import { afterEach, describe, expect, test } from "bun:test";
import type {
  LanguageModelV3CallOptions,
  LanguageModelV3StreamPart,
} from "@ai-sdk/provider";
import { createAdRouter } from "../../src/provider.js";

const originalEnv = { ...process.env };

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (key.startsWith("ADROUTER_")) delete process.env[key];
  }
  for (const [key, value] of Object.entries(originalEnv)) {
    if (key.startsWith("ADROUTER_") && value !== undefined) process.env[key] = value;
  }
});

function call(prompt: LanguageModelV3CallOptions["prompt"]): LanguageModelV3CallOptions {
  return {
    prompt,
    maxOutputTokens: 9000,
    tools: [{
      type: "function",
      name: "weather",
      description: "Get weather",
      inputSchema: {
        type: "object",
        properties: { city: { type: "string" } },
        required: ["city"],
      },
    }],
    providerOptions: { adrouter: { thinkingLevel: "high" } },
  };
}

function chunkedNdjson(events: unknown[]): Response {
  const encoded = new TextEncoder().encode(events.map((event) => JSON.stringify(event)).join("\r\n"));
  const cuts = [1, 7, 23, 41, 89, encoded.length - 2, encoded.length];
  let offset = 0;
  return new Response(new ReadableStream({
    pull(controller) {
      const end = cuts.shift();
      if (end === undefined) {
        controller.close();
        return;
      }
      controller.enqueue(encoded.slice(offset, end));
      offset = end;
    },
  }), { headers: { "content-type": "application/x-ndjson; charset=utf-8" } });
}

async function parts(stream: ReadableStream<LanguageModelV3StreamPart>): Promise<LanguageModelV3StreamPart[]> {
  const result: LanguageModelV3StreamPart[] = [];
  const reader = stream.getReader();
  while (true) {
    const item = await reader.read();
    if (item.done) break;
    result.push(item.value);
  }
  return result;
}

describe("AdRouter LanguageModelV3", () => {
  test("maps split NDJSON, authoritative suffixes, tools, usage, and metadata", async () => {
    let requestBody: Record<string, any> | undefined;
    const fetchMock = (async (_input, init) => {
      requestBody = JSON.parse(String(init?.body));
      return chunkedNdjson([
        {
          type: "ad",
          ad: {
            id: "ad-1",
            turn_id: "turn-1",
            tier: 1,
            sponsor: {
              brand_name: "Acme",
              ad_copy: "Build faster",
              click_url: "https://acme.test",
            },
          },
          injection: { mode: "display_only", placement: "bottom" },
          status: "live",
        },
        { type: "thinking", delta: "I should " },
        { type: "text", content: "Hello " },
        {
          type: "tool_call",
          tool_call: { id: "call-1", function: { name: "weather", arguments: "{\"city\":\"SG\"}" } },
        },
        {
          type: "settlement",
          turn_id: "turn-1",
          settlement: { ad_subsidy: 0.001234, cost: { input: 0.01 } },
          usage: { input: 12, output: 8, totalTokens: 20 },
        },
        {
          type: "done",
          assistant: {
            reasoning_content: "I should check",
            content: "Hello world",
            tool_calls: [{ id: "call-1", name: "weather", arguments: { city: "SG" } }],
          },
        },
      ]);
    }) as typeof fetch;
    const model = createAdRouter({
      apiKey: "secret",
      baseURL: "http://127.0.0.1:8787",
      fetch: fetchMock,
      workspace: "/work",
    }).languageModel("deepseek-v4-flash");

    const result = await model.doStream(call([
      { role: "system", content: "Be useful" },
      { role: "user", content: [{ type: "text", text: "Weather?" }] },
    ]));
    const output = await parts(result.stream);

    expect(output.filter((part) => part.type === "tool-call")).toHaveLength(1);
    expect(output.filter((part) => part.type === "text-delta").map((part) => part.delta).join("")).toBe("Hello world");
    expect(output.filter((part) => part.type === "reasoning-delta").map((part) => part.delta).join("")).toBe("I should check");
    const finish = output.find((part) => part.type === "finish");
    expect(finish?.type).toBe("finish");
    if (finish?.type === "finish") {
      expect(finish.finishReason.unified).toBe("tool-calls");
      expect(finish.usage.inputTokens.total).toBe(12);
      expect((finish.providerMetadata?.adrouter as any).phase).toBe("done");
      expect((finish.providerMetadata?.adrouter as any).settlement.ad_subsidy).toBe(0.001234);
    }
    expect(requestBody?.thinking_level).toBe("high");
    expect(requestBody?.runtime_mode).toBe("mock");
    expect(requestBody?.max_output_tokens).toBe(4096);
    expect(requestBody?.metadata).toEqual({
      client: "adrouter-opencode",
      workspace: "/work",
      ad_mode: "mock",
      ads_enabled: true,
      min_ad_tier: "3",
    });
  });

  test("JSON generation preserves raw and normalized ad outcomes without prompt leakage", async () => {
    let requestBody: Record<string, any> | undefined;
    const fetchMock = (async (_input, init) => {
      requestBody = JSON.parse(String(init?.body));
      return Response.json({
        turn_id: "turn-json",
        status: "mock",
        ads: [{
          id: "ad-c",
          tier: "C",
          title: "Tools",
          body: "A compact sponsor",
          url: "https://example.test",
        }],
        assistant: { reasoning_content: "reason", content: "answer" },
        settlement: { ad_subsidy: 0.02 },
        usage: { inputTokens: 3, outputTokens: 4, totalTokens: 7 },
      });
    }) as typeof fetch;
    const model = createAdRouter({
      apiKey: "key",
      baseURL: "http://localhost:8787",
      fetch: fetchMock,
    }).languageModel("deepseek-v4-pro");
    const result = await model.doGenerate(call([
      {
        role: "assistant",
        content: [{
          type: "text",
          text: "prior",
          providerOptions: { adrouter: { ads: [{ title: "must not leak" }] } },
        }],
      },
      { role: "user", content: [{ type: "text", text: "next" }] },
    ]));

    expect(result.content.some((part) => part.type === "text" && part.text === "answer")).toBe(true);
    expect((result.providerMetadata?.adrouter as any).ads[0].tier).toBe("C");
    expect(JSON.stringify(requestBody)).not.toContain("must not leak");
    expect(requestBody?.context.messages).toEqual([
      { role: "assistant", content: [{ type: "text", text: "prior" }] },
      { role: "user", content: "next" },
    ]);
  });

  test("rejects conflicting authoritative snapshots and clears sponsor metadata", async () => {
    const model = createAdRouter({
      apiKey: "key",
      baseURL: "http://localhost:8787",
      fetch: (async () => chunkedNdjson([
        {
          type: "ad",
          status: "live",
          ads: [{ id: "ad", tier: "B", title: "Old", body: "Sponsor" }],
        },
        { type: "text", content: "abc" },
        { type: "done", assistant: { content: "xyz" } },
      ])) as unknown as typeof fetch,
    }).languageModel("deepseek-v4-flash");
    const output = await parts((await model.doStream(call([
      { role: "user", content: [{ type: "text", text: "test" }] },
    ]))).stream);
    expect(output.some((part) => part.type === "error")).toBe(true);
    const finish = output.find((part) => part.type === "finish");
    if (finish?.type !== "finish") throw new Error("missing finish");
    expect(finish.finishReason.unified).toBe("error");
    expect((finish.providerMetadata?.adrouter as any).ads).toEqual([]);
    expect((finish.providerMetadata?.adrouter as any).status).toBe("degraded");
  });

  test("environment off switch cannot be overridden", async () => {
    process.env.ADROUTER_AD_MODE = "off";
    let body: any;
    const model = createAdRouter({
      apiKey: "key",
      baseURL: "http://localhost:8787",
      adMode: "live",
      adsEnabled: true,
      fetch: (async (_input, init) => {
        body = JSON.parse(String(init?.body));
        return Response.json({ status: "live", ads: [{ id: "a", tier: "A", title: "x", body: "y" }], assistant: {} });
      }) as typeof fetch,
    }).languageModel("deepseek-v4-flash");
    const result = await model.doGenerate(call([{ role: "user", content: [{ type: "text", text: "x" }] }]));
    expect(body.metadata.ad_mode).toBe("off");
    expect(body.metadata.ads_enabled).toBe(false);
    expect((result.providerMetadata?.adrouter as any).status).toBe("off");
    expect((result.providerMetadata?.adrouter as any).ads).toEqual([]);
  });
});

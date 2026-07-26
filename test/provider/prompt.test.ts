import { describe, expect, test } from "bun:test";
import { buildNativeContext } from "../../src/transport/prompt.js";

describe("prompt translation", () => {
  test("deduplicates identical tool calls and results", () => {
    const context = buildNativeContext({
      prompt: [
        {
          role: "assistant",
          content: [
            { type: "tool-call", toolCallId: "id-1", toolName: "read", input: { path: "a" } },
            { type: "tool-call", toolCallId: "id-1", toolName: "read", input: { path: "a" } },
          ],
        },
        {
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId: "id-1",
              toolName: "read",
              output: { type: "text", value: "ok" },
            },
            {
              type: "tool-result",
              toolCallId: "id-1",
              toolName: "read",
              output: { type: "text", value: "ok" },
            },
          ],
        },
      ],
    });
    expect(context.messages[0]?.content as unknown[]).toHaveLength(1);
    expect(context.messages.filter((message) => message.role === "toolResult")).toHaveLength(1);
  });

  test("rejects conflicting IDs and files", () => {
    expect(() =>
      buildNativeContext({
        prompt: [
          {
            role: "assistant",
            content: [
              { type: "tool-call", toolCallId: "same", toolName: "one", input: {} },
              { type: "tool-call", toolCallId: "same", toolName: "two", input: {} },
            ],
          },
        ],
      }),
    ).toThrow("Conflicting tool calls");

    expect(() =>
      buildNativeContext({
        prompt: [
          {
            role: "user",
            content: [{ type: "file", data: "AA==", mediaType: "image/png" }],
          },
        ],
      }),
    ).toThrow("does not support file");
  });

  test("maps system, reasoning, tool output variants, and function definitions", () => {
    const context = buildNativeContext({
      prompt: [
        { role: "system", content: "one" },
        { role: "system", content: "two" },
        { role: "user", content: [{ type: "text", text: "question" }] },
        {
          role: "assistant",
          content: [
            { type: "reasoning", text: "think" },
            { type: "text", text: "answer" },
          ],
        },
        {
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId: "json",
              toolName: "lookup",
              output: { type: "json", value: { ok: true } },
            },
            {
              type: "tool-result",
              toolCallId: "error",
              toolName: "lookup",
              output: { type: "error-text", value: "failed" },
            },
            {
              type: "tool-result",
              toolCallId: "denied",
              toolName: "lookup",
              output: { type: "execution-denied", reason: "no" },
            },
            {
              type: "tool-result",
              toolCallId: "content",
              toolName: "lookup",
              output: { type: "content", value: [{ type: "text", text: "first" }] },
            },
          ],
        },
      ],
      tools: [
        {
          type: "function",
          name: "lookup",
          description: "Lookup",
          inputSchema: { type: "object" },
        },
      ],
    });
    expect(context.systemPrompt).toBe("one\n\ntwo");
    expect(context.tools).toEqual([
      {
        name: "lookup",
        description: "Lookup",
        parameters: { type: "object" },
      },
    ]);
    expect(context.messages.filter((message) => message.role === "toolResult")).toHaveLength(4);
  });
});

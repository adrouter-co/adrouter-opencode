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
            { type: "tool-result", toolCallId: "id-1", toolName: "read", output: { type: "text", value: "ok" } },
            { type: "tool-result", toolCallId: "id-1", toolName: "read", output: { type: "text", value: "ok" } },
          ],
        },
      ],
    });
    expect((context.messages[0]?.content as unknown[])).toHaveLength(1);
    expect(context.messages.filter((message) => message.role === "toolResult")).toHaveLength(1);
  });

  test("rejects conflicting IDs and files", () => {
    expect(() => buildNativeContext({
      prompt: [{
        role: "assistant",
        content: [
          { type: "tool-call", toolCallId: "same", toolName: "one", input: {} },
          { type: "tool-call", toolCallId: "same", toolName: "two", input: {} },
        ],
      }],
    })).toThrow("Conflicting tool calls");

    expect(() => buildNativeContext({
      prompt: [{
        role: "user",
        content: [{ type: "file", data: "AA==", mediaType: "image/png" }],
      }],
    })).toThrow("does not support file");
  });
});

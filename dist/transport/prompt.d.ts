import type { LanguageModelV3CallOptions } from "@ai-sdk/provider";
interface NativeMessage {
    role: "user" | "assistant" | "toolResult";
    content?: unknown;
    toolCallId?: string;
    toolName?: string;
    isError?: boolean;
}
export declare function buildNativeContext(options: LanguageModelV3CallOptions): {
    systemPrompt?: string;
    messages: NativeMessage[];
    tools?: unknown[];
};
export {};
//# sourceMappingURL=prompt.d.ts.map
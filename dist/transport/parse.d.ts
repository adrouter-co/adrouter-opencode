import type { LanguageModelV3Content, LanguageModelV3FinishReason, LanguageModelV3Usage, SharedV3ProviderMetadata } from "@ai-sdk/provider";
import type { AdRouterAd, AdRouterInjection, AdRouterProviderMetadataV1, AdRouterSettlement, AdRouterStatus, AdRouterUsage } from "../contracts.js";
export interface RouterAssistant {
    content?: unknown;
    reasoning_content?: unknown;
    tool_calls?: unknown;
    toolCalls?: unknown;
}
export interface RouterPayload {
    type?: unknown;
    turn_id?: unknown;
    assistant?: RouterAssistant;
    ad?: unknown;
    ads?: unknown;
    injection?: unknown;
    settlement?: unknown;
    usage?: unknown;
    status?: unknown;
    content?: unknown;
    delta?: unknown;
    tool_call?: unknown;
    message?: unknown;
}
export interface ParsedToolCall {
    id: string;
    name: string;
    input: string;
}
export declare function sanitizeText(value: unknown, fallback?: string): string;
export declare function parseAds(ads: unknown, rawAd: unknown): AdRouterAd[];
export declare function normalizeOutcome(ads: AdRouterAd[], statusValue: unknown, adMode: string, adsEnabled: boolean): {
    ads: AdRouterAd[];
    status: AdRouterStatus;
};
export declare function parseInjection(value: unknown): AdRouterInjection | undefined;
export declare function parseSettlement(value: unknown): AdRouterSettlement | undefined;
export declare function parseUsage(value: unknown): {
    sdk: LanguageModelV3Usage;
    public: AdRouterUsage;
};
export declare function parseToolCalls(value: unknown): ParsedToolCall[];
export declare function turnId(payload: RouterPayload): string | undefined;
export declare function metadata(snapshot: AdRouterProviderMetadataV1): SharedV3ProviderMetadata;
export declare function assistantContent(payload: RouterPayload): {
    content: LanguageModelV3Content[];
    tools: ParsedToolCall[];
    text: string;
    reasoning: string;
};
export declare function finishReason(hasTools: boolean): LanguageModelV3FinishReason;
export declare function ndjsonLines(body: ReadableStream<Uint8Array>): AsyncGenerator<RouterPayload>;
//# sourceMappingURL=parse.d.ts.map
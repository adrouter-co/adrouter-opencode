export type AdRouterTier = "A" | "B" | "C" | "NONE";
export type AdRouterStatus = "live" | "mock" | "off" | "privacy_protected" | "degraded";
export type AdRouterPhase = "routed" | "streaming" | "settled" | "done" | "error";
export interface AdRouterAd {
    id: string;
    tier: AdRouterTier;
    campaignId?: string;
    reasonCode?: string;
    title: string;
    body: string;
    cta?: string;
    url?: string;
    label: string;
}
export interface AdRouterInjection {
    mode?: string;
    location?: string;
    [key: string]: unknown;
}
export interface AdRouterSettlement {
    ad_subsidy?: number;
    cost?: Record<string, number>;
    [key: string]: unknown;
}
export interface AdRouterUsage {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cachedInputTokens?: number;
    reasoningTokens?: number;
}
export interface AdRouterProviderMetadataV1 {
    version: 1;
    turnId?: string;
    sequence: number;
    phase: AdRouterPhase;
    status: AdRouterStatus;
    ads: AdRouterAd[];
    injection?: AdRouterInjection;
    settlement?: AdRouterSettlement;
    usage?: AdRouterUsage;
    error?: string;
}
export interface AdRouterProviderMetadata {
    adrouter: AdRouterProviderMetadataV1;
}
export interface AdRouterProviderOptions {
    apiKey?: string;
    baseURL?: string;
    fetch?: typeof globalThis.fetch;
    headers?: HeadersInit;
    adMode?: string;
    runtimeMode?: "auto" | "mock" | "live";
    adsEnabled?: boolean;
    minimumTier?: AdRouterTier | "1" | "2" | "3";
    workspace?: string;
    model?: string;
    defaultMaxOutputTokens?: number;
}
//# sourceMappingURL=contracts.d.ts.map
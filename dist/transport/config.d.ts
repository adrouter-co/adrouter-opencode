import type { AdRouterProviderOptions } from "../contracts.js";
export declare const DEFAULT_BASE_URL = "https://api-staging.adrouter.co";
export declare const MAX_OUTPUT_TOKENS = 4096;
export interface ResolvedAdRouterConfig {
    apiKey: string;
    baseURL: string;
    model: string;
    workspace: string;
    adMode: string;
    runtimeMode: "mock" | "live" | undefined;
    adsEnabled: boolean;
    minimumTier: string;
    maxOutputTokens: number;
    fetch: typeof globalThis.fetch;
    headers: Headers;
}
export declare function isHostedURL(value: string): boolean;
export declare function resolveConfig(requestedModel: string, options: AdRouterProviderOptions, callMaxOutputTokens?: number): ResolvedAdRouterConfig;
//# sourceMappingURL=config.d.ts.map
import type { LanguageModelV3 } from "@ai-sdk/provider";
import type { AdRouterProviderOptions } from "./contracts.js";
export interface AdRouterProvider {
    readonly specificationVersion: "v3";
    languageModel(modelId: string): LanguageModelV3;
}
export declare function createAdRouter(options?: AdRouterProviderOptions): AdRouterProvider;
//# sourceMappingURL=provider.d.ts.map
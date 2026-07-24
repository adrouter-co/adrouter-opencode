import type { AdRouterProviderOptions } from "../contracts.js";

export const DEFAULT_BASE_URL = "https://api-staging.adrouter.co";
export const MAX_OUTPUT_TOKENS = 4096;

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

function env(name: string): string | undefined {
  const value = typeof process === "undefined" ? undefined : process.env[name];
  return value?.trim() || undefined;
}

export function isHostedURL(value: string): boolean {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === "api.adrouter.co" || hostname === "api-staging.adrouter.co";
  } catch {
    return false;
  }
}

function enabled(value: string | undefined): boolean {
  return value?.toLowerCase() !== "false";
}

export function resolveConfig(
  requestedModel: string,
  options: AdRouterProviderOptions,
  callMaxOutputTokens?: number,
): ResolvedAdRouterConfig {
  const apiKey = options.apiKey?.trim() || env("ADROUTER_API_KEY");
  if (!apiKey) {
    throw new Error(
      "AdRouter authentication is not configured. Set ADROUTER_API_KEY or run `opencode auth login --provider adrouter`.",
    );
  }

  const baseURL = (env("ADROUTER_API_URL") ?? options.baseURL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  let configuredRuntime = (env("ADROUTER_RUNTIME_MODE") ?? options.runtimeMode)?.toLowerCase();
  if (configuredRuntime && !["auto", "mock", "live"].includes(configuredRuntime)) {
    throw new Error("ADROUTER_RUNTIME_MODE must be auto, mock, or live.");
  }
  if (isHostedURL(baseURL) && configuredRuntime === "mock") {
    throw new Error("AdRouter hosted URLs only support live runtime mode.");
  }
  if (!configuredRuntime || configuredRuntime === "auto") {
    configuredRuntime = isHostedURL(baseURL) ? "live" : "mock";
  }

  const environmentAdMode = env("ADROUTER_AD_MODE");
  const forcedOff = environmentAdMode?.toLowerCase() === "off";
  const adsEnabled = !forcedOff && enabled(env("ADROUTER_ADS_ENABLED")) && options.adsEnabled !== false;
  const configuredLimit = callMaxOutputTokens ?? options.defaultMaxOutputTokens ?? MAX_OUTPUT_TOKENS;
  const maxOutputTokens = Math.max(1, Math.min(MAX_OUTPUT_TOKENS, Math.floor(configuredLimit)));

  const headers = new Headers(options.headers);
  headers.set("accept", "application/x-ndjson, application/json");
  headers.set("authorization", `Bearer ${apiKey}`);
  headers.set("content-type", "application/json");

  return {
    apiKey,
    baseURL,
    model: env("ADROUTER_MODEL_ROUTE") ?? options.model ?? requestedModel,
    workspace:
      env("ADROUTER_WORKSPACE") ??
      options.workspace ??
      (typeof process === "undefined" ? "." : process.cwd()),
    adMode: forcedOff ? "off" : (environmentAdMode ?? options.adMode ?? (isHostedURL(baseURL) ? "live" : "mock")),
    runtimeMode: isHostedURL(baseURL) ? undefined : (configuredRuntime as "mock" | "live"),
    adsEnabled,
    minimumTier: String(env("ADROUTER_MIN_AD_TIER") ?? options.minimumTier ?? "3"),
    maxOutputTokens,
    fetch: options.fetch ?? globalThis.fetch,
    headers,
  };
}

import { readFileSync } from "node:fs";
import type { Config, Plugin, PluginModule } from "@opencode-ai/plugin";
import { ADROUTER_CODING_MODELS, type AdRouterThinkingLevel } from "./catalog.js";

function providerPackageSpec(): string {
  const manifest = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  ) as { name?: unknown; version?: unknown };
  if (manifest.name !== "@adrouter/opencode" || typeof manifest.version !== "string") {
    throw new Error("The AdRouter package identity is invalid.");
  }
  return `${manifest.name}@${manifest.version}`;
}

const PROVIDER_PACKAGE_SPEC = providerPackageSpec();

function model(
  id: string,
  name: string,
  levels: readonly AdRouterThinkingLevel[],
  context: number,
) {
  const variants = Object.fromEntries(
    levels.map((thinkingLevel) => [thinkingLevel, { thinkingLevel }]),
  );
  return {
    id,
    name,
    attachment: false,
    reasoning: true,
    temperature: false,
    tool_call: true,
    limit: { context, output: 4096 },
    modalities: { input: ["text"], output: ["text"] },
    variants,
  };
}

export function applyAdRouterConfig(config: Config): void {
  const current = config.provider?.adrouter;
  const defaultModels = Object.fromEntries(
    ADROUTER_CODING_MODELS.map((entry) => [
      entry.id,
      model(entry.id, entry.name, entry.thinkingLevels, entry.contextWindow),
    ]),
  );
  const defaults = {
    id: "adrouter",
    name: "AdRouter",
    npm: PROVIDER_PACKAGE_SPEC,
    env: ["ADROUTER_INTEGRATION_API_KEY"],
    models: defaultModels,
  };
  if (!current) {
    config.provider = { ...config.provider, adrouter: defaults } as NonNullable<Config["provider"]>;
    return;
  }

  const currentModels = current.models ?? {};
  const mergedModels: Record<string, unknown> = { ...defaults.models };
  for (const [id, configured] of Object.entries(currentModels)) {
    const fallback = defaults.models[id];
    mergedModels[id] = fallback
      ? {
          ...fallback,
          ...configured,
          variants: {
            ...fallback.variants,
            ...((configured as { variants?: Record<string, unknown> }).variants ?? {}),
          },
        }
      : configured;
  }
  config.provider = {
    ...config.provider,
    adrouter: {
      ...defaults,
      ...current,
      env: current.env ?? defaults.env,
      models: mergedModels,
      options: current.options ? { ...current.options } : undefined,
    },
  } as NonNullable<Config["provider"]>;
}

const server: Plugin = async () => ({
  config: async (config) => {
    applyAdRouterConfig(config);
  },
  auth: {
    provider: "adrouter",
    methods: [{ type: "api", label: "AdRouter integration API key (adr_int_)" }],
  },
});

const plugin: PluginModule & { id: string } = {
  id: "adrouter",
  server,
};

export default plugin;

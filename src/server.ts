import type { Config, Plugin, PluginModule } from "@opencode-ai/plugin";

type ThinkingLevel = "none" | "medium" | "high";

function model(id: string, name: string, levels: readonly ThinkingLevel[], context: number) {
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
  const defaults = {
    id: "adrouter",
    name: "AdRouter",
    npm: "@adrouter/opencode",
    env: ["ADROUTER_INTEGRATION_API_KEY"],
    models: {
      "deepseek-v4-flash": model(
        "deepseek-v4-flash",
        "DeepSeek V4 Flash",
        ["none", "medium", "high"],
        1_048_576,
      ),
      "deepseek-v4-pro": model(
        "deepseek-v4-pro",
        "DeepSeek V4 Pro",
        ["none", "medium", "high"],
        1_048_576,
      ),
      "mimo-v2.5": model("mimo-v2.5", "MiMo V2.5 Flash", ["none", "high"], 1_048_576),
      "mimo-v2.5-pro": model("mimo-v2.5-pro", "MiMo V2.5 Pro", ["none", "high"], 1_048_576),
      "agnes-2.0-flash": model("agnes-2.0-flash", "Agnes 2.0 Flash", ["none", "high"], 524_288),
      "agnes-2.5-flash": model("agnes-2.5-flash", "Agnes 2.5 Flash", ["none", "high"], 524_288),
      "agnes-2.5-pro": model("agnes-2.5-pro", "Agnes 2.5 Pro", ["high"], 1_048_576),
      "agnes-2.5-pro-alpha": model(
        "agnes-2.5-pro-alpha",
        "Agnes 2.5 Pro Alpha",
        ["high"],
        1_048_576,
      ),
    },
  };
  if (!current) {
    config.provider = { ...config.provider, adrouter: defaults } as NonNullable<Config["provider"]>;
    return;
  }

  const currentModels = current.models ?? {};
  const mergedModels: Record<string, unknown> = { ...defaults.models };
  for (const [id, configured] of Object.entries(currentModels)) {
    const fallback = defaults.models[id as keyof typeof defaults.models];
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

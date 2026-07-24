import type { Config, Plugin, PluginModule } from "@opencode-ai/plugin";

const variants = {
  none: { thinkingLevel: "none" },
  medium: { thinkingLevel: "medium" },
  high: { thinkingLevel: "high" },
};

function model(name: string) {
  return {
    id: name,
    name,
    attachment: false,
    reasoning: true,
    temperature: false,
    tool_call: true,
    limit: { context: 1_000_000, output: 4096 },
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
    env: ["ADROUTER_API_KEY"],
    models: {
      "deepseek-v4-flash": model("DeepSeek V4 Flash"),
      "deepseek-v4-pro": model("DeepSeek V4 Pro"),
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
    methods: [{ type: "api", label: "AdRouter API key" }],
  },
});

const plugin: PluginModule & { id: string } = {
  id: "adrouter",
  server,
};

export default plugin;

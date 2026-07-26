import { describe, expect, test } from "bun:test";
import type { Config } from "@opencode-ai/plugin";
import serverPlugin, { applyAdRouterConfig } from "../src/server.js";

describe("OpenCode server plugin", () => {
  test("registers both models and variants in a fresh config", () => {
    const config: Config = {};
    applyAdRouterConfig(config);
    const provider = config.provider?.adrouter as any;
    expect(provider.name).toBe("AdRouter");
    expect(provider.npm).toBe("@adrouter/opencode");
    expect(provider.env).toEqual(["ADROUTER_API_KEY"]);
    expect(Object.keys(provider.models)).toEqual(["deepseek-v4-flash", "deepseek-v4-pro"]);
    expect(provider.models["deepseek-v4-flash"]).toMatchObject({
      id: "deepseek-v4-flash",
      name: "DeepSeek V4 Flash",
    });
    expect(provider.models["deepseek-v4-pro"]).toMatchObject({
      id: "deepseek-v4-pro",
      name: "DeepSeek V4 Pro",
    });
    // OpenCode 1.18.4 resolves api.id from the configured model id.
    expect(provider.models["deepseek-v4-flash"].id).toBe("deepseek-v4-flash");
    expect(provider.models["deepseek-v4-flash"].variants).toEqual({
      none: { thinkingLevel: "none" },
      medium: { thinkingLevel: "medium" },
      high: { thinkingLevel: "high" },
    });
  });

  test("preserves configured provider fields, model overrides, and enablement", () => {
    const config: Config = {
      disabled_providers: ["adrouter"],
      provider: {
        adrouter: {
          name: "My Router",
          npm: "file:///custom/provider.js",
          options: { baseURL: "http://localhost:9999", apiKey: "local" },
          models: {
            "deepseek-v4-flash": {
              name: "My Flash",
              limit: { context: 123, output: 321 },
            },
            custom: { name: "Custom" },
          },
        },
      },
    };
    applyAdRouterConfig(config);
    const provider = config.provider?.adrouter as any;
    expect(provider.name).toBe("My Router");
    expect(provider.npm).toBe("file:///custom/provider.js");
    expect(provider.options).toEqual({ baseURL: "http://localhost:9999", apiKey: "local" });
    expect(provider.models["deepseek-v4-flash"].limit).toEqual({ context: 123, output: 321 });
    expect(provider.models.custom.name).toBe("Custom");
    expect(config.disabled_providers).toEqual(["adrouter"]);
  });

  test("exposes an API-key auth hook", async () => {
    const hooks = await serverPlugin.server({} as any);
    expect(hooks.auth?.provider).toBe("adrouter");
    expect(hooks.auth?.methods[0]).toMatchObject({ type: "api", label: "AdRouter API key" });
    const config: Config = {};
    await hooks.config?.(config);
    expect((config.provider?.adrouter?.models?.["deepseek-v4-pro"] as any).id).toBe(
      "deepseek-v4-pro",
    );
  });
});

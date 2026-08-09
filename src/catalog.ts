export type AdRouterThinkingLevel = "none" | "medium" | "high";

export interface AdRouterCodingModel {
  id: string;
  name: string;
  thinkingLevels: readonly AdRouterThinkingLevel[];
  defaultThinkingLevel: AdRouterThinkingLevel;
  contextWindow: number;
}

export const ADROUTER_CODING_MODELS: readonly AdRouterCodingModel[] = [
  {
    id: "deepseek-v4-flash",
    name: "DeepSeek V4 Flash",
    thinkingLevels: ["none", "medium", "high"],
    defaultThinkingLevel: "medium",
    contextWindow: 1_048_576,
  },
  {
    id: "deepseek-v4-pro",
    name: "DeepSeek V4 Pro",
    thinkingLevels: ["none", "medium", "high"],
    defaultThinkingLevel: "medium",
    contextWindow: 1_048_576,
  },
  {
    id: "mimo-v2.5",
    name: "MiMo V2.5 Flash",
    thinkingLevels: ["none", "high"],
    defaultThinkingLevel: "high",
    contextWindow: 1_048_576,
  },
  {
    id: "mimo-v2.5-pro",
    name: "MiMo V2.5 Pro",
    thinkingLevels: ["none", "high"],
    defaultThinkingLevel: "high",
    contextWindow: 1_048_576,
  },
  {
    id: "agnes-2.0-flash",
    name: "Agnes 2.0 Flash",
    thinkingLevels: ["none", "high"],
    defaultThinkingLevel: "none",
    contextWindow: 524_288,
  },
  {
    id: "agnes-2.5-flash",
    name: "Agnes 2.5 Flash",
    thinkingLevels: ["none", "high"],
    defaultThinkingLevel: "none",
    contextWindow: 524_288,
  },
] as const;

const DEFAULT_THINKING_LEVELS = new Map(
  ADROUTER_CODING_MODELS.map((model) => [model.id, model.defaultThinkingLevel]),
);

export function defaultThinkingLevel(modelId: string): AdRouterThinkingLevel {
  return DEFAULT_THINKING_LEVELS.get(modelId) ?? "medium";
}

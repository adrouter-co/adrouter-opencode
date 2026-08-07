import type { LanguageModelV3CallOptions } from "@ai-sdk/provider";
import { AdRouterPanelState, renderCompactAd } from "../src/presentation.js";
import { createAdRouter } from "../src/provider.js";

const apiKey = process.env.ADROUTER_INTEGRATION_API_KEY?.trim();
if (!apiKey) {
  throw new Error("ADROUTER_INTEGRATION_API_KEY is required for the staging canary.");
}

const call: LanguageModelV3CallOptions = {
  prompt: [{ role: "user", content: [{ type: "text", text: "Reply with exactly: canary-ok" }] }],
  maxOutputTokens: 64,
};

for (const modelID of ["deepseek-v4-flash", "deepseek-v4-pro"]) {
  const result = await createAdRouter({ apiKey }).languageModel(modelID).doGenerate(call);
  const metadata = result.providerMetadata?.adrouter as
    | {
        phase?: string;
        ads?: Array<Parameters<typeof renderCompactAd>[0]>;
        settlement?: unknown;
        usage?: { totalTokens?: number };
      }
    | undefined;
  if (metadata?.phase !== "done") throw new Error(`${modelID}: missing terminal done metadata.`);
  if (!metadata.usage?.totalTokens) throw new Error(`${modelID}: missing usage.`);
  if (!metadata.settlement) throw new Error(`${modelID}: missing settlement.`);
  const assistantText = result.content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
  for (const ad of metadata.ads ?? []) {
    if (assistantText.includes(ad.title) || assistantText.includes(ad.body)) {
      throw new Error(`${modelID}: sponsor content leaked into assistant text.`);
    }
  }

  const panel = new AdRouterPanelState();
  panel.reconstruct("canary", [
    {
      id: `${modelID}-assistant`,
      role: "assistant",
      parts: [{ metadata: { adrouter: metadata } }],
    },
  ]);
  const ad = panel.snapshot()?.ads[0];
  if (ad && !renderCompactAd(ad, 120)) throw new Error(`${modelID}: TUI rendering failed.`);
  console.log(`${modelID}: staging canary passed.`);
}

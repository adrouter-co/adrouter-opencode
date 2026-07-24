import { describe, expect, test } from "bun:test";
import {
  ADROUTER_PALETTE,
  AdRouterPanelState,
  formatSubsidy,
  renderCompactAd,
  tierACard,
  truncateVisible,
} from "../../src/presentation.js";

const tierC = {
  id: "c",
  tier: "C" as const,
  title: "\u001b[31mDeveloper Tools\u001b[0m",
  body: "Build faster",
  url: "https://example.test",
  label: "Sponsored",
};

describe("tiered presentation", () => {
  test("matches native truncation at representative widths", () => {
    for (const width of [20, 40, 80, 120]) {
      expect(renderCompactAd(tierC, width).length).toBeLessThanOrEqual(width);
    }
    expect(truncateVisible("abcdef", 1)).toBe(".");
    expect(truncateVisible("abcdef", 2)).toBe("..");
    expect(truncateVisible("abcdef", 3)).toBe("...");
    expect(renderCompactAd(tierC, 120)).toBe(
      "TIER C: Developer Tools — Build faster — https://example.test",
    );
  });

  test("renders NONE and Tier A settlement copy and palette", () => {
    expect(renderCompactAd({
      id: "none",
      tier: "NONE",
      title: "ignored",
      body: "Privacy guardrail",
      label: "TIER NONE",
    }, 120)).toBe("TIER NONE: No sponsored content — Privacy guardrail");

    expect(tierACard({
      id: "a",
      tier: "A",
      title: "Acme",
      body: "Ship",
      cta: "Try it",
      url: "https://acme.test",
      label: "Sponsored",
    }, { ad_subsidy: 0.001234 })).toEqual({
      label: "Sponsored · TIER A",
      content: "Acme — Ship — Try it https://acme.test",
      saved: "Saved $0.001234",
    });
    expect(ADROUTER_PALETTE.dark).toEqual({ background: "#17364a", label: "#8fcfff" });
    expect(ADROUTER_PALETTE.light).toEqual({ background: "#dcefff", label: "#1769aa" });
    expect(formatSubsidy(0.009)).toBe("0.009000");
    expect(formatSubsidy(0.02)).toBe("0.020");
  });

  test("deduplicates cumulative settlement by turn and clears stale ads", () => {
    const state = new AdRouterPanelState();
    state.switchSession("s1");
    const settled = {
      adrouter: {
        version: 1,
        sequence: 2,
        phase: "settled",
        status: "live",
        turnId: "turn-1",
        ads: [tierC],
        settlement: { ad_subsidy: 0.002 },
      },
    };
    state.ingest("s1", { metadata: settled });
    state.ingest("s1", { metadata: settled });
    expect(state.cumulativeSavings()).toBe(0.002);
    state.ingest("s1", {
      metadata: {
        adrouter: {
          version: 1,
          sequence: 3,
          phase: "error",
          status: "degraded",
          turnId: "turn-2",
          ads: [],
        },
      },
    });
    expect(state.snapshot()?.ads).toEqual([]);
    expect(state.cumulativeSavings()).toBe(0.002);
    state.switchSession("s2");
    expect(state.cumulativeSavings()).toBe(0);
  });
});

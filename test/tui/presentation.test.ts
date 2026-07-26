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
    expect(
      renderCompactAd(
        {
          id: "none",
          tier: "NONE",
          title: "ignored",
          body: "Privacy guardrail",
          label: "TIER NONE",
        },
        120,
      ),
    ).toBe("TIER NONE: No sponsored content — Privacy guardrail");

    expect(
      tierACard(
        {
          id: "a",
          tier: "A",
          title: "Acme",
          body: "Ship",
          cta: "Try it",
          url: "https://acme.test",
          label: "Sponsored",
        },
        { ad_subsidy: 0.001234 },
      ),
    ).toEqual({
      label: "Sponsored · TIER A",
      content: "Acme — Ship — Try it https://acme.test",
      saved: "Saved $0.001234",
    });
    expect(ADROUTER_PALETTE.dark).toEqual({ background: "#17364a", label: "#8fcfff" });
    expect(ADROUTER_PALETTE.light).toEqual({ background: "#dcefff", label: "#1769aa" });
    expect(formatSubsidy(0.009)).toBe("0.009000");
    expect(formatSubsidy(0.02)).toBe("0.020");
  });

  test("reconstructs ordered messages, accepts only highest sequences, and clears stale ads", () => {
    const state = new AdRouterPanelState();
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
    const lower = {
      adrouter: {
        ...settled.adrouter,
        sequence: 1,
        ads: [{ ...tierC, title: "Stale" }],
        settlement: { ad_subsidy: 99 },
      },
    };
    state.reconstruct("s1", [
      { id: "u1", role: "user", parts: [] },
      {
        id: "a1",
        role: "assistant",
        parts: [{ metadata: settled }, { metadata: lower }, { metadata: settled }],
      },
      {
        id: "a1-late",
        role: "assistant",
        parts: [{ metadata: lower }],
      },
    ]);
    expect(state.cumulativeSavings()).toBe(0.002);
    expect(state.snapshot()?.ads[0]?.title).not.toBe("Stale");

    state.reconstruct("s1", [
      {
        id: "a1",
        role: "assistant",
        parts: [{ metadata: settled }],
      },
      { id: "u2", role: "user", parts: [] },
    ]);
    expect(state.snapshot()).toBeUndefined();
    expect(state.cumulativeSavings()).toBe(0.002);

    state.reconstruct("s2", []);
    expect(state.cumulativeSavings()).toBe(0);
  });
});

import { describe, expect, test } from "bun:test";
import { normalizeOutcome, parseAds } from "../../src/transport/parse.js";

describe("AdRouter outcomes", () => {
  test("normalizes letter and numeric tiers", () => {
    expect(parseAds([{ id: "a", tier: 1, title: "A", body: "a" }], undefined)[0]?.tier).toBe("A");
    expect(parseAds([{ id: "b", tier: "2", title: "B", body: "b" }], undefined)[0]?.tier).toBe("B");
    expect(parseAds([{ id: "c", tier: 3, title: "C", body: "c" }], undefined)[0]?.tier).toBe("C");
  });

  test("keeps privacy NONE visible", () => {
    const ads = parseAds(undefined, {
      id: "none",
      tier: "NONE",
      reason_code: "guardrail",
      reason: "Sensitive category",
    });
    expect(normalizeOutcome(ads, "privacy_protected", "live", true)).toEqual({
      status: "privacy_protected",
      ads,
    });
  });

  test("clears opt-out, routing failure, and no-inventory outcomes", () => {
    const ad = (reasonCode: string) => [{
      id: reasonCode,
      tier: "C" as const,
      title: "Sponsor",
      body: "Body",
      label: "Sponsored",
      reasonCode,
    }];
    expect(normalizeOutcome(ad("user_opt_out"), "live", "live", true)).toEqual({
      status: "off",
      ads: [],
    });
    expect(normalizeOutcome(ad("routing_failure"), "live", "live", true)).toEqual({
      status: "degraded",
      ads: [],
    });
    expect(normalizeOutcome(ad("no_inventory"), "live", "live", true)).toEqual({
      status: "degraded",
      ads: [],
    });
  });

  test("creates a synthetic Tier C only for a non-failing mock outcome", () => {
    const result = normalizeOutcome([], "mock", "mock", true);
    expect(result.status).toBe("mock");
    expect(result.ads[0]?.tier).toBe("C");
    expect(normalizeOutcome([], "degraded", "mock", true).ads).toEqual([]);
  });
});

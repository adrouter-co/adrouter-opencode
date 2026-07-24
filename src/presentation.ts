import type {
  AdRouterAd,
  AdRouterProviderMetadataV1,
  AdRouterSettlement,
} from "./contracts.js";
import { sanitizeText } from "./transport/parse.js";

export const ADROUTER_PALETTE = {
  dark: { background: "#17364a", label: "#8fcfff" },
  light: { background: "#dcefff", label: "#1769aa" },
} as const;

function charWidth(char: string): number {
  const code = char.codePointAt(0) ?? 0;
  if (/\p{Mark}/u.test(char) || code === 0x200d || (code >= 0xfe00 && code <= 0xfe0f)) return 0;
  return (
    code >= 0x1100 &&
    (code <= 0x115f ||
      code === 0x2329 ||
      code === 0x232a ||
      (code >= 0x2e80 && code <= 0xa4cf) ||
      (code >= 0xac00 && code <= 0xd7a3) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe10 && code <= 0xfe19) ||
      (code >= 0xfe30 && code <= 0xfe6f) ||
      (code >= 0xff00 && code <= 0xff60) ||
      (code >= 0xffe0 && code <= 0xffe6) ||
      (code >= 0x1f300 && code <= 0x1faff) ||
      (code >= 0x20000 && code <= 0x3fffd))
  ) ? 2 : 1;
}

export function visibleWidth(value: string): number {
  return Array.from(sanitizeText(value)).reduce((width, char) => width + charWidth(char), 0);
}

export function truncateVisible(value: string, width: number): string {
  const text = sanitizeText(value);
  if (width <= 0) return "";
  if (visibleWidth(text) <= width) return text;
  if (width <= 3) return ".".repeat(width);
  const target = width - 3;
  let result = "";
  let used = 0;
  for (const char of text) {
    const next = charWidth(char);
    if (used + next > target) break;
    result += char;
    used += next;
  }
  return `${result}...`;
}

export function renderCompactAd(ad: AdRouterAd, width: number): string {
  const title = sanitizeText(ad.title);
  const body = sanitizeText(ad.body);
  const url = sanitizeText(ad.url);
  const content =
    ad.tier === "NONE"
      ? `No sponsored content — ${body}`
      : [title, body, url].filter(Boolean).join(" — ");
  return truncateVisible(`TIER ${ad.tier}: ${content}`, width);
}

export function formatSubsidy(amount: number): string {
  return amount < 0.01 ? amount.toFixed(6) : amount.toFixed(3);
}

export function tierACard(ad: AdRouterAd, settlement: AdRouterSettlement): {
  label: string;
  content: string;
  saved?: string;
} {
  const cta = sanitizeText(ad.cta);
  const url = sanitizeText(ad.url);
  return {
    label: `${sanitizeText(ad.label, "Sponsored")} · TIER A`,
    content: `${sanitizeText(ad.title)} — ${sanitizeText(ad.body)}${cta ? ` — ${cta}` : ""}${url ? ` ${url}` : ""}`,
    ...(typeof settlement.ad_subsidy === "number"
      ? { saved: `Saved $${formatSubsidy(settlement.ad_subsidy)}` }
      : {}),
  };
}

export function extractAdRouterMetadata(value: unknown): AdRouterProviderMetadataV1 | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const candidate = record.adrouter;
  if (candidate && typeof candidate === "object") {
    const snapshot = candidate as Partial<AdRouterProviderMetadataV1>;
    if (
      snapshot.version === 1 &&
      typeof snapshot.sequence === "number" &&
      typeof snapshot.phase === "string" &&
      typeof snapshot.status === "string" &&
      Array.isArray(snapshot.ads)
    ) {
      return snapshot as AdRouterProviderMetadataV1;
    }
  }
  for (const child of Object.values(record)) {
    const found = extractAdRouterMetadata(child);
    if (found) return found;
  }
  return undefined;
}

export class AdRouterPanelState {
  private sessionID: string | undefined;
  private current: AdRouterProviderMetadataV1 | undefined;
  private readonly settlements = new Map<string, number>();

  switchSession(sessionID: string | undefined, parts: Iterable<unknown> = []): void {
    if (sessionID === this.sessionID) return;
    this.sessionID = sessionID;
    this.current = undefined;
    this.settlements.clear();
    for (const part of parts) this.ingest(sessionID, part);
  }

  userTurn(sessionID: string): void {
    if (sessionID !== this.sessionID) return;
    this.current = undefined;
  }

  ingest(sessionID: string | undefined, part: unknown): void {
    if (!sessionID || sessionID !== this.sessionID) return;
    const snapshot = extractAdRouterMetadata(part);
    if (!snapshot) return;
    if (
      !this.current ||
      snapshot.turnId !== this.current.turnId ||
      snapshot.sequence >= this.current.sequence
    ) {
      this.current = snapshot;
    }
    const subsidy = snapshot.settlement?.ad_subsidy;
    if (snapshot.turnId && typeof subsidy === "number" && Number.isFinite(subsidy)) {
      this.settlements.set(snapshot.turnId, subsidy);
    }
  }

  snapshot(): AdRouterProviderMetadataV1 | undefined {
    return this.current;
  }

  cumulativeSavings(): number {
    let total = 0;
    for (const amount of this.settlements.values()) total += amount;
    return total;
  }
}

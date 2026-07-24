export function sanitizeText(value, fallback = "") {
    return String(value ?? fallback)
        .replace(/\x1b(?:\[[0-?]*[ -/]*[@-~]|\][^\u0007]*(?:\u0007|\x1b\\))/g, "")
        .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
        .trim();
}
function tier(value) {
    if (value === 1 || value === "1" || value === "A")
        return "A";
    if (value === 2 || value === "2" || value === "B")
        return "B";
    if (value === 3 || value === "3" || value === "C")
        return "C";
    if (value === "NONE")
        return "NONE";
    return undefined;
}
function parseAdRecord(value, raw = false) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return [];
    const record = value;
    const normalizedTier = tier(record.tier) ?? (raw ? undefined : "C");
    if (!normalizedTier)
        return [];
    const sponsor = record.sponsor && typeof record.sponsor === "object"
        ? record.sponsor
        : undefined;
    if (normalizedTier === "NONE") {
        return [{
                id: sanitizeText(record.id, "ad-none"),
                tier: "NONE",
                ...(sanitizeText(record.campaign_id) ? { campaignId: sanitizeText(record.campaign_id) } : {}),
                ...(sanitizeText(record.reason_code) ? { reasonCode: sanitizeText(record.reason_code) } : {}),
                title: "No sponsored content",
                body: sanitizeText(record.reason ?? record.body, "Routed without sponsored content."),
                label: "TIER NONE",
            }];
    }
    const title = sanitizeText(record.title ?? sponsor?.brand_name);
    const body = sanitizeText(record.body ?? sponsor?.ad_copy);
    const url = sanitizeText(record.url ?? sponsor?.click_url);
    return [{
            id: sanitizeText(record.id, "ad-sponsor"),
            tier: normalizedTier,
            ...(sanitizeText(record.campaign_id) ? { campaignId: sanitizeText(record.campaign_id) } : {}),
            ...(sanitizeText(record.reason_code) ? { reasonCode: sanitizeText(record.reason_code) } : {}),
            title: title || "No sponsor content available",
            body: body || sanitizeText(record.reason, "Baseline routing fallback."),
            ...(sanitizeText(record.cta, url ? "Learn more" : "") ? { cta: sanitizeText(record.cta, "Learn more") } : {}),
            ...(url ? { url } : {}),
            label: sanitizeText(record.label, "Sponsored") || "Sponsored",
        }];
}
export function parseAds(ads, rawAd) {
    if (Array.isArray(ads)) {
        const parsed = ads.flatMap((value) => parseAdRecord(value));
        if (parsed.length)
            return parsed;
    }
    return parseAdRecord(rawAd, true);
}
export function normalizeOutcome(ads, statusValue, adMode, adsEnabled) {
    const backendStatus = ["live", "mock", "off", "privacy_protected", "degraded"].includes(String(statusValue))
        ? statusValue
        : undefined;
    const reasons = new Set(ads.map((ad) => ad.reasonCode));
    if (!adsEnabled || backendStatus === "off" || reasons.has("user_opt_out"))
        return { ads: [], status: "off" };
    if (backendStatus === "degraded" || reasons.has("routing_failure") || reasons.has("no_inventory")) {
        return { ads: [], status: "degraded" };
    }
    if (backendStatus === "privacy_protected" || reasons.has("guardrail")) {
        return { ads: ads.filter((ad) => ad.tier === "NONE"), status: "privacy_protected" };
    }
    if (ads.length)
        return { ads, status: backendStatus === "mock" ? "mock" : "live" };
    if (backendStatus === "mock" || adMode === "mock") {
        return {
            status: "mock",
            ads: [{
                    id: "mock-tier-3-001",
                    tier: "C",
                    title: "Developer Tooling",
                    body: "Mock sponsored message for validating the AdRouter OpenCode panel.",
                    cta: "Learn more",
                    url: "https://example.com",
                    label: "Sponsored",
                }],
        };
    }
    return { ads: [], status: "degraded" };
}
export function parseInjection(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return undefined;
    const result = {};
    for (const [key, candidate] of Object.entries(value)) {
        if (typeof candidate === "string")
            result[key] = sanitizeText(candidate);
        else if (typeof candidate === "boolean" || typeof candidate === "number")
            result[key] = candidate;
    }
    return Object.keys(result).length ? result : undefined;
}
export function parseSettlement(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return undefined;
    const result = {};
    for (const [key, candidate] of Object.entries(value)) {
        if (typeof candidate === "number" && Number.isFinite(candidate))
            result[key] = candidate;
        else if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
            const numbers = Object.fromEntries(Object.entries(candidate).filter((entry) => typeof entry[1] === "number"));
            if (Object.keys(numbers).length)
                result[key] = numbers;
        }
        else if (typeof candidate === "string")
            result[key] = sanitizeText(candidate);
    }
    return Object.keys(result).length ? result : undefined;
}
function finite(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
export function parseUsage(value) {
    const raw = value && typeof value === "object" ? value : {};
    const input = finite(raw.inputTokens) ?? finite(raw.input) ?? finite(raw.prompt_tokens) ?? 0;
    const output = finite(raw.outputTokens) ?? finite(raw.output) ?? finite(raw.completion_tokens) ?? 0;
    const cached = finite(raw.cachedInputTokens) ?? finite(raw.cacheRead) ?? finite(raw.cache_read_tokens);
    const reasoning = finite(raw.reasoningTokens) ?? finite(raw.reasoning_tokens);
    const total = finite(raw.totalTokens) ?? finite(raw.total_tokens) ?? input + output;
    return {
        sdk: {
            inputTokens: { total: input, noCache: Math.max(0, input - (cached ?? 0)), cacheRead: cached, cacheWrite: undefined },
            outputTokens: { total: output, text: reasoning === undefined ? output : Math.max(0, output - reasoning), reasoning },
            raw: raw,
        },
        public: {
            inputTokens: input,
            outputTokens: output,
            totalTokens: total,
            ...(cached === undefined ? {} : { cachedInputTokens: cached }),
            ...(reasoning === undefined ? {} : { reasoningTokens: reasoning }),
        },
    };
}
export function parseToolCalls(value) {
    if (!Array.isArray(value))
        return [];
    return value.flatMap((item) => {
        if (!item || typeof item !== "object")
            return [];
        const record = item;
        const fn = record.function && typeof record.function === "object"
            ? record.function
            : undefined;
        const id = sanitizeText(record.id);
        const name = sanitizeText(record.name ?? fn?.name);
        if (!id)
            throw new Error("AdRouter returned a tool call without a stable ID.");
        if (!name)
            throw new Error(`AdRouter returned tool call ${id} without a name.`);
        const args = record.arguments ?? fn?.arguments ?? {};
        let input;
        if (typeof args === "string") {
            try {
                input = JSON.stringify(JSON.parse(args));
            }
            catch {
                throw new Error(`AdRouter returned malformed arguments for tool call ${id}.`);
            }
        }
        else {
            input = JSON.stringify(args);
        }
        return [{ id, name, input }];
    });
}
export function turnId(payload) {
    if (typeof payload.turn_id === "string" && payload.turn_id)
        return payload.turn_id;
    if (payload.ad && typeof payload.ad === "object") {
        const value = payload.ad.turn_id;
        if (typeof value === "string" && value)
            return value;
    }
    return undefined;
}
export function metadata(snapshot) {
    return { adrouter: snapshot };
}
export function assistantContent(payload) {
    const text = typeof payload.assistant?.content === "string" ? payload.assistant.content : "";
    const reasoning = typeof payload.assistant?.reasoning_content === "string" ? payload.assistant.reasoning_content : "";
    const tools = parseToolCalls(payload.assistant?.tool_calls ?? payload.assistant?.toolCalls);
    return {
        text,
        reasoning,
        tools,
        content: [
            ...(reasoning ? [{ type: "reasoning", text: reasoning }] : []),
            ...(text ? [{ type: "text", text }] : []),
            ...tools.map((tool) => ({
                type: "tool-call",
                toolCallId: tool.id,
                toolName: tool.name,
                input: tool.input,
            })),
        ],
    };
}
export function finishReason(hasTools) {
    return { unified: hasTools ? "tool-calls" : "stop", raw: hasTools ? "tool_calls" : "stop" };
}
export async function* ndjsonLines(body) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            buffer += decoder.decode(value, { stream: true });
            let index = buffer.indexOf("\n");
            while (index >= 0) {
                const line = buffer.slice(0, index).replace(/\r$/, "").trim();
                buffer = buffer.slice(index + 1);
                if (line)
                    yield JSON.parse(line);
                index = buffer.indexOf("\n");
            }
        }
        buffer += decoder.decode();
        const finalLine = buffer.replace(/\r$/, "").trim();
        if (finalLine)
            yield JSON.parse(finalLine);
    }
    finally {
        reader.releaseLock();
    }
}
//# sourceMappingURL=parse.js.map
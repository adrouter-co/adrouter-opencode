import { resolveConfig } from "./transport/config.js";
import { assistantContent, finishReason, metadata, ndjsonLines, normalizeOutcome, parseAds, parseInjection, parseSettlement, parseToolCalls, parseUsage, sanitizeText, turnId, } from "./transport/parse.js";
import { buildNativeContext } from "./transport/prompt.js";
const EMPTY_USAGE = {
    inputTokens: { total: 0, noCache: 0, cacheRead: undefined, cacheWrite: undefined },
    outputTokens: { total: 0, text: 0, reasoning: undefined },
};
const EMPTY_PUBLIC_USAGE = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
function initialState() {
    return {
        snapshot: { version: 1, sequence: 0, phase: "streaming", status: "degraded", ads: [] },
        text: "",
        reasoning: "",
        textStarted: false,
        reasoningStarted: false,
        attachedMetadata: false,
        done: false,
        usage: EMPTY_USAGE,
        publicUsage: EMPTY_PUBLIC_USAGE,
        tools: new Map(),
    };
}
function nextSnapshot(state, patch) {
    state.snapshot = {
        ...state.snapshot,
        ...patch,
        version: 1,
        sequence: state.snapshot.sequence + 1,
    };
}
function firstMetadata(state) {
    if (state.attachedMetadata)
        return undefined;
    state.attachedMetadata = true;
    return metadata(state.snapshot);
}
function reasoningLevel(options) {
    const provider = options.providerOptions?.adrouter;
    const value = provider?.thinkingLevel ?? provider?.reasoning;
    if (value === "none" || value === "off" || value === "minimal")
        return "none";
    if (value === "high" || value === "xhigh" || value === "max")
        return "high";
    return "medium";
}
function bodyFor(requestedModel, config, call) {
    return {
        model: config.model || requestedModel,
        thinking_level: reasoningLevel(call),
        ...(config.runtimeMode ? { runtime_mode: config.runtimeMode } : {}),
        context: buildNativeContext(call),
        metadata: {
            client: "adrouter-opencode",
            workspace: config.workspace,
            ad_mode: config.adMode,
            ads_enabled: config.adsEnabled,
            min_ad_tier: config.minimumTier,
        },
        max_output_tokens: config.maxOutputTokens,
    };
}
async function providerError(response) {
    let message = "";
    try {
        const value = await response.text();
        try {
            const parsed = JSON.parse(value);
            message = sanitizeText(parsed.error ?? parsed.message);
        }
        catch {
            message = sanitizeText(value);
        }
    }
    catch {
        // Ignore an unreadable error response.
    }
    const safe = message.slice(0, 500) || response.statusText || "request failed";
    return new Error(`AdRouter request failed (${response.status}): ${safe}`);
}
async function request(requestedModel, providerOptions, call) {
    const config = resolveConfig(requestedModel, providerOptions, call.maxOutputTokens);
    const headers = new Headers(config.headers);
    for (const [key, value] of Object.entries(call.headers ?? {})) {
        if (value !== undefined && key.toLowerCase() !== "authorization")
            headers.set(key, value);
    }
    const response = await config.fetch(`${config.baseURL}/v1/agent/turn`, {
        method: "POST",
        headers,
        body: JSON.stringify(bodyFor(requestedModel, config, call)),
        ...(call.abortSignal ? { signal: call.abortSignal } : {}),
    });
    if (!response.ok)
        throw await providerError(response);
    return { response, config };
}
function enqueueText(controller, state, delta) {
    if (!delta)
        return;
    if (!state.textStarted) {
        state.textStarted = true;
        const providerMetadata = firstMetadata(state);
        controller.enqueue({
            type: "text-start",
            id: "adrouter-text",
            ...(providerMetadata ? { providerMetadata } : {}),
        });
    }
    state.text += delta;
    controller.enqueue({ type: "text-delta", id: "adrouter-text", delta });
}
function enqueueReasoning(controller, state, delta) {
    if (!delta)
        return;
    if (!state.reasoningStarted) {
        state.reasoningStarted = true;
        const providerMetadata = firstMetadata(state);
        controller.enqueue({
            type: "reasoning-start",
            id: "adrouter-reasoning",
            ...(providerMetadata ? { providerMetadata } : {}),
        });
    }
    state.reasoning += delta;
    controller.enqueue({ type: "reasoning-delta", id: "adrouter-reasoning", delta });
}
function enqueueTool(controller, state, tool) {
    const prior = state.tools.get(tool.id);
    if (prior) {
        if (prior.name !== tool.name || prior.input !== tool.input) {
            throw new Error(`AdRouter returned conflicting tool calls with ID ${tool.id}.`);
        }
        return;
    }
    state.tools.set(tool.id, tool);
    const providerMetadata = firstMetadata(state);
    controller.enqueue({
        type: "tool-input-start",
        id: tool.id,
        toolName: tool.name,
        ...(providerMetadata ? { providerMetadata } : {}),
    });
    controller.enqueue({ type: "tool-input-delta", id: tool.id, delta: tool.input });
    controller.enqueue({ type: "tool-input-end", id: tool.id });
    controller.enqueue({
        type: "tool-call",
        toolCallId: tool.id,
        toolName: tool.name,
        input: tool.input,
    });
}
function reconcile(current, authoritative, label, emit) {
    if (!authoritative || authoritative === current)
        return;
    if (!authoritative.startsWith(current)) {
        throw new Error(`AdRouter ${label} snapshot diverged from the streamed ${label}.`);
    }
    emit(authoritative.slice(current.length));
}
function applyAd(state, payload, config) {
    const outcome = normalizeOutcome(parseAds(payload.ads, payload.ad), payload.status, config.adMode, config.adsEnabled);
    const id = turnId(payload);
    const injection = parseInjection(payload.injection);
    nextSnapshot(state, {
        phase: "routed",
        status: outcome.status,
        ads: outcome.ads,
        ...(id ? { turnId: id } : {}),
        ...(injection ? { injection } : {}),
    });
}
function applySettlement(state, payload) {
    const usage = parseUsage(payload.usage);
    state.usage = usage.sdk;
    state.publicUsage = usage.public;
    const id = turnId(payload);
    const settlement = parseSettlement(payload.settlement);
    nextSnapshot(state, {
        phase: "settled",
        ...(id ? { turnId: id } : {}),
        ...(settlement ? { settlement } : {}),
        usage: usage.public,
    });
}
function emitPayload(controller, state, payload, config) {
    switch (payload.type) {
        case "ad":
            applyAd(state, payload, config);
            return;
        case "text":
            enqueueText(controller, state, typeof (payload.content ?? payload.delta) === "string"
                ? String(payload.content ?? payload.delta)
                : "");
            return;
        case "thinking":
            enqueueReasoning(controller, state, typeof (payload.content ?? payload.delta) === "string"
                ? String(payload.content ?? payload.delta)
                : "");
            return;
        case "tool_call":
            for (const tool of parseToolCalls([payload.tool_call]))
                enqueueTool(controller, state, tool);
            return;
        case "settlement":
            applySettlement(state, payload);
            return;
        case "done": {
            const final = assistantContent(payload);
            reconcile(state.reasoning, final.reasoning, "reasoning", (suffix) => enqueueReasoning(controller, state, suffix));
            reconcile(state.text, final.text, "text", (suffix) => enqueueText(controller, state, suffix));
            for (const tool of final.tools)
                enqueueTool(controller, state, tool);
            state.done = true;
            nextSnapshot(state, { phase: "done" });
            return;
        }
        case "error": {
            const message = sanitizeText(payload.message, "AdRouter stream error");
            nextSnapshot(state, { phase: "error", status: "degraded", ads: [], error: message });
            throw new Error(message);
        }
        default:
            return;
    }
}
function finishStream(controller, state) {
    const finalMetadata = metadata(state.snapshot);
    if (state.reasoningStarted) {
        controller.enqueue({
            type: "reasoning-end",
            id: "adrouter-reasoning",
            ...(!state.textStarted ? { providerMetadata: finalMetadata } : {}),
        });
    }
    if (state.textStarted) {
        controller.enqueue({ type: "text-end", id: "adrouter-text", providerMetadata: finalMetadata });
    }
    else if (!state.reasoningStarted) {
        // OpenCode persists provider metadata on content parts. An empty text part is
        // a display-neutral carrier for tool-only and otherwise empty responses.
        controller.enqueue({ type: "text-start", id: "adrouter-metadata", providerMetadata: finalMetadata });
        controller.enqueue({ type: "text-end", id: "adrouter-metadata", providerMetadata: finalMetadata });
    }
    controller.enqueue({
        type: "finish",
        usage: state.usage,
        finishReason: state.snapshot.phase === "error"
            ? { unified: "error", raw: "error" }
            : finishReason(state.tools.size > 0),
        providerMetadata: finalMetadata,
    });
}
function errorStream(error) {
    const message = sanitizeText(error instanceof Error ? error.message : error, "AdRouter request failed");
    const snapshot = {
        version: 1,
        sequence: 1,
        phase: "error",
        status: "degraded",
        ads: [],
        error: message,
    };
    return {
        stream: new ReadableStream({
            start(controller) {
                controller.enqueue({ type: "stream-start", warnings: [] });
                controller.enqueue({ type: "error", error: new Error(message) });
                controller.enqueue({
                    type: "finish",
                    usage: EMPTY_USAGE,
                    finishReason: { unified: "error", raw: "error" },
                    providerMetadata: metadata(snapshot),
                });
                controller.close();
            },
        }),
    };
}
async function streamModel(requestedModel, providerOptions, call) {
    let requested;
    try {
        requested = await request(requestedModel, providerOptions, call);
    }
    catch (error) {
        return errorStream(error);
    }
    const { response, config } = requested;
    const responseHeaders = Object.fromEntries(response.headers.entries());
    return {
        response: { headers: responseHeaders },
        stream: new ReadableStream({
            async start(controller) {
                const state = initialState();
                controller.enqueue({ type: "stream-start", warnings: [] });
                try {
                    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
                    if (contentType.includes("application/x-ndjson") && response.body) {
                        for await (const payload of ndjsonLines(response.body))
                            emitPayload(controller, state, payload, config);
                        if (!state.done)
                            throw new Error("AdRouter stream ended without an authoritative done event.");
                    }
                    else {
                        const payload = await response.json();
                        applyAd(state, payload, config);
                        if (payload.settlement || payload.usage)
                            applySettlement(state, payload);
                        const final = assistantContent(payload);
                        enqueueReasoning(controller, state, final.reasoning);
                        enqueueText(controller, state, final.text);
                        for (const tool of final.tools)
                            enqueueTool(controller, state, tool);
                        state.done = true;
                        nextSnapshot(state, { phase: "done" });
                    }
                    finishStream(controller, state);
                }
                catch (error) {
                    const message = sanitizeText(error instanceof Error ? error.message : error, "AdRouter protocol error");
                    nextSnapshot(state, { phase: "error", status: "degraded", ads: [], error: message });
                    controller.enqueue({ type: "error", error: new Error(message) });
                    finishStream(controller, state);
                }
                finally {
                    controller.close();
                }
            },
        }),
    };
}
async function generateModel(model, call) {
    const { stream, response } = await model.doStream(call);
    const content = [];
    const indexes = new Map();
    let usage = EMPTY_USAGE;
    let finish = finishReason(false);
    let providerMetadata;
    const reader = stream.getReader();
    while (true) {
        const item = await reader.read();
        if (item.done)
            break;
        const part = item.value;
        if (part.type === "text-start") {
            indexes.set(`text:${part.id}`, content.length);
            content.push({
                type: "text",
                text: "",
                ...(part.providerMetadata ? { providerMetadata: part.providerMetadata } : {}),
            });
        }
        else if (part.type === "text-delta") {
            const index = indexes.get(`text:${part.id}`);
            const current = index === undefined ? undefined : content[index];
            if (current?.type === "text")
                current.text += part.delta;
        }
        else if (part.type === "text-end") {
            const index = indexes.get(`text:${part.id}`);
            const current = index === undefined ? undefined : content[index];
            if (current?.type === "text" && part.providerMetadata)
                current.providerMetadata = part.providerMetadata;
        }
        else if (part.type === "reasoning-start") {
            indexes.set(`reasoning:${part.id}`, content.length);
            content.push({
                type: "reasoning",
                text: "",
                ...(part.providerMetadata ? { providerMetadata: part.providerMetadata } : {}),
            });
        }
        else if (part.type === "reasoning-delta") {
            const index = indexes.get(`reasoning:${part.id}`);
            const current = index === undefined ? undefined : content[index];
            if (current?.type === "reasoning")
                current.text += part.delta;
        }
        else if (part.type === "reasoning-end") {
            const index = indexes.get(`reasoning:${part.id}`);
            const current = index === undefined ? undefined : content[index];
            if (current?.type === "reasoning" && part.providerMetadata)
                current.providerMetadata = part.providerMetadata;
        }
        else if (part.type === "tool-call") {
            content.push(part);
        }
        else if (part.type === "finish") {
            usage = part.usage;
            finish = part.finishReason;
            providerMetadata = part.providerMetadata;
        }
        else if (part.type === "error") {
            throw part.error;
        }
    }
    reader.releaseLock();
    return {
        content: content.filter((part) => !((part.type === "text" || part.type === "reasoning") && part.text.length === 0)),
        usage,
        finishReason: finish,
        ...(providerMetadata ? { providerMetadata } : {}),
        ...(response
            ? { response: { ...(response.headers ? { headers: response.headers } : {}) } }
            : {}),
        warnings: [],
    };
}
export function createAdRouter(options = {}) {
    return {
        specificationVersion: "v3",
        languageModel(modelId) {
            const model = {
                specificationVersion: "v3",
                provider: "adrouter",
                modelId,
                supportedUrls: {},
                doStream: (call) => streamModel(modelId, options, call),
                doGenerate: (call) => generateModel(model, call),
            };
            return model;
        },
    };
}
//# sourceMappingURL=provider.js.map
function toolOutput(output) {
    switch (output.type) {
        case "text":
        case "json":
            return { content: output.value, isError: false };
        case "error-text":
        case "error-json":
            return { content: output.value, isError: true };
        case "execution-denied":
            return { content: output.reason ?? "Tool execution denied", isError: true };
        case "content": {
            if (output.value.some((part) => part.type !== "text")) {
                throw new Error("AdRouter does not support file or image tool results.");
            }
            return {
                content: output.value.map((part) => (part.type === "text" ? part.text : "")).join("\n"),
                isError: false,
            };
        }
    }
}
function normalizeAssistant(message, calls) {
    const content = [];
    for (const part of message.content) {
        if (part.type === "file")
            throw new Error("AdRouter does not support file or image prompt parts.");
        if (part.type === "tool-result") {
            throw new Error("Assistant tool results are not supported by the AdRouter transport.");
        }
        if (part.type === "text")
            content.push({ type: "text", text: part.text });
        if (part.type === "reasoning")
            content.push({ type: "thinking", thinking: part.text });
        if (part.type === "tool-call") {
            if (!part.toolCallId || !part.toolName)
                throw new Error("AdRouter tool calls require stable IDs and names.");
            const signature = JSON.stringify({ name: part.toolName, input: part.input });
            const prior = calls.get(part.toolCallId);
            if (prior && prior !== signature) {
                throw new Error(`Conflicting tool calls reuse ID ${part.toolCallId} in AdRouter context.`);
            }
            if (prior)
                continue;
            calls.set(part.toolCallId, signature);
            const call = {
                type: "toolCall",
                id: part.toolCallId,
                name: part.toolName,
                arguments: part.input,
            };
            content.push({ ...call });
        }
    }
    return { role: "assistant", content };
}
export function buildNativeContext(options) {
    const systems = [];
    const messages = [];
    const calls = new Map();
    const results = new Map();
    for (const message of options.prompt) {
        if (message.role === "system") {
            systems.push(message.content);
            continue;
        }
        if (message.role === "user") {
            const text = [];
            for (const part of message.content) {
                if (part.type === "file")
                    throw new Error("AdRouter does not support file or image prompt parts.");
                text.push(part.text);
            }
            messages.push({ role: "user", content: text.join("\n") });
            continue;
        }
        if (message.role === "assistant") {
            messages.push(normalizeAssistant(message, calls));
            continue;
        }
        for (const part of message.content) {
            if (part.type === "tool-approval-response") {
                throw new Error("AdRouter does not support provider-executed tool approvals.");
            }
            const parsed = toolOutput(part.output);
            const signature = JSON.stringify({
                toolName: part.toolName,
                content: parsed.content,
                isError: parsed.isError,
            });
            const prior = results.get(part.toolCallId);
            if (prior && prior !== signature) {
                throw new Error(`Conflicting tool results reuse ID ${part.toolCallId} in AdRouter context.`);
            }
            if (prior)
                continue;
            results.set(part.toolCallId, signature);
            messages.push({
                role: "toolResult",
                toolCallId: part.toolCallId,
                toolName: part.toolName,
                content: parsed.content,
                isError: parsed.isError,
            });
        }
    }
    const tools = options.tools?.map((tool) => {
        if (tool.type !== "function")
            throw new Error("AdRouter only supports function tools.");
        return {
            name: tool.name,
            description: tool.description,
            parameters: tool.inputSchema,
        };
    });
    return {
        ...(systems.length ? { systemPrompt: systems.join("\n\n") } : {}),
        messages,
        ...(tools?.length ? { tools } : {}),
    };
}
//# sourceMappingURL=prompt.js.map
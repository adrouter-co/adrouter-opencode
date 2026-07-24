import { jsx as _jsx, jsxs as _jsxs } from "@opentui/solid/jsx-runtime";
import { createSignal } from "solid-js";
import { ADROUTER_PALETTE, AdRouterPanelState, formatSubsidy, renderCompactAd, tierACard, } from "./presentation.js";
const tui = async (api) => {
    const state = new AdRouterPanelState();
    const [revision, setRevision] = createSignal(0);
    function routeSession() {
        const current = api.route.current;
        if (current.name !== "session" || !current.params)
            return undefined;
        return typeof current.params.sessionID === "string" ? current.params.sessionID : undefined;
    }
    function allParts(sessionID) {
        if (!sessionID)
            return [];
        return api.state.session.messages(sessionID).flatMap((message) => [...api.state.part(message.id)]);
    }
    function refreshSession() {
        const sessionID = routeSession();
        state.switchSession(sessionID, allParts(sessionID));
        return sessionID;
    }
    function changed() {
        setRevision((value) => value + 1);
    }
    api.event.on("message.part.updated", (event) => {
        const sessionID = refreshSession();
        state.ingest(event.properties.sessionID, event.properties.part);
        if (sessionID === event.properties.sessionID)
            changed();
    });
    api.event.on("message.updated", (event) => {
        refreshSession();
        if (event.properties.info.role === "user") {
            state.userTurn(event.properties.sessionID);
            changed();
        }
    });
    api.event.on("session.updated", () => {
        refreshSession();
        changed();
    });
    api.slots.register({
        order: 900,
        slots: {
            app_bottom: () => {
                revision();
                refreshSession();
                const snapshot = state.snapshot();
                const savings = state.cumulativeSavings();
                if (!snapshot ||
                    snapshot.status === "off" ||
                    snapshot.status === "degraded" ||
                    !snapshot.ads[0]) {
                    return null;
                }
                const ad = snapshot.ads[0];
                const width = Math.max(0, api.renderer.width);
                const palette = ADROUTER_PALETTE[api.theme.mode()];
                const settledTierA = ad.tier === "A" && snapshot.phase !== "streaming" && snapshot.settlement;
                const card = settledTierA ? tierACard(ad, snapshot.settlement) : undefined;
                return (_jsxs("box", { flexDirection: "column", children: [_jsx("text", { fg: palette.label, children: renderCompactAd(ad, width) }), card ? (_jsxs("box", { flexDirection: "column", backgroundColor: palette.background, paddingLeft: 1, paddingRight: 1, children: [_jsx("text", { fg: palette.label, children: card.label }), _jsx("text", { children: card.content }), card.saved ? _jsx("text", { fg: palette.label, children: card.saved }) : null] })) : null, savings > 0 ? _jsx("text", { fg: palette.label, children: `saved $${formatSubsidy(savings)}` }) : null] }));
            },
        },
    });
};
const plugin = {
    id: "adrouter",
    tui,
};
export default plugin;
//# sourceMappingURL=tui.js.map
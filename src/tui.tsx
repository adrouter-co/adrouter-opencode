/** @jsxImportSource @opentui/solid */
import type { Part } from "@opencode-ai/sdk/v2";
import type { TuiPlugin, TuiPluginModule } from "@opencode-ai/plugin/tui";
import { createSignal } from "solid-js";
import {
  ADROUTER_PALETTE,
  AdRouterPanelState,
  formatSubsidy,
  renderCompactAd,
  tierACard,
} from "./presentation.js";

const tui: TuiPlugin = async (api) => {
  const state = new AdRouterPanelState();
  const [revision, setRevision] = createSignal(0);

  function routeSession(): string | undefined {
    const current = api.route.current;
    if (current.name !== "session" || !current.params) return undefined;
    return typeof current.params.sessionID === "string" ? current.params.sessionID : undefined;
  }

  function allParts(sessionID: string | undefined): Part[] {
    if (!sessionID) return [];
    return api.state.session.messages(sessionID).flatMap((message) => [...api.state.part(message.id)]);
  }

  function refreshSession(): string | undefined {
    const sessionID = routeSession();
    state.switchSession(sessionID, allParts(sessionID));
    return sessionID;
  }

  function changed(): void {
    setRevision((value) => value + 1);
  }

  api.event.on("message.part.updated", (event) => {
    const sessionID = refreshSession();
    state.ingest(event.properties.sessionID, event.properties.part);
    if (sessionID === event.properties.sessionID) changed();
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
        if (
          !snapshot ||
          snapshot.status === "off" ||
          snapshot.status === "degraded" ||
          !snapshot.ads[0]
        ) {
          return null;
        }
        const ad = snapshot.ads[0];
        const width = Math.max(0, api.renderer.width);
        const palette = ADROUTER_PALETTE[api.theme.mode()];
        const settledTierA = ad.tier === "A" && snapshot.phase !== "streaming" && snapshot.settlement;
        const card = settledTierA ? tierACard(ad, snapshot.settlement!) : undefined;
        return (
          <box flexDirection="column">
            <text fg={palette.label}>{renderCompactAd(ad, width)}</text>
            {card ? (
              <box
                flexDirection="column"
                backgroundColor={palette.background}
                paddingLeft={1}
                paddingRight={1}
              >
                <text fg={palette.label}>{card.label}</text>
                <text>{card.content}</text>
                {card.saved ? <text fg={palette.label}>{card.saved}</text> : null}
              </box>
            ) : null}
            {savings > 0 ? <text fg={palette.label}>{`saved $${formatSubsidy(savings)}`}</text> : null}
          </box>
        );
      },
    },
  });
};

const plugin: TuiPluginModule & { id: string } = {
  id: "adrouter",
  tui,
};

export default plugin;

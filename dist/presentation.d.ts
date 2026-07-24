import type { AdRouterAd, AdRouterProviderMetadataV1, AdRouterSettlement } from "./contracts.js";
export declare const ADROUTER_PALETTE: {
    readonly dark: {
        readonly background: "#17364a";
        readonly label: "#8fcfff";
    };
    readonly light: {
        readonly background: "#dcefff";
        readonly label: "#1769aa";
    };
};
export declare function visibleWidth(value: string): number;
export declare function truncateVisible(value: string, width: number): string;
export declare function renderCompactAd(ad: AdRouterAd, width: number): string;
export declare function formatSubsidy(amount: number): string;
export declare function tierACard(ad: AdRouterAd, settlement: AdRouterSettlement): {
    label: string;
    content: string;
    saved?: string;
};
export declare function extractAdRouterMetadata(value: unknown): AdRouterProviderMetadataV1 | undefined;
export declare class AdRouterPanelState {
    private sessionID;
    private current;
    private readonly settlements;
    switchSession(sessionID: string | undefined, parts?: Iterable<unknown>): void;
    userTurn(sessionID: string): void;
    ingest(sessionID: string | undefined, part: unknown): void;
    snapshot(): AdRouterProviderMetadataV1 | undefined;
    cumulativeSavings(): number;
}
//# sourceMappingURL=presentation.d.ts.map
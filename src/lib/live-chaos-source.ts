import type { EventPhase } from "./chaos-simulation";
import { readMarketSnapshot } from "./market-client.ts";
import type { MarketSnapshot } from "./market-types";

export interface LiveChaosSnapshot {
  provenance: "unconfigured" | "mock" | "verified" | "market-data";
  chaosIndex: number | null;
  phase: EventPhase;
  selectedToken: string | null;
  cycle: number | null;
  observedAt: string | null;
  transaction: string | null;
  market?: MarketSnapshot;
}

// Read-only by design: no trigger, selection, wallet, signing, or distribution methods.
// The future Solana program owns all financial transitions. The website observes them.
export interface LiveChaosSource {
  readSnapshot(signal: AbortSignal): Promise<LiveChaosSnapshot>;
}

export const unavailableSnapshot: LiveChaosSnapshot = {
  provenance: "unconfigured", chaosIndex: null, phase: "measuring",
  selectedToken: null, cycle: null, observedAt: null, transaction: null,
};

// DEX Screener is an off-chain data provider, not direct on-chain verification.
// Backend threshold events are explicitly simulated and never initiate distributions.
export const liveChaosSource: LiveChaosSource = {
  async readSnapshot(signal) {
    const market = await readMarketSnapshot(signal);
    const usable = market.lastUpdate !== null && market.status !== "stale" && market.status !== "unavailable";
    return { provenance: "market-data", chaosIndex: usable ? market.chaosIndex : null,
      phase: usable && market.eventStatus === "SIMULATED_CHAOS_EVENT_TRIGGERED" ? "triggered" : "measuring",
      selectedToken: null, cycle: null, observedAt: market.lastUpdate, transaction: null, market };
  },
};

export function validateLiveSnapshot(snapshot: LiveChaosSnapshot): LiveChaosSnapshot {
  if (snapshot.chaosIndex !== null && (!Number.isFinite(snapshot.chaosIndex) || snapshot.chaosIndex < 0 || snapshot.chaosIndex > 100)) {
    throw new Error("Invalid Chaos Index from read-only source");
  }
  if (snapshot.provenance === "unconfigured") return unavailableSnapshot;
  return snapshot;
}

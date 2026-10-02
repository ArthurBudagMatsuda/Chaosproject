import type { MarketSnapshot } from "./market-types";

let cached: { at: number; snapshot: MarketSnapshot } | null = null;
let pending: Promise<MarketSnapshot> | null = null;

export async function readMarketSnapshot(signal?: AbortSignal): Promise<MarketSnapshot> {
  if (!cached || Date.now() - cached.at > 10_000) {
    pending ??= fetch("/api/chaos", { cache: "no-store", signal: AbortSignal.timeout(15_000) }).then(async response => {
      if (!response.ok) throw new Error("Market API unavailable");
      const snapshot = await response.json() as MarketSnapshot;
      if (snapshot.schemaVersion !== 1 || snapshot.provenance !== "dexscreener" || !Array.isArray(snapshot.eligibleTokens) || !Array.isArray(snapshot.events) || (snapshot.chaosIndex !== null && (!Number.isFinite(snapshot.chaosIndex) || snapshot.chaosIndex < 0 || snapshot.chaosIndex > 100))) throw new Error("Invalid market snapshot");
      cached = { at: Date.now(), snapshot };
      return snapshot;
    }).finally(() => { pending = null; });
    await pending;
  }
  if (signal?.aborted) throw new DOMException("Market read cancelled", "AbortError");
  return cached!.snapshot;
}

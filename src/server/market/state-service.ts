import type { ScannerState } from "../../lib/market-types.ts";
import { BlobMarketStore, hasBlobMarketStore, isConcurrentBlobWrite } from "./blob-store.ts";
import type { MarketConfig } from "./config.ts";
import { DexClient } from "./dex-client.ts";
import { scanMarket } from "./scanner.ts";
import { MarketStore } from "./store.ts";

export const SERVERLESS_REFRESH_MS = 30 * 60_000;

type MarketStateResult = { state: ScannerState; storage: "local-json" | "vercel-blob" };
type RefreshGlobals = typeof globalThis & { chaosMarketRefresh?: Promise<ScannerState> };

export function stateNeedsRefresh(state: ScannerState, now = Date.now(), refreshMs = SERVERLESS_REFRESH_MS) {
  const timestamp = state.snapshot.lastAttempt ?? state.snapshot.lastUpdate;
  return !timestamp || !Number.isFinite(Date.parse(timestamp)) || now - Date.parse(timestamp) >= refreshMs;
}

export async function readMarketState(config: MarketConfig): Promise<MarketStateResult> {
  if (!hasBlobMarketStore()) return { state: await new MarketStore(config).read(config), storage: "local-json" };
  return { state: (await new BlobMarketStore().read(config)).state, storage: "vercel-blob" };
}

export function refreshBlobMarketState(config: MarketConfig): Promise<ScannerState> {
  const globals = globalThis as RefreshGlobals;
  globals.chaosMarketRefresh ??= refresh(config).finally(() => { globals.chaosMarketRefresh = undefined; });
  return globals.chaosMarketRefresh;
}

async function refresh(config: MarketConfig): Promise<ScannerState> {
  const store = new BlobMarketStore();
  const current = await store.read(config);
  const refreshMs = Math.max(config.scanIntervalMs, SERVERLESS_REFRESH_MS);
  if (!stateNeedsRefresh(current.state, Date.now(), refreshMs)) return current.state;
  const next = await scanMarket(current.state, new DexClient(config), config);
  try {
    await store.write(next, current.etag);
    return next;
  } catch (error) {
    if (!isConcurrentBlobWrite(error)) throw error;
    return (await store.read(config)).state;
  }
}

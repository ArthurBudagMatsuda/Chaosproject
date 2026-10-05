import type { FinancialState } from "../../lib/financial-types.ts";
import type { FinancialConfig } from "./config.ts";
import { FinancialStore } from "./store.ts";
import { BlobFinancialStore, type FinancialStateStore } from "./blob-store.ts";
import { hasBlobMarketStore } from "../market/blob-store.ts";
import { monitorFinancialState } from "./monitor.ts";
import { SolanaProvider, type SolanaReader } from "./solana-provider.ts";

export function getFinancialStore(config: FinancialConfig): FinancialStateStore {
  return hasBlobMarketStore() ? new BlobFinancialStore() : new FinancialStore(config);
}

export function financialNeedsRefresh(state: FinancialState, config: FinancialConfig, now = Date.now()) {
  if (state.snapshot.token.address !== config.tokenAddress || state.snapshot.feeWallet.address !== config.feeWalletAddress) return true;
  const at = Date.parse(state.snapshot.lastAttempt ?? "");
  return !Number.isFinite(at) || now - at >= config.monitorIntervalMs;
}

export async function refreshFinancialState(store: FinancialStateStore, reader: SolanaReader, config: FinancialConfig, now = Date.now()) {
  return store.update(config, state => financialNeedsRefresh(state, config, now)
    ? monitorFinancialState(state, reader, config, undefined, () => now) : state);
}

type Globals = typeof globalThis & { chaosFinancialRead?: { expires: number; state?: FinancialState; pending?: Promise<FinancialState> } };
export async function readCurrentFinancialState(config: FinancialConfig): Promise<FinancialState> {
  const globals = globalThis as Globals;
  const cache = globals.chaosFinancialRead ??= { expires: 0 };
  if (cache.state && Date.now() < cache.expires && !financialNeedsRefresh(cache.state, config)) return cache.state;
  cache.pending ??= (async () => {
    const store = getFinancialStore(config);
    const state = await store.read(config);
    // Local workers own local scans. Vercel reads refresh the shared durable state.
    const next = hasBlobMarketStore() && financialNeedsRefresh(state, config)
      ? await refreshFinancialState(store, new SolanaProvider(config), config) : state;
    cache.state = next;
    cache.expires = Date.now() + 5000;
    return next;
  })().finally(() => { cache.pending = undefined; });
  return cache.pending;
}

export function invalidateFinancialCache() {
  const cache = (globalThis as Globals).chaosFinancialRead;
  if (cache) { cache.expires = 0; cache.state = undefined; }
}

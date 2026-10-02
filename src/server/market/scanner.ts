import { randomUUID } from "node:crypto";
import type { MarketToken, ScannerState } from "../../lib/market-types.ts";
import type { MarketConfig } from "./config.ts";
import { canonicalTokens, isEligible, isSolanaAddress, parsePair } from "./pairs.ts";
import { calculateChaosIndex } from "./index-calculator.ts";
import { emptyState } from "./store.ts";

export interface MarketReader { get(path: string, signal?: AbortSignal): Promise<unknown>; readonly cooldownUntil?: number }
export function reconcileThreshold(previous: ScannerState, index: number | null, ready: boolean, tokenCount: number, at: string, config: MarketConfig) {
  let latched = previous.thresholdLatched;
  const events = [...previous.snapshot.events];
  if (ready && index !== null && index < 100) latched = false;
  if (ready && index === 100 && !latched) {
    latched = true;
    events.unshift({ id: randomUUID(), type: "CHAOS_EVENT_TRIGGERED", simulated: true, source: "backend-experimental-index", timestamp: at, chaosIndex: 100, eligibleTokenCount: tokenCount, selectedToken: null, distributionSol: null, transaction: null });
  }
  return { events: events.slice(0, config.maxEvents), latched, eventStatus: ready && index === 100 && latched ? "SIMULATED_CHAOS_EVENT_TRIGGERED" as const : "WAITING" as const };
}

export async function scanMarket(previous: ScannerState, reader: MarketReader, config: MarketConfig, signal?: AbortSignal, clock: () => number = Date.now): Promise<ScannerState> {
  const started = clock();
  const candidates = { ...previous.candidates };
  let errors = 0, successfulReads = 0;
  const discover = (address: unknown) => { if (isSolanaAddress(address)) candidates[address] = started; };
  config.seedAddresses.forEach(discover);
  for (const path of ["/token-profiles/latest/v1", "/token-boosts/top/v1"]) {
    try {
      const data = await reader.get(path, signal);
      if (!Array.isArray(data)) throw new Error("Malformed discovery feed");
      successfulReads++;
      for (const item of data) if (item?.chainId === "solana") discover(item.tokenAddress);
    } catch { errors++; }
    if (signal?.aborted) throw signal.reason;
  }
  for (let i = 0; i < Math.min(config.queriesPerScan, config.queries.length); i++) {
    const query = config.queries[(previous.discoveryCursor + i) % config.queries.length];
    try {
      const data = await reader.get(`/latest/dex/search?q=${encodeURIComponent(query)}`, signal) as { pairs?: unknown[] };
      if (!Array.isArray(data?.pairs)) throw new Error("Malformed search response");
      successfulReads++;
      for (const value of data.pairs) {
        const pair = parsePair(value, new Date(clock()).toISOString());
        if (pair) discover(pair.tokenAddress);
      }
    } catch { errors++; }
    if (signal?.aborted) throw signal.reason;
  }
  // Existing eligible tokens are retained first; remaining capacity favors recently discovered addresses.
  const prioritized = [...new Set([...previous.snapshot.eligibleTokens.map(t => t.tokenAddress), ...config.seedAddresses.filter(isSolanaAddress), ...Object.keys(candidates).sort((a,b) => candidates[b] - candidates[a])])].slice(0, config.maxCandidates);
  const registry = Object.fromEntries(prioritized.map(address => [address, candidates[address] ?? started]));
  const freshPairs: MarketToken[] = [];
  let scannedTokenCount = 0;
  for (let i = 0; i < prioritized.length; i += 30) {
    const batch = prioritized.slice(i, i + 30);
    try {
      const data = await reader.get(`/tokens/v1/solana/${batch.join(",")}`, signal);
      if (!Array.isArray(data)) throw new Error("Malformed pair response");
      successfulReads++; scannedTokenCount += batch.length;
      const addresses = new Set(batch);
      for (const value of data) {
        const pair = parsePair(value, new Date(clock()).toISOString());
        if (pair && addresses.has(pair.tokenAddress)) freshPairs.push(pair);
      }
    } catch { errors++; }
    if (signal?.aborted) throw signal.reason;
  }
  const now = clock(), at = new Date(now).toISOString();
  const nextEvaluation = new Date(Math.max(now + config.scanIntervalMs, reader.cooldownUntil ?? 0)).toISOString();
  if (successfulReads === 0 || (prioritized.length > 0 && scannedTokenCount === 0)) {
    return { ...previous, candidates: registry, snapshot: { ...previous.snapshot, lastAttempt: at, nextEvaluation, status: previous.snapshot.lastUpdate ? "degraded" : "unavailable", coverage: { ...previous.snapshot.coverage, errors }, eventStatus: "WAITING" } };
  }
  const tokens = canonicalTokens(freshPairs);
  const eligibleTokens = tokens.filter(token => isEligible(token, config, now));
  const history = Object.fromEntries(Object.entries(previous.history).filter(([address]) => address in registry).map(([address, entries]) => [address, entries.filter(e => now - e.at <= config.historyWindowMs)]));
  for (const token of tokens) {
    const entries = history[token.tokenAddress] ?? [];
    entries.push({ at: now, pairAddress: token.pairAddress, priceUsd: token.priceUsd, liquidity: token.liquidity, volume24h: token.volume24h });
    history[token.tokenAddress] = entries.slice(-1000);
  }
  const result = calculateChaosIndex(eligibleTokens, history, config, now);
  const ready = result.ready && errors === 0;
  const threshold = reconcileThreshold(previous, result.chaosIndex, ready, eligibleTokens.length, at, config);
  return { schemaVersion: 1, candidates: registry, history, thresholdLatched: threshold.latched,
    discoveryCursor: config.queries.length ? (previous.discoveryCursor + config.queriesPerScan) % config.queries.length : 0,
    snapshot: { ...emptyState(config).snapshot, chaosIndex: result.chaosIndex, components: result.components,
      status: errors ? "degraded" : result.ready ? "healthy" : "warming_up",
      systemState: result.chaosIndex === null ? "INSUFFICIENT MARKET DATA" : result.chaosIndex >= 65 ? "HIGHLY UNSTABLE" : result.chaosIndex >= 35 ? "UNSTABLE" : "LOW INSTABILITY",
      eligibleTokenCount: eligibleTokens.length, eligibleTokens, lastUpdate: at, lastAttempt: at, nextEvaluation,
      eventStatus: threshold.eventStatus, events: threshold.events,
      coverage: { scope: "sampled-discovery-not-all-solana", discoveredTokenCount: Object.keys(registry).length, scannedTokenCount, observedPairCount: freshPairs.length, errors },
    },
  };
}

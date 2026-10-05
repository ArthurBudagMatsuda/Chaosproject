import { randomUUID } from "node:crypto";
import type { FeeActivityInput, MarketToken, ScannerState } from "../../lib/market-types.ts";
import type { MarketConfig } from "./config.ts";
import { canonicalTokens, isEligible, isSolanaAddress, parsePair } from "./pairs.ts";
import { calculateChaosIndex, progressionSystemState } from "./index-calculator.ts";
import { emptyState } from "./store.ts";

export interface MarketReader { get(path: string, signal?: AbortSignal): Promise<unknown>; readonly cooldownUntil?: number }
export function reconcileThreshold(previous: ScannerState, index: number | null, ready: boolean, distributionReady: boolean, tokenCount: number, at: string, config: MarketConfig, activityScore: number | null = null, fees?: FeeActivityInput) {
  let latched = previous.thresholdLatched;
  const events = [...previous.snapshot.events];
  if (ready && index !== null && index < config.eventRearmThreshold) latched = false;
  if (ready && distributionReady && index === 100 && !latched) {
    latched = true;
    events.unshift({ id: randomUUID(), type: "CHAOS_EVENT_TRIGGERED", simulated: false, source: "chaos-index-v2", timestamp: at, chaosIndex: 100, activityScore, distributionReady: true, availableFeeBalance: fees?.balance ?? null, minimumDistributionBalance: fees?.minimumBalance ?? 0, eligibleTokenCount: tokenCount, selectedToken: null, distributionSol: null, transaction: null });
  }
  return { events: events.slice(0, config.maxEvents), latched, eventStatus: ready && distributionReady && index === 100 && latched ? "CHAOS_EVENT_TRIGGERED" as const : "WAITING" as const };
}

export async function scanMarket(previous: ScannerState, reader: MarketReader, config: MarketConfig, signal?: AbortSignal, clock: () => number = Date.now, fees?: FeeActivityInput): Promise<ScannerState> {
  const started = clock();
  const candidates = Object.fromEntries(Object.entries(previous.candidates).filter(([address]) => !config.excludedAddresses.includes(address)));
  let errors = 0, successfulReads = 0;
  const discover = (address: unknown) => { if (isSolanaAddress(address) && !config.excludedAddresses.includes(address)) candidates[address] = started; };
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
  const prioritized = [...new Set([...previous.snapshot.eligibleTokens.map(t => t.tokenAddress), ...config.seedAddresses.filter(isSolanaAddress), ...Object.keys(candidates).sort((a,b) => candidates[b] - candidates[a])])].filter(address => !config.excludedAddresses.includes(address)).slice(0, config.maxCandidates);
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
  const eligibleTokens = tokens.filter(token => isEligible(token, config));
  const history = Object.fromEntries(Object.entries(previous.history).filter(([address]) => address in registry).map(([address, entries]) => [address, entries.filter(e => now - e.at <= config.historyWindowMs)]));
  for (const token of tokens) {
    const entries = history[token.tokenAddress] ?? [];
    const transactionCount = token.transactions.buys24h !== null && token.transactions.sells24h !== null ? token.transactions.buys24h + token.transactions.sells24h : null;
    entries.push({ at: now, pairAddress: token.pairAddress, priceUsd: token.priceUsd, marketCap: token.marketCap, liquidity: token.liquidity, volume24h: token.volume24h, holders: token.holders ?? null, transactionCount });
    history[token.tokenAddress] = entries.slice(-1000);
  }
  const result = calculateChaosIndex(eligibleTokens, history, config, now, fees);
  const ready = result.ready && errors === 0;
  const distributionReady = ready && result.distributionReady;
  const threshold = reconcileThreshold(previous, result.chaosIndex, ready, distributionReady, eligibleTokens.length, at, config, result.activityScore, fees);
  return { schemaVersion: 1, candidates: registry, history, thresholdLatched: threshold.latched,
    discoveryCursor: config.queries.length ? (previous.discoveryCursor + config.queriesPerScan) % config.queries.length : 0,
    snapshot: { ...emptyState(config).snapshot, chaosIndex: result.chaosIndex, activityScore: result.activityScore, distributionReady, availableFeeBalance: result.availableFeeBalance, minimumDistributionBalance: result.minimumDistributionBalance, nextEventThreshold: result.nextEventThreshold, components: result.components, componentWeights: result.componentWeights, dataCoverage: result.dataCoverage,
      status: errors ? "degraded" : result.ready ? "healthy" : "warming_up",
      systemState: progressionSystemState(result.chaosIndex, distributionReady),
      eligibleTokenCount: eligibleTokens.length, eligibleTokens, tokenActivity: result.tokenActivity, tokensWithSufficientData: result.tokensWithSufficientData, lastUpdate: at, dataTimestamp: at, lastAttempt: at, nextEvaluation,
      eventStatus: threshold.eventStatus, events: threshold.events,
      coverage: { scope: "sampled-discovery-not-all-solana", discoveredTokenCount: Object.keys(registry).length, scannedTokenCount, observedPairCount: freshPairs.length, errors },
    },
  };
}

// Server/worker configuration. Never use NEXT_PUBLIC_ for credentials or scanner settings.
import { projectSeedAddresses, projectExcludedAddresses } from "./seed-tokens.ts";
function number(env: NodeJS.ProcessEnv, key: string, fallback: number, min: number, max = Infinity) {
  const value = env[key] === undefined || env[key] === "" ? fallback : Number(env[key]);
  if (!Number.isFinite(value) || value < min || value > max) throw new Error(`Invalid configuration: ${key}`);
  return value;
}
export function getMarketConfig(env: NodeJS.ProcessEnv = process.env) {
  return {
    scanIntervalMs: number(env, "CHAOS_SCAN_INTERVAL_SECONDS", 300, 60) * 1000,
    staleAfterMs: number(env, "CHAOS_STALE_AFTER_SECONDS", 1200, 60) * 1000,
    dataDirectory: env.CHAOS_DATA_DIR || ".chaos-data",
    minMarketCapUsd: number(env, "CHAOS_MIN_MARKET_CAP_USD", 1_000_000, 0),
    minLiquidityUsd: number(env, "CHAOS_MIN_LIQUIDITY_USD", 250_000, 0),
    minVolume24hUsd: number(env, "CHAOS_MIN_VOLUME_24H_USD", 100_000, 0),
    // Retained in API metadata for compatibility; age no longer gates pool membership.
    minAgeDays: 0,
    maxCandidates: Math.floor(number(env, "CHAOS_MAX_CANDIDATES", 300, 30, 3000)),
    queries: (env.CHAOS_DISCOVERY_QUERIES || "solana,SOL,USDC,BONK,WIF,RAY,POPCAT").split(",").map(s => s.trim()).filter(Boolean),
    excludedAddresses: [...new Set([...projectExcludedAddresses, ...(env.CHAOS_EXCLUDED_ADDRESSES || "").split(",").map(s => s.trim()).filter(Boolean)])],
    seedAddresses: [...new Set([...projectSeedAddresses, ...(env.CHAOS_SEED_ADDRESSES || "").split(",").map(s => s.trim()).filter(Boolean)])],
    queriesPerScan: Math.floor(number(env, "CHAOS_QUERIES_PER_SCAN", 4, 1, 10)),
    requestGapMs: number(env, "CHAOS_PROVIDER_REQUEST_GAP_MS", 1600, 1100),
    requestCacheMs: number(env, "CHAOS_PROVIDER_CACHE_SECONDS", 120, 10) * 1000,
    requestTimeoutMs: number(env, "CHAOS_PROVIDER_TIMEOUT_SECONDS", 12, 1, 30) * 1000,
    historyWindowMs: number(env, "CHAOS_HISTORY_WINDOW_MINUTES", 360, 15) * 60_000,
    maxComparisonGapMs: number(env, "CHAOS_MAX_COMPARISON_GAP_MINUTES", 20, 1) * 60_000,
    minPoolSize: Math.floor(number(env, "CHAOS_INDEX_MIN_POOL_SIZE", 2, 2)),
    minCoverage: number(env, "CHAOS_INDEX_MIN_COVERAGE", .6, .1, 1),
    minAvailableWeight: number(env, "CHAOS_INDEX_MIN_AVAILABLE_WEIGHT", .6, .1, 1),
    eventRearmThreshold: number(env, "CHAOS_EVENT_REARM_THRESHOLD", 99.99, 0, 99.999999),
    feeGrowthScale: number(env, "CHAOS_SCALE_FEE_GROWTH_PERCENT", 25, .001),
    maxEvents: Math.floor(number(env, "CHAOS_MAX_EVENTS", 100, 1, 1000)),
    // Relative activity at which each component saturates. These are project progression parameters.
    scales: {
      volume: number(env, "CHAOS_SCALE_VOLUME_CHANGE_PERCENT", 30, .001),
      marketCap: number(env, "CHAOS_SCALE_MARKET_CAP_CHANGE_PERCENT", 20, .001),
      liquidity: number(env, "CHAOS_SCALE_LIQUIDITY_CHANGE_PERCENT", 15, .001),
      holders: number(env, "CHAOS_SCALE_HOLDER_CHANGE_PERCENT", 20, .001),
      transactions: number(env, "CHAOS_SCALE_TRANSACTION_CHANGE_PERCENT", 30, .001),
      price: number(env, "CHAOS_SCALE_PRICE_VOLATILITY_PERCENT", 5, .001),
    },
    weights: {
      fees: number(env, "CHAOS_WEIGHT_FEES", .25, 0),
      volume: number(env, "CHAOS_WEIGHT_VOLUME", .25, 0),
      marketCap: number(env, "CHAOS_WEIGHT_MARKET_CAP", .1, 0),
      liquidity: number(env, "CHAOS_WEIGHT_LIQUIDITY", .1, 0),
      holders: number(env, "CHAOS_WEIGHT_HOLDERS", .1, 0),
      transactions: number(env, "CHAOS_WEIGHT_TRANSACTIONS", .1, 0),
      price: number(env, "CHAOS_WEIGHT_PRICE", .1, 0),
    },
  };
}
export type MarketConfig = ReturnType<typeof getMarketConfig>;

// Server/worker configuration. Never use NEXT_PUBLIC_ for credentials or scanner settings.
import { projectSeedAddresses } from "./seed-tokens.ts";
function number(env: NodeJS.ProcessEnv, key: string, fallback: number, min: number, max = Infinity) {
  const value = env[key] === undefined ? fallback : Number(env[key]);
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
    minAgeDays: number(env, "CHAOS_MIN_AGE_DAYS", 30, 0),
    maxCandidates: Math.floor(number(env, "CHAOS_MAX_CANDIDATES", 300, 30, 3000)),
    queries: (env.CHAOS_DISCOVERY_QUERIES || "solana,SOL,USDC,BONK,WIF,JUP,RAY,POPCAT").split(",").map(s => s.trim()).filter(Boolean),
    seedAddresses: [...new Set([...projectSeedAddresses, ...(env.CHAOS_SEED_ADDRESSES || "").split(",").map(s => s.trim()).filter(Boolean)])],
    queriesPerScan: Math.floor(number(env, "CHAOS_QUERIES_PER_SCAN", 4, 1, 10)),
    requestGapMs: number(env, "CHAOS_PROVIDER_REQUEST_GAP_MS", 1600, 1100),
    requestCacheMs: number(env, "CHAOS_PROVIDER_CACHE_SECONDS", 120, 10) * 1000,
    requestTimeoutMs: number(env, "CHAOS_PROVIDER_TIMEOUT_SECONDS", 12, 1, 30) * 1000,
    historyWindowMs: number(env, "CHAOS_HISTORY_WINDOW_MINUTES", 360, 15) * 60_000,
    maxComparisonGapMs: number(env, "CHAOS_MAX_COMPARISON_GAP_MINUTES", 20, 1) * 60_000,
    minPoolSize: Math.floor(number(env, "CHAOS_INDEX_MIN_POOL_SIZE", 2, 2)),
    minCoverage: number(env, "CHAOS_INDEX_MIN_COVERAGE", .6, .1, 1),
    maxEvents: Math.floor(number(env, "CHAOS_MAX_EVENTS", 100, 1, 1000)),
    // Raw values at which each component saturates at 100. These are design parameters, not scientific constants.
    scales: {
      volatility: number(env, "CHAOS_SCALE_VOLATILITY_PERCENT", 5, .001),
      tradingActivity: number(env, "CHAOS_SCALE_ACTIVITY_PER_MINUTE", 20, .001),
      volumeChange: number(env, "CHAOS_SCALE_VOLUME_CHANGE_PERCENT", 30, .001),
      liquidityChange: number(env, "CHAOS_SCALE_LIQUIDITY_CHANGE_PERCENT", 15, .001),
      priceDispersion: number(env, "CHAOS_SCALE_DISPERSION_PERCENT", 20, .001),
    },
    weights: {
      volatility: number(env, "CHAOS_WEIGHT_VOLATILITY", .3, 0),
      tradingActivity: number(env, "CHAOS_WEIGHT_ACTIVITY", .2, 0),
      volumeChange: number(env, "CHAOS_WEIGHT_VOLUME", .2, 0),
      liquidityChange: number(env, "CHAOS_WEIGHT_LIQUIDITY", .15, 0),
      priceDispersion: number(env, "CHAOS_WEIGHT_DISPERSION", .15, 0),
    },
  };
}
export type MarketConfig = ReturnType<typeof getMarketConfig>;

const BASE58_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function number(env: NodeJS.ProcessEnv, key: string, fallback: number, min: number, max = Infinity) {
  const value = env[key] === undefined || env[key] === "" ? fallback : Number(env[key]);
  if (!Number.isFinite(value) || value < min || value > max) throw new Error(`Invalid configuration: ${key}`);
  return value;
}

function address(env: NodeJS.ProcessEnv, key: string) {
  const value = env[key]?.trim() || null;
  if (value !== null && !BASE58_ADDRESS.test(value)) throw new Error(`Invalid Solana address: ${key}`);
  return value;
}

function thresholdSequence(env: NodeJS.ProcessEnv) {
  if (!env.CHAOS_DISTRIBUTION_THRESHOLDS_SOL?.trim()) return [];
  const values = env.CHAOS_DISTRIBUTION_THRESHOLDS_SOL.split(",").map(value => Number(value.trim()));
  if (!values.length || values.some((value, index) => !Number.isFinite(value) || value <= 0 || (index > 0 && value <= values[index - 1]))) {
    throw new Error("Invalid configuration: CHAOS_DISTRIBUTION_THRESHOLDS_SOL");
  }
  return values;
}

export const isSolanaAddress = (value: unknown): value is string => typeof value === "string" && BASE58_ADDRESS.test(value);

export function getFinancialConfig(env: NodeJS.ProcessEnv = process.env) {
  return {
    dataDirectory: env.CHAOS_DATA_DIR || ".chaos-data",
    tokenAddress: address(env, "CHAOS_TOKEN_CA"),
    feeWalletAddress: address(env, "FEE_WALLET_CA"),
    rpcUrl: env.SOLANA_RPC_URL?.trim() || "https://api.mainnet-beta.solana.com",
    baseThresholdSol: number(env, "BASE_DISTRIBUTION_THRESHOLD_SOL", 5, 0.000000001),
    distributionPercentage: number(env, "DISTRIBUTION_PERCENTAGE", 20, 0, 100),
    nextThresholdMultiplier: number(env, "NEXT_THRESHOLD_MULTIPLIER", 2, 1.000001),
    thresholdSequence: thresholdSequence(env),
    monitorIntervalMs: number(env, "CHAOS_FINANCIAL_MONITOR_INTERVAL_SECONDS", 60, 15) * 1000,
    staleAfterMs: number(env, "CHAOS_FINANCIAL_STALE_AFTER_SECONDS", 300, 30) * 1000,
    rpcTimeoutMs: number(env, "SOLANA_RPC_TIMEOUT_SECONDS", 15, 1, 60) * 1000,
    maxHistory: Math.floor(number(env, "CHAOS_MAX_DISTRIBUTIONS", 250, 1, 5000)),
    maxEvents: Math.floor(number(env, "CHAOS_MAX_FINANCIAL_EVENTS", 250, 1, 5000)),
  };
}

export type FinancialConfig = ReturnType<typeof getFinancialConfig>;

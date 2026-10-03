import { randomUUID } from "node:crypto";
import type { FinancialState, OnChainMovement } from "../../lib/financial-types.ts";
import type { FinancialConfig } from "./config.ts";
import type { SolanaReader } from "./solana-provider.ts";
import { calculateDistributionThreshold } from "./threshold.ts";

export async function monitorFinancialState(previous: FinancialState, reader: SolanaReader, config: FinancialConfig, signal?: AbortSignal, clock: () => number = Date.now): Promise<FinancialState> {
  const now = clock();
  const at = new Date(now).toISOString();
  const nextEvaluation = new Date(now + config.monitorIntervalMs).toISOString();
  const tokenConfigured = config.tokenAddress !== null;
  const walletConfigured = config.feeWalletAddress !== null;
  if (!tokenConfigured && !walletConfigured) {
    return { ...previous, snapshot: { ...previous.snapshot, status: "not_configured", token: { address: null, configured: false, supply: null, decimals: null, largestAccounts: null, recentMovements: [] }, feeWallet: { address: null, configured: false, balanceSol: null, recentMovements: [] }, threshold: calculateDistributionThreshold(null, previous.thresholdLevel, config), lastAttempt: at, nextEvaluation, lastError: null } };
  }

  let successes = 0;
  const errors: string[] = [];
  let token = { ...previous.snapshot.token, address: config.tokenAddress, configured: tokenConfigured };
  let feeWallet = { ...previous.snapshot.feeWallet, address: config.feeWalletAddress, configured: walletConfigured };

  if (config.tokenAddress) {
    try {
      const [supply, largestAccounts, recentMovements] = await Promise.all([
        reader.getTokenSupply(config.tokenAddress, signal),
        reader.getTokenLargestAccounts(config.tokenAddress, signal),
        reader.getSignatures(config.tokenAddress, signal),
      ]);
      token = { ...token, supply: supply.amount, decimals: supply.decimals, largestAccounts, recentMovements };
      successes++;
    } catch (error) { errors.push(error instanceof Error ? error.message : "Token monitoring failed"); }
  } else token = { address: null, configured: false, supply: null, decimals: null, largestAccounts: null, recentMovements: [] as OnChainMovement[] };

  if (config.feeWalletAddress) {
    try {
      const [balanceSol, recentMovements] = await Promise.all([
        reader.getBalance(config.feeWalletAddress, signal),
        reader.getSignatures(config.feeWalletAddress, signal),
      ]);
      feeWallet = { ...feeWallet, balanceSol, recentMovements };
      successes++;
    } catch (error) { errors.push(error instanceof Error ? error.message : "Fee wallet monitoring failed"); }
  } else feeWallet = { address: null, configured: false, balanceSol: null, recentMovements: [] as OnChainMovement[] };

  const threshold = calculateDistributionThreshold(feeWallet.balanceSol, previous.thresholdLevel, config);
  const reachedThresholdLevels = [...previous.reachedThresholdLevels];
  const verifiedEvents = [...previous.snapshot.verifiedEvents];
  if (successes > 0 && threshold.distributionAvailable && !reachedThresholdLevels.includes(previous.thresholdLevel)) {
    reachedThresholdLevels.push(previous.thresholdLevel);
    verifiedEvents.unshift({ id: randomUUID(), type: "THRESHOLD_REACHED", timestamp: at, description: `Fee wallet reached distribution threshold level ${previous.thresholdLevel + 1}`, amount: feeWallet.balanceSol ?? threshold.currentThreshold, destination: null, txid: null, simulated: false, source: "solana-rpc" });
  }
  const configuredCount = Number(tokenConfigured) + Number(walletConfigured);
  const status = errors.length ? (previous.snapshot.lastUpdate || successes ? "degraded" : "unavailable") : configuredCount < 2 ? "partial" : "healthy";
  return {
    ...previous,
    reachedThresholdLevels,
    snapshot: {
      ...previous.snapshot,
      status,
      token,
      feeWallet,
      threshold,
      lastUpdate: successes ? at : previous.snapshot.lastUpdate,
      lastAttempt: at,
      nextEvaluation,
      lastError: errors.length ? errors.join("; ") : null,
      lastDistribution: previous.distributions.find(item => item.status === "confirmed") ?? null,
      verifiedEvents: verifiedEvents.slice(0, config.maxEvents),
    },
  };
}

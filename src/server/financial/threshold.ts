import type { DistributionThreshold } from "../../lib/financial-types.ts";
import type { FinancialConfig } from "./config.ts";

const roundSol = (value: number) => Math.round(value * 1_000_000_000) / 1_000_000_000;
const roundPercent = (value: number) => Math.round(value * 1_000_000) / 1_000_000;

export function thresholdAtLevel(level: number, config: FinancialConfig) {
  if (config.thresholdSequence[level] !== undefined) return config.thresholdSequence[level];
  if (config.thresholdSequence.length) {
    const lastIndex = config.thresholdSequence.length - 1;
    return config.thresholdSequence[lastIndex] * config.nextThresholdMultiplier ** (level - lastIndex);
  }
  return config.baseThresholdSol * config.nextThresholdMultiplier ** level;
}

export function calculateDistributionThreshold(balance: number | null, level: number, config: FinancialConfig): DistributionThreshold {
  const currentThreshold = roundSol(thresholdAtLevel(level, config));
  const currentBalance = balance === null || !Number.isFinite(balance) || balance < 0 ? null : balance;
  const distributionAvailable = currentBalance !== null && currentBalance >= currentThreshold;
  const eligibleValue = distributionAvailable ? currentBalance : 0;
  return {
    level,
    currentBalance,
    currentThreshold,
    progress: currentBalance === null ? 0 : roundPercent(Math.min(100, currentBalance / currentThreshold * 100)),
    remaining: currentBalance === null ? currentThreshold : roundSol(Math.max(0, currentThreshold - currentBalance)),
    eligibleValue,
    distributionPercentage: config.distributionPercentage,
    availableForDistribution: roundSol(eligibleValue * config.distributionPercentage / 100),
    distributionAvailable,
    nextThreshold: roundSol(thresholdAtLevel(level + 1, config)),
  };
}

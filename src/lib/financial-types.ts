export type FinancialStatus = "not_configured" | "partial" | "initializing" | "healthy" | "degraded" | "stale" | "unavailable";

export interface OnChainMovement {
  signature: string;
  slot: number;
  timestamp: string | null;
  successful: boolean;
}

export interface ChaosTokenState {
  address: string | null;
  configured: boolean;
  supply: string | null;
  decimals: number | null;
  largestAccounts: number | null;
  recentMovements: OnChainMovement[];
}

export interface FeeWalletState {
  address: string | null;
  configured: boolean;
  balanceSol: number | null;
  recentMovements: OnChainMovement[];
}

export interface DistributionThreshold {
  level: number;
  currentBalance: number | null;
  currentThreshold: number;
  progress: number;
  remaining: number;
  eligibleValue: number;
  distributionPercentage: number;
  availableForDistribution: number;
  distributionAvailable: boolean;
  nextThreshold: number;
}

export type DistributionStatus = "pending" | "confirmed" | "invalid";

export interface DistributionRecord {
  id: string;
  timestamp: string;
  amount: number;
  currency: "SOL";
  sourceWallet: string;
  destinationProject: string;
  destinationWallet: string;
  destinationToken: string | null;
  txid: string;
  status: DistributionStatus;
  verifiedAt: string | null;
}

export interface VerifiedFinancialEvent {
  id: string;
  type: "DISTRIBUTION_CONFIRMED" | "THRESHOLD_REACHED";
  timestamp: string;
  description: string;
  amount: number;
  destination: string | null;
  txid: string | null;
  simulated: false;
  source: "solana-rpc";
}

export interface FinancialSnapshot {
  schemaVersion: 1;
  provenance: "solana-rpc";
  custody: false;
  status: FinancialStatus;
  token: ChaosTokenState;
  feeWallet: FeeWalletState;
  threshold: DistributionThreshold;
  lastUpdate: string | null;
  lastAttempt: string | null;
  nextEvaluation: string | null;
  lastError: string | null;
  lastDistribution: DistributionRecord | null;
  verifiedEvents: VerifiedFinancialEvent[];
}

export interface FinancialState {
  schemaVersion: 1;
  thresholdLevel: number;
  reachedThresholdLevels: number[];
  distributions: DistributionRecord[];
  snapshot: FinancialSnapshot;
}

export interface DistributionSubmission {
  amount: number;
  destinationProject: string;
  destinationWallet: string;
  destinationToken: string | null;
  txid: string;
}

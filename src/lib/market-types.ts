export interface MarketToken {
  chainId: "solana";
  tokenAddress: string;
  symbol: string;
  name: string;
  pairAddress: string;
  dexId: string;
  marketCap: number | null;
  liquidity: number | null;
  volume24h: number | null;
  priceUsd: number | null;
  priceChange: { m5: number | null; h1: number | null; h6: number | null; h24: number | null };
  transactions: { buys24h: number | null; sells24h: number | null };
  pairCreatedAt: number | null;
  observedAt: string;
}

export type ComponentName = "volatility" | "tradingActivity" | "volumeChange" | "liquidityChange" | "priceDispersion";
export interface IndexComponent {
  raw: number | null;
  score: number | null;
  weight: number;
  sampleCount: number;
  coverage: number;
  description: string;
}
export interface MarketEvent {
  id: string;
  type: "CHAOS_EVENT_TRIGGERED";
  simulated: true;
  source: "backend-experimental-index";
  timestamp: string;
  chaosIndex: number;
  eligibleTokenCount: number;
  selectedToken: null;
  distributionSol: null;
  transaction: null;
}
export interface MarketSnapshot {
  schemaVersion: 1;
  provenance: "dexscreener";
  metric: "experimental-project-metric";
  formulaVersion: "experimental-v1";
  status: "initializing" | "warming_up" | "healthy" | "degraded" | "stale" | "unavailable";
  chaosIndex: number | null;
  systemState: string;
  eligibleTokenCount: number;
  eligibleTokens: MarketToken[];
  lastUpdate: string | null;
  lastAttempt: string | null;
  nextEvaluation: string | null;
  eventStatus: "WAITING" | "SIMULATED_CHAOS_EVENT_TRIGGERED";
  events: MarketEvent[];
  components: Record<ComponentName, IndexComponent> | null;
  coverage: { scope: "sampled-discovery-not-all-solana"; discoveredTokenCount: number; scannedTokenCount: number; observedPairCount: number; errors: number };
  eligibility: { minMarketCapUsd: number; minLiquidityUsd: number; minVolume24hUsd: number; minAgeDays: number; ageBasis: "pair-creation-time" };
  warning: string;
}
export interface PriceObservation { at: number; pairAddress: string; priceUsd: number | null; liquidity: number | null; volume24h: number | null }
export interface ScannerState {
  schemaVersion: 1;
  snapshot: MarketSnapshot;
  candidates: Record<string, number>;
  history: Record<string, PriceObservation[]>;
  thresholdLatched: boolean;
  discoveryCursor: number;
}

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
  holders?: number | null;
  pairCreatedAt: number | null;
  observedAt: string;
}

export type ComponentName = "fees" | "volume" | "marketCap" | "liquidity" | "holders" | "transactions" | "price";
export type MarketComponentName = Exclude<ComponentName, "fees">;

export interface IndexComponent {
  raw: number | null;
  score: number | null;
  weight: number;
  effectiveWeight: number;
  sampleCount: number;
  coverage: number;
  available: boolean;
  description: string;
}

export interface PriceObservation {
  at: number;
  pairAddress: string;
  priceUsd: number | null;
  marketCap?: number | null;
  liquidity: number | null;
  volume24h: number | null;
  holders?: number | null;
  transactionCount?: number | null;
}

export interface TokenActivity {
  tokenAddress: string;
  symbol: string;
  name: string;
  pairAddress: string;
  price: number | null;
  marketCap: number | null;
  volume: number | null;
  liquidity: number | null;
  holders: number | null;
  transactionCount: number | null;
  fees: null;
  historicalObservations: PriceObservation[];
  componentScores: Record<MarketComponentName, number | null>;
  sufficientData: boolean;
}

export interface FeeActivityInput {
  balance: number | null;
  minimumBalance: number;
  observedAt: string | null;
  previousBalance?: number | null;
  reliable?: boolean;
}

export interface MarketEvent {
  id: string;
  type: "CHAOS_EVENT_TRIGGERED";
  simulated: boolean;
  source: "backend-experimental-index" | "chaos-index-v2";
  timestamp: string;
  chaosIndex: number;
  activityScore?: number | null;
  distributionReady?: boolean;
  availableFeeBalance?: number | null;
  minimumDistributionBalance?: number;
  eligibleTokenCount: number;
  selectedToken: null;
  distributionSol: null;
  transaction: null;
}

export interface MarketSnapshot {
  schemaVersion: 1;
  provenance: "dexscreener";
  metric: "chaos-event-progression";
  formulaVersion: "activity-progression-v2";
  status: "initializing" | "warming_up" | "healthy" | "degraded" | "stale" | "unavailable";
  chaosIndex: number | null;
  activityScore: number | null;
  distributionReady: boolean;
  availableFeeBalance: number | null;
  minimumDistributionBalance: number;
  nextEventThreshold: 100;
  systemState: string;
  eligibleTokenCount: number;
  eligibleTokens: MarketToken[];
  tokenActivity: TokenActivity[];
  tokensWithSufficientData: TokenActivity[];
  lastUpdate: string | null;
  dataTimestamp: string | null;
  lastAttempt: string | null;
  nextEvaluation: string | null;
  eventStatus: "WAITING" | "SIMULATED_CHAOS_EVENT_TRIGGERED" | "CHAOS_EVENT_TRIGGERED";
  events: MarketEvent[];
  components: Record<ComponentName, IndexComponent> | null;
  componentWeights: Record<ComponentName, number>;
  dataCoverage: {
    availableWeight: number;
    totalWeight: number;
    ratio: number;
    marketComponentsAvailable: number;
    marketComponentsTotal: 6;
  };
  coverage: { scope: "sampled-discovery-not-all-solana"; discoveredTokenCount: number; scannedTokenCount: number; observedPairCount: number; errors: number };
  eligibility: { minMarketCapUsd: number; minLiquidityUsd: number; minVolume24hUsd: number; minAgeDays: number; ageBasis: "pair-creation-time" };
  warning: string;
}

export interface ScannerState {
  schemaVersion: 1;
  snapshot: MarketSnapshot;
  candidates: Record<string, number>;
  history: Record<string, PriceObservation[]>;
  thresholdLatched: boolean;
  discoveryCursor: number;
}

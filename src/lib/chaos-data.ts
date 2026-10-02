export interface ChaosEvent {
  id: string;
  selectedToken: string;
  distributionSol: number | null;
  timestamp: string | null;
  transaction: string | null;
}

export interface PoolToken {
  symbol: string;
  name: string;
  marketCap: string;
  liquidity: string;
  status: "ELIGIBLE";
  color: string;
}

export interface ChaosData {
  mode: "demo";
  chaosIndex: number;
  events: ChaosEvent[];
  pool: PoolToken[];
}

// Presentation fixtures only. These symbols do not identify real tokens.
export const demoData: ChaosData = {
  mode: "demo",
  chaosIndex: 73.42,
  events: ["001", "002", "003"].map((id) => ({
    id, selectedToken: "$XXXX", distributionSol: null, timestamp: null, transaction: null,
  })),
  pool: [
    { symbol: "$TOKEN", name: "Test specimen 01", marketCap: "$12.4M", liquidity: "$2.1M", status: "ELIGIBLE", color: "#f45d53" },
    { symbol: "$ECHO", name: "Test specimen 02", marketCap: "$8.7M", liquidity: "$1.4M", status: "ELIGIBLE", color: "#a4a5b5" },
    { symbol: "$FLUX", name: "Test specimen 03", marketCap: "$6.2M", liquidity: "$980K", status: "ELIGIBLE", color: "#b6bf91" },
    { symbol: "$VOID", name: "Test specimen 04", marketCap: "$3.8M", liquidity: "$620K", status: "ELIGIBLE", color: "#9d8dad" },
  ],
};

export interface ChaosDataSource {
  getSnapshot(): Promise<ChaosData>;
}

// Replace this adapter when a real, explicitly labeled API is ready.
// No network calls, chain SDKs, wallets, or transaction execution exist here.
export const chaosDataSource: ChaosDataSource = {
  async getSnapshot() { return demoData; },
};

export const projectConfig = {
  // Set to official project URLs when available. Null renders an honest placeholder.
  socialUrl: null as string | null,
  communityUrl: null as string | null,
};

export function systemState(index: number) {
  return index >= 65 ? "HIGHLY UNSTABLE" : index >= 35 ? "UNSTABLE" : "LOW INSTABILITY";
}

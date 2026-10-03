import { mkdir, open, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import type { ScannerState, MarketSnapshot } from "../../lib/market-types.ts";
import type { MarketConfig } from "./config.ts";

export function emptyState(config: MarketConfig): ScannerState {
  return { schemaVersion: 1, candidates: {}, history: {}, thresholdLatched: false, discoveryCursor: 0,
    snapshot: { schemaVersion: 1, provenance: "dexscreener", metric: "chaos-event-progression", formulaVersion: "activity-progression-v2", status: "initializing", chaosIndex: null, activityScore: null, distributionReady: false, availableFeeBalance: null, minimumDistributionBalance: 0, nextEventThreshold: 100, systemState: "AWAITING MARKET DATA", eligibleTokenCount: 0, eligibleTokens: [], tokenActivity: [], tokensWithSufficientData: [], lastUpdate: null, dataTimestamp: null, lastAttempt: null, nextEvaluation: null, eventStatus: "WAITING", events: [], components: null, componentWeights: { ...config.weights },
      dataCoverage: { availableWeight: 0, totalWeight: Object.values(config.weights).reduce((sum, weight) => sum + weight, 0), ratio: 0, marketComponentsAvailable: 0, marketComponentsTotal: 6 },
      coverage: { scope: "sampled-discovery-not-all-solana", discoveredTokenCount: 0, scannedTokenCount: 0, observedPairCount: 0, errors: 0 },
      eligibility: { minMarketCapUsd: config.minMarketCapUsd, minLiquidityUsd: config.minLiquidityUsd, minVolume24hUsd: config.minVolume24hUsd, minAgeDays: config.minAgeDays, ageBasis: "pair-creation-time" },
      warning: "Project activity/progression metric, not a scientific measure of chaos, probability or price forecast. Index events never authorize or execute transfers." },
  };
}

export class MarketStore {
  readonly directory: string;
  constructor(config: MarketConfig) { this.directory = resolve(config.dataDirectory); }
  async read(config: MarketConfig): Promise<ScannerState> {
    try {
      const value = JSON.parse(await readFile(join(this.directory, "state.json"), "utf8")) as ScannerState;
      if (value.schemaVersion !== 1 || !value.snapshot || !value.candidates || !value.history) throw new Error("Invalid scanner state");
      const base = emptyState(config);
      const currentFormula = value.snapshot.formulaVersion === base.snapshot.formulaVersion;
      return {
        ...value,
        thresholdLatched: currentFormula ? value.thresholdLatched : false,
        snapshot: {
          ...base.snapshot,
          ...value.snapshot,
          metric: base.snapshot.metric,
          formulaVersion: base.snapshot.formulaVersion,
          components: currentFormula ? value.snapshot.components : null,
          activityScore: currentFormula ? value.snapshot.activityScore : null,
          distributionReady: currentFormula ? value.snapshot.distributionReady : false,
          tokenActivity: currentFormula ? value.snapshot.tokenActivity : [],
          tokensWithSufficientData: currentFormula ? value.snapshot.tokensWithSufficientData : [],
          componentWeights: base.snapshot.componentWeights,
          dataCoverage: currentFormula ? value.snapshot.dataCoverage : base.snapshot.dataCoverage,
        },
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyState(config);
      throw error; // Never silently overwrite corrupt history or events.
    }
  }
  async write(state: ScannerState) {
    await mkdir(this.directory, { recursive: true });
    const temp = join(this.directory, `state.${process.pid}.tmp`);
    await writeFile(temp, JSON.stringify(state), "utf8");
    await rename(temp, join(this.directory, "state.json"));
  }
  async lock(): Promise<() => Promise<void>> {
    await mkdir(this.directory, { recursive: true });
    const path = join(this.directory, "scanner.lock");
    try {
      const handle = await open(path, "wx");
      await handle.writeFile(String(process.pid));
      await handle.close();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const pid = Number(await readFile(path, "utf8"));
      if (!Number.isInteger(pid) || pid <= 0) throw new Error("Invalid scanner lock; inspect it before restarting");
      try { process.kill(pid, 0); } catch (probe) {
        if ((probe as NodeJS.ErrnoException).code === "ESRCH") { await unlink(path); return this.lock(); }
        throw probe;
      }
      throw new Error("Another scanner already owns this data directory");
    }
    return async () => { await unlink(path).catch(() => undefined); };
  }
}

export function publicSnapshot(snapshot: MarketSnapshot, config: MarketConfig, now = Date.now()): MarketSnapshot {
  if (snapshot.lastUpdate && now - Date.parse(snapshot.lastUpdate) > config.staleAfterMs) return { ...snapshot, status: "stale", systemState: "STALE MARKET DATA", distributionReady: false, eventStatus: "WAITING" };
  return snapshot;
}

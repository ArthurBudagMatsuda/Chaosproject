import { mkdir, open, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import type { ScannerState, MarketSnapshot } from "../../lib/market-types.ts";
import type { MarketConfig } from "./config.ts";

export function emptyState(config: MarketConfig): ScannerState {
  return { schemaVersion: 1, candidates: {}, history: {}, thresholdLatched: false, discoveryCursor: 0,
    snapshot: { schemaVersion: 1, provenance: "dexscreener", metric: "experimental-project-metric", formulaVersion: "experimental-v1", status: "initializing", chaosIndex: null, systemState: "AWAITING MARKET DATA", eligibleTokenCount: 0, eligibleTokens: [], lastUpdate: null, lastAttempt: null, nextEvaluation: null, eventStatus: "WAITING", events: [], components: null,
      coverage: { scope: "sampled-discovery-not-all-solana", discoveredTokenCount: 0, scannedTokenCount: 0, observedPairCount: 0, errors: 0 },
      eligibility: { minMarketCapUsd: config.minMarketCapUsd, minLiquidityUsd: config.minLiquidityUsd, minVolume24hUsd: config.minVolume24hUsd, minAgeDays: config.minAgeDays, ageBasis: "pair-creation-time" },
      warning: "Experimental project metric, not a scientific measure of market chaos or a price forecast. DEX Screener observations are not direct on-chain verification. All threshold events are simulated; no funds move." },
  };
}

export class MarketStore {
  readonly directory: string;
  constructor(config: MarketConfig) { this.directory = resolve(config.dataDirectory); }
  async read(config: MarketConfig): Promise<ScannerState> {
    try {
      const value = JSON.parse(await readFile(join(this.directory, "state.json"), "utf8")) as ScannerState;
      if (value.schemaVersion !== 1 || !value.snapshot || !value.candidates || !value.history) throw new Error("Invalid scanner state");
      return value;
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
  if (snapshot.lastUpdate && now - Date.parse(snapshot.lastUpdate) > config.staleAfterMs) return { ...snapshot, status: "stale", systemState: "STALE MARKET DATA", eventStatus: "WAITING" };
  return snapshot;
}

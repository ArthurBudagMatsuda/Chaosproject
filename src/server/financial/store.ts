import { mkdir, open, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { FinancialState, FinancialSnapshot } from "../../lib/financial-types.ts";
import type { FinancialConfig } from "./config.ts";
import { calculateDistributionThreshold } from "./threshold.ts";

export function emptyFinancialState(config: FinancialConfig): FinancialState {
  const tokenConfigured = config.tokenAddress !== null;
  const walletConfigured = config.feeWalletAddress !== null;
  return {
    schemaVersion: 1,
    thresholdLevel: 0,
    reachedThresholdLevels: [],
    distributions: [],
    snapshot: {
      schemaVersion: 1,
      provenance: "solana-rpc",
      custody: false,
      status: tokenConfigured || walletConfigured ? "initializing" : "not_configured",
      token: { address: config.tokenAddress, configured: tokenConfigured, supply: null, decimals: null, largestAccounts: null, recentMovements: [] },
      feeWallet: { address: config.feeWalletAddress, configured: walletConfigured, balanceSol: null, recentMovements: [] },
      threshold: calculateDistributionThreshold(null, 0, config),
      lastUpdate: null,
      lastAttempt: null,
      nextEvaluation: null,
      lastError: null,
      lastDistribution: null,
      verifiedEvents: [],
    },
  };
}

export function validateFinancialState(value: FinancialState): FinancialState {
  if (value?.schemaVersion !== 1 || !value.snapshot || !Array.isArray(value.distributions) || !Array.isArray(value.snapshot.verifiedEvents) || !Array.isArray(value.reachedThresholdLevels) || !Number.isInteger(value.thresholdLevel) || value.thresholdLevel < 0) throw new Error("Invalid financial state");
  return value;
}

export class FinancialStore {
  readonly directory: string;
  private readonly statePath: string;
  private readonly lockPath: string;
  constructor(config: FinancialConfig) {
    this.directory = resolve(config.dataDirectory);
    this.statePath = join(this.directory, "financial-state.json");
    this.lockPath = join(this.directory, "financial.lock");
  }

  async read(config: FinancialConfig): Promise<FinancialState> {
    try {
      const value = JSON.parse(await readFile(this.statePath, "utf8")) as FinancialState;
      return validateFinancialState(value);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyFinancialState(config);
      throw error;
    }
  }

  private async writeUnlocked(state: FinancialState) {
    await mkdir(this.directory, { recursive: true });
    const temp = join(this.directory, `financial-state.${process.pid}.${Date.now()}.tmp`);
    await writeFile(temp, JSON.stringify(state), { encoding: "utf8", mode: 0o600 });
    await rename(temp, this.statePath);
  }

  private async lock() {
    await mkdir(this.directory, { recursive: true });
    for (let attempt = 0; attempt < 40; attempt++) {
      try {
        const handle = await open(this.lockPath, "wx", 0o600);
        await handle.writeFile(`${process.pid}:${Date.now()}`);
        await handle.close();
        return async () => { await unlink(this.lockPath).catch(() => undefined); };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        const info = await stat(this.lockPath).catch(() => null);
        if (info && Date.now() - info.mtimeMs > 30_000) { await unlink(this.lockPath).catch(() => undefined); continue; }
        await new Promise(resolveWait => setTimeout(resolveWait, 25 + attempt * 5));
      }
    }
    throw new Error("Financial state is busy; retry shortly");
  }

  async update(config: FinancialConfig, mutate: (state: FinancialState) => FinancialState | Promise<FinancialState>) {
    const unlock = await this.lock();
    try {
      const next = await mutate(await this.read(config));
      await this.writeUnlocked(next);
      return next;
    } finally { await unlock(); }
  }
}

export function publicFinancialSnapshot(snapshot: FinancialSnapshot, config: FinancialConfig, now = Date.now()): FinancialSnapshot {
  if (snapshot.lastUpdate && snapshot.status !== "not_configured" && now - Date.parse(snapshot.lastUpdate) > config.staleAfterMs) {
    return { ...snapshot, status: "stale", threshold: { ...snapshot.threshold, distributionAvailable: false }, lastError: "On-chain observations are older than the configured freshness limit" };
  }
  return snapshot;
}

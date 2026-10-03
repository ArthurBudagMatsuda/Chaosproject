import { setTimeout as delay } from "node:timers/promises";
import { getMarketConfig } from "../src/server/market/config.ts";
import { DexClient } from "../src/server/market/dex-client.ts";
import { MarketStore } from "../src/server/market/store.ts";
import { scanMarket } from "../src/server/market/scanner.ts";
import { getFinancialConfig } from "../src/server/financial/config.ts";
import { SolanaProvider } from "../src/server/financial/solana-provider.ts";
import { FinancialStore } from "../src/server/financial/store.ts";
import { monitorFinancialState } from "../src/server/financial/monitor.ts";

const config = getMarketConfig();
if (!config.queries.length && !config.seedAddresses.length) throw new Error("Configure discovery queries or seed addresses");
if (Object.values(config.weights).every(w => w === 0)) throw new Error("At least one index component weight must be positive");
const store = new MarketStore(config);
const unlock = await store.lock();
const controller = new AbortController();
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => controller.abort());
const reader = new DexClient(config);
const financialConfig = getFinancialConfig();
const financialStore = new FinancialStore(financialConfig);
const solana = new SolanaProvider(financialConfig);

async function runMarket() {
  let state = await store.read(config);
  const scheduled = state.snapshot.nextEvaluation ? Date.parse(state.snapshot.nextEvaluation) : 0;
  if (!process.argv.includes("--once") && scheduled > Date.now()) await delay(scheduled - Date.now(), undefined, { signal: controller.signal });
  do {
    state = await scanMarket(state, reader, config, controller.signal);
    await store.write(state);
    console.log(JSON.stringify({ service: "market", status: state.snapshot.status, eligibleTokens: state.snapshot.eligibleTokenCount, chaosIndex: state.snapshot.chaosIndex, lastUpdate: state.snapshot.lastUpdate, nextEvaluation: state.snapshot.nextEvaluation, providerErrors: state.snapshot.coverage.errors }));
    if (process.argv.includes("--once")) return state.snapshot.status !== "unavailable";
    await delay(Math.max(1000, Date.parse(state.snapshot.nextEvaluation) - Date.now()), undefined, { signal: controller.signal });
  } while (!controller.signal.aborted);
  return true;
}

async function runFinancial() {
  do {
    const state = await financialStore.update(financialConfig, current => monitorFinancialState(current, solana, financialConfig, controller.signal));
    console.log(JSON.stringify({ service: "financial", status: state.snapshot.status, balanceSol: state.snapshot.feeWallet.balanceSol, threshold: state.snapshot.threshold.currentThreshold, lastUpdate: state.snapshot.lastUpdate, nextEvaluation: state.snapshot.nextEvaluation }));
    if (process.argv.includes("--once")) return state.snapshot.status !== "unavailable";
    await delay(financialConfig.monitorIntervalMs, undefined, { signal: controller.signal });
  } while (!controller.signal.aborted);
  return true;
}
try {
  const results = await Promise.all([runMarket(), runFinancial()]);
  if (process.argv.includes("--once") && results.some(result => !result)) process.exitCode = 1;
} catch (error) {
  if (!controller.signal.aborted) { console.error(error instanceof Error ? error.message : "Scanner failed"); process.exitCode = 1; }
} finally { await unlock(); }

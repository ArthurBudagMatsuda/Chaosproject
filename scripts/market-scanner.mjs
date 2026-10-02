import { setTimeout as delay } from "node:timers/promises";
import { getMarketConfig } from "../src/server/market/config.ts";
import { DexClient } from "../src/server/market/dex-client.ts";
import { MarketStore } from "../src/server/market/store.ts";
import { scanMarket } from "../src/server/market/scanner.ts";

const config = getMarketConfig();
if (!config.queries.length && !config.seedAddresses.length) throw new Error("Configure discovery queries or seed addresses");
if (Object.values(config.weights).every(w => w === 0)) throw new Error("At least one index component weight must be positive");
const store = new MarketStore(config);
const unlock = await store.lock();
const controller = new AbortController();
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => controller.abort());
const reader = new DexClient(config);
try {
  let state = await store.read(config);
  // Preserve provider limits across restarts; scans do not run early when a future evaluation is saved.
  const scheduled = state.snapshot.nextEvaluation ? Date.parse(state.snapshot.nextEvaluation) : 0;
  if (!process.argv.includes("--once") && scheduled > Date.now()) await delay(scheduled - Date.now(), undefined, { signal: controller.signal });
  do {
    state = await scanMarket(state, reader, config, controller.signal);
    await store.write(state);
    console.log(JSON.stringify({ status: state.snapshot.status, eligibleTokens: state.snapshot.eligibleTokenCount, chaosIndex: state.snapshot.chaosIndex, lastUpdate: state.snapshot.lastUpdate, nextEvaluation: state.snapshot.nextEvaluation, providerErrors: state.snapshot.coverage.errors }));
    if (process.argv.includes("--once")) {
      if (state.snapshot.status === "unavailable") process.exitCode = 1;
      break;
    }
    await delay(Math.max(1000, Date.parse(state.snapshot.nextEvaluation) - Date.now()), undefined, { signal: controller.signal });
  } while (!controller.signal.aborted);
} catch (error) {
  if (!controller.signal.aborted) { console.error(error instanceof Error ? error.message : "Scanner failed"); process.exitCode = 1; }
} finally { await unlock(); }

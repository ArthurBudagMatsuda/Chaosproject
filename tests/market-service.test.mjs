import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getMarketConfig } from "../src/server/market/config.ts";
import { parsePair, canonicalTokens, isEligible } from "../src/server/market/pairs.ts";
import { calculateChaosIndex, normalizeComponent, relativeActivity } from "../src/server/market/index-calculator.ts";
import { emptyState, MarketStore, publicSnapshot } from "../src/server/market/store.ts";
import { scanMarket, reconcileThreshold } from "../src/server/market/scanner.ts";
import { DexClient } from "../src/server/market/dex-client.ts";
import { marketResponse } from "../src/server/market/api.ts";

const now = Date.UTC(2026, 9, 2);
const config = getMarketConfig({});
const address = "A".repeat(32), pairAddress = "B".repeat(32);

function pair(overrides = {}) {
  return {
    chainId: "solana",
    pairAddress,
    dexId: "test",
    baseToken: { address, symbol: "TEST", name: "Test fixture only" },
    marketCap: 2e6,
    liquidity: { usd: 5e5 },
    volume: { h24: 2e5 },
    priceUsd: "1",
    priceChange: { h1: 10, h24: 20 },
    txns: { h24: { buys: 1000, sells: 1000 } },
    pairCreatedAt: now - 40 * 86400000,
    ...overrides,
  };
}

const token = (overrides = {}) => ({ ...parsePair(pair(overrides), new Date(now).toISOString()), holders: overrides.holders ?? null });
const observation = (overrides = {}) => ({
  at: now - 300000,
  pairAddress,
  priceUsd: 1,
  marketCap: 1e6,
  liquidity: 2.5e5,
  volume24h: 1e5,
  holders: 100,
  transactionCount: 1000,
  ...overrides,
});

function saturatedToken(tokenAddress, overrides = {}) {
  return {
    ...token({
      marketCap: 2e6,
      liquidity: { usd: 5e5 },
      volume: { h24: 2e5 },
      priceChange: { h1: 10, h24: 20 },
      txns: { h24: { buys: 1000, sells: 1000 } },
    }),
    tokenAddress,
    holders: 200,
    ...overrides,
  };
}

function saturatedHistory(tokens) {
  return Object.fromEntries(tokens.map(value => [value.tokenAddress, [observation({ pairAddress: value.pairAddress })]]));
}

test("eligibility uses strict USD thresholds, inclusive minimum pair age, and rejects missing fields", () => {
  assert.equal(isEligible(token(), config, now), true);
  for (const overrides of [{ marketCap: 1e6 }, { liquidity: { usd: 250000 } }, { volume: { h24: 100000 } }, { marketCap: undefined, fdv: 1e9 }, { pairCreatedAt: null }, { pairCreatedAt: now + 1 }, { pairCreatedAt: now - 29 * 86400000 }]) {
    assert.equal(isEligible(token(overrides), config, now), false);
  }
  assert.equal(isEligible(token({ pairCreatedAt: now - 30 * 86400000 }), config, now), true);
  assert.equal(parsePair(pair({ chainId: "ethereum" }), "now"), null);
  assert.equal(parsePair(pair({ priceUsd: "NaN" }), "now").priceUsd, null);
});

test("one token is counted once using its highest-liquidity pair", () => {
  const a = token(), b = token({ pairAddress: "C".repeat(32), liquidity: { usd: 9e5 } });
  const result = canonicalTokens([a, b, a]);
  assert.equal(result.length, 1);
  assert.equal(result[0].pairAddress, b.pairAddress);
});

test("seven configured weights total 100 percent and bounds are validated", () => {
  assert.deepEqual(config.weights, { fees: .25, volume: .25, marketCap: .1, liquidity: .1, holders: .1, transactions: .1, price: .1 });
  assert.ok(Math.abs(Object.values(config.weights).reduce((sum, value) => sum + value, 0) - 1) < Number.EPSILON);
  const custom = getMarketConfig({ CHAOS_WEIGHT_FEES: ".4", CHAOS_WEIGHT_VOLUME: ".1" });
  assert.equal(custom.weights.fees, .4);
  assert.equal(custom.weights.volume, .1);
  assert.throws(() => getMarketConfig({ CHAOS_SCAN_INTERVAL_SECONDS: "NaN" }));
  assert.throws(() => getMarketConfig({ CHAOS_EVENT_REARM_THRESHOLD: "100" }));
});

test("component normalization is bounded and relative activity detects growth and decline", () => {
  assert.equal(normalizeComponent(15, 30), 50);
  assert.equal(normalizeComponent(300, 30), 100);
  assert.equal(normalizeComponent(null, 30), null);
  assert.equal(relativeActivity(200, [100]), 100);
  assert.equal(relativeActivity(50, [100]), 50);
  assert.equal(relativeActivity(100, []), null);
});

test("missing components stay null and available weights are renormalized", () => {
  const tokens = [saturatedToken(address, { holders: null }), saturatedToken("C".repeat(32), { holders: null })];
  const result = calculateChaosIndex(tokens, {}, config, now);
  assert.equal(result.components.volume.score, null);
  assert.equal(result.components.marketCap.score, null);
  assert.equal(result.components.holders.score, null);
  assert.equal(result.components.price.score, 100);
  assert.equal(result.components.price.effectiveWeight, 1);
  assert.equal(result.dataCoverage.marketComponentsAvailable, 1);
  assert.equal(result.ready, false);
  assert.equal(calculateChaosIndex([], {}, config, now).chaosIndex, null);
});

test("volume, market-cap, liquidity, holder, transaction and price activity are calculated per token", () => {
  const tokens = [saturatedToken(address), saturatedToken("C".repeat(32))];
  const result = calculateChaosIndex(tokens, saturatedHistory(tokens), config, now);
  for (const name of ["volume", "marketCap", "liquidity", "holders", "transactions", "price"]) {
    assert.equal(result.components[name].score, 100, name);
  }
  assert.equal(result.tokenActivity.length, 2);
  assert.equal(result.tokensWithSufficientData.length, 2);
  assert.equal(result.tokenActivity[0].historicalObservations.length, 1);
  assert.equal(result.tokenActivity[0].transactionCount, 2000);
});

test("median aggregation prevents one extreme token from dominating the global index", () => {
  const high = saturatedToken(address);
  const stableA = saturatedToken("C".repeat(32), { volume24h: 1e5, holders: 100, marketCap: 1e6, liquidity: 2.5e5, transactions: { buys24h: 500, sells24h: 500 }, priceChange: { m5: null, h1: 0, h6: null, h24: 0 } });
  const stableB = { ...stableA, tokenAddress: "D".repeat(32) };
  const tokens = [high, stableA, stableB];
  const result = calculateChaosIndex(tokens, saturatedHistory(tokens), config, now);
  assert.equal(result.components.volume.score, 0);
  assert.equal(result.components.marketCap.score, 0);
  assert.equal(result.components.transactions.score, 0);
});

test("rapid fee growth can reach index 100 but insufficient absolute balance blocks distribution", () => {
  const tokens = [saturatedToken(address), saturatedToken("C".repeat(32))];
  const result = calculateChaosIndex(tokens, saturatedHistory(tokens), config, now, { balance: 3.2, previousBalance: 1, minimumBalance: 5, observedAt: "now" });
  assert.equal(result.components.fees.score, 100);
  assert.equal(result.activityScore, 100);
  assert.equal(result.chaosIndex, 100);
  assert.equal(result.availableFeeBalance, 3.2);
  assert.equal(result.minimumDistributionBalance, 5);
  assert.equal(result.distributionReady, false);
});

test("sufficient fee balance and saturated activity make distribution ready", () => {
  const tokens = [saturatedToken(address), saturatedToken("C".repeat(32))];
  const result = calculateChaosIndex(tokens, saturatedHistory(tokens), config, now, { balance: 7.4, previousBalance: 7, minimumBalance: 5, observedAt: "now" });
  assert.equal(result.chaosIndex, 100);
  assert.equal(result.distributionReady, true);
  assert.equal(result.ready, true);
});

test("CHAOS EVENT requires distribution readiness, deduplicates at 100 and rearms below threshold", () => {
  const state = emptyState(config);
  const fees = { balance: 7.4, minimumBalance: 5, observedAt: "now" };
  assert.equal(reconcileThreshold(state, 100, true, false, 2, "now", config, 100, fees).events.length, 0);
  const triggered = reconcileThreshold(state, 100, true, true, 2, "now", config, 100, fees);
  assert.equal(triggered.events.length, 1);
  assert.equal(triggered.events[0].simulated, false);
  assert.equal(triggered.events[0].source, "chaos-index-v2");
  assert.equal(triggered.events[0].transaction, null);
  const latched = { ...state, thresholdLatched: true, snapshot: { ...state.snapshot, events: triggered.events } };
  assert.equal(reconcileThreshold(latched, 100, true, true, 2, "later", config, 100, fees).events.length, 1);
  assert.equal(reconcileThreshold(latched, config.eventRearmThreshold, true, false, 2, "later", config).latched, true);
  const rearmed = reconcileThreshold(latched, config.eventRearmThreshold - .01, true, false, 2, "later", config);
  assert.equal(rearmed.latched, false);
  assert.equal(reconcileThreshold({ ...latched, thresholdLatched: false }, 100, true, true, 2, "later", config, 100, fees).events.length, 2);
});

test("scanner deduplicates, applies eligibility, persists token activity and preserves data on outage", async () => {
  let current = pair();
  const reader = { get: async path => path.startsWith("/tokens/") ? [current] : path.includes("search") ? { pairs: [current] } : [] };
  const first = await scanMarket(emptyState(config), reader, config, undefined, () => now);
  assert.equal(first.snapshot.eligibleTokenCount, 1);
  assert.equal(first.snapshot.status, "warming_up");
  assert.equal(first.snapshot.formulaVersion, "activity-progression-v2");
  assert.equal(first.history[address][0].transactionCount, 2000);
  current = pair({ liquidity: { usd: 1 } });
  const second = await scanMarket(first, reader, config, undefined, () => now + 300000);
  assert.equal(second.snapshot.eligibleTokenCount, 0);
  const failed = await scanMarket(first, { get: async () => { throw new Error("Offline"); } }, config, undefined, () => now + 600000);
  assert.equal(failed.snapshot.status, "degraded");
  assert.equal(failed.snapshot.lastUpdate, first.snapshot.lastUpdate);
  assert.equal(failed.snapshot.eventStatus, "WAITING");
});

test("stale data disables distribution readiness and disk persistence remains atomic", async () => {
  const directory = await mkdtemp(join(tmpdir(), "chaos-test-"));
  try {
    const cfg = { ...config, dataDirectory: directory };
    const store = new MarketStore(cfg), unlock = await store.lock();
    await assert.rejects(new MarketStore(cfg).lock(), /already owns/);
    const state = emptyState(cfg);
    state.snapshot.lastUpdate = new Date(now).toISOString();
    state.snapshot.distributionReady = true;
    await store.write(state);
    assert.equal((await store.read(cfg)).schemaVersion, 1);
    const stale = publicSnapshot(state.snapshot, cfg, now + cfg.staleAfterMs + 1);
    assert.equal(stale.status, "stale");
    assert.equal(stale.distributionReady, false);
    await unlock();
    assert.equal(JSON.parse(await readFile(join(directory, "state.json"), "utf8")).schemaVersion, 1);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("GET /api/chaos exposes progression, components, coverage and formula metadata", async () => {
  const directory = await mkdtemp(join(tmpdir(), "chaos-api-"));
  const previousDirectory = process.env.CHAOS_DATA_DIR;
  try {
    process.env.CHAOS_DATA_DIR = directory;
    const cfg = getMarketConfig(process.env);
    const state = emptyState(cfg);
    state.snapshot.lastUpdate = new Date(now).toISOString();
    state.snapshot.dataTimestamp = state.snapshot.lastUpdate;
    await new MarketStore(cfg).write(state);
    const response = await marketResponse("chaos");
    const body = await response.json();
    assert.equal(response.status, 200);
    for (const key of ["chaosIndex", "activityScore", "distributionReady", "availableFeeBalance", "minimumDistributionBalance", "nextEventThreshold", "components", "componentWeights", "eligibleTokenCount", "tokensWithSufficientData", "dataTimestamp", "formulaVersion", "systemState"]) {
      assert.ok(key in body, key);
    }
    assert.equal(body.formulaVersion, "activity-progression-v2");
    assert.equal(body.distributionReady, false);
  } finally {
    if (previousDirectory === undefined) delete process.env.CHAOS_DATA_DIR;
    else process.env.CHAOS_DATA_DIR = previousDirectory;
    await rm(directory, { recursive: true, force: true });
  }
});

test("provider client caches reads and honors 429 Retry-After without repeated upstream calls", async () => {
  let requests = 0;
  const cached = new DexClient(config, async () => { requests++; return Response.json([]); });
  await cached.get("/test");
  await cached.get("/test");
  assert.equal(requests, 1);
  const limited = new DexClient(config, async () => { requests++; return new Response(null, { status: 429, headers: { "Retry-After": "120" } }); });
  await assert.rejects(limited.get("/rate-limited"));
  assert.ok(limited.cooldownUntil > Date.now() + 110000);
  await assert.rejects(limited.get("/another"), /cooldown/);
  assert.equal(requests, 2);
});

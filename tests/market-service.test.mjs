import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getMarketConfig } from "../src/server/market/config.ts";
import { parsePair, canonicalTokens, isEligible } from "../src/server/market/pairs.ts";
import { calculateChaosIndex, normalizeComponent } from "../src/server/market/index-calculator.ts";
import { emptyState, MarketStore, publicSnapshot } from "../src/server/market/store.ts";
import { scanMarket, reconcileThreshold } from "../src/server/market/scanner.ts";
import { DexClient } from "../src/server/market/dex-client.ts";

const now = Date.UTC(2026, 9, 2);
const config = getMarketConfig({});
const address = "A".repeat(32), pairAddress = "B".repeat(32);
function pair(overrides = {}) {
  return { chainId: "solana", pairAddress, dexId: "test", baseToken: { address, symbol: "TEST", name: "Test fixture only" }, marketCap: 2e6, liquidity: { usd: 5e5 }, volume: { h24: 2e5 }, priceUsd: "1", priceChange: { h1: 10, h24: 20 }, txns: { h24: { buys: 1000, sells: 1000 } }, pairCreatedAt: now - 40 * 86400000, ...overrides };
}
const token = (overrides = {}) => parsePair(pair(overrides), new Date(now).toISOString());

test("eligibility uses strict USD thresholds, inclusive minimum pair age, and rejects missing fields", () => {
  assert.equal(isEligible(token(), config, now), true);
  for (const overrides of [{ marketCap: 1e6 }, { liquidity: { usd: 250000 } }, { volume: { h24: 100000 } }, { marketCap: undefined, fdv: 1e9 }, { pairCreatedAt: null }, { pairCreatedAt: now + 1 }, { pairCreatedAt: now - 29 * 86400000 }]) assert.equal(isEligible(token(overrides), config, now), false);
  assert.equal(isEligible(token({ pairCreatedAt: now - 30 * 86400000 }), config, now), true);
  assert.equal(parsePair(pair({ chainId: "ethereum" }), "now"), null);
  assert.equal(parsePair(pair({ priceUsd: "NaN" }), "now").priceUsd, null);
});

test("one token is counted once, using highest-liquidity pair, not summed market caps", () => {
  const a = token(), b = token({ pairAddress: "C".repeat(32), liquidity: { usd: 9e5 } });
  const result = canonicalTokens([a, b, a]);
  assert.equal(result.length, 1); assert.equal(result[0].pairAddress, b.pairAddress);
});

test("config defaults and configurable bounds are validated", () => {
  assert.equal(config.minMarketCapUsd, 1e6); assert.equal(config.minAgeDays, 30);
  assert.equal(getMarketConfig({ CHAOS_MIN_MARKET_CAP_USD: "2000000" }).minMarketCapUsd, 2e6);
  assert.throws(() => getMarketConfig({ CHAOS_SCAN_INTERVAL_SECONDS: "NaN" }));
  assert.throws(() => getMarketConfig({ CHAOS_PROVIDER_REQUEST_GAP_MS: "1" }));
});

test("missing history is missing, never fabricated as zero; scores normalize and stay bounded", () => {
  const a = token(), b = { ...a, tokenAddress: "C".repeat(32), priceChange: { ...a.priceChange, h1: -10 } };
  const result = calculateChaosIndex([a,b], {}, config, now);
  assert.equal(result.ready, false);
  assert.equal(result.components.volatility.score, null);
  assert.equal(result.components.volumeChange.score, null);
  assert.equal(result.components.priceDispersion.score, 50);
  assert.ok(result.chaosIndex >= 0 && result.chaosIndex <= 100);
  assert.equal(calculateChaosIndex([], {}, config, now).chaosIndex, null);
  assert.equal(normalizeComponent(100, 1), 100); assert.equal(normalizeComponent(null, 1), null);
});

test("history comparisons reject pair switches and long gaps", () => {
  const a = token();
  const history = { [address]: [
    { at: now - 300000, pairAddress: "C".repeat(32), priceUsd: 1, liquidity: 1e5, volume24h: 1e5 },
    { at: now, pairAddress, priceUsd: 2, liquidity: 5e5, volume24h: 2e5 },
  ] };
  const result = calculateChaosIndex([a], history, config, now);
  assert.equal(result.components.volumeChange.score, null);
  assert.equal(result.components.liquidityChange.score, null);
  const longGap = { [address]: [ { ...history[address][1], at: now - config.maxComparisonGapMs - 1 }, history[address][1] ] };
  assert.equal(calculateChaosIndex([a], longGap, config, now).components.volumeChange.score, null);
});

test("five complete saturated components reach 100 and report healthy readiness", () => {
  const a = token({ priceChange: { h1: 50 }, txns: { h24: { buys: 100000, sells: 100000 } } });
  const b = { ...a, tokenAddress: "C".repeat(32), priceChange: { ...a.priceChange, h1: -50 } };
  const samples = [1, 10, 1].map((priceUsd, i) => ({ at: now - (2 - i) * 300000, pairAddress, priceUsd, liquidity: i === 1 ? 1e5 : 5e5, volume24h: i === 1 ? 1e5 : 2e5 }));
  const result = calculateChaosIndex([a,b], { [a.tokenAddress]: samples, [b.tokenAddress]: samples }, config, now);
  assert.equal(result.ready, true); assert.equal(result.chaosIndex, 100);
  for (const c of Object.values(result.components)) assert.equal(c.score, 100);
});

test("backend threshold emits one simulated event, latches across scans/restart, and rearms below threshold", () => {
  const state = emptyState(config);
  let result = reconcileThreshold(state, 100, false, 2, "now", config);
  assert.equal(result.events.length, 0);
  result = reconcileThreshold(state, 100, true, 2, "now", config);
  assert.equal(result.events.length, 1); assert.equal(result.events[0].simulated, true); assert.equal(result.events[0].transaction, null);
  const latched = { ...state, thresholdLatched: result.latched, snapshot: { ...state.snapshot, events: result.events } };
  assert.equal(reconcileThreshold(latched, 100, true, 2, "later", config).events.length, 1);
  const rearmed = reconcileThreshold(latched, 99, true, 2, "later", config);
  assert.equal(rearmed.latched, false);
  assert.equal(reconcileThreshold({ ...latched, thresholdLatched: false }, 100, true, 2, "later", config).events.length, 2);
});

test("scanner deduplicates, applies eligibility, removes tokens failing a later scan, preserves data on outage", async () => {
  let current = pair();
  const reader = { get: async path => path.startsWith("/tokens/") ? [current] : path.includes("search") ? { pairs: [current] } : [] };
  const first = await scanMarket(emptyState(config), reader, config, undefined, () => now);
  assert.equal(first.snapshot.eligibleTokenCount, 1); assert.equal(first.snapshot.status, "warming_up");
  current = pair({ liquidity: { usd: 1 } });
  const second = await scanMarket(first, reader, config, undefined, () => now + 300000);
  assert.equal(second.snapshot.eligibleTokenCount, 0);
  const failed = await scanMarket(first, { get: async () => { throw new Error("Offline"); } }, config, undefined, () => now + 600000);
  assert.equal(failed.snapshot.status, "degraded"); assert.equal(failed.snapshot.lastUpdate, first.snapshot.lastUpdate);
  assert.equal(failed.snapshot.eligibleTokenCount, 1); assert.equal(failed.snapshot.eventStatus, "WAITING");
});

test("disk persistence is atomic, lock prevents two workers, stale data is marked", async () => {
  const directory = await mkdtemp(join(tmpdir(), "chaos-test-"));
  try {
    const cfg = { ...config, dataDirectory: directory };
    const store = new MarketStore(cfg), unlock = await store.lock();
    await assert.rejects(new MarketStore(cfg).lock(), /already owns/);
    const state = emptyState(cfg); state.snapshot.lastUpdate = new Date(now).toISOString();
    await store.write(state); assert.equal((await store.read(cfg)).schemaVersion, 1);
    assert.equal(publicSnapshot(state.snapshot, cfg, now + cfg.staleAfterMs + 1).status, "stale");
    await unlock();
    assert.equal(JSON.parse(await readFile(join(directory, "state.json"), "utf8")).schemaVersion, 1);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("provider client caches reads and honors 429 Retry-After without repeated upstream calls", async () => {
  let requests = 0;
  const cached = new DexClient(config, async () => { requests++; return Response.json([]); });
  await cached.get("/test"); await cached.get("/test"); assert.equal(requests, 1);
  const limited = new DexClient(config, async () => { requests++; return new Response(null, { status: 429, headers: { "Retry-After": "120" } }); });
  await assert.rejects(limited.get("/rate-limited"));
  assert.ok(limited.cooldownUntil > Date.now() + 110000);
  await assert.rejects(limited.get("/another"), /cooldown/); assert.equal(requests, 2);
});

import { getMarketConfig } from "./config.ts";
import { publicSnapshot } from "./store.ts";
import type { MarketSnapshot } from "../../lib/market-types.ts";
import { readFinancialData } from "../financial/api.ts";
import { calculateProgression, progressionSystemState } from "./index-calculator.ts";
import { MarketRefreshError, readMarketState, refreshBlobMarketState, SERVERLESS_REFRESH_MS, stateNeedsRefresh } from "./state-service.ts";

type ApiCache = { expires: number; snapshot?: MarketSnapshot; candidates?: Record<string, number>; storage?: "local-json" | "vercel-blob"; pending?: Promise<MarketSnapshot>; windowStart: number; requests: number };
const globals = globalThis as typeof globalThis & { chaosMarketApi?: ApiCache };
const cache = globals.chaosMarketApi ??= { expires: 0, windowStart: Date.now(), requests: 0 };

export async function marketResponse(kind: "chaos" | "tokens" | "events") {
  const now = Date.now();
  if (now - cache.windowStart >= 60_000) { cache.windowStart = now; cache.requests = 0; }
  if (++cache.requests > 300) return Response.json({ error: "API rate limit reached" }, { status: 429, headers: { "Retry-After": String(Math.ceil((cache.windowStart + 60_000 - now) / 1000)), "Cache-Control": "no-store" } });
  const config = getMarketConfig();
  try {
    if (!cache.snapshot || now >= cache.expires) {
      cache.pending ??= readMarketState(config).then(result => { cache.snapshot = result.state.snapshot; cache.candidates = result.state.candidates; cache.storage = result.storage; cache.expires = Date.now() + 5000; return result.state.snapshot; }).finally(() => { cache.pending = undefined; });
      await cache.pending;
    }
    if (kind === "chaos" && cache.storage === "vercel-blob" && stateNeedsRefresh({ schemaVersion: 1, candidates: cache.candidates ?? {}, history: {}, thresholdLatched: false, discoveryCursor: 0, snapshot: cache.snapshot! }, now, Math.max(config.scanIntervalMs, SERVERLESS_REFRESH_MS), config)) {
      // Finish and persist a due scan within the request lifecycle.
      const state = await refreshBlobMarketState(config);
      cache.snapshot = state.snapshot;
      cache.candidates = state.candidates;
      cache.expires = Date.now() + 5000;
    }
    const freshnessConfig = cache.storage === "vercel-blob" ? { ...config, staleAfterMs: Math.max(config.staleAfterMs, SERVERLESS_REFRESH_MS * 2) } : config;
    let snapshot = publicSnapshot(cache.snapshot!, freshnessConfig, now);
    const financial = await readFinancialData().catch(() => null);
    const names = ["volume", "marketCap", "liquidity", "holders", "transactions", "price"] as const;
    if (snapshot.components && names.every(name => snapshot.components?.[name])) {
      const market = Object.fromEntries(names.map(name => [name, snapshot.components![name]])) as Pick<NonNullable<MarketSnapshot["components"]>, typeof names[number]>;
      const progression = calculateProgression(market, snapshot.eligibleTokenCount, config, financial ? {
        balance: financial.feeWallet.balanceSol,
        minimumBalance: financial.threshold.currentThreshold,
        observedAt: financial.lastUpdate,
        previousBalance: snapshot.availableFeeBalance,
        reliable: ["healthy", "partial"].includes(financial.status),
      } : undefined);
      const distributionReady = progression.distributionReady && snapshot.status === "healthy" && Boolean(financial && ["healthy", "partial"].includes(financial.status));
      snapshot = { ...snapshot, ...progression, distributionReady, systemState: progressionSystemState(progression.chaosIndex, distributionReady) };
    }
    // Consistent system metadata in every endpoint; /tokens and /events are focused views.
    const { events, components, ...system } = snapshot;
    let data: object = kind === "events" ? { ...system, events } : kind === "tokens" ? system : { ...snapshot, components };
    if (kind === "events") {
      data = { ...data, indexEvents: events, simulatedEvents: events.filter(event => event.simulated), verifiedEvents: financial?.verifiedEvents ?? [], distributions: financial?.distributions ?? [] };
    }
    return Response.json(data, { headers: { "Cache-Control": "public, max-age=5, must-revalidate", "X-Data-Source": "dexscreener+solana-rpc", "X-State-Store": cache.storage ?? "unknown", "X-Metric-Type": "activity-progression", "X-Index-Events": "informational-non-custodial", "X-Verified-Events": kind === "events" ? "included-separately" : "not-included" } });
  } catch (error) {
    console.error("CHAOS market refresh failed", error);
    return Response.json({ error: "Market snapshot unavailable", code: error instanceof MarketRefreshError ? error.code : "MARKET_STATE_UNAVAILABLE", chaosIndex: null, activityScore: null, distributionReady: false, availableFeeBalance: null, minimumDistributionBalance: 0, nextEventThreshold: 100, systemState: "UNAVAILABLE", eligibleTokenCount: 0, eligibleTokens: [], tokenActivity: [], tokensWithSufficientData: [], lastUpdate: null, nextEvaluation: null, eventStatus: "WAITING", components: null }, { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "15" } });
  }
}

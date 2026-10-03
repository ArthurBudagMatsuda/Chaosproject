import { getMarketConfig } from "./config.ts";
import { MarketStore, publicSnapshot } from "./store.ts";
import type { MarketSnapshot } from "../../lib/market-types.ts";
import { readFinancialData } from "../financial/api.ts";

type ApiCache = { expires: number; snapshot?: MarketSnapshot; pending?: Promise<MarketSnapshot>; windowStart: number; requests: number };
const globals = globalThis as typeof globalThis & { chaosMarketApi?: ApiCache };
const cache = globals.chaosMarketApi ??= { expires: 0, windowStart: Date.now(), requests: 0 };

export async function marketResponse(kind: "chaos" | "tokens" | "events") {
  const now = Date.now();
  if (now - cache.windowStart >= 60_000) { cache.windowStart = now; cache.requests = 0; }
  if (++cache.requests > 300) return Response.json({ error: "API rate limit reached" }, { status: 429, headers: { "Retry-After": String(Math.ceil((cache.windowStart + 60_000 - now) / 1000)), "Cache-Control": "no-store" } });
  const config = getMarketConfig();
  try {
    if (!cache.snapshot || now >= cache.expires) {
      cache.pending ??= new MarketStore(config).read(config).then(state => { cache.snapshot = state.snapshot; cache.expires = Date.now() + 5000; return state.snapshot; }).finally(() => { cache.pending = undefined; });
      await cache.pending;
    }
    const snapshot = publicSnapshot(cache.snapshot!, config, now);
    // Consistent system metadata in every endpoint; /tokens and /events are focused views.
    const { events, components, ...system } = snapshot;
    let data: object = kind === "events" ? { ...system, events } : kind === "tokens" ? system : { ...snapshot, components };
    if (kind === "events") {
      const financial = await readFinancialData().catch(() => null);
      data = { ...data, simulatedEvents: events, verifiedEvents: financial?.verifiedEvents ?? [], distributions: financial?.distributions ?? [] };
    }
    return Response.json(data, { headers: { "Cache-Control": "public, max-age=5, must-revalidate", "X-Data-Source": "dexscreener", "X-Metric-Type": "experimental", "X-Events-Simulated": "true", "X-Verified-Events": kind === "events" ? "included-separately" : "not-included" } });
  } catch {
    return Response.json({ error: "Market snapshot unavailable", chaosIndex: null, systemState: "UNAVAILABLE", eligibleTokenCount: 0, eligibleTokens: [], lastUpdate: null, nextEvaluation: null, eventStatus: "WAITING" }, { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "15" } });
  }
}

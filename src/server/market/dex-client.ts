import { setTimeout as delay } from "node:timers/promises";
import type { MarketConfig } from "./config.ts";

export class DexClient {
  private cache = new Map<string, { expires: number; data: unknown }>();
  private nextRequest = 0;
  private blockedUntil = 0;
  private consecutiveFailures = 0;
  constructor(privateConfig: MarketConfig, fetcher: typeof fetch = fetch) { this.config = privateConfig; this.fetcher = fetcher; }
  private config: MarketConfig;
  private fetcher: typeof fetch;
  get cooldownUntil() { return this.blockedUntil; }

  async get(path: string, signal?: AbortSignal): Promise<unknown> {
    if (!path.startsWith("/") || path.startsWith("//")) throw new Error("Invalid provider path");
    const cached = this.cache.get(path);
    if (cached && cached.expires > Date.now()) return cached.data;
    if (Date.now() < this.blockedUntil) throw new Error("Provider cooldown active");
    for (let attempt = 0; attempt < 2; attempt++) {
      // All provider requests are serial in the worker, below even the 60/min discovery limit.
      const wait = Math.max(0, this.nextRequest - Date.now());
      if (wait) await delay(wait, undefined, { signal });
      this.nextRequest = Date.now() + this.config.requestGapMs;
      try {
        const timeout = AbortSignal.timeout(this.config.requestTimeoutMs);
        const response = await this.fetcher(`https://api.dexscreener.com${path}`, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout, headers: { Accept: "application/json" }, cache: "no-store" });
        if (response.status === 429) {
          const retry = response.headers.get("retry-after");
          const seconds = retry !== null && Number.isFinite(Number(retry)) ? Number(retry) * 1000 : retry ? Date.parse(retry) - Date.now() : 60_000;
          this.blockedUntil = Date.now() + Math.max(60_000, Number.isFinite(seconds) ? seconds : 60_000);
          throw new Error("Provider rate limit reached");
        }
        if (!response.ok) throw new Error(`Provider HTTP ${response.status}`);
        const data: unknown = await response.json();
        this.consecutiveFailures = 0;
        this.cache.set(path, { data, expires: Date.now() + Math.min(this.config.requestCacheMs, this.config.scanIntervalMs / 2) });
        for (const [key, value] of this.cache) if (value.expires < Date.now()) this.cache.delete(key);
        return data;
      } catch (error) {
        if (++this.consecutiveFailures >= 2 && this.blockedUntil <= Date.now()) this.blockedUntil = Date.now() + 30_000;
        if (signal?.aborted || this.blockedUntil > Date.now() || attempt === 1) throw error;
        await delay(2000, undefined, { signal });
      }
    }
    throw new Error("Provider unavailable");
  }
}

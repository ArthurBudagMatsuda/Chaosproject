import type { MarketToken } from "../../lib/market-types.ts";
import type { MarketConfig } from "./config.ts";

export const isSolanaAddress = (value: unknown): value is string => typeof value === "string" && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
const record = (v: unknown): Record<string, unknown> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
const numeric = (v: unknown, signed = false) => {
  if ((typeof v !== "number" && typeof v !== "string") || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && (signed || n >= 0) ? n : null;
};

export function parsePair(value: unknown, observedAt: string): MarketToken | null {
  const pair = record(value), base = record(pair.baseToken);
  if (pair.chainId !== "solana" || !isSolanaAddress(base.address) || !isSolanaAddress(pair.pairAddress)) return null;
  const changes = record(pair.priceChange), txn = record(record(pair.txns).h24);
  return {
    chainId: "solana", tokenAddress: base.address, pairAddress: pair.pairAddress,
    symbol: typeof base.symbol === "string" ? base.symbol.slice(0, 40) : "UNKNOWN",
    name: typeof base.name === "string" ? base.name.slice(0, 120) : "Unknown token",
    dexId: typeof pair.dexId === "string" ? pair.dexId : "unknown",
    marketCap: numeric(pair.marketCap), // Never substitute FDV for a missing market cap.
    liquidity: numeric(record(pair.liquidity).usd), volume24h: numeric(record(pair.volume).h24),
    priceUsd: numeric(pair.priceUsd),
    priceChange: { m5: numeric(changes.m5, true), h1: numeric(changes.h1, true), h6: numeric(changes.h6, true), h24: numeric(changes.h24, true) },
    transactions: { buys24h: numeric(txn.buys), sells24h: numeric(txn.sells) },
    holders: null,
    pairCreatedAt: numeric(pair.pairCreatedAt), observedAt,
  };
}

export function canonicalTokens(pairs: MarketToken[]): MarketToken[] {
  const tokens = new Map<string, MarketToken>();
  for (const pair of pairs) {
    const previous = tokens.get(pair.tokenAddress);
    if (!previous || (pair.liquidity ?? -1) > (previous.liquidity ?? -1) || ((pair.liquidity ?? -1) === (previous.liquidity ?? -1) && pair.pairAddress < previous.pairAddress)) tokens.set(pair.tokenAddress, pair);
  }
  return [...tokens.values()].sort((a,b) => a.tokenAddress.localeCompare(b.tokenAddress));
}

export function isEligible(token: MarketToken, config: MarketConfig, now: number): boolean {
  return token.chainId === "solana" && token.marketCap !== null && token.marketCap > config.minMarketCapUsd
    && token.liquidity !== null && token.liquidity > config.minLiquidityUsd
    && token.volume24h !== null && token.volume24h > config.minVolume24hUsd
    && token.pairCreatedAt !== null && token.pairCreatedAt > 0 && token.pairCreatedAt <= now
    && now - token.pairCreatedAt >= config.minAgeDays * 86_400_000;
}

import type { ComponentName, IndexComponent, MarketToken, PriceObservation } from "../../lib/market-types.ts";
import type { MarketConfig } from "./config.ts";

const average = (values: number[]) => values.length ? values.reduce((a,b) => a + b, 0) / values.length : null;
function stdev(values: number[]) {
  const mean = average(values);
  return mean !== null && values.length >= 2 ? Math.sqrt(values.reduce((sum,v) => sum + (v - mean) ** 2, 0) / values.length) : null;
}
export const normalizeComponent = (value: number | null, scale: number) => value === null || !Number.isFinite(value) ? null : Math.max(0, Math.min(100, value / scale * 100));
const descriptions: Record<ComponentName, string> = {
  volatility: "Mean per-token standard deviation of log price returns (%), scaled to a 5-minute interval; requires 3 comparable observations.",
  tradingActivity: "Mean (24h buys + sells) / 1440, transactions per minute; a rolling-window activity proxy.",
  volumeChange: "Mean absolute percentage change in rolling 24h volume versus the previous comparable scan (not discrete interval volume).",
  liquidityChange: "Mean absolute percentage change in selected-pair USD liquidity versus the previous comparable scan.",
  priceDispersion: "Standard deviation of observed 1h price-change percentages across distinct eligible tokens.",
};

export function calculateChaosIndex(tokens: MarketToken[], history: Record<string, PriceObservation[]>, config: MarketConfig, now: number) {
  const values: Record<ComponentName, number[]> = { volatility: [], tradingActivity: [], volumeChange: [], liquidityChange: [], priceDispersion: [] };
  for (const token of tokens) {
    const samples = (history[token.tokenAddress] || []).filter(s => s.pairAddress === token.pairAddress && now - s.at <= config.historyWindowMs);
    const returns: number[] = [];
    for (let i = 1; i < samples.length; i++) {
      const a = samples[i - 1], b = samples[i], gap = b.at - a.at;
      if (a.priceUsd && b.priceUsd && gap > 0 && gap <= config.maxComparisonGapMs) returns.push(Math.log(b.priceUsd / a.priceUsd) * 100 * Math.sqrt(300_000 / gap));
    }
    const volatility = stdev(returns);
    if (volatility !== null && token.priceUsd !== null && token.priceUsd > 0) values.volatility.push(volatility);
    const txns = token.transactions;
    if (txns.buys24h !== null && txns.sells24h !== null) values.tradingActivity.push((txns.buys24h + txns.sells24h) / 1440);
    const previous = samples.at(-2);
    if (previous && now - previous.at <= config.maxComparisonGapMs) {
      if (previous.volume24h && token.volume24h !== null) values.volumeChange.push(Math.abs(token.volume24h / previous.volume24h - 1) * 100);
      if (previous.liquidity && token.liquidity !== null) values.liquidityChange.push(Math.abs(token.liquidity / previous.liquidity - 1) * 100);
    }
    if (token.priceChange.h1 !== null) values.priceDispersion.push(token.priceChange.h1);
  }
  const components = {} as Record<ComponentName, IndexComponent>;
  for (const name of Object.keys(values) as ComponentName[]) {
    const raw = name === "priceDispersion" ? stdev(values[name]) : average(values[name]);
    components[name] = { raw, score: normalizeComponent(raw, config.scales[name]), weight: config.weights[name], sampleCount: values[name].length, coverage: tokens.length ? values[name].length / tokens.length : 0, description: descriptions[name] };
  }
  const available = Object.values(components).filter(c => c.score !== null && c.weight > 0);
  const totalWeight = available.reduce((sum,c) => sum + c.weight, 0);
  const rawScore = totalWeight ? available.reduce((sum,c) => sum + c.score! * c.weight, 0) / totalWeight : null;
  // Avoid rounding 99.999 into a false threshold event. Only true saturation yields 100.
  const chaosIndex = tokens.length < config.minPoolSize || rawScore === null ? null : rawScore >= 100 - 1e-10 ? 100 : Math.min(99.99, Math.round(rawScore * 100) / 100);
  const ready = tokens.length >= config.minPoolSize && totalWeight > 0 && Object.values(components).filter(c => c.weight > 0).every(c => c.score !== null && c.coverage >= config.minCoverage);
  return { chaosIndex, components, ready };
}

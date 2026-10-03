import type {
  ComponentName,
  FeeActivityInput,
  IndexComponent,
  MarketComponentName,
  MarketToken,
  PriceObservation,
  TokenActivity,
} from "../../lib/market-types.ts";
import type { MarketConfig } from "./config.ts";

const marketComponents: MarketComponentName[] = ["volume", "marketCap", "liquidity", "holders", "transactions", "price"];
const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const median = (values: number[]) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const stdev = (values: number[]) => {
  const mean = average(values);
  return mean !== null && values.length >= 2 ? Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length) : null;
};
const finite = (value: number | null | undefined): value is number => typeof value === "number" && Number.isFinite(value);
const roundScore = (value: number | null) => value === null ? null : value >= 100 - 1e-10 ? 100 : Math.min(99.99, Math.round(value * 100) / 100);

export const normalizeComponent = (value: number | null, scale: number) =>
  value === null || !Number.isFinite(value) ? null : Math.max(0, Math.min(100, value / scale * 100));

export function relativeActivity(current: number | null | undefined, previous: Array<number | null | undefined>) {
  if (!finite(current)) return null;
  const baseline = median(previous.filter(finite));
  return baseline === null || baseline <= 0 ? null : Math.abs(current / baseline - 1) * 100;
}

const descriptions: Record<ComponentName, string> = {
  fees: "Fee-wallet accumulation score from minimum-balance progress and unusual balance growth. Absolute sufficiency is checked separately.",
  volume: "Median per-token absolute change in rolling 24h volume versus each token's recent baseline.",
  marketCap: "Median per-token absolute market-cap change versus each token's recent baseline; absolute size is not rewarded.",
  liquidity: "Median per-token absolute liquidity change versus each token's recent baseline.",
  holders: "Median per-token holder-count change versus recent baselines. Unavailable until a reliable holder source is configured.",
  transactions: "Median per-token change in rolling transaction count versus recent baselines.",
  price: "Median per-token price activity using normalized return volatility and current one-hour movement.",
};

function emptyComponent(name: ComponentName, config: MarketConfig): IndexComponent {
  return {
    raw: null,
    score: null,
    weight: config.weights[name],
    effectiveWeight: 0,
    sampleCount: 0,
    coverage: 0,
    available: false,
    description: descriptions[name],
  };
}

function tokenTransactionCount(token: MarketToken) {
  const { buys24h, sells24h } = token.transactions;
  return finite(buys24h) && finite(sells24h) ? buys24h + sells24h : null;
}

function tokenMetrics(token: MarketToken, history: PriceObservation[], config: MarketConfig, now: number): TokenActivity {
  const samples = history
    .filter(sample => sample.pairAddress === token.pairAddress && now - sample.at <= config.historyWindowMs)
    .sort((a, b) => a.at - b.at);
  const previous = samples.filter(sample => sample.at < now && now - sample.at <= config.maxComparisonGapMs * 6).slice(-12);
  const returns: number[] = [];
  const priceSamples = samples.filter(sample => finite(sample.priceUsd) && sample.priceUsd > 0);
  for (let index = 1; index < priceSamples.length; index++) {
    const before = priceSamples[index - 1], current = priceSamples[index];
    const gap = current.at - before.at;
    if (gap > 0 && gap <= config.maxComparisonGapMs) {
      returns.push(Math.abs(Math.log(current.priceUsd! / before.priceUsd!) * 100 * Math.sqrt(300_000 / gap)));
    }
  }
  const priceVolatility = stdev(returns);
  const currentMove = finite(token.priceChange.h1) ? Math.abs(token.priceChange.h1) : null;
  const priceRaw = priceVolatility === null ? currentMove : currentMove === null ? priceVolatility : Math.max(priceVolatility, currentMove);
  const transactionCount = tokenTransactionCount(token);
  const raw: Record<MarketComponentName, number | null> = {
    volume: relativeActivity(token.volume24h, previous.map(sample => sample.volume24h)),
    marketCap: relativeActivity(token.marketCap, previous.map(sample => sample.marketCap)),
    liquidity: relativeActivity(token.liquidity, previous.map(sample => sample.liquidity)),
    holders: relativeActivity(token.holders, previous.map(sample => sample.holders)),
    transactions: relativeActivity(transactionCount, previous.map(sample => sample.transactionCount)),
    price: priceRaw,
  };
  const componentScores = Object.fromEntries(
    marketComponents.map(name => [name, normalizeComponent(raw[name], config.scales[name])]),
  ) as Record<MarketComponentName, number | null>;
  const availableCount = Object.values(componentScores).filter(score => score !== null).length;
  return {
    tokenAddress: token.tokenAddress,
    symbol: token.symbol,
    name: token.name,
    pairAddress: token.pairAddress,
    price: token.priceUsd,
    marketCap: token.marketCap,
    volume: token.volume24h,
    liquidity: token.liquidity,
    holders: token.holders ?? null,
    transactionCount,
    fees: null,
    historicalObservations: samples.slice(-24),
    componentScores,
    sufficientData: availableCount >= 3,
  };
}

function aggregateMarketComponents(tokens: TokenActivity[], config: MarketConfig) {
  const components = {} as Record<MarketComponentName, IndexComponent>;
  for (const name of marketComponents) {
    const scores = tokens.map(token => token.componentScores[name]).filter(finite);
    const coverage = tokens.length ? scores.length / tokens.length : 0;
    const reliable = scores.length > 0 && coverage >= config.minCoverage;
    const rawValues = tokens.map(token => {
      const score = token.componentScores[name];
      return score === null ? null : score / 100 * config.scales[name];
    }).filter(finite);
    components[name] = {
      ...emptyComponent(name, config),
      raw: reliable ? median(rawValues) : null,
      score: reliable ? roundScore(median(scores)) : null,
      sampleCount: scores.length,
      coverage,
      available: reliable,
    };
  }
  return components;
}

function feeComponent(fees: FeeActivityInput | undefined, config: MarketConfig): IndexComponent {
  const component = emptyComponent("fees", config);
  if (!fees || fees.reliable === false || !finite(fees.balance) || fees.balance < 0 || !finite(fees.minimumBalance) || fees.minimumBalance <= 0) return component;
  const balanceProgress = normalizeComponent(fees.balance, fees.minimumBalance);
  const growth = relativeActivity(fees.balance, [fees.previousBalance]);
  const growthScore = normalizeComponent(growth, config.feeGrowthScale);
  const score = growthScore === null ? balanceProgress : Math.max(balanceProgress ?? 0, growthScore);
  return {
    ...component,
    raw: fees.balance,
    score: roundScore(score),
    sampleCount: 1,
    coverage: 1,
    available: true,
  };
}

export function calculateProgression(
  market: Record<MarketComponentName, IndexComponent>,
  tokenCount: number,
  config: MarketConfig,
  fees?: FeeActivityInput,
) {
  const components = {
    fees: feeComponent(fees, config),
    ...Object.fromEntries(marketComponents.map(name => [name, { ...market[name] }])),
  } as Record<ComponentName, IndexComponent>;
  const totalWeight = Object.values(config.weights).reduce((sum, weight) => sum + weight, 0);
  const available = Object.values(components).filter(component => component.available && component.score !== null && component.weight > 0);
  const availableWeight = available.reduce((sum, component) => sum + component.weight, 0);
  for (const component of Object.values(components)) {
    component.effectiveWeight = component.available && availableWeight > 0 ? component.weight / availableWeight : 0;
  }
  const weighted = availableWeight
    ? available.reduce((sum, component) => sum + component.score! * component.weight, 0) / availableWeight
    : null;
  const marketAvailable = marketComponents
    .map(name => components[name])
    .filter(component => component.available && component.score !== null && component.weight > 0);
  const marketWeight = marketAvailable.reduce((sum, component) => sum + component.weight, 0);
  const activity = marketWeight
    ? marketAvailable.reduce((sum, component) => sum + component.score! * component.weight, 0) / marketWeight
    : null;
  const coverageRatio = totalWeight > 0 ? availableWeight / totalWeight : 0;
  const ready = tokenCount >= config.minPoolSize && activity !== null && coverageRatio >= config.minAvailableWeight;
  const chaosIndex = tokenCount < config.minPoolSize || weighted === null ? null : roundScore(weighted);
  const feeSufficient = Boolean(fees && fees.reliable !== false && finite(fees.balance) && fees.balance >= fees.minimumBalance);
  const distributionReady = ready && chaosIndex === 100 && feeSufficient;
  return {
    chaosIndex,
    activityScore: roundScore(activity),
    distributionReady,
    ready,
    components,
    componentWeights: { ...config.weights },
    availableFeeBalance: fees?.balance ?? null,
    minimumDistributionBalance: fees?.minimumBalance ?? 0,
    nextEventThreshold: 100 as const,
    dataCoverage: {
      availableWeight,
      totalWeight,
      ratio: coverageRatio,
      marketComponentsAvailable: marketAvailable.length,
      marketComponentsTotal: 6 as const,
    },
  };
}

export function progressionSystemState(index: number | null, distributionReady: boolean) {
  if (index === null) return "INSUFFICIENT ACTIVITY DATA";
  if (distributionReady) return "CHAOS EVENT READY";
  if (index === 100) return "ACTIVITY THRESHOLD / FEES REQUIRED";
  if (index >= 65) return "HIGH EVENT PROGRESSION";
  if (index >= 35) return "EVENT PROGRESSION ACTIVE";
  return "LOW EVENT PROGRESSION";
}

export function calculateChaosIndex(
  tokens: MarketToken[],
  history: Record<string, PriceObservation[]>,
  config: MarketConfig,
  now: number,
  fees?: FeeActivityInput,
) {
  const tokenActivity = tokens.map(token => tokenMetrics(token, history[token.tokenAddress] || [], config, now));
  const market = aggregateMarketComponents(tokenActivity, config);
  return {
    ...calculateProgression(market, tokens.length, config, fees),
    tokenActivity,
    tokensWithSufficientData: tokenActivity.filter(token => token.sufficientData),
  };
}

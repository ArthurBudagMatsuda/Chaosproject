"use client";

import { useEffect, useState } from "react";
import { Atom, CircleDot } from "lucide-react";
import { readMarketSnapshot } from "@/lib/market-client";
import type { MarketSnapshot } from "@/lib/market-types";
import { Badge, Reveal, SectionLabel } from "./ui";

const money = (value: number | null) => value === null ? "--" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 2 }).format(value);
const time = (value: string | null) => value ? new Date(value).toLocaleString("en-US", { timeZone: "UTC", hour12: false }) + " UTC" : "--";

export function MarketDataPanel() {
  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const data = await readMarketSnapshot(controller.signal);
        if (!controller.signal.aborted) { setSnapshot(data); setError(false); }
      } catch { if (!controller.signal.aborted) setError(true); }
      finally { if (!controller.signal.aborted) timer = setTimeout(poll, 30_000); }
    };
    void poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, []);
  const tokens = snapshot?.eligibleTokens ?? [];
  const activity = new Map((snapshot?.tokenActivity ?? []).map(token => [token.tokenAddress, token]));
  return <>
    <section className="section container" id="events"><Reveal><div className="section-heading"><SectionLabel number="04">THE DISTURBANCES</SectionLabel><Badge>CHAOS EVENTS / INFORMATIONAL</Badge></div><div className="split-heading"><h2>Chaos <span className="serif">events.</span></h2><p className="body-copy">CHAOS EVENT records confirm the configured progression and fee conditions were met. Transfers remain manual and appear separately only after on-chain verification.</p></div>
      {error && <p className="market-error" role="status">Market service unavailable. Previously displayed observations may be outdated.</p>}
      {snapshot?.events.length ? <div className="events-grid">{snapshot.events.slice(0, 6).map(event => <article className="event-card" key={event.id}><div className="event-card-top"><CircleDot size={20} /><Badge>{event.simulated ? "LEGACY INDEX RECORD" : "CHAOS EVENT"}</Badge></div><h3>CHAOS_EVENT_TRIGGERED</h3><dl><div><dt>Index at trigger</dt><dd>{event.chaosIndex}%</dd></div><div><dt>Activity score</dt><dd>{event.activityScore === undefined || event.activityScore === null ? "--" : `${event.activityScore}%`}</dd></div><div><dt>Eligible tokens</dt><dd>{event.eligibleTokenCount}</dd></div><div><dt>Timestamp</dt><dd className="market-event-time">{time(event.timestamp)}</dd></div><div><dt>Transaction</dt><dd>--</dd></div></dl><div className="event-foot mono">TRIGGER CONDITION MET / NO AUTOMATIC TRANSFER</div></article>)}</div> : <div className="market-empty"><CircleDot size={20} /><p>No Chaos Events recorded.</p><span className="mono">AN EVENT REQUIRES 100% PROGRESS, SUFFICIENT COVERAGE AND THE MINIMUM FEE BALANCE.</span></div>}
    </Reveal></section>
    <section className="section container pool-section" id="pool"><Reveal><div className="section-heading"><SectionLabel number="05">THE POSSIBILITIES</SectionLabel><Badge>DEX SCREENER / MARKET DATA</Badge></div><div className="split-heading"><h2>The Chaos <span className="serif">Pool.</span></h2><p className="body-copy">Eligible tokens in the observed Solana sample.<br />Eligibility is not an endorsement or price prediction.</p></div>
      <div className="market-health mono" role="status"><span>SCANNER: {error ? "UNAVAILABLE" : snapshot?.status.replaceAll("_", " ").toUpperCase() ?? "LOADING"}</span><span>{tokens.length} ELIGIBLE TOKENS</span><span>LAST UPDATE: {time(snapshot?.lastUpdate ?? null)}</span><span>NEXT EVALUATION: {time(snapshot?.nextEvaluation ?? null)}</span></div>
      {snapshot?.eligibility && <p className="demo-note mono">AUTOMATIC DISCOVERY: MCAP &gt; {money(snapshot.eligibility.minMarketCapUsd)} / LIQUIDITY &gt; {money(snapshot.eligibility.minLiquidityUsd)} / 24H VOLUME &gt; {money(snapshot.eligibility.minVolume24hUsd)}. PROJECT-ADDED TOKENS BYPASS THESE THRESHOLDS. NO MINIMUM AGE.</p>}
      {tokens.length ? <div className="pool-table-wrap"><table className="pool-table"><caption className="sr-only">Provider-reported Solana market observations, one representative pair per eligible token.</caption><thead><tr><th scope="col">TOKEN / ADDRESS</th><th scope="col">MARKET CAP</th><th scope="col">LIQUIDITY</th><th scope="col">24H VOLUME</th><th scope="col">PRICE / 24H CHANGE</th><th scope="col">HOLDERS</th><th scope="col">24H TX</th><th scope="col">STATUS</th></tr></thead><tbody>{tokens.map(token => { const metrics = activity.get(token.tokenAddress); return <tr key={token.tokenAddress}><th scope="row"><div className="token-cell"><span className="token-icon accent"><Atom size={20} /></span><div><span>{token.symbol}</span><small>{token.name}</small><a className="market-address" href={`https://dexscreener.com/solana/${token.pairAddress}`} target="_blank" rel="noopener noreferrer" title={token.tokenAddress}>{token.tokenAddress.slice(0, 5)}…{token.tokenAddress.slice(-5)} ↗</a></div></div></th><td>{money(token.marketCap)}</td><td>{money(token.liquidity)}</td><td>{money(token.volume24h)}</td><td>{token.priceUsd === null ? "--" : `$${token.priceUsd.toPrecision(5)}`}<small className="market-price-change">{token.priceChange.h24 === null ? "--" : `${token.priceChange.h24.toFixed(2)}%`}</small></td><td>{metrics?.holders ?? "--"}</td><td>{metrics?.transactionCount ?? "--"}</td><td><span className="eligible">{error || snapshot?.status === "stale" || snapshot?.status === "unavailable" ? "STALE" : metrics?.sufficientData ? "MEASURED" : "WARMING UP"}</span></td></tr>; })}</tbody></table></div> : <div className="market-empty"><Atom size={20} /><p>{snapshot?.lastUpdate ? "No observed tokens currently pass the configured filters." : "Waiting for the market scanner’s first successful evaluation."}</p></div>}
      <p className="demo-note mono">SAMPLED DISCOVERY / NOT ALL SOLANA TOKENS. VALUES ARE PROVIDER-REPORTED, NOT DIRECT ON-CHAIN VERIFICATION.</p>
      {snapshot?.components && <div className="market-components">{Object.entries(snapshot.components).map(([name, c]) => <div key={name}><span className="mono">{name.replace(/([A-Z])/g, " $1").toUpperCase()}</span><strong>{c.score === null ? "--" : c.score.toFixed(1)}<small> / 100</small></strong><span className="mono">COVERAGE {(c.coverage * 100).toFixed(0)}%</span></div>)}</div>}
      <p className="demo-note">Project-defined market metric. Historical components need multiple comparable scans; partial scores are marked as warming up. This metric is not a scientific measure of market chaos.</p>
    </Reveal></section>
  </>;
}

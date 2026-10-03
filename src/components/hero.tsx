"use client";

import { useState } from "react";
import { ArrowDown, ArrowUpRight, Pause, Play } from "lucide-react";
import { Attractor } from "./attractor";
import { systemState } from "@/lib/chaos-data";
import { Badge } from "./ui";
import { useChaosIndex } from "@/hooks/use-chaos-index";

export function Hero() {
  const { live, liveError } = useChaosIndex();
  const index = live.chaosIndex;
  const [paused, setPaused] = useState(false);
  return <section className="hero" aria-labelledby="hero-title">
    <div className="hero-grid" aria-hidden="true" />
    <div className="container hero-top"><span className="mono"><span className="status-dot" /> SOLANA MARKET OBSERVATORY</span><span className="mono hero-coordinate">SENSITIVE TO INITIAL CONDITIONS</span></div>
    <div className="hero-content container">
      <div className="hero-kicker"><span className="tiny-cross">+</span> ORDER IS AN ILLUSION.</div>
      <h1 id="hero-title">CHAOS<span className="hero-title-period">.</span></h1>
      <p className="hero-subtitle">THE SYSTEM IS UNSTABLE.</p>
      <p className="hero-quote">Small changes can create massive consequences.</p>
      <p className="mode-description mono">{liveError ? "MARKET SOURCE UNAVAILABLE" : live.provenance === "unconfigured" ? "AWAITING MARKET DATA" : live.provenance === "market-data" ? `DEX SCREENER · ${live.market?.status.replaceAll("_", " ").toUpperCase()} · READ-ONLY INDEX` : "READ-ONLY SOURCE DATA"}</p>
      <div className="experiment-field">
        <Attractor index={index ?? 0} paused={paused || index === null} />
        <div className="field-corner top-left" /><div className="field-corner top-right" /><div className="field-corner bottom-left" /><div className="field-corner bottom-right" />
        <div className="field-annotation annotation-left mono"><span>LORENZ ATTRACTOR</span><span>σ 10 · ρ 28 · β 8/3</span><span className="annotation-rule" /></div>
        <div className="index-display"><div className="index-label mono">CHAOS INDEX <Badge>{live.provenance === "market-data" ? "MARKET DATA" : "AWAITING DATA"}</Badge></div><div className="index-number" aria-label={`Read-only Chaos Index ${index === null ? "unavailable" : `${index.toFixed(2)} percent`}`}>{index === null ? "--" : index.toFixed(2)}<span>%</span></div><div className="state-label mono">CURRENT SYSTEM STATE</div><div className="state-value mono"><span className="status-dot" />{index === null ? live.market?.systemState ?? "AWAITING DATA SOURCE" : systemState(index)}</div>{live.provenance !== "unconfigured" && <div className="mono live-phase" role="status">{live.provenance === "market-data" ? (live.phase === "triggered" ? "INDEX THRESHOLD RECORDED / INFORMATIONAL ONLY" : `${live.market?.eligibleTokenCount ?? 0} ELIGIBLE TOKENS / READ ONLY`) : `REPORTED PHASE: ${live.phase.replaceAll("-", " ").toUpperCase()}`}</div>}</div>
        <div className="field-annotation annotation-right mono"><span>DETERMINISTIC SYSTEM</span><span>UNPREDICTABLE OUTCOME</span><span className="annotation-rule" /></div>
        <div className="field-bottom"><span className="mono">FIG. 01 — THE BUTTERFLY EFFECT</span><div className="field-actions"><button onClick={() => setPaused(!paused)} aria-label={paused ? "Resume particle animation" : "Pause particle animation"}>{paused ? <Play size={14} /> : <Pause size={14} />}</button></div></div>
      </div>
      <div className="hero-buttons"><a className="button primary" href="#engine">Explore the Chaos Engine <ArrowUpRight size={17} /></a><a href="#about" className="button secondary">Understand the theory <ArrowDown size={15} /></a></div>
    </div>
    <div className="hero-bottom container mono"><span>A SMALL CHANGE. AN ENTIRELY DIFFERENT FUTURE.</span><a href="#about">SCROLL TO OBSERVE <ArrowDown size={12} /></a></div>
  </section>;
}

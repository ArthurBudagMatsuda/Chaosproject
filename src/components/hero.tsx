"use client";

import { useState } from "react";
import { ArrowDown, ArrowUpRight, Pause, Play, RotateCcw, SlidersHorizontal } from "lucide-react";
import { Attractor } from "./attractor";
import { systemState } from "@/lib/chaos-data";
import { Badge } from "./ui";
import { useChaosIndex } from "@/hooks/use-chaos-index";
import { ChaosEventDisplay } from "./chaos-event-display";

export function Hero({ initialIndex, pool }: { initialIndex: number; pool: readonly string[] }) {
  const { mode, setMode, simulation, live, liveError, adjust, reset } = useChaosIndex(initialIndex, pool);
  const index = mode === "simulation" ? simulation.index : live.chaosIndex;
  const eventActive = mode === "simulation" && simulation.phase !== "measuring";
  const [paused, setPaused] = useState(false);
  const [controls, setControls] = useState(false);
  return <section className="hero" aria-labelledby="hero-title">
    <div className="hero-grid" aria-hidden="true" />
    <div className="container hero-top"><span className="mono"><span className="status-dot" /> EXPERIMENT 001 / SOLANA CONCEPT</span><span className="mono hero-coordinate">SENSITIVE TO INITIAL CONDITIONS</span></div>
    <div className="hero-content container">
      <div className="hero-kicker"><span className="tiny-cross">+</span> ORDER IS AN ILLUSION.</div>
      <h1 id="hero-title">CHAOS<span className="hero-title-period">.</span></h1>
      <p className="hero-subtitle">THE SYSTEM IS UNSTABLE.</p>
      <p className="hero-quote">Small changes can create massive consequences.</p>
      <div className="index-mode-switch" role="group" aria-label="Chaos Index mode">
        <button aria-pressed={mode === "simulation"} onClick={() => setMode("simulation")}>SIMULATION MODE</button>
        <button aria-pressed={mode === "live"} onClick={() => setMode("live")}>LIVE MODE</button>
      </div>
      <p className="mode-description mono">{mode === "simulation" ? "LOCAL DEMO · NO TRANSACTIONS · MANUAL INDEX" : liveError ? "READ-ONLY SOURCE UNAVAILABLE · NO LIVE MEASUREMENT" : live.provenance === "unconfigured" ? "READ-ONLY · DATA SOURCE NOT CONNECTED" : live.provenance === "market-data" ? `DEX SCREENER · ${live.market?.status.replaceAll("_", " ").toUpperCase()} · EXPERIMENTAL METRIC` : live.provenance === "mock" ? "READ-ONLY PREVIEW · MOCK DATA · NOT BLOCKCHAIN STATE" : "READ-ONLY · VERIFIED SOURCE DATA"}</p>
      <div className={`experiment-field ${eventActive ? "event-active" : ""}`}>
        <Attractor index={index ?? 0} paused={paused || index === null} />
        <div className="field-corner top-left" /><div className="field-corner top-right" /><div className="field-corner bottom-left" /><div className="field-corner bottom-right" />
        <div className="field-annotation annotation-left mono"><span>LORENZ ATTRACTOR</span><span>σ 10 · ρ 28 · β 8/3</span><span className="annotation-rule" /></div>
        {eventActive && simulation.phase !== "measuring" ? <ChaosEventDisplay phase={simulation.phase} token={simulation.selectedToken} cycle={simulation.cycle} /> : <div className="index-display"><div className="index-label mono">CHAOS INDEX <Badge>{mode === "simulation" ? "SIMULATION" : live.provenance === "mock" ? "MOCK DATA" : live.provenance === "verified" ? "LIVE / READ ONLY" : live.provenance === "market-data" ? "MARKET DATA" : "NOT CONNECTED"}</Badge></div><div className="index-number" aria-label={`${mode === "simulation" ? "Simulated" : "Read-only"} Chaos Index ${index === null ? "unavailable" : `${index.toFixed(2)} percent`}`}>{index === null ? "--" : index.toFixed(2)}<span>%</span></div><div className="state-label mono">CURRENT SYSTEM STATE</div><div className="state-value mono"><span className="status-dot" />{index === null ? (mode === "live" && live.market ? live.market.systemState : "AWAITING DATA SOURCE") : systemState(index)}</div>{mode === "simulation" && <span className="mono index-cycle">CYCLE {String(simulation.cycle).padStart(3, "0")}</span>}{mode === "live" && live.provenance !== "unconfigured" && <div className="mono live-phase" role="status">{live.provenance === "market-data" ? (live.phase === "triggered" ? "SIMULATED CHAOS_EVENT_TRIGGERED / NO TRANSACTION" : `${live.market?.eligibleTokenCount ?? 0} ELIGIBLE TOKENS / READ ONLY`) : `REPORTED PHASE: ${live.phase.replaceAll("-", " ").toUpperCase()}`}{live.selectedToken && <span>REPORTED TOKEN: {live.selectedToken}</span>}</div>}</div>}
        <div className="field-annotation annotation-right mono"><span>DETERMINISTIC SYSTEM</span><span>UNPREDICTABLE OUTCOME</span><span className="annotation-rule" /></div>
        <div className="field-bottom"><span className="mono">FIG. 01 — THE BUTTERFLY EFFECT</span><div className="field-actions"><button onClick={() => setPaused(!paused)} aria-label={paused ? "Resume particle animation" : "Pause particle animation"}>{paused ? <Play size={14} /> : <Pause size={14} />}</button>{mode === "simulation" && <button onClick={() => setControls(!controls)} aria-expanded={controls} aria-controls="simulation-controls"><SlidersHorizontal size={14} /><span>Adjust simulation</span></button>}</div></div>
      </div>
      {mode === "simulation" && controls && <div className="simulation-controls" id="simulation-controls"><Badge>DEVELOPMENT / DEMO CONTROL</Badge><label htmlFor="chaos-range" className="mono">SIMULATED INSTABILITY <span>{simulation.index.toFixed(2)}%</span></label><input id="chaos-range" type="range" min="0" max="100" step="0.01" value={simulation.index} disabled={eventActive} onChange={e => adjust(Number(e.target.value))} /><button onClick={reset} className="text-button"><RotateCcw size={13} />{eventActive ? "Cancel demo / Reset to 0" : "Reset to 0"}</button><p>Local UI only. Reach 100% to preview a Chaos Event. No blockchain measurement, selection, or distribution is performed.</p></div>}
      <div className="hero-buttons"><a className="button primary" href="#engine">Explore the Chaos Engine <ArrowUpRight size={17} /></a><a href="#about" className="button secondary">Understand the theory <ArrowDown size={15} /></a></div>
    </div>
    <div className="hero-bottom container mono"><span>A SMALL CHANGE. AN ENTIRELY DIFFERENT FUTURE.</span><a href="#about">SCROLL TO OBSERVE <ArrowDown size={12} /></a></div>
  </section>;
}

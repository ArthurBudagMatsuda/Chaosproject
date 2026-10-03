"use client";

import { useState, type KeyboardEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, ChartNoAxesCombined, CircleDot, Gauge, GitBranch, ScanSearch, ShieldCheck, WalletCards } from "lucide-react";

const stages = [
  { title: "MARKET DATA", icon: ChartNoAxesCombined, description: "Inputs describe the system", detail: "The backend observes a sample of Solana tokens through DEX Screener. Prices, liquidity, volume and transaction counts become inputs, not predictions." },
  { title: "CHAOS INDEX", icon: Gauge, description: "Market instability score", detail: "The index expresses the project's metric from 0 to 100%. It can rise or fall. It is neither a scientific measure of market chaos nor a price forecast." },
  { title: "FEE WALLET", icon: WalletCards, description: "A public address is observed", detail: "A separate Solana RPC monitor reads the configured fee wallet balance and recent signatures. The website never receives the wallet's private key." },
  { title: "THRESHOLD", icon: CircleDot, description: "Distribution availability is calculated", detail: "The financial threshold starts at a configurable 5 SOL. Reaching it only marks a manual distribution as available; it never initiates a transaction." },
  { title: "ADMIN DECISION", icon: ShieldCheck, description: "The wallet operator decides", detail: "The administrator chooses whether and where to distribute. That decision and the transaction happen outside this website." },
  { title: "MANUAL TRANSFER", icon: GitBranch, description: "Funds move through the external wallet", detail: "The wallet administrator sends SOL manually. CHAOS has no wallet connection, signing method, automatic treasury or custody capability." },
  { title: "TX VERIFICATION", icon: ScanSearch, description: "The submitted TXID is checked", detail: "The backend verifies confirmation, configured source wallet, destination wallet and exact SOL amount directly through the Solana RPC." },
  { title: "VERIFIED RECORD", icon: ShieldCheck, description: "The public history is updated", detail: "Only successful on-chain verification creates a confirmed distribution. Informational index records remain separate from verified financial events." },
];

export function EngineCarousel() {
  const [active, setActive] = useState(0);
  const reduced = useReducedMotion();
  const goTo = (index: number) => setActive(Math.max(0, Math.min(stages.length - 1, index)));
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "Home") goTo(0);
    else if (event.key === "End") goTo(stages.length - 1);
    else goTo(active + (event.key === "ArrowRight" ? 1 : -1));
  };

  return <div className="engine-carousel" role="region" aria-roledescription="carousel" aria-label="Chaos Engine mechanism" tabIndex={0} onKeyDown={onKeyDown}>
    <div className="engine-carousel-top mono"><span>NON-CUSTODIAL SYSTEM FLOW</span><span aria-hidden="true">{String(active + 1).padStart(2, "0")} / 08</span></div>
    <div className="engine-carousel-viewport">
      <motion.div className="engine-carousel-swipe" drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={reduced ? 0 : .12} style={{ touchAction: "pan-y" }} onDragEnd={(_, info) => {
        if (info.offset.x < -45 || info.velocity.x < -400) goTo(active + 1);
        else if (info.offset.x > 45 || info.velocity.x > 400) goTo(active - 1);
      }}>
        <motion.div className="engine-carousel-track" animate={{ x: `${-active * 100}%` }} transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 220, damping: 30 }}>
          {stages.map((stage, index) => <article className={`engine-carousel-stage ${index === 3 ? "engine-carousel-threshold" : ""}`} key={stage.title} role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${stages.length}: ${stage.title}`} aria-hidden={active !== index} inert={active !== index}>
            <div className="engine-carousel-graphic" aria-hidden="true"><div className="engine-carousel-orbit" /><stage.icon size={62} strokeWidth={.8} /><span className="engine-carousel-specimen mono">FIG. {String(index + 1).padStart(2, "0")}</span></div>
            <div className="engine-carousel-copy"><span className="mono accent">STEP {String(index + 1).padStart(2, "0")}</span><h3>{stage.title}</h3><p className="engine-carousel-lead">{stage.description}</p><p>{stage.detail}</p></div>
          </article>)}
        </motion.div>
      </motion.div>
    </div>
    <div className="engine-carousel-controls"><button className="engine-carousel-arrow" onClick={() => goTo(active - 1)} disabled={active === 0} aria-label="Previous mechanism step"><ArrowLeft size={17} /></button>
      <div className="engine-carousel-dots" role="group" aria-label="Choose mechanism step">{stages.map((stage, index) => <button key={stage.title} aria-label={`Go to step ${index + 1}: ${stage.title}`} aria-current={active === index ? "step" : undefined} onClick={() => goTo(index)}><span /></button>)}</div>
      <button className="engine-carousel-arrow" onClick={() => goTo(active + 1)} disabled={active === stages.length - 1} aria-label="Next mechanism step"><ArrowRight size={17} /></button>
    </div>
    <p className="engine-carousel-hint mono">SWIPE TO EXPLORE / USE ARROWS OR SELECT A STEP</p>
    <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">Step {active + 1} of {stages.length}: {stages[active].title}. {stages[active].description}.</span>
  </div>;
}

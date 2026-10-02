"use client";

import { useState, type KeyboardEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Atom, AudioLines, Boxes, ChartNoAxesCombined, CircleDot, Gauge, GitBranch, RotateCcw } from "lucide-react";

const stages = [
  { title: "MARKET DATA", icon: ChartNoAxesCombined, description: "Inputs describe the system", detail: "The backend observes a sample of Solana tokens through DEX Screener. Prices, liquidity, volume and transaction counts become inputs, not predictions." },
  { title: "CHAOS ENGINE", icon: AudioLines, description: "Experimental evaluation", detail: "The current backend combines five normalized components using configurable weights. Financial event execution remains a future blockchain-program responsibility." },
  { title: "CHAOS INDEX", icon: Gauge, description: "Experimental instability score", detail: "The index expresses the project's metric from 0 to 100%. It can rise or fall. It is neither a scientific measure of market chaos nor a price forecast." },
  { title: "100%", icon: CircleDot, description: "The event threshold is reached", detail: "At 100%, the future blockchain program would initiate a Chaos Event. The website would only observe that transition." },
  { title: "CHAOS EVENT", icon: Atom, description: "Future program initiates the event", detail: "Today, a complete, healthy backend index reaching 100% records an explicitly simulated event. Real selection and distribution are not implemented." },
  { title: "RANDOM TOKEN", icon: Boxes, description: "Selected from the Chaos Pool", detail: "Verifiable randomness would select an eligible token from the future pool. Selection would not imply expected returns or future price performance." },
  { title: "DISTRIBUTION", icon: GitBranch, description: "Program distributes resources", detail: "The future blockchain program would distribute a portion of accumulated resources. This frontend neither signs transactions nor moves funds." },
  { title: "NEW CYCLE", icon: RotateCcw, description: "Instability resets to zero", detail: "After the planned distribution, the program would reset the index and begin another cycle. In the current simulation, only the local display resets." },
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
    <div className="engine-carousel-top mono"><span>PROPOSED MECHANISM / NOT LIVE</span><span aria-hidden="true">{String(active + 1).padStart(2, "0")} / 08</span></div>
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

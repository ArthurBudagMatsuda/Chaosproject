"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AudioLines, Atom, GitBranch, RotateCcw, Shuffle } from "lucide-react";
import type { EventPhase } from "@/lib/chaos-simulation";
import { Badge } from "./ui";

const stages = {
  threshold: { title: "THRESHOLD REACHED", caption: "100% · A disturbance is beginning", icon: AudioLines },
  triggered: { title: "CHAOS EVENT TRIGGERED", caption: "The system crosses its instability threshold", icon: AudioLines },
  selecting: { title: "SELECTING TOKEN...", caption: "Exploring the fictional Chaos Pool", icon: Shuffle },
  selected: { title: "SELECTED TOKEN", caption: "A fictional specimen has been selected", icon: Atom },
  distributing: { title: "DISTRIBUTION", caption: "Visual demonstration · No funds transferred", icon: GitBranch },
  "new-cycle": { title: "NEW CYCLE", caption: "Index reset to 0% · Adjust to begin again", icon: RotateCcw },
};

export function ChaosEventDisplay({ phase, token, cycle }: { phase: Exclude<EventPhase, "measuring">; token: string | null; cycle: number }) {
  const reduced = useReducedMotion();
  const stage = stages[phase];
  return <div className="event-display">
    <motion.div className="event-orbit" aria-hidden="true" animate={reduced ? {} : { rotate: 360 }} transition={{ duration: 12, ease: "linear", repeat: Infinity }} />
    <Badge>SIMULATION / DEMO ONLY</Badge>
    <motion.div className="event-stage-content" key={phase} initial={reduced ? false : { opacity: 0, y: 12, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: .4 }}>
      <stage.icon className="event-stage-icon" size={24} strokeWidth={1.2} aria-hidden="true" />
      <div className="event-threshold">{phase === "new-cycle" ? "0" : "100"}<span>%</span></div>
      <h2 className="event-stage-title">{stage.title}</h2>
      {token && (phase === "selected" || phase === "distributing") && <div className="event-selected-token">{token}<span>FICTIONAL TOKEN</span></div>}
      <p>{stage.caption}</p>
    </motion.div>
    <div className="event-progress" aria-hidden="true">{Object.keys(stages).map((key, i) => <span key={key} className={i <= Object.keys(stages).indexOf(phase) ? "active" : ""} />)}</div>
    <span className="mono event-cycle">CYCLE {String(cycle).padStart(3, "0")} · LOCAL VISUAL EXPERIMENT</span>
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">Simulation: {stage.title}. {token && phase === "selected" ? `Fictional token ${token}.` : ""} {stage.caption}.</div>
  </div>;
}

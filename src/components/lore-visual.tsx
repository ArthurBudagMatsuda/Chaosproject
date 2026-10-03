"use client";

import { useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { Pause, Play } from "lucide-react";
import { Attractor } from "./attractor";
import type { LoreVisualKind } from "@/lib/chaos-lore";

const nodes = [[58, 95], [160, 48], [160, 170], [250, 110], [347, 45], [350, 180], [440, 110]];
const captions = {
  attractor: ["LORENZ SYSTEM", "σ 10 · ρ 28 · β 8/3", "MATHEMATICAL VISUALIZATION"],
  network: ["INTERACTING VARIABLES", "HEAT / LIFE / INFORMATION", "CONCEPTUAL SYSTEM MAP"],
  threshold: ["A DEFINED THRESHOLD", "INDEX → EVENT", "INDEX EVENT THRESHOLD"],
  pool: ["THE POSSIBLE OUTCOMES", "ONE SET / MULTIPLE PATHS", "ELIGIBLE MARKET SET"],
  butterfly: ["SENSITIVE DEPENDENCE", "δ₀ → DIVERGENCE", "SCHEMATIC TRAJECTORIES / NOT A FORECAST"],
} as const;

export function LoreVisual({ kind }: { kind: Extract<LoreVisualKind, keyof typeof captions> }) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, { amount: .15 });
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const moving = visible && !reduced && !paused;
  const caption = captions[kind];
  const movingLine = { strokeDashoffset: moving ? [0, -48] : 0 };
  return <div className="lore-visual" ref={ref}>
    <div className="lore-visual-header mono"><span>{caption[0]}</span><button aria-label={`${paused ? "Resume" : "Pause"} ${caption[0].toLowerCase()} animation`} aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? <Play size={12} /> : <Pause size={12} />}</button></div>
    <div className="lore-visual-field">
      {kind === "attractor" ? <Attractor index={60} paused={paused} /> : <svg viewBox="0 0 500 230" fill="none" aria-hidden="true">
        <path d="M20 115H480M250 15V215" stroke="#272721" strokeDasharray="2 6" />
        {kind === "network" && <>
          {[[0,1],[0,2],[1,3],[2,3],[3,4],[3,5],[4,6],[5,6],[1,4],[2,5]].map(([a,b], i) => <motion.path key={i} d={`M${nodes[a].join(" ")}L${nodes[b].join(" ")}`} stroke={i % 3 === 0 ? "#f25b49" : "#555548"} strokeOpacity={.5} strokeWidth={1} strokeDasharray="3 9" animate={movingLine} transition={{ duration: 7 + i, repeat: Infinity, ease: "linear" }} />)}
          {nodes.map(([x,y], i) => <g key={i}><circle cx={x} cy={y} r={13} stroke="#464638" /><motion.circle cx={x} cy={y} r={3} fill={i === 3 ? "#f25b49" : "#b3b3a3"} animate={{ opacity: moving ? [.4, 1, .4] : .8 }} transition={{ duration: 3, delay: i * .25, repeat: Infinity }} /></g>)}
        </>}
        {kind === "butterfly" && <>
          <motion.path d="M25 119C120 118 163 105 239 79S385 70 470 27" stroke="#f25b49" strokeWidth="1.5" strokeDasharray="5 3" animate={movingLine} transition={{ duration: 9, repeat: Infinity, ease: "linear" }} />
          <path d="M25 122C120 123 163 133 239 158S385 177 470 205" stroke="#a4a496" strokeDasharray="4 6" />
          <circle cx={25} cy={120} r={4} fill="#f25b49" /><circle cx={470} cy={27} r={4} fill="#f25b49" /><circle cx={470} cy={205} r={3} fill="#a4a496" />
          <path d="M125 95V146M120 95H130M120 146H130" stroke="#777769" /><text x="115" y="175" fill="#a4a496" fontSize="9">δ₀</text>
        </>}
        {kind === "threshold" && <>
          <circle cx={250} cy={115} r={82} stroke="#38382f" /><motion.circle cx={250} cy={115} r={82} stroke="#f25b49" strokeDasharray="4 16" animate={movingLine} transition={{ duration: 8, repeat: Infinity, ease: "linear" }} />
          <text x="250" y="120" fill="#eeede8" fontSize="49" textAnchor="middle" letterSpacing="-3">100<tspan fill="#f25b49" fontSize="23">%</tspan></text><text x="250" y="143" fill="#f25b49" fontSize="8" textAnchor="middle" letterSpacing="2">INDEX EVENT THRESHOLD</text>
        </>}
        {kind === "pool" && <>
          {[65,190,315,440].map((x,i) => <g key={x}><motion.path d={`M250 43Q${x} 70 ${x} 142`} stroke="#f25b49" strokeOpacity={.45} strokeDasharray="3 9" animate={movingLine} transition={{ duration: 8 + i, repeat: Infinity, ease: "linear" }} /><circle cx={x} cy={160} r={21} stroke="#555548" /><text x={x} y={163} fill="#c0c0b1" textAnchor="middle" fontSize="9">0{i+1}</text></g>)}
          <circle cx={250} cy={43} r={5} fill="#f25b49" /><text x="250" y="207" fill="#a4a496" fontSize="8" textAnchor="middle" letterSpacing="2">ELIGIBILITY ≠ PREDICTION</text>
        </>}
      </svg>}
    </div>
    <div className="lore-visual-meta mono"><span>{caption[1]}</span><span>FIG. {kind === "attractor" ? "01" : kind === "network" ? "02" : kind === "threshold" ? "04" : kind === "pool" ? "05" : "06"}</span></div>
    <p className="mono lore-visual-note">{caption[2]}</p>
  </div>;
}

export function ChapterBreak() {
  const reduced = useReducedMotion();
  return <div className="chapter-break" aria-hidden="true"><svg width="20" height="70" viewBox="0 0 20 70"><motion.path d="M10 0V60" stroke="#f25b49" strokeOpacity=".4" initial={reduced ? false : { pathLength: 0 }} whileInView={{ pathLength: 1 }} transition={{ duration: 1.2 }} viewport={{ once: true }} /><circle cx="10" cy="64" r="2" fill="#f25b49" /></svg></div>;
}

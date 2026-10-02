"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

export function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  return <motion.div className={className} initial={reduced ? false : { opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.12 }} transition={{ duration: 0.65 }}>{children}</motion.div>;
}

export function SectionLabel({ number, children }: { number: string; children: ReactNode }) {
  return <div className="section-label"><span className="accent">/{number}</span><span>{children}</span></div>;
}

export function Badge({ children }: { children: ReactNode }) {
  return <span className="badge">{children}</span>;
}

export function ChaosMark({ small = false }: { small?: boolean }) {
  return <svg width={small ? 24 : 32} height={small ? 24 : 32} viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M20 20C-1-10-7 38 20 20C47 2 41 50 20 20Z" stroke="currentColor" strokeWidth="2" /><path d="M20 20C2 47 50 41 20 20C-10-1 38-7 20 20Z" stroke="currentColor" strokeWidth="1.3" opacity=".7" /></svg>;
}

"use client";

import { useEffect, useReducer, useState } from "react";
import { phaseDuration, simulationReducer, type IndexMode } from "@/lib/chaos-simulation";
import { liveChaosSource, unavailableSnapshot, validateLiveSnapshot, type LiveChaosSource } from "@/lib/live-chaos-source";

export function useChaosIndex(initialIndex: number, pool: readonly string[], source: LiveChaosSource = liveChaosSource) {
  const [mode, setModeState] = useState<IndexMode>("simulation");
  const [simulation, dispatch] = useReducer(simulationReducer, {
    index: initialIndex, phase: "measuring", cycle: 1, selectedToken: null,
  });
  const [live, setLive] = useState(unavailableSnapshot);
  const [liveError, setLiveError] = useState(false);

  useEffect(() => {
    const duration = phaseDuration[simulation.phase];
    if (mode !== "simulation" || !duration) return;
    const timer = window.setTimeout(() => {
      // Cosmetic local selection only, never verifiable randomness or a real token selection.
      const token = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
      dispatch({ type: "advance", token });
    }, duration);
    return () => window.clearTimeout(timer);
  }, [mode, simulation.phase, pool]);

  useEffect(() => {
    if (mode !== "live") return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const read = async () => {
      try {
        const snapshot = validateLiveSnapshot(await source.readSnapshot(controller.signal));
        if (!controller.signal.aborted) { setLive(snapshot); setLiveError(false); }
      } catch {
        if (!controller.signal.aborted) { setLive(unavailableSnapshot); setLiveError(true); }
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(read, 15000);
      }
    };
    void read();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [mode, source]);

  const setMode = (next: IndexMode) => {
    if (next === mode) return;
    dispatch({ type: "cancel" });
    setModeState(next);
  };

  return { mode, setMode, simulation, live, liveError,
    adjust: (index: number) => { if (mode === "simulation") dispatch({ type: "adjust", index }); },
    reset: () => { if (mode === "simulation") dispatch({ type: "reset" }); },
  };
}

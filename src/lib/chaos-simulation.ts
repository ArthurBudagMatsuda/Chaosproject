export type EventPhase = "measuring" | "threshold" | "triggered" | "selecting" | "selected" | "distributing" | "new-cycle";
export type IndexMode = "simulation" | "live";

export interface SimulationState {
  index: number;
  phase: EventPhase;
  cycle: number;
  selectedToken: string | null;
}

export const phaseDuration: Partial<Record<EventPhase, number>> = {
  threshold: 1000, triggered: 1300, selecting: 1800,
  selected: 1600, distributing: 1800, "new-cycle": 1400,
};

export type SimulationAction =
  | { type: "adjust"; index: number }
  | { type: "advance"; token: string | null }
  | { type: "reset" }
  | { type: "cancel" };

export function simulationReducer(state: SimulationState, action: SimulationAction): SimulationState {
  if (action.type === "reset") return { ...state, index: 0, phase: "measuring", selectedToken: null };
  if (action.type === "cancel") return state.phase === "measuring" ? state : { ...state, index: 0, phase: "measuring", selectedToken: null };
  if (action.type === "adjust") {
    if (state.phase !== "measuring" || !Number.isFinite(action.index)) return state;
    const index = Math.max(0, Math.min(100, action.index));
    return { ...state, index, phase: index === 100 ? "threshold" : "measuring" };
  }
  switch (state.phase) {
    case "threshold": return { ...state, phase: "triggered" };
    case "triggered": return { ...state, phase: "selecting" };
    case "selecting": return { ...state, phase: "selected", selectedToken: action.token };
    case "selected": return { ...state, phase: "distributing" };
    case "distributing": return { ...state, index: 0, phase: "new-cycle", cycle: state.cycle + 1 };
    case "new-cycle": return { ...state, phase: "measuring", selectedToken: null };
    default: return state;
  }
}

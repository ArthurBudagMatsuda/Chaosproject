export const loreChapters = [
  {
    number: "01", id: "lore-theory", label: "THE THEORY", title: "What is", emphasis: "chaos?", visual: "attractor",
    lead: "Rules do not guarantee predictability.",
    paragraphs: [
      "A deterministic system evolves according to rules. Given exactly the same starting state, those rules produce the same trajectory. Yet some nonlinear systems are chaotic: nearby starting states can separate dramatically as time passes.",
      "Measurements are never infinitely precise. In a chaotic system, a tiny uncertainty at the beginning can grow until a long-term forecast loses its usefulness. The rules have not disappeared. Our ability to follow the outcome has reached a limit.",
      "This sensitivity to initial conditions is the butterfly effect. Chaos is not simply randomness. Even a small set of deterministic equations, like the Lorenz system, can produce intricate, aperiodic motion.",
    ],
    note: "SAME RULES / SLIGHTLY DIFFERENT BEGINNINGS / DIVERGING PATHS",
  },
  {
    number: "02", id: "lore-observation", label: "THE OBSERVATION", title: "Nothing moves", emphasis: "alone.", visual: "network",
    lead: "A system is more than the variable you are watching.",
    paragraphs: [
      "Weather connects heat, pressure and moving air. Ecosystems connect organisms, resources and changing habitats. Markets connect decisions, liquidity, information and the expectations of other participants.",
      "A change in one place can travel through those relationships. Feedback can amplify it, dampen it or redirect it. Many interacting variables make the path difficult to isolate.",
      "Complexity alone does not prove mathematical chaos, and not every small disturbance becomes a large event. The observation is simpler: what looks local may be connected to something much larger.",
    ],
    note: "OBSERVE THE CONNECTIONS, NOT JUST THE POINTS",
  },
  {
    number: "03", id: "lore-experiment", label: "THE EXPERIMENT", title: "A different", emphasis: "question.", visual: "experiment",
    lead: "What if uncertainty became part of the design?",
    paragraphs: [
      "CHAOS begins there. An experimental memecoin concept inspired by systems whose rules can be understood without making their futures easy to predict.",
      "The proposed protocol would not try to forecast the market. Instead, a measure of instability and a separate source of verifiable randomness would become inputs to its mechanics. Instability would determine when an event becomes eligible; randomness would determine which eligible token is selected.",
      "That distinction matters. Random selection is a design choice, not a proof of chaos. Today, a local simulation explores the idea while a read-only market service observes a sample of Solana tokens. The financial protocol has not been implemented.",
    ],
    note: "CURRENT STATE: MARKET OBSERVATION + VISUAL SIMULATION / FUTURE: FINANCIAL PROTOCOL",
  },
  {
    number: "04", id: "lore-engine", label: "THE CHAOS ENGINE", title: "A threshold,", emphasis: "not a forecast.", visual: "threshold",
    lead: "The Chaos Index gives the system a state to observe.",
    paragraphs: [
      "The first experimental Chaos Index combines observed volatility, trading activity, changes in volume and liquidity, and price dispersion across eligible tokens. Each input is normalized onto a 0–100 scale. Its weights and calibration remain provisional: this is a project metric, not an established scientific measure of market chaos.",
      "When the real index reaches 100%, the future blockchain program would trigger a Chaos Event under its rules. It would own the event, token selection and distribution. The website would only read and display the resulting state.",
      "In Simulation Mode, you move the index yourself. At 100%, a local animation plays. Live Mode has no manual control: it reads the backend's DEX Screener observations and marks incomplete history as warming up. A healthy backend index reaching 100% records a simulated event. Neither mode initiates a financial distribution.",
    ],
    note: "100% IS A PLANNED TRIGGER / IT IS NOT A PRICE SIGNAL",
  },
  {
    number: "05", id: "lore-pool", label: "THE CHAOS POOL", title: "A field of", emphasis: "possibilities.", visual: "pool",
    lead: "A possible outcome is not a promised winner.",
    paragraphs: [
      "The proposed Chaos Pool would define the eligible Solana tokens from which an event could select an outcome. A first market-data filter now checks reported market cap, liquidity, 24-hour volume and selected-pair age. These configurable thresholds are a starting point, not permanent protocol rules.",
      "Membership would describe eligibility for the mechanism, not expected returns. A token entering the pool would not become a prediction, an endorsement or a claim about future price performance.",
      "The displayed market pool contains provider-reported observations from a limited discovery sample, not a registered on-chain pool. Pair age is a proxy, not verified token age. The separate local simulation still selects fictional specimens. The boundary defines a possible set; it does not tell us what will perform well.",
    ],
    note: "ELIGIBILITY DEFINES THE SET / IT DOES NOT PREDICT THE RESULT",
  },
  {
    number: "06", id: "lore-butterfly", label: "THE BUTTERFLY EFFECT", title: "Almost the same.", emphasis: "Until it isn’t.", visual: "butterfly",
    lead: "Small changes can create massive consequences.",
    paragraphs: [
      "Imagine two trajectories beginning almost on top of each other. They follow the same equations. For a while, they appear to agree. Later, that small initial separation becomes impossible to ignore.",
      "The butterfly is the metaphor for that sensitivity. It does not promise that every flap produces a storm, or that a particular cause guarantees a particular outcome. It reminds us that the starting conditions can matter more than they seem.",
      "For CHAOS, this is the central image: a small disturbance entering a connected system, with consequences that cannot be read from its size alone. It is the project's lens, not a claim that CHAOS can predict prices or control the wider market.",
    ],
    note: "A METAPHOR FOR SENSITIVITY / NOT A GUARANTEE OF IMPACT",
  },
  {
    number: "07", id: "lore-cycle", label: "THE CYCLE", title: "An ending is", emphasis: "another beginning.", visual: "cycle",
    lead: "The event is a transition, not the end of the experiment.",
    paragraphs: [
      "The proposed cycle begins with observation. Resources accumulate while the system's instability is measured. The index may rise or fall; it is not a clock that must always move toward 100%.",
      "At the threshold, a Chaos Event would begin. An eligible token would be selected through verifiable randomness. The program would distribute a portion of accumulated resources, reset the index and open a new cycle.",
      "In the current demo, the same rhythm is only visual. You set the index, a fictional token is selected locally, a distribution animation plays, and the index returns to zero. No funds move. A new cycle waits for your next adjustment.",
    ],
    note: "DESIGN INTENT / NO LIVE CYCLES OR ON-CHAIN EVENTS ARE RUNNING",
  },
  {
    number: "08", id: "lore-inside", label: "THE EXPERIMENT", title: "YOU ARE NOT WATCHING THE EXPERIMENT.", emphasis: "YOU ARE INSIDE IT.", visual: "ending",
    lead: "The interface is where the idea becomes observable.",
    paragraphs: [
      "Change the simulated index. Observe the pattern as it shifts. Move it to its threshold and watch one visual cycle become the next.",
      "Participation begins with attention, not a transaction. What exists today is an invitation to explore a system in development. What comes next must earn its place through implementation, evidence and observation.",
    ],
    note: "EXPERIMENTAL MARKET OBSERVATORY / FINANCIAL PROTOCOL NOT IMPLEMENTED",
  },
] as const;

export type LoreVisualKind = typeof loreChapters[number]["visual"];

export const loreCycle = ["OBSERVE", "ACCUMULATE", "CHAOS RISES", "100%", "CHAOS EVENT", "RANDOM SELECTION", "DISTRIBUTION", "RESET", "NEW CYCLE"] as const;

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
    number: "03", id: "lore-experiment", label: "THE PRINCIPLE", title: "A different", emphasis: "question.", visual: "experiment",
    lead: "What if uncertainty became part of the design?",
    paragraphs: [
      "CHAOS begins there: a Solana project inspired by systems whose rules can be understood without making their futures easy to predict.",
      "The Chaos Index does not try to forecast the market. It describes one observed system, while a separate Solana monitor reads the public state of configured project addresses.",
      "That distinction matters. The market service observes a sample of Solana tokens, and the financial service verifies transfers made manually by the wallet administrator. The website never executes them.",
    ],
    note: "MARKET OBSERVATION + NON-CUSTODIAL MONITORING + FINANCIAL VERIFICATION",
  },
  {
    number: "04", id: "lore-engine", label: "THE CHAOS ENGINE", title: "A threshold,", emphasis: "not a forecast.", visual: "threshold",
    lead: "The Chaos Index gives the system a state to observe.",
    paragraphs: [
      "The Chaos Index combines fees, volume, market cap, liquidity, holders, transactions and price activity. Each available input is normalized onto a 0–100 scale, with missing weights redistributed instead of fabricated as zero.",
      "A complete, healthy index reaching 100% records an informational market event only when the absolute fee-wallet minimum is also satisfied. High activity alone cannot mark a distribution as ready.",
      "The public interface reads backend observations and marks incomplete or stale data explicitly. CHAOS EVENT records remain separate from verified financial transfers and never initiate a distribution.",
    ],
    note: "100% + SUFFICIENT FEES = CHAOS EVENT / NEVER AUTOMATIC EXECUTION",
  },
  {
    number: "05", id: "lore-pool", label: "THE CHAOS POOL", title: "A field of", emphasis: "possibilities.", visual: "pool",
    lead: "A possible outcome is not a promised winner.",
    paragraphs: [
      "The Chaos Pool describes the eligible Solana tokens observed by the market-data service. Its filter checks reported market cap, liquidity, 24-hour volume and selected-pair age using configurable thresholds.",
      "Membership would describe eligibility for the mechanism, not expected returns. A token entering the pool would not become a prediction, an endorsement or a claim about future price performance.",
      "The displayed market pool contains provider-reported observations from a limited discovery sample, not a registered on-chain pool. Pair age is a proxy, not verified token age. The boundary defines an observed set; it does not tell us what will perform well.",
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
    lead: "The event is a transition, not the end of the cycle.",
    paragraphs: [
      "The operational cycle begins with observation. Market activity may rise or fall while the configured fee wallet accumulates resources; together, the available signals determine progression toward the next event.",
      "At 100% progression with sufficient absolute fees, the system records a CHAOS EVENT. The administrator still decides whether to act, transfers through the external wallet, and provides the TXID. Only an on-chain match becomes a verified record.",
      "Once verification succeeds, the confirmed record becomes part of the financial history and the next threshold level becomes active. No automatic transaction is created at any stage.",
    ],
    note: "MANUAL TRANSFERS / ON-CHAIN VERIFICATION / NO AUTOMATIC EXECUTION",
  },
  {
    number: "08", id: "lore-inside", label: "THE SYSTEM", title: "YOU ARE NOT WATCHING THE SYSTEM.", emphasis: "YOU ARE INSIDE IT.", visual: "ending",
    lead: "The interface is where the idea becomes observable.",
    paragraphs: [
      "Observe the market index as new measurements arrive. Follow the fee-wallet threshold and the verified records that define each completed financial cycle.",
      "Participation begins with attention, not a transaction. CHAOS makes its data sources, operational boundaries and non-custodial architecture visible throughout the system.",
    ],
    note: "SOLANA MARKET OBSERVATORY / NON-CUSTODIAL FINANCIAL MONITOR",
  },
] as const;

export type LoreVisualKind = typeof loreChapters[number]["visual"];

export const loreCycle = ["OBSERVE", "ACCUMULATE", "THRESHOLD", "ADMIN DECISION", "MANUAL TRANSFER", "SUBMIT TXID", "VERIFY", "RECORD EVENT", "NEXT THRESHOLD"] as const;

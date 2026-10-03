export interface DocSection {
  id: string;
  title: string;
  paragraphs: string[];
  items?: string[];
  flow?: string[];
  statuses?: { label: "ACTIVE" | "INFORMATIONAL" | "MANUAL"; title: string; detail: string }[];
}

export interface DocPage {
  slug: string;
  label: string;
  title: string;
  subtitle: string;
  description: string;
  sections: DocSection[];
}

export const docsPages: DocPage[] = [
  { slug: "", label: "Overview", title: "CHAOS", subtitle: "Protocol Documentation", description: "A non-custodial system built around market observation, threshold monitoring and verified records.", sections: [
    { id: "overview", title: "Overview", paragraphs: ["CHAOS is a Solana project inspired by chaos theory and the butterfly effect. It observes interconnected market signals without presenting the index as a price prediction or a scientific measurement of mathematical chaos.", "The system combines a read-only Solana market observatory, monitoring of configured project addresses and on-chain verification of transfers made manually by the wallet administrator. The website has no custody or transaction-signing capability."] },
    { id: "how-it-works", title: "How It Works", paragraphs: ["The financial lifecycle is deliberately non-custodial. The backend observes the fee wallet and calculates availability; the wallet administrator makes any transfer manually and the backend verifies its TXID afterward."], flow: ["FEE WALLET", "THRESHOLD", "ADMIN DECISION", "MANUAL TRANSFER", "SUBMIT TXID", "VERIFY", "RECORD"] },
    { id: "current-status", title: "System Status", paragraphs: ["Market observations, informational index records and verified financial events have distinct provenance and responsibilities."], statuses: [
      { label: "ACTIVE", title: "Read-only market and treasury data", detail: "The DEX Screener scanner and Solana RPC monitor read configured public data. Manual distributions appear only after their TXID, source, destination and amount are verified on-chain." },
      { label: "INFORMATIONAL", title: "Chaos Index records", detail: "Index-threshold records describe the market metric only. They do not select a token, authorize a transfer or move funds." },
      { label: "MANUAL", title: "Financial execution", detail: "Every transfer is decided and executed by the wallet administrator outside the website. CHAOS verifies and records the completed transaction afterward." },
    ] },
  ] },
  { slug: "theory", label: "The Theory", title: "The Theory", subtitle: "Rules, uncertainty and sensitive dependence", description: "The science behind the metaphor. Complexity and randomness are not proof of mathematical chaos.", sections: [
    { id: "deterministic-systems", title: "Deterministic systems", paragraphs: ["A deterministic system evolves according to rules. Exactly the same initial state produces the same trajectory. Some nonlinear deterministic systems are chaotic: nearby starting states can diverge dramatically over time."] },
    { id: "initial-conditions", title: "Sensitivity to initial conditions", paragraphs: ["Measurements have finite precision. In a chaotic system, a small uncertainty in the initial state can grow until a long-term forecast becomes unreliable. The rules remain deterministic even when practical prediction becomes difficult."] },
    { id: "butterfly-effect", title: "The butterfly effect", paragraphs: ["The butterfly effect is a metaphor for sensitive dependence on initial conditions, not a promise that every small disturbance creates a large event. The Lorenz attractor illustrates how a small set of deterministic equations can produce intricate, aperiodic motion.", "CHAOS uses this lens for its identity. Its market index does not establish that markets satisfy the mathematical definition of chaos."] },
  ] },
  { slug: "chaos-index", label: "Chaos Index", title: "Chaos Index", subtitle: "A market instability metric", description: "A modular 0–100 score computed from the observed eligible token sample.", sections: [
    { id: "components", title: "Components", paragraphs: ["The backend combines five normalized inputs. Each score is clamped to 0–100 and combined using configurable weights; unavailable inputs remain null."], items: ["Volatility: standard deviation of historical log price returns, scaled to a five-minute interval.", "Trading activity: average 24-hour transaction count divided by 1440, a transactions-per-minute proxy.", "Volume change: absolute change in rolling 24-hour volume between comparable scans.", "Liquidity change: absolute change in selected-pair USD liquidity between comparable scans.", "Price dispersion: standard deviation of one-hour price changes across eligible tokens."] },
    { id: "readiness", title: "Readiness and freshness", paragraphs: ["The default minimum pool size is two tokens. Volatility requires at least three comparable observations. The score remains in warming-up state until every enabled component meets the configured coverage requirement.", "Provider failures mark degradation; aged observations become stale. Incomplete or degraded evaluations cannot emit threshold records. Missing data is never presented as a fabricated zero measurement."] },
    { id: "threshold", title: "The 100% threshold", paragraphs: ["A complete, healthy backend index reaching 100 records an informational CHAOS_EVENT_TRIGGERED entry. A persisted latch prevents duplicate records while the score remains at 100 and rearms after a healthy reading below 100.", "This market threshold is separate from the fee-wallet distribution threshold and cannot authorize a transfer. The score is not a scientific measure of market chaos or a price forecast."] },
  ] },
  { slug: "chaos-pool", label: "Chaos Pool", title: "Chaos Pool", subtitle: "Eligibility defines the observed set", description: "A sampled set of Solana tokens, not a recommendation or registered on-chain pool.", sections: [
    { id: "eligibility", title: "Eligibility", paragraphs: ["The backend filter applies configurable market-data thresholds."], items: ["Solana tokens only.", "Reported market cap greater than $1,000,000.", "Selected-pair liquidity greater than $250,000.", "Selected-pair 24-hour volume greater than $100,000.", "Selected-pair age of at least 30 days."] },
    { id: "coverage", title: "Coverage and pair identity", paragraphs: ["Discovery uses DEX Screener profiles, boosts, rotating searches and optional configured mint addresses. These feeds do not cover every Solana token. One representative, highest-liquidity observed base-token pair supplies the metrics for each token.", "Pair creation time is an age proxy, not verified token creation time. Missing required fields fail eligibility; FDV is not substituted for market cap. A change in representative pair can affect eligibility and historical continuity."] },
    { id: "interpretation", title: "What membership means", paragraphs: ["Eligibility describes whether a token meets the current filter. It does not predict performance, establish safety or endorse a token. The pool remains separate from the fee-wallet monitor; no eligible token is automatically selected for a distribution."] },
  ] },
  { slug: "chaos-engine", label: "Chaos Engine", title: "Chaos Engine", subtitle: "Observation, manual execution and verification", description: "The backend evaluates observations and verifies records. Financial execution remains outside the website.", sections: [
    { id: "observation", title: "Market observation", paragraphs: ["A standalone worker periodically discovers and refreshes tokens, applies eligibility filters, calculates the Chaos Index and persists snapshots. Read-only APIs expose those snapshots without launching provider scans from page requests."] },
    { id: "manual-lifecycle", title: "Manual lifecycle", paragraphs: ["The fee-wallet threshold is independent of the Chaos Index. Reaching it calculates an informational distribution amount and marks action as available; it does not send funds."], flow: ["OBSERVE", "THRESHOLD", "ADMIN DECISION", "MANUAL TRANSFER", "SUBMIT TXID", "VERIFY", "CONFIRMED EVENT", "NEXT THRESHOLD"] },
    { id: "responsibility", title: "Execution responsibility", paragraphs: ["The wallet administrator owns every financial decision and performs transfers manually outside CHAOS. The website cannot authorize, create, sign or broadcast transactions. It records a distribution only when the submitted TXID matches the configured source, destination and amount on Solana."] },
  ] },
  { slug: "chaos-events", label: "Chaos Events", title: "Chaos Events", subtitle: "Index records and verified financial events", description: "Event provenance stays explicit: market-index records never become financial records.", sections: [
    { id: "index-records", title: "Index records", paragraphs: ["A complete, healthy index evaluation at 100 can record CHAOS_EVENT_TRIGGERED with an observation timestamp and eligible token count. Selected token, distribution amount and transaction reference remain empty because this record has no financial authority.", "The event latch persists across worker restarts. The website reads the history from /api/events or the complete /api/chaos snapshot."] },
    { id: "verified-records", title: "Verified financial records", paragraphs: ["A manual distribution is registered only after the backend verifies its Solana TXID, confirmation status, configured source wallet, destination and exact SOL amount.", "Threshold milestones observed from the configured fee wallet are maintained separately. The API exposes verified events and confirmed distributions in dedicated fields."] },
  ] },
  { slug: "tokenomics", label: "Treasury", title: "Treasury", subtitle: "Operational parameters and non-custodial flow", description: "How thresholds, distribution availability and manual execution are represented.", sections: [
    { id: "parameters", title: "Configured parameters", paragraphs: ["Token and fee-wallet addresses, the starting threshold, threshold progression and distribution percentage are supplied through server-side configuration. These values describe monitoring and calculation rules; they do not make transfers automatic."] },
    { id: "manual-distributions", title: "Manual distribution workflow", paragraphs: ["The backend observes the fee wallet and calculates threshold progress. When an operator chooses to act, the transfer is made manually outside this website. The operator then submits the TXID to the protected admin console for independent on-chain verification.", "The calculated available amount is informational. The website never creates, signs or broadcasts a transaction and has no custody over the configured wallet."] },
    { id: "records", title: "Public records", paragraphs: ["Confirmed distributions retain the destination project, destination wallet, amount, TXID and verification timestamp. Only successful on-chain verification adds a financial event to public history."] },
  ] },
  { slug: "security", label: "Security", title: "Security", subtitle: "Keep observation separate from execution", description: "Boundaries for the non-custodial monitor and administrative record. No audit is claimed.", sections: [
    { id: "read-only", title: "Read-only and non-custodial", paragraphs: ["The public frontend only reads snapshots. The protected admin console submits metadata and TXIDs for verification; it contains no private key, seed phrase, wallet connector, signing method or transfer method. A frontend index reading or treasury threshold is never authority to move funds."] },
    { id: "data-boundaries", title: "Data and service boundaries", paragraphs: ["DEX Screener market observations and Solana RPC financial observations are separate services and stores. Provenance, freshness and configuration state are displayed explicitly. Missing addresses are shown as NOT CONFIGURED.", "Admin credentials and RPC configuration remain server-side. Sessions use signed HttpOnly cookies and mutations verify their request origin. The current atomic JSON stores and locks support a single host; multi-host deployment requires shared persistence and distributed coordination."] },
    { id: "operational-review", title: "Operational review", paragraphs: ["Production operation should review RPC trust, administrator credential rotation, reverse-proxy origin headers, persistence backups and incident handling. No smart contract or smart-contract audit is implemented or claimed because this website has no contract execution role."] },
  ] },
  { slug: "roadmap", label: "Operations", title: "Operations", subtitle: "Runtime responsibilities and service boundaries", description: "The services required to keep market and financial observations available.", sections: [
    { id: "web-service", title: "Web service", paragraphs: ["The Next.js application serves the public interface, documentation, read-only APIs and protected TXID verification console. It does not launch provider scans from page requests."] },
    { id: "worker", title: "Monitoring worker", paragraphs: ["The scanner runs as a separate long-lived process. It refreshes market observations, calculates the index and reads configured Solana addresses at their respective intervals."] },
    { id: "persistence", title: "Persistence", paragraphs: ["The current atomic JSON stores and locks are designed for one persistent host. Multi-host or serverless operation requires shared persistence and distributed coordination before the scanner can be considered reliable in that environment."] },
  ] },
];

export const docsNavigation = docsPages.map(({ slug, label }) => ({ href: slug ? `/docs/${slug}` : "/docs", label }));
export const getDocPage = (slug: string) => docsPages.find(page => page.slug === slug);

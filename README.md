# CHAOS

Experimental Solana market observatory, visual simulation and non-custodial financial monitor. Next.js, TypeScript, Tailwind CSS, Framer Motion and Lucide. No smart contract, wallet connection, purchase, signing or automatic transfer is implemented.

## Run

Use Node.js 24 LTS (worker/tests require native TypeScript stripping; Node 22.18+ also supports it) and pnpm.

```sh
pnpm install
pnpm dev
```

Start the continuous backend worker in a second terminal:

```sh
pnpm market:scan
```

Open http://localhost:3000. Copy `.env.example` to `.env.local` to change settings, then restart both processes. The public DEX Screener endpoints used here need no API key. Keep future credentials server-side, never in `NEXT_PUBLIC_*`.

```sh
pnpm market:once  # diagnostic scan: paced requests, bypasses saved scan schedule
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm start
```

The worker runs independently of page requests. It persists observations, history, events and the threshold latch in `.chaos-data/state.json` using atomic replacement. A PID lock prevents two local workers sharing the directory. Continuous mode respects the saved next evaluation after restart. Stop with Ctrl+C. Do not edit state while the worker runs.

The same process runs an independent Solana RPC monitor for `CHAOS_TOKEN_CA` and `FEE_WALLET_CA`. Financial observations, verified distributions and real events are persisted atomically in `.chaos-data/financial-state.json` with a separate short-lived lock. Leaving either address empty is supported and appears as `NOT CONFIGURED`. The monitor never receives a private key and has no transaction-signing or transfer method.

The protected `/admin` console is enabled only when `CHAOS_ADMIN_PASSWORD` and a random `CHAOS_ADMIN_SESSION_SECRET` of at least 32 characters are configured. It accepts metadata and a TXID for a transfer that the administrator already made outside the website. Registration verifies Solana confirmation, source wallet, destination wallet and exact SOL amount. Confirmed records are immutable and emit `DISTRIBUTION_CONFIRMED` with `simulated: false`.

Threshold calculation starts at `BASE_DISTRIBUTION_THRESHOLD_SOL=5`, uses `NEXT_THRESHOLD_MULTIPLIER` by default and optionally accepts an explicit `CHAOS_DISTRIBUTION_THRESHOLDS_SOL` sequence. `DISTRIBUTION_PERCENTAGE` calculates an informational amount from the current eligible balance. Reaching a threshold never sends funds.

## Scanner and eligibility

`src/server/market` separates configuration, provider requests, pair parsing, eligibility, index calculation, scanning, storage and API responses. Public types live in `src/lib/market-types.ts`. Replace `MarketReader` to use another provider without rewriting the UI or formula.

Discovery combines latest token profiles, top boosts, rotating search queries, optional mint-address seeds and a bounded persistent address registry. Batches refresh up to 30 addresses. These DEX Screener endpoints do not expose an exhaustive Solana listing: **this is a sampled universe, not all Solana tokens**. Discovery can favor promoted tokens. Configure additional queries or known mint addresses to broaden coverage.

Project-requested mint addresses live in `src/server/market/seed-tokens.ts` and are always included in discovery. `CHAOS_SEED_ADDRESSES` adds addresses to that list without duplicating them. Being tracked does not bypass eligibility: an address appears in the displayed pool only while its observed pair passes every configured filter. Restart the scanner after editing either list.

One token counts once. Its highest-liquidity returned base-token pair supplies all metrics; ties use pair address. We do not sum duplicate market caps, use quote-token metrics, substitute FDV for missing market cap or fill missing observations with zero. Pair identity changes invalidate historical comparisons. Fields include mint address, symbol, name, pair/DEX, market cap, liquidity, 24h volume, USD price, price changes, 24h buy/sell counts, pair creation time and observation time.

| Default eligibility | Environment variable |
| --- | --- |
| Solana only | Fixed chain filter |
| Market cap > $1,000,000 | `CHAOS_MIN_MARKET_CAP_USD` |
| Pair liquidity > $250,000 | `CHAOS_MIN_LIQUIDITY_USD` |
| Pair 24h volume > $100,000 | `CHAOS_MIN_VOLUME_24H_USD` |
| Selected pair age ≥ 30 days | `CHAOS_MIN_AGE_DAYS` |

**Pair creation time is a token-age proxy**, not verified mint creation time. Missing required fields or future timestamps fail eligibility. Representative-pair changes can change eligibility. These configurable filters are provisional, not claims of safety, establishment, investment merit or future returns.

## Experimental Chaos Index v1

This is an experimental project metric, **not a scientific measure of mathematical market chaos or a price forecast**.

| Component | Raw calculation | Default scale for score 100 | Weight |
| --- | --- | --- | --- |
| Volatility | Mean per-token population standard deviation of historical log price returns (%), scaled to a 5-minute interval | 5% | 0.30 |
| Trading activity | Mean (24h buys + sells) / 1440, transactions/minute | 20 | 0.20 |
| Volume change | Mean absolute percent change of rolling 24h volume since previous comparable scan | 30% | 0.20 |
| Liquidity change | Mean absolute percent change of selected-pair USD liquidity since previous comparable scan | 15% | 0.15 |
| Price dispersion | Population standard deviation of 1h price-change percentages across tokens | 20 percentage points | 0.15 |

Each component is `clamp(raw / configuredScale × 100, 0, 100)`. The index is the weighted mean of available components, renormalizing available weights. Volume change compares rolling windows, not discrete interval trading volume. Volatility needs at least three comparable observations; comparisons reject gaps above the configured maximum. History defaults to six hours.

Missing components remain null. With fewer than two eligible tokens the index is null. Otherwise incomplete coverage produces a **provisional score marked `warming_up`**. Healthy readiness requires every enabled component to cover at least 60% of eligible tokens and no provider errors. Scales, weights, pool size and coverage are configurable. Warm-up normally needs several five-minute scans and depends on pool composition. Rounding never promotes an unsaturated score to 100.

At a complete, healthy index of 100, the backend records `CHAOS_EVENT_TRIGGERED` with `simulated: true`, actual observation time and token count. Selected token, distribution and transaction remain null. A persisted latch emits once while the score remains at 100, rearming only after a healthy reading below 100. Warming-up, degraded and stale data cannot emit events. The measured index is never artificially reset. This demonstration does not implement a financial cycle.

## Read-only APIs

| Endpoint | Contents |
| --- | --- |
| `GET /api/chaos` | Full snapshot, components/coverage and simulated event history |
| `GET /api/tokens` | System metadata and eligible observations |
| `GET /api/events` | Legacy simulated events plus separate verified events and confirmed distributions |
| `GET /api/financial` | Read-only token, fee-wallet, threshold and verified distribution state |

Every successful response includes `chaosIndex`, `systemState`, `eligibleTokenCount`, `eligibleTokens`, `lastUpdate`, `nextEvaluation`, `eventStatus`, provider provenance, status, formula version, eligibility and discovery coverage. `/api/chaos` also includes `components`. Timestamps are ISO UTC; missing values are null. Headers explicitly identify DEX Screener, the experimental metric and simulated events.

Statuses: `initializing`, `warming_up`, `healthy`, `degraded`, `stale`, `unavailable`. Provider outages retain the last successful snapshot/timestamp, mark degradation and suppress events. After the freshness limit, reads mark it stale; Live Mode clears the displayed measurement. Unreadable/corrupt storage returns HTTP 503, not invented data. The worker refuses to overwrite corrupt state.

Page/API requests never contact DEX Screener. Shared disk reads and HTTP responses cache for five seconds. A per-process aggregate budget of 300 API requests/minute returns HTTP 429 with Retry-After. Browser consumers share a ten-second cache and concurrent request, then poll serially. Production should additionally use ingress/CDN traffic limits; the process-local budget is not distributed abuse protection.

The worker serializes provider calls with a default 1600ms gap (~37.5 requests/minute), below documented 60/min discovery and 300/min market limits. Responses cache up to 120 seconds, capped below the scan interval. Requests have timeouts, bounded retries and circuit cooldowns. HTTP 429 honors Retry-After with a minimum 60-second cooldown. Batching, bounded candidates and the default five-minute interval limit load. See the [official API reference](https://docs.dexscreener.com/api/reference).

## Frontend and financial boundary

Simulation Mode retains the development slider and local 0–100 state. At 100 the demo shows event, fictional selection, distribution animation and reset to zero. No funds move. Local events never enter the backend ledger; switching modes cancels timers. Fictional fixtures stay isolated in `src/lib/chaos-data.ts`.

Live Mode has no slider. `src/lib/live-chaos-source.ts` reads `/api/chaos` and explicitly labels off-chain DEX Screener observations and provisional status. It does not call the local simulation reducer, choose a token, reset measured data or infer an event from a frontend reading of 100. It renders the backend's simulated event status only.

The wallet administrator owns every real financial decision and performs transfers manually outside this website. The backend only monitors public addresses, calculates threshold status and verifies submitted TXIDs. The frontend and backend have no private key, wallet connection, signing or transfer methods. Neither backend demo events nor local `Math.random()` may be reused as financial authorization or evidence of a transfer.

The dark laboratory identity, Lorenz attractor, eight lore chapters and swipeable engine carousel are retained. Animations honor reduced motion and stop offscreen; canvas caps frame rate and pixel ratio. Keyboard navigation, skip links, focus styles, accessible controls and mobile table scrolling remain available.

## Deployment and checks

Documentation lives at `/docs`, with eight additional direct routes for theory, index, pool, engine, events, tokenomics, security and roadmap. The homepage's DOCS link opens this separate App Router layout. Edit `src/lib/docs-content.ts` to replace the editorial content; the shared article renderer supplies headings, in-page contents and previous/next links. The reusable sidebar marks the current URL and collapses on mobile. Documentation styles are scoped to `.docs-*` classes, preserving the homepage. Route pages are statically generated; unknown documentation slugs return 404.

Run one long-lived worker alongside Next.js with the same persistent `CHAOS_DATA_DIR` and configuration. Use a supervisor to restart the worker after unexpected failures. The atomic JSON store and PID lock support a **single host**. A serverless Next.js deployment alone cannot run this continuous worker or share its local filesystem. For multiple hosts, replace `MarketStore` with a shared database and distributed scheduler/lock; do not run independent scanners on every web instance. Keep the data directory private and do not expose a writable scanner endpoint.

Tests cover strict eligibility, missing fields, duplicate pairs, normalization, history continuity/readiness, saturation, event deduplication/rearming, outages, persistence/locking, staleness, provider caching/429 and the frontend read-only boundary.

# CHAOS

Solana market observatory and non-custodial financial monitor. Next.js, TypeScript, Tailwind CSS, Framer Motion and Lucide. No smart contract, wallet connection, purchase, signing or automatic transfer is implemented.

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

Project-requested mint addresses live in `src/server/market/seed-tokens.ts` and are always included in discovery. `CHAOS_SEED_ADDRESSES` adds addresses to that list without duplicating them. These explicitly added Solana tokens bypass market cap, liquidity and volume thresholds once a real pair is observed. Explicit mint exclusions always take precedence. Restart the scanner after editing either list.

One token counts once. Its highest-liquidity returned base-token pair supplies all metrics; ties use pair address. We do not sum duplicate market caps, use quote-token metrics, substitute FDV for missing market cap or fill missing observations with zero. Pair identity changes invalidate historical comparisons. Fields include mint address, symbol, name, pair/DEX, market cap, liquidity, 24h volume, USD price, price changes, 24h buy/sell counts, pair creation time and observation time.

| Automatic discovery eligibility | Environment variable |
| --- | --- |
| Solana only | Fixed chain filter |
| Market cap > $1,000,000 | `CHAOS_MIN_MARKET_CAP_USD` |
| Pair liquidity > $250,000 | `CHAOS_MIN_LIQUIDITY_USD` |
| Pair 24h volume > $100,000 | `CHAOS_MIN_VOLUME_24H_USD` |
| No minimum age | Legacy `CHAOS_MIN_AGE_DAYS` is ignored |

**Pair creation time is a token-age proxy**, not verified mint creation time. Missing required market fields fail automatic eligibility. Project-added tokens retain missing values as null. Representative-pair changes can change eligibility. These configurable filters are provisional, not claims of safety, establishment, investment merit or future returns.

## Chaos Index: activity progression v2

The index measures progression toward a CHAOS EVENT from current market activity and available fee-wallet resources. It is a project-defined operational metric, **not a scientific measure of mathematical market chaos or a price forecast**.

| Component | Raw calculation | Default scale for score 100 | Weight |
| --- | --- | --- | --- |
| Fees | Greater of progress to the current fee threshold or unusual balance growth | 100% of threshold / 25% growth | 0.25 |
| Volume | Median per-token absolute 24h-volume change from its recent baseline | 30% | 0.25 |
| Market cap | Median per-token absolute market-cap change from its recent baseline | 20% | 0.10 |
| Liquidity | Median per-token absolute liquidity change from its recent baseline | 15% | 0.10 |
| Holders | Median per-token absolute holder-count change from its recent baseline | 20% | 0.10 |
| Transactions | Median per-token absolute 24h-transaction change from its recent baseline | 30% | 0.10 |
| Price | Median per-token return volatility and current one-hour movement | 5% | 0.10 |

Each component is `clamp(raw / configuredScale × 100, 0, 100)`. Market activity is calculated per token first and then aggregated with a median so that a single large token cannot dominate the pool. The final index is the weighted mean of available components, renormalizing available weights. Growth and decline both count as activity. Rolling-window values are compared with each token's own recent baseline; history defaults to six hours.

Missing components remain null and their weights are redistributed among available inputs. With fewer than two eligible tokens the index is null. A calculation is ready only when the available configured weight reaches the minimum and the market sample is healthy. The current DEX Screener source does not expose reliable holder counts, so the holder component remains null until a trusted source is configured. Scales, weights, pool size and coverage are configurable. Rounding never promotes an unsaturated score to 100.

`chaosIndex` may reach 100 through unusual activity, but `distributionReady` becomes true only when the absolute fee-wallet balance also meets the current minimum and both market and financial observations are reliable. A ready evaluation records `CHAOS_EVENT_TRIGGERED` with `simulated: false`, observation time, activity score and fee state. It does not select a token, move funds or authorize a transfer. A persisted latch emits once while the score remains at 100 and rearms below the configured threshold. Warming-up, degraded and stale data cannot emit events.

## Read-only APIs

| Endpoint | Contents |
| --- | --- |
| `GET /api/chaos` | Full progression snapshot, components, token activity and event history |
| `GET /api/tokens` | System metadata, eligible observations and per-token activity |
| `GET /api/events` | CHAOS events, legacy records, verified events and confirmed distributions |
| `GET /api/financial` | Read-only token, fee-wallet, threshold and verified distribution state |

Every successful response includes `chaosIndex`, `activityScore`, `distributionReady`, fee availability, the 100% event threshold, component weights, data coverage, eligible tokens, per-token activity, timestamps, provider provenance, status and formula version. `/api/chaos` also includes the seven component records. Timestamps are ISO UTC; missing values are null. Headers identify DEX Screener plus Solana RPC and mark index events as informational and non-custodial.

Statuses: `initializing`, `warming_up`, `healthy`, `degraded`, `stale`, `unavailable`. Provider outages retain the last successful snapshot/timestamp, mark degradation and suppress events. After the freshness limit, reads mark it stale; Live Mode clears the displayed measurement. Unreadable/corrupt storage returns HTTP 503, not invented data. The worker refuses to overwrite corrupt state.

With the local worker, page/API requests never contact DEX Screener. On Vercel, `/api/chaos` awaits and persists a due scan when observations are at least five minutes old or project pool settings have changed. Serverless scans prioritize pool members and explicit additions, cap discovery at 120 candidates and abort at 45 seconds. The refresh uses the same scanner, filters and formula; optimistic Blob writes prevent an older concurrent result from overwriting newer state. HTTP responses cache for five seconds. A per-process aggregate budget of 300 API requests/minute returns HTTP 429 with Retry-After. Browser consumers share a ten-second cache and concurrent request, then poll serially. Production should additionally use ingress/CDN traffic limits; the process-local budget is not distributed abuse protection.

The worker serializes provider calls with a default 1600ms gap (~37.5 requests/minute), below documented 60/min discovery and 300/min market limits. Responses cache up to 120 seconds, capped below the scan interval. Requests have timeouts, bounded retries and circuit cooldowns. HTTP 429 honors Retry-After with a minimum 60-second cooldown. Batching, bounded candidates and the default five-minute interval limit load. See the [official API reference](https://docs.dexscreener.com/api/reference).

## Frontend and financial boundary

The public interface is read-only. `src/lib/live-chaos-source.ts` reads `/api/chaos`; it does not choose a token, reset measured data or infer an event from a frontend reading of 100. Event state comes from the backend only. Legacy local simulation utilities remain isolated from the production data source and financial ledger.

The wallet administrator owns every real financial decision and performs transfers manually outside this website. The backend only monitors public addresses, calculates progression and verifies submitted TXIDs. The frontend and backend have no private key, wallet connection, signing or transfer methods. A CHAOS EVENT is never financial authorization or evidence of a transfer.

The dark laboratory identity, Lorenz attractor, eight lore chapters and swipeable engine carousel are retained. Animations honor reduced motion and stop offscreen; canvas caps frame rate and pixel ratio. Keyboard navigation, skip links, focus styles, accessible controls and mobile table scrolling remain available.

## Deployment and checks

Documentation lives at `/docs`, with eight additional direct routes for theory, index, pool, engine, events, tokenomics, security and roadmap. The homepage's DOCS link opens this separate App Router layout. Edit `src/lib/docs-content.ts` to replace the editorial content; the shared article renderer supplies headings, in-page contents and previous/next links. The reusable sidebar marks the current URL and collapses on mobile. Documentation styles are scoped to `.docs-*` classes, preserving the homepage. Route pages are statically generated; unknown documentation slugs return 404.

For a traditional host, run one long-lived worker alongside Next.js with the same persistent `CHAOS_DATA_DIR` and configuration. Use a supervisor to restart the worker after unexpected failures. The atomic JSON store and PID lock support a **single host**.

On Vercel, connect a private Vercel Blob store to the project. `BLOB_STORE_ID` is injected through Vercel OIDC and must remain server-only. The API stores `.chaos-data/state.json`'s logical market state at `chaos/market-state.json` and refreshes it on demand at the configured scan interval (minimum five minutes), so redeployments do not erase the Chaos Pool. This is not a continuous worker: scans occur only after traffic reaches `/api/chaos`, and financial reads persist their separate state at `chaos/financial-state.json`, refreshing expired Solana observations at the configured monitoring interval. Financial updates and admin registrations use conditional ETag writes with bounded conflict retries, preserving the distribution ledger. A due refresh completes before returning; unconfigured addresses remain explicitly unconfigured. A future always-on scanner or scheduled service plus a database/distributed lock is still recommended for continuous market and financial monitoring across multiple instances.

Tests cover all seven configurable weights, growth and decline, missing-data renormalization, per-token median aggregation, fee sufficiency, event deduplication/rearming, strict eligibility, outages, persistence/locking, staleness, provider caching/429 and the frontend read-only boundary.

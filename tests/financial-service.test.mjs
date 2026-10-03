import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAdminSession, getAdminAuthConfig, requestHasSameOrigin, verifyAdminCredentials, verifyAdminSession } from "../src/server/financial/auth.ts";
import { getFinancialConfig } from "../src/server/financial/config.ts";
import { monitorFinancialState } from "../src/server/financial/monitor.ts";
import { SolanaProvider } from "../src/server/financial/solana-provider.ts";
import { emptyFinancialState, FinancialStore, publicFinancialSnapshot } from "../src/server/financial/store.ts";
import { calculateDistributionThreshold, thresholdAtLevel } from "../src/server/financial/threshold.ts";
import { confirmDistribution, validateDistributionSubmission, verifyDistributionTransaction } from "../src/server/financial/verification.ts";

const now = Date.UTC(2026, 9, 2);
const wallet = "A".repeat(32);
const destination = "B".repeat(32);
const token = "C".repeat(32);
const txid = "D".repeat(88);
const configured = (overrides = {}) => getFinancialConfig({ FEE_WALLET_CA: wallet, CHAOS_TOKEN_CA: token, ...overrides });
const submission = { amount: 1.25, destinationProject: "PROJECT X", destinationWallet: destination, destinationToken: token, txid };

function reader(overrides = {}) {
  return {
    getBalance: async () => 5.4,
    getTokenSupply: async () => ({ amount: "1000000", decimals: 6 }),
    getTokenLargestAccounts: async () => 20,
    getSignatures: async () => [],
    getSignatureStatus: async () => ({ confirmationStatus: "finalized", err: null }),
    getParsedTransaction: async () => ({ blockTime: now / 1000, meta: { err: null, innerInstructions: [] }, transaction: { message: { instructions: [{ program: "system", parsed: { type: "transfer", info: { source: wallet, destination, lamports: 1_250_000_000 } } }] } } }),
    ...overrides,
  };
}

test("financial configuration is explicit and works before token or fee wallet addresses exist", () => {
  const config = getFinancialConfig({});
  assert.equal(config.tokenAddress, null); assert.equal(config.feeWalletAddress, null);
  assert.equal(config.baseThresholdSol, 5); assert.equal(config.distributionPercentage, 20);
  const state = emptyFinancialState(config);
  assert.equal(state.snapshot.status, "not_configured");
  assert.equal(state.snapshot.token.configured, false); assert.equal(state.snapshot.feeWallet.configured, false);
  assert.throws(() => getFinancialConfig({ FEE_WALLET_CA: "invalid" }), /Invalid Solana address/);
});

test("Solana signature requests use the supported two-parameter RPC shape", async () => {
  let payload;
  const fetcher = async (_url, init) => {
    payload = JSON.parse(init.body);
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: payload.id, result: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
  const provider = new SolanaProvider(configured(), fetcher);
  assert.deepEqual(await provider.getSignatures(token), []);
  assert.deepEqual(payload, {
    jsonrpc: "2.0",
    id: 1,
    method: "getSignaturesForAddress",
    params: [token, { limit: 10, commitment: "confirmed" }],
  });
});

test("threshold math covers below, reached, percentage and progressive/custom levels", () => {
  const config = configured();
  const below = calculateDistributionThreshold(3.72, 0, config);
  assert.equal(below.currentThreshold, 5); assert.equal(below.progress, 74.4); assert.equal(below.remaining, 1.28); assert.equal(below.distributionAvailable, false); assert.equal(below.availableForDistribution, 0);
  const reached = calculateDistributionThreshold(5.4, 0, config);
  assert.equal(reached.progress, 100); assert.equal(reached.remaining, 0); assert.equal(reached.distributionAvailable, true); assert.equal(reached.availableForDistribution, 1.08); assert.equal(reached.nextThreshold, 10);
  const sequence = configured({ CHAOS_DISTRIBUTION_THRESHOLDS_SOL: "5,10,25,50,100", NEXT_THRESHOLD_MULTIPLIER: "3" });
  assert.deepEqual([0,1,2,3,4,5].map(level => thresholdAtLevel(level, sequence)), [5,10,25,50,100,300]);
});

test("monitor records on-chain threshold milestone once and keeps simulated events separate", async () => {
  const config = configured();
  const first = await monitorFinancialState(emptyFinancialState(config), reader(), config, undefined, () => now);
  assert.equal(first.snapshot.status, "healthy"); assert.equal(first.snapshot.feeWallet.balanceSol, 5.4);
  assert.equal(first.snapshot.verifiedEvents.length, 1); assert.equal(first.snapshot.verifiedEvents[0].type, "THRESHOLD_REACHED"); assert.equal(first.snapshot.verifiedEvents[0].simulated, false);
  const second = await monitorFinancialState(first, reader(), config, undefined, () => now + 60_000);
  assert.equal(second.snapshot.verifiedEvents.length, 1);
});

test("monitor preserves successful token fields when one RPC subrequest is rate limited", async () => {
  const config = configured({ FEE_WALLET_CA: "" });
  const partial = await monitorFinancialState(emptyFinancialState(config), reader({ getSignatures: async () => { throw new Error("HTTP 429"); } }), config, undefined, () => now);
  assert.equal(partial.snapshot.status, "degraded");
  assert.equal(partial.snapshot.token.supply, "1000000");
  assert.equal(partial.snapshot.token.decimals, 6);
  assert.equal(partial.snapshot.token.largestAccounts, 20);
  assert.deepEqual(partial.snapshot.token.recentMovements, []);
  assert.match(partial.snapshot.lastError, /Token signatures: HTTP 429/);
});

test("RPC failure preserves prior observations, reports degradation/unavailability and staleness", async () => {
  const config = configured();
  const healthy = await monitorFinancialState(emptyFinancialState(config), reader(), config, undefined, () => now);
  const offline = reader({ getBalance: async () => { throw new Error("RPC offline"); }, getTokenSupply: async () => { throw new Error("RPC offline"); } });
  const degraded = await monitorFinancialState(healthy, offline, config, undefined, () => now + 60_000);
  assert.equal(degraded.snapshot.status, "degraded"); assert.equal(degraded.snapshot.feeWallet.balanceSol, 5.4); assert.match(degraded.snapshot.lastError, /RPC offline/);
  assert.equal(publicFinancialSnapshot(degraded.snapshot, config, now + 60_000 + config.staleAfterMs + 1).status, "stale");
  const unavailableReader = reader({ getBalance: async () => { throw new Error("RPC offline"); }, getTokenSupply: async () => { throw new Error("RPC offline"); }, getTokenLargestAccounts: async () => { throw new Error("RPC offline"); }, getSignatures: async () => { throw new Error("RPC offline"); } });
  const unavailable = await monitorFinancialState(emptyFinancialState(config), unavailableReader, config, undefined, () => now);
  assert.equal(unavailable.snapshot.status, "unavailable");
});

test("distribution input rejects invalid TXID, amount and destination", () => {
  assert.throws(() => validateDistributionSubmission({ ...submission, txid: "bad" }), error => error.code === "INVALID_TXID");
  assert.throws(() => validateDistributionSubmission({ ...submission, amount: 0 }), error => error.code === "INVALID_AMOUNT");
  assert.throws(() => validateDistributionSubmission({ ...submission, destinationWallet: "bad" }), error => error.code === "INVALID_DESTINATION");
  assert.deepEqual(validateDistributionSubmission(submission), submission);
});

test("TX verification rejects missing, unconfirmed, wrong source/destination and wrong amount", async () => {
  const config = configured();
  await assert.rejects(verifyDistributionTransaction(submission, reader({ getSignatureStatus: async () => null }), config), error => error.code === "TX_NOT_FOUND");
  await assert.rejects(verifyDistributionTransaction(submission, reader({ getSignatureStatus: async () => ({ confirmationStatus: "processed", err: null }) }), config), error => error.code === "TX_NOT_CONFIRMED");
  const transaction = (source, target, lamports) => ({ meta: { err: null, innerInstructions: [] }, transaction: { message: { instructions: [{ program: "system", parsed: { type: "transfer", info: { source, destination: target, lamports } } }] } } });
  await assert.rejects(verifyDistributionTransaction(submission, reader({ getParsedTransaction: async () => transaction(destination, destination, 1_250_000_000) }), config), error => error.code === "TRANSFER_MISMATCH");
  await assert.rejects(verifyDistributionTransaction(submission, reader({ getParsedTransaction: async () => transaction(wallet, "E".repeat(32), 1_250_000_000) }), config), error => error.code === "TRANSFER_MISMATCH");
  await assert.rejects(verifyDistributionTransaction(submission, reader({ getParsedTransaction: async () => transaction(wallet, destination, 1_000_000_000) }), config), error => error.code === "AMOUNT_MISMATCH");
});

test("verified distribution creates one real event, advances threshold and refuses duplicates", async () => {
  const config = configured();
  const verified = await verifyDistributionTransaction(submission, reader(), config);
  const confirmed = confirmDistribution(emptyFinancialState(config), submission, verified.timestamp, new Date(now).toISOString(), config);
  assert.equal(confirmed.distributions[0].status, "confirmed"); assert.equal(confirmed.distributions[0].sourceWallet, wallet);
  assert.equal(confirmed.snapshot.verifiedEvents[0].type, "DISTRIBUTION_CONFIRMED"); assert.equal(confirmed.snapshot.verifiedEvents[0].simulated, false);
  assert.equal(confirmed.thresholdLevel, 1); assert.equal(confirmed.snapshot.threshold.currentThreshold, 10);
  assert.throws(() => confirmDistribution(confirmed, submission, verified.timestamp, new Date(now).toISOString(), config), error => error.code === "DUPLICATE_TXID");
});

test("financial state persists atomically in its own file", async () => {
  const directory = await mkdtemp(join(tmpdir(), "chaos-financial-"));
  try {
    const config = configured({ CHAOS_DATA_DIR: directory });
    const store = new FinancialStore(config);
    await store.update(config, state => ({ ...state, thresholdLevel: 2 }));
    assert.equal((await store.read(config)).thresholdLevel, 2);
    assert.equal(JSON.parse(await readFile(join(directory, "financial-state.json"), "utf8")).schemaVersion, 1);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("admin authentication requires secrets, signs expiring sessions and checks request origin", () => {
  assert.equal(getAdminAuthConfig({}).configured, false);
  const config = getAdminAuthConfig({ CHAOS_ADMIN_USERNAME: "operator", CHAOS_ADMIN_PASSWORD: "correct horse battery staple", CHAOS_ADMIN_SESSION_SECRET: "s".repeat(32) });
  assert.equal(config.configured, true); assert.equal(verifyAdminCredentials("operator", "wrong", config), false); assert.equal(verifyAdminCredentials("operator", "correct horse battery staple", config), true);
  const session = createAdminSession(config, now);
  assert.equal(verifyAdminSession(session, config, now + 1), true); assert.equal(verifyAdminSession(session, config, now + 8 * 60 * 60 * 1000 + 1), false); assert.equal(verifyAdminSession(session + "x", config, now), false);
  assert.equal(requestHasSameOrigin(new Request("https://chaos.test/api", { headers: { Origin: "https://chaos.test" } })), true);
  assert.equal(requestHasSameOrigin(new Request("https://chaos.test/api", { headers: { Origin: "https://evil.test" } })), false);
  assert.equal(requestHasSameOrigin(new Request("http://0.0.0.0:3000/api", { headers: { Origin: "http://localhost:3000", Host: "localhost:3000" } })), true);
  assert.equal(requestHasSameOrigin(new Request("http://internal:3000/api", { headers: { Origin: "https://chaos.example", Host: "internal:3000", "X-Forwarded-Host": "chaos.example", "X-Forwarded-Proto": "https" } })), true);
});

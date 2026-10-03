import { randomUUID } from "node:crypto";
import type { DistributionRecord, DistributionSubmission, FinancialState, VerifiedFinancialEvent } from "../../lib/financial-types.ts";
import type { FinancialConfig } from "./config.ts";
import { isSolanaAddress } from "./config.ts";
import type { SolanaReader } from "./solana-provider.ts";
import { calculateDistributionThreshold } from "./threshold.ts";

export class DistributionVerificationError extends Error {
  readonly code: string;
  constructor(message: string, code: string) { super(message); this.code = code; }
}

const isSignature = (value: string) => /^[1-9A-HJ-NP-Za-km-z]{64,100}$/.test(value);
const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

function transferInstructions(transaction: unknown) {
  const root = record(transaction);
  const tx = record(root.transaction);
  const message = record(tx.message);
  const meta = record(root.meta);
  const outer = Array.isArray(message.instructions) ? message.instructions : [];
  const innerGroups = Array.isArray(meta.innerInstructions) ? meta.innerInstructions : [];
  const inner = innerGroups.flatMap(group => {
    const instructions = record(group).instructions;
    return Array.isArray(instructions) ? instructions : [];
  });
  return [...outer, ...inner].flatMap(value => {
    const instruction = record(value);
    if (instruction.program !== "system") return [];
    const parsed = record(instruction.parsed);
    if (parsed.type !== "transfer") return [];
    const info = record(parsed.info);
    const lamports = Number(info.lamports);
    return typeof info.source === "string" && typeof info.destination === "string" && Number.isSafeInteger(lamports) && lamports > 0
      ? [{ source: info.source, destination: info.destination, lamports }]
      : [];
  });
}

export function validateDistributionSubmission(value: unknown): DistributionSubmission {
  const body = record(value);
  const amount = Number(body.amount);
  const destinationProject = typeof body.destinationProject === "string" ? body.destinationProject.trim() : "";
  const destinationWallet = typeof body.destinationWallet === "string" ? body.destinationWallet.trim() : "";
  const destinationTokenValue = typeof body.destinationToken === "string" ? body.destinationToken.trim() : "";
  const txid = typeof body.txid === "string" ? body.txid.trim() : "";
  if (!Number.isFinite(amount) || amount <= 0 || Math.round(amount * 1_000_000_000) / 1_000_000_000 !== amount) throw new DistributionVerificationError("Amount must be a positive SOL value with at most 9 decimals", "INVALID_AMOUNT");
  if (!destinationProject || destinationProject.length > 120) throw new DistributionVerificationError("Destination project is required and must be 120 characters or fewer", "INVALID_PROJECT");
  if (!isSolanaAddress(destinationWallet)) throw new DistributionVerificationError("Destination wallet is not a valid Solana address", "INVALID_DESTINATION");
  if (destinationTokenValue && !isSolanaAddress(destinationTokenValue)) throw new DistributionVerificationError("Destination token CA is not a valid Solana address", "INVALID_TOKEN");
  if (!isSignature(txid)) throw new DistributionVerificationError("TXID is not a valid Solana transaction signature", "INVALID_TXID");
  return { amount, destinationProject, destinationWallet, destinationToken: destinationTokenValue || null, txid };
}

export async function verifyDistributionTransaction(submission: DistributionSubmission, reader: SolanaReader, config: FinancialConfig, signal?: AbortSignal) {
  if (!config.feeWalletAddress) throw new DistributionVerificationError("FEE_WALLET_CA is not configured", "SOURCE_NOT_CONFIGURED");
  const status = await reader.getSignatureStatus(submission.txid, signal);
  if (!status) throw new DistributionVerificationError("Transaction was not found on Solana", "TX_NOT_FOUND");
  if (status.err !== null) throw new DistributionVerificationError("Transaction failed on Solana", "TX_FAILED");
  if (status.confirmationStatus !== "confirmed" && status.confirmationStatus !== "finalized") throw new DistributionVerificationError("Transaction is not yet confirmed", "TX_NOT_CONFIRMED");
  const transaction = await reader.getParsedTransaction(submission.txid, signal);
  if (!transaction) throw new DistributionVerificationError("Confirmed transaction details are unavailable", "TX_DETAILS_UNAVAILABLE");
  const root = record(transaction);
  const meta = record(root.meta);
  if (meta.err !== null && meta.err !== undefined) throw new DistributionVerificationError("Transaction metadata reports a failure", "TX_FAILED");
  const matchingTransfers = transferInstructions(transaction).filter(item => item.source === config.feeWalletAddress && item.destination === submission.destinationWallet);
  if (!matchingTransfers.length) throw new DistributionVerificationError("Transaction does not transfer SOL from the configured fee wallet to the submitted destination", "TRANSFER_MISMATCH");
  const actualLamports = matchingTransfers.reduce((total, item) => total + item.lamports, 0);
  const expectedLamports = Math.round(submission.amount * 1_000_000_000);
  if (actualLamports !== expectedLamports) throw new DistributionVerificationError(`Transaction amount mismatch: expected ${submission.amount} SOL, verified ${actualLamports / 1_000_000_000} SOL`, "AMOUNT_MISMATCH");
  const blockTime = typeof root.blockTime === "number" ? root.blockTime : null;
  return { timestamp: blockTime === null ? new Date().toISOString() : new Date(blockTime * 1000).toISOString() };
}

export function confirmDistribution(state: FinancialState, submission: DistributionSubmission, timestamp: string, verifiedAt: string, config: FinancialConfig) {
  if (state.distributions.some(item => item.txid === submission.txid && item.status === "confirmed")) throw new DistributionVerificationError("This TXID is already registered", "DUPLICATE_TXID");
  const distribution: DistributionRecord = {
    id: randomUUID(), timestamp, amount: submission.amount, currency: "SOL", sourceWallet: config.feeWalletAddress!, destinationProject: submission.destinationProject,
    destinationWallet: submission.destinationWallet, destinationToken: submission.destinationToken, txid: submission.txid, status: "confirmed", verifiedAt,
  };
  const event: VerifiedFinancialEvent = {
    id: randomUUID(), type: "DISTRIBUTION_CONFIRMED", timestamp: verifiedAt, description: `Verified manual distribution to ${submission.destinationProject}`,
    amount: submission.amount, destination: submission.destinationWallet, txid: submission.txid, simulated: false, source: "solana-rpc",
  };
  const thresholdLevel = state.thresholdLevel + 1;
  const distributions = [distribution, ...state.distributions].slice(0, config.maxHistory);
  return {
    ...state,
    thresholdLevel,
    distributions,
    snapshot: {
      ...state.snapshot,
      threshold: calculateDistributionThreshold(state.snapshot.feeWallet.balanceSol, thresholdLevel, config),
      lastDistribution: distribution,
      verifiedEvents: [event, ...state.snapshot.verifiedEvents].slice(0, config.maxEvents),
    },
  } satisfies FinancialState;
}

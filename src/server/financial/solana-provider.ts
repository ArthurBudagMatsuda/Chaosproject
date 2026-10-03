import type { OnChainMovement } from "../../lib/financial-types.ts";
import type { FinancialConfig } from "./config.ts";

interface RpcEnvelope<T> { result?: T; error?: { code: number; message: string } }
export interface SignatureStatus { confirmationStatus: "processed" | "confirmed" | "finalized" | null; err: unknown }

export interface SolanaReader {
  getBalance(address: string, signal?: AbortSignal): Promise<number>;
  getTokenSupply(address: string, signal?: AbortSignal): Promise<{ amount: string; decimals: number }>;
  getTokenLargestAccounts(address: string, signal?: AbortSignal): Promise<number>;
  getSignatures(address: string, signal?: AbortSignal): Promise<OnChainMovement[]>;
  getSignatureStatus(signature: string, signal?: AbortSignal): Promise<SignatureStatus | null>;
  getParsedTransaction(signature: string, signal?: AbortSignal): Promise<unknown | null>;
}

export class SolanaProvider implements SolanaReader {
  private requestId = 0;
  private config: FinancialConfig;
  private fetcher: typeof fetch;
  constructor(config: FinancialConfig, fetcher: typeof fetch = fetch) { this.config = config; this.fetcher = fetcher; }

  private async call<T>(method: string, params: unknown[], signal?: AbortSignal): Promise<T> {
    const timeout = AbortSignal.timeout(this.config.rpcTimeoutMs);
    const response = await this.fetcher(this.config.rpcUrl, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: ++this.requestId, method, params }),
      cache: "no-store",
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    if (!response.ok) throw new Error(`Solana RPC HTTP ${response.status}`);
    const body = await response.json() as RpcEnvelope<T>;
    if (body.error) throw new Error(`Solana RPC ${body.error.code}: ${body.error.message}`);
    if (body.result === undefined) throw new Error(`Solana RPC returned no result for ${method}`);
    return body.result;
  }

  async getBalance(address: string, signal?: AbortSignal) {
    const result = await this.call<{ value: number }>("getBalance", [address, { commitment: "confirmed" }], signal);
    return result.value / 1_000_000_000;
  }

  async getTokenSupply(address: string, signal?: AbortSignal) {
    const result = await this.call<{ value: { amount: string; decimals: number } }>("getTokenSupply", [address, { commitment: "confirmed" }], signal);
    return result.value;
  }

  async getTokenLargestAccounts(address: string, signal?: AbortSignal) {
    const result = await this.call<{ value: unknown[] }>("getTokenLargestAccounts", [address, { commitment: "confirmed" }], signal);
    return result.value.length;
  }

  async getSignatures(address: string, signal?: AbortSignal) {
    const result = await this.call<Array<{ signature: string; slot: number; blockTime: number | null; err: unknown }>>("getSignaturesForAddress", [address, { limit: 10, commitment: "confirmed" }], signal);
    return result.map(item => ({ signature: item.signature, slot: item.slot, timestamp: item.blockTime === null ? null : new Date(item.blockTime * 1000).toISOString(), successful: item.err === null }));
  }

  async getSignatureStatus(signature: string, signal?: AbortSignal) {
    const result = await this.call<{ value: Array<SignatureStatus | null> }>("getSignatureStatuses", [[signature], { searchTransactionHistory: true }], signal);
    return result.value[0] ?? null;
  }

  async getParsedTransaction(signature: string, signal?: AbortSignal) {
    return this.call<unknown | null>("getTransaction", [signature, { commitment: "confirmed", encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }], signal);
  }
}

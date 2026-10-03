import type { DistributionRecord, FinancialSnapshot } from "./financial-types";

export interface PublicFinancialData extends FinancialSnapshot { distributions: DistributionRecord[] }

export async function readFinancialSnapshot(signal?: AbortSignal): Promise<PublicFinancialData> {
  const response = await fetch("/api/financial", { cache: "no-store", signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15_000)]) : AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error("Financial API unavailable");
  const value = await response.json() as PublicFinancialData;
  if (value.schemaVersion !== 1 || value.provenance !== "solana-rpc" || value.custody !== false || !Array.isArray(value.verifiedEvents) || !Array.isArray(value.distributions)) throw new Error("Invalid financial snapshot");
  return value;
}

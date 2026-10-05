import { put } from "@vercel/blob";
import type { FinancialState } from "../../lib/financial-types.ts";
import type { FinancialConfig } from "./config.ts";
import { emptyFinancialState, validateFinancialState } from "./store.ts";
import { isConcurrentBlobWrite } from "../market/blob-store.ts";
import { readVersionedBlob } from "../blob-state.ts";

const PATH = "chaos/financial-state.json";
export interface FinancialStateStore {
  read(config: FinancialConfig): Promise<FinancialState>;
  update(config: FinancialConfig, mutate: (state: FinancialState) => FinancialState | Promise<FinancialState>): Promise<FinancialState>;
}
export interface FinancialBlobReader {
  read(config: FinancialConfig): Promise<{ state: FinancialState; etag: string | null }>;
  write(state: FinancialState, etag: string | null): Promise<void>;
  isConflict(error: unknown): boolean;
}

// Each retry re-applies the mutation to the latest ledger; never overwrite a concurrent distribution.
export async function updateFinancialBlob(reader: FinancialBlobReader, config: FinancialConfig, mutate: (state: FinancialState) => FinancialState | Promise<FinancialState>) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const current = await reader.read(config);
    const next = await mutate(current.state);
    try { await reader.write(next, current.etag); return next; }
    catch (error) { if (!reader.isConflict(error) || attempt === 2) throw error; }
  }
  throw new Error("Financial state is busy");
}

export class BlobFinancialStore implements FinancialStateStore {
  private reader: FinancialBlobReader = {
    read: async config => {
      const result = await readVersionedBlob(PATH);
      if (!result) return { state: emptyFinancialState(config), etag: null };
      const state = validateFinancialState(JSON.parse(result.content));
      return { state, etag: result.etag };
    },
    write: async (state, etag) => {
      await put(PATH, JSON.stringify(state), { access: "private", addRandomSuffix: false,
        allowOverwrite: etag !== null, cacheControlMaxAge: 60, contentType: "application/json",
        ...(etag ? { ifMatch: etag } : {}) });
    },
    isConflict: isConcurrentBlobWrite,
  };
  async read(config: FinancialConfig) { return (await this.reader.read(config)).state; }
  update(config: FinancialConfig, mutate: (state: FinancialState) => FinancialState | Promise<FinancialState>) {
    return updateFinancialBlob(this.reader, config, mutate);
  }
}

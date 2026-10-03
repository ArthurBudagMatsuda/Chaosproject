import { BlobPreconditionFailedError, get, put } from "@vercel/blob";
import type { ScannerState } from "../../lib/market-types.ts";
import type { MarketConfig } from "./config.ts";
import { emptyState, hydrateState } from "./store.ts";

const STATE_PATH = "chaos/market-state.json";

export interface VersionedMarketState {
  state: ScannerState;
  etag: string | null;
}

export function hasBlobMarketStore(env: NodeJS.ProcessEnv = process.env) {
  return env.VERCEL === "1" && Boolean(env.BLOB_STORE_ID);
}

export class BlobMarketStore {
  async read(config: MarketConfig): Promise<VersionedMarketState> {
    const result = await get(STATE_PATH, { access: "private", useCache: false });
    if (!result) return { state: emptyState(config), etag: null };
    if (result.statusCode !== 200 || !result.stream) throw new Error("Unable to read market state from Blob");
    const value = JSON.parse(await new Response(result.stream).text()) as ScannerState;
    return { state: hydrateState(value, config), etag: result.blob.etag };
  }

  async write(state: ScannerState, etag: string | null) {
    await put(STATE_PATH, JSON.stringify(state), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: etag !== null,
      cacheControlMaxAge: 60,
      contentType: "application/json",
      ...(etag ? { ifMatch: etag } : {}),
    });
  }
}

export function isConcurrentBlobWrite(error: unknown) {
  return error instanceof BlobPreconditionFailedError || (error instanceof Error && /already exists|precondition/i.test(error.message));
}

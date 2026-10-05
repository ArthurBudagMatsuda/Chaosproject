import { BlobNotFoundError, get, head } from "@vercel/blob";

export interface BlobStateReader {
  version(path: string): Promise<string | null>;
  content(path: string): Promise<string | null>;
}
const reader: BlobStateReader = {
  version: async path => {
    try { return (await head(path)).etag; }
    catch (error) { if (error instanceof BlobNotFoundError) return null; throw error; }
  },
  content: async path => {
    const result = await get(path, { access: "private", useCache: false });
    if (!result) return null;
    if (result.statusCode !== 200 || !result.stream) throw new Error("Unable to read Blob state");
    return new Response(result.stream).text();
  },
};

// Use the storage API's canonical version, not a transformed download/CDN ETag.
// Checking before and after the download prevents pairing content with a newer version.
export async function readVersionedBlob(path: string, source: BlobStateReader = reader): Promise<{ content: string; etag: string } | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const before = await source.version(path);
    if (before === null) return null;
    const content = await source.content(path);
    const after = await source.version(path);
    if (content !== null && before === after) return { content, etag: before };
  }
  throw new Error("Blob state changed while being read; retry shortly");
}

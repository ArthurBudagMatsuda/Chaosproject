import { test } from "node:test";
import assert from "node:assert/strict";
import { readVersionedBlob } from "../src/server/blob-state.ts";

test("versioned Blob reads retry mixed versions and use the canonical storage version", async () => {
  const versions = ["v1", "v2", "v2", "v2"];
  const contents = ["old-content", "current-content"];
  const result = await readVersionedBlob("test", { version: async () => versions.shift(), content: async () => contents.shift() });
  assert.deepEqual(result, { content: "current-content", etag: "v2" });
  assert.equal(await readVersionedBlob("missing", { version: async () => null, content: async () => { throw new Error("unexpected read"); } }), null);
  let version = 0;
  await assert.rejects(readVersionedBlob("busy", { version: async () => String(++version), content: async () => "state" }), /changed while being read/);
});

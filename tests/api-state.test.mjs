import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createStateHandler } from "../api/lib/state-handler.js";

const fixture = JSON.parse(await readFile(new URL("../docs/data/state.json", import.meta.url)));

function memoryStore(initial = fixture, etag = '"revision-3"') {
  let state = structuredClone(initial);
  let currentEtag = etag;
  return {
    async read() {
      return { state: structuredClone(state), etag: currentEtag };
    },
    async write(next, { ifMatch }) {
      if (ifMatch !== currentEtag) {
        const error = new Error("precondition");
        error.code = "BLOB_PRECONDITION_FAILED";
        throw error;
      }
      state = structuredClone(next);
      currentEtag = `"revision-${next.revision}"`;
      return { state: structuredClone(state), etag: currentEtag };
    },
  };
}

test("GET returns validated state and an ETag", async () => {
  const handle = createStateHandler({ store: memoryStore() });
  const response = await handle({ method: "GET", headers: {}, body: "" });
  assert.equal(response.status, 200);
  assert.equal(response.headers.ETag, '"revision-3"');
  assert.equal(response.body.state.matches.length, 2);
});

test("PUT increments revision and stamps server time", async () => {
  const handle = createStateHandler({
    store: memoryStore(),
    now: () => new Date("2026-08-02T20:53:00.000Z"),
  });
  const response = await handle({
    method: "PUT",
    headers: { "content-type": "application/json", "if-match": '"revision-3"' },
    body: JSON.stringify(fixture),
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.state.revision, 4);
  assert.equal(response.body.state.updatedAt, "2026-08-02T20:53:00.000Z");
});

test("PUT rejects stale, invalid, and oversized payloads", async () => {
  const handle = createStateHandler({ store: memoryStore(), maxBytes: 128 * 1024 });
  const stale = await handle({
    method: "PUT",
    headers: { "content-type": "application/json", "if-match": '"old"' },
    body: JSON.stringify(fixture),
  });
  assert.equal(stale.status, 409);

  const invalid = await handle({
    method: "PUT",
    headers: { "content-type": "application/json", "if-match": '"revision-3"' },
    body: "{}",
  });
  assert.equal(invalid.status, 422);

  const tinyHandle = createStateHandler({ store: memoryStore(), maxBytes: 256 });
  const oversized = await tinyHandle({
    method: "PUT",
    headers: { "content-type": "application/json", "if-match": '"revision-3"' },
    body: "x".repeat(257),
  });
  assert.equal(oversized.status, 413);
});

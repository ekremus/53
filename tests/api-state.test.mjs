import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createStateHandler } from "../api/lib/state-handler.js";

const fixture = JSON.parse(await readFile(new URL("../docs/data/state.json", import.meta.url)));
const editPassword = "test-1453";
const authorizedHeaders = { "content-type": "application/json", "x-edit-password": editPassword };

function memoryStore(initial = fixture, etag = '"revision-3"') {
  let state = structuredClone(initial);
  let currentEtag = etag;
  return {
    async read() {
      return { state: structuredClone(state), etag: currentEtag };
    },
    async write(next) {
      state = structuredClone(next);
      currentEtag = `"revision-${next.revision}"`;
      return { state: structuredClone(state), etag: currentEtag };
    },
  };
}

test("GET returns validated state without a browser concurrency header", async () => {
  const handle = createStateHandler({ store: memoryStore() });
  const response = await handle({ method: "GET", headers: {}, body: "" });
  assert.equal(response.status, 200);
  assert.equal(response.headers.ETag, undefined);
  assert.equal(response.body.state.matches.length, 2);
});

test("PUT increments revision and stamps server time", async () => {
  const handle = createStateHandler({
    store: memoryStore(),
    editPassword,
    now: () => new Date("2026-08-02T20:53:00.000Z"),
  });
  const response = await handle({
    method: "PUT",
    headers: { ...authorizedHeaders, "if-match": '"revision-3"' },
    body: JSON.stringify(fixture),
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.state.revision, 4);
  assert.equal(response.body.state.updatedAt, "2026-08-02T20:53:00.000Z");
});

test("PUT accepts a valid stale client and applies last-write-wins", async () => {
  const stale = structuredClone(fixture);
  stale.revision = 1;
  stale.matches[0].teams.cortinyanlar[0].civilization = "Armenians";
  const handle = createStateHandler({ store: memoryStore(), editPassword });
  const response = await handle({
    method: "PUT",
    headers: authorizedHeaders,
    body: JSON.stringify(stale),
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.state.revision, fixture.revision + 1);
  assert.equal(response.body.state.matches[0].teams.cortinyanlar[0].civilization, "Armenians");
});

test("PUT accepts vacant slots and canonicalizes them to Random", async () => {
  const submitted = structuredClone(fixture);
  submitted.matches[0].teams.cortinyanlar[0] = { playerId: "", civilization: "Huns" };
  const handle = createStateHandler({ store: memoryStore(), editPassword });
  const response = await handle({
    method: "PUT",
    headers: authorizedHeaders,
    body: JSON.stringify(submitted),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.state.matches[0].teams.cortinyanlar[0], {
    playerId: "",
    civilization: "Random",
  });
});

test("PUT rejects invalid and oversized payloads", async () => {
  const handle = createStateHandler({ store: memoryStore(), maxBytes: 128 * 1024, editPassword });
  const invalid = await handle({
    method: "PUT",
    headers: authorizedHeaders,
    body: "{}",
  });
  assert.equal(invalid.status, 422);

  const tinyHandle = createStateHandler({ store: memoryStore(), maxBytes: 256, editPassword });
  const oversized = await tinyHandle({
    method: "PUT",
    headers: { ...authorizedHeaders, "if-match": '"revision-3"' },
    body: "x".repeat(257),
  });
  assert.equal(oversized.status, 413);
});

test("PUT rejects missing and incorrect edit passwords before reading state", async () => {
  let reads = 0;
  const store = memoryStore();
  const read = store.read;
  store.read = async () => {
    reads += 1;
    return read();
  };
  const handle = createStateHandler({ store, editPassword });

  const missing = await handle({
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(fixture),
  });
  const wrong = await handle({
    method: "PUT",
    headers: { "content-type": "application/json", "x-edit-password": "wrong" },
    body: JSON.stringify(fixture),
  });
  assert.equal(missing.status, 401);
  assert.equal(wrong.status, 401);
  assert.equal(reads, 0);
});

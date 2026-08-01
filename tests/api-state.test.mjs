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

test("PUT accepts a valid stale client and applies last-write-wins", async () => {
  const stale = structuredClone(fixture);
  stale.revision = 1;
  stale.matches[0].teams.cortinyanlar[0].civilization = "Armenians";
  const handle = createStateHandler({ store: memoryStore() });
  const response = await handle({
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(stale),
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.state.revision, fixture.revision + 1);
  assert.equal(response.body.state.matches[0].teams.cortinyanlar[0].civilization, "Armenians");
});

test("PUT accepts vacant slots and canonicalizes them to Random", async () => {
  const submitted = structuredClone(fixture);
  submitted.matches[0].teams.cortinyanlar[0] = { playerId: "", civilization: "Huns" };
  const handle = createStateHandler({ store: memoryStore() });
  const response = await handle({
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(submitted),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.state.matches[0].teams.cortinyanlar[0], {
    playerId: "",
    civilization: "Random",
  });
});

test("PUT rejects invalid and oversized payloads", async () => {
  const handle = createStateHandler({ store: memoryStore(), maxBytes: 128 * 1024 });
  const invalid = await handle({
    method: "PUT",
    headers: { "content-type": "application/json" },
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

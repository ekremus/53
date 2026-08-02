import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { orderedMatchRecords } from "../docs/lib/matrix.js";
import { validateState } from "../docs/lib/model.js";

const root = new URL("../data/migrations/2026-08-02-saturday-sessions/", import.meta.url);
const before = validateState(JSON.parse(await readFile(new URL("before.json", root), "utf8")));
const after = validateState(JSON.parse(await readFile(new URL("after.json", root), "utf8")));
const report = JSON.parse(await readFile(new URL("report.json", root), "utf8"));

function contentById(state) {
  return new Map(state.matches.map(({ id, date, ...content }) => [id, content]));
}

test("normalizes only dates and ordering while preserving all match content", () => {
  assert.equal(before.players.length, 13);
  assert.equal(before.matches.length, 47);
  assert.equal(after.players.length, 13);
  assert.equal(after.matches.length, 47);
  assert.deepEqual(after.players, before.players);
  assert.deepEqual(after.teams, before.teams);
  assert.deepEqual(contentById(after), contentById(before));
  assert.equal(new Set(after.matches.map(({ id }) => id)).size, 47);
  assert.ok(after.matches.every(({ date }) => new Date(`${date}T00:00:00Z`).getUTCDay() === 6));
  assert.deepEqual(report.changedFields, ["matches[].date", "matches array order"]);
});

test("keeps real repeated games and derives contiguous session sequences", () => {
  const ids = new Set(after.matches.map(({ id }) => id));
  assert.ok(ids.has("replay-20260222-0043-037"));
  assert.ok(ids.has("replay-20260221-2334-038"));
  const groups = new Map();
  for (const { match, sequence } of orderedMatchRecords(after)) {
    const values = groups.get(match.date) ?? [];
    values.push(sequence);
    groups.set(match.date, values);
  }
  for (const values of groups.values()) {
    const ascending = [...values].sort((a, b) => a - b);
    assert.deepEqual(ascending, Array.from({ length: values.length }, (_, index) => index + 1));
  }
});

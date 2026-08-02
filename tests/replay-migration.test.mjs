import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateState } from "../docs/lib/model.js";

const migrationRoot = new URL("../data/migrations/2026-08-02-replays/", import.meta.url);
const before = validateState(JSON.parse(await readFile(new URL("before.json", migrationRoot), "utf8")));
const after = validateState(JSON.parse(await readFile(new URL("after.json", migrationRoot), "utf8")));
const report = JSON.parse(await readFile(new URL("report.json", migrationRoot), "utf8"));

test("keeps a complete rollback snapshot and imports each new replay once", async () => {
  const source = await readFile(new URL("../replays/aoe2_replays.xlsx", import.meta.url));
  assert.equal(createHash("sha256").update(source).digest("hex"), report.sourceSha256);
  assert.equal(report.sourceMatches, 44);
  assert.deepEqual(report.duplicateSourceRows, [1, 2]);
  assert.equal(report.importedMatches, 42);
  assert.equal(before.matches.length, 5);
  assert.equal(after.matches.length, 47);
  assert.deepEqual(after.players, before.players);
  assert.deepEqual(after.matches.slice(0, before.matches.length), before.matches);
  assert.equal(new Set(after.matches.map((match) => match.id)).size, after.matches.length);
});

test("records the source duration limitation without inventing short matches", () => {
  assert.equal(report.durationColumnPresent, false);
  assert.equal(report.underTenMinuteMatchesDetectedFromTimestamps, 0);
  assert.equal(report.minimumAdjacentReplayGapMinutes, 53);
  assert.deepEqual(report.excludedUnderTenMinuteSourceRows, []);
  assert.deepEqual(report.importedDateRange, { from: "2026-01-31", to: "2026-07-18" });
  assert.deepEqual(report.importedWinnerTotals, { cortinyanlar: 25, bakracogullari: 17 });
});

test("preserves every imported civilization instead of falling back to Random", () => {
  const importedCivilizations = new Set(after.matches.slice(before.matches.length).flatMap(
    (match) => Object.values(match.teams).flatMap((slots) => slots.map((slot) => slot.civilization)),
  ));
  for (const civilization of ["Macedonians", "Puru", "Thracians"]) {
    assert.ok(importedCivilizations.has(civilization));
  }
});

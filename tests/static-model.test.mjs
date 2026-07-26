import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { CIVILIZATIONS } from "../docs/lib/civilizations.js";
import {
  activeRoster,
  calculateStatistics,
  createEmptyMatch,
  removeOrDeactivatePlayer,
  upsertPlayer,
  validateState,
} from "../docs/lib/model.js";

const fixtureState = JSON.parse(await readFile(
  new URL("../docs/data/state.json", import.meta.url),
  "utf8",
));

test("ships the current 53 standard AoE2 DE civilizations", () => {
  assert.equal(CIVILIZATIONS.length, 53);
  for (const civilization of ["Mapuche", "Muisca", "Tupi", "Turks", "Vikings"]) {
    assert.ok(CIVILIZATIONS.includes(civilization));
  }
});

test("validates and structurally clones the production state", () => {
  const state = validateState(fixtureState);
  assert.notEqual(state, fixtureState);
  assert.equal(state.matches.length, 2);
  assert.deepEqual(state.teams.map((team) => team.name), ["Cortinyanlar", "Bakracoğulları"]);
  assert.deepEqual(state.teams.map((team) => team.tone), ["blue", "red"]);
  assert.equal(state.revision, 3);
});

test("rejects incomplete, duplicate, and unknown match participants", () => {
  const incomplete = structuredClone(fixtureState);
  incomplete.matches[0].teams.cortinyanlar.pop();
  assert.throws(() => validateState(incomplete), /tam 4 oyuncu/);

  const duplicate = structuredClone(fixtureState);
  duplicate.matches[0].teams.bakracogullari[0].playerId = duplicate.matches[0].teams.cortinyanlar[0].playerId;
  assert.throws(() => validateState(duplicate), /iki kez/);

  const unknown = structuredClone(fixtureState);
  unknown.matches[0].teams.cortinyanlar[0].playerId = "bilinmeyen";
  assert.throws(() => validateState(unknown), /kayıtlı değil/);
});

test("rejects unknown civilizations and invalid winners", () => {
  const civilization = structuredClone(fixtureState);
  civilization.matches[0].teams.cortinyanlar[0].civilization = "Atlantis";
  assert.throws(() => validateState(civilization), /uygarlık/);

  const winner = structuredClone(fixtureState);
  winner.matches[0].winner = "draw";
  assert.throws(() => validateState(winner), /kazanan/);
});

test("derives team totals and player rankings from player identities", () => {
  const statistics = calculateStatistics(validateState(fixtureState));
  assert.equal(statistics.totalMatches, 2);
  assert.deepEqual(statistics.teams, { cortinyanlar: 2, bakracogullari: 0 });
  assert.equal(statistics.leader, "cortinyanlar");

  const general = statistics.players.find((player) => player.name === "Alman General");
  assert.deepEqual(
    { played: general?.played, wins: general?.wins, losses: general?.losses, winRate: general?.winRate },
    { played: 2, wins: 2, losses: 0, winRate: 100 },
  );
  assert.equal(statistics.players[0].rank, 1);
});

test("returns only active roster entries in Turkish sort order", () => {
  const state = structuredClone(fixtureState);
  state.players.find((player) => player.id === "zombi").active = false;
  const roster = activeRoster(validateState(state));
  assert.equal(roster.some((player) => player.id === "zombi"), false);
  assert.deepEqual(roster, [...roster].sort((a, b) => a.name.localeCompare(b.name, "tr-TR")));
});

test("creates a complete empty 4v4 match with Random civilizations", () => {
  const match = createEmptyMatch(validateState(fixtureState), "2026-07-27");
  assert.equal(match.date, "2026-07-27");
  assert.equal(match.teams.cortinyanlar.length, 4);
  assert.equal(match.teams.bakracogullari.length, 4);
  assert.ok(Object.values(match.teams).flat().every((slot) => slot.civilization === "Random"));
});

test("adds and renames players without duplicating names", () => {
  const added = upsertPlayer(fixtureState, { name: "Yeni Oyuncu" });
  const created = added.players.find((player) => player.name === "Yeni Oyuncu");
  assert.ok(created?.id);
  const renamed = upsertPlayer(added, { id: created.id, name: "Yeni İsim" });
  assert.equal(renamed.players.find((player) => player.id === created.id)?.name, "Yeni İsim");
  assert.throws(() => upsertPlayer(renamed, { name: "  YENİ   İSİM " }), /zaten var/);
});

test("deactivates referenced players, deletes unused players, and can reactivate", () => {
  const used = removeOrDeactivatePlayer(fixtureState, "buyukekrem");
  assert.equal(used.players.find((player) => player.id === "buyukekrem")?.active, false);

  const withUnused = upsertPlayer(fixtureState, { name: "Yedek" });
  const unused = withUnused.players.find((player) => player.name === "Yedek");
  const removed = removeOrDeactivatePlayer(withUnused, unused.id);
  assert.equal(removed.players.some((player) => player.id === unused.id), false);

  const reactivated = upsertPlayer(used, { id: "buyukekrem", name: "BuyukEkrem", active: true });
  assert.equal(reactivated.players.find((player) => player.id === "buyukekrem")?.active, true);
});

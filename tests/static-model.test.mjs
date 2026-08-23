import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { CIVILIZATIONS } from "../docs/lib/civilizations.js";
import {
  activeRoster,
  calculateStatistics,
  createEmptyMatch,
  favoriteCivilizationForPlayer,
  latestCivilizationForPlayer,
  removeOrDeactivatePlayer,
  sortPlayerStatistics,
  upsertPlayer,
  validateState,
} from "../docs/lib/model.js";

const fixtureState = JSON.parse(await readFile(
  new URL("../docs/data/state.json", import.meta.url),
  "utf8",
));

test("ships every AoE2 DE civilization used by saved matches", () => {
  assert.equal(CIVILIZATIONS.length, 56);
  for (const civilization of ["Macedonians", "Mapuche", "Muisca", "Puru", "Thracians", "Tupi", "Turks", "Vikings"]) {
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

test("accepts multiple vacant slots, normalizes their civilizations, and still rejects duplicate players", () => {
  const vacant = structuredClone(fixtureState);
  vacant.matches[0].teams.cortinyanlar[0] = { playerId: "", civilization: "Huns" };
  vacant.matches[0].teams.bakracogullari[0] = { playerId: "", civilization: "Random" };
  const normalized = validateState(vacant);
  assert.deepEqual(normalized.matches[0].teams.cortinyanlar[0], { playerId: "", civilization: "Random" });
  assert.deepEqual(normalized.matches[0].teams.bakracogullari[0], { playerId: "", civilization: "Random" });

  const duplicate = structuredClone(fixtureState);
  duplicate.matches[0].teams.bakracogullari[0].playerId = duplicate.matches[0].teams.cortinyanlar[0].playerId;
  assert.throws(() => validateState(duplicate), /iki kez/);
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
  assert.equal(statistics.players.length, fixtureState.players.length);
  assert.deepEqual(statistics.players.map((player) => player.rank), statistics.players.map((_, index) => index + 1));
});

test("ranks by total wins by default and sorts every standings measure without mutation", () => {
  const records = [
    { id: "perfect", name: "Az Maç", played: 1, wins: 1, losses: 0, winRate: 100, rank: 0 },
    { id: "veteran", name: "Çok Galibiyet", played: 16, wins: 8, losses: 8, winRate: 50, rank: 0 },
    { id: "steady", name: "Eşit Galibiyet", played: 10, wins: 8, losses: 2, winRate: 80, rank: 0 },
  ];

  assert.deepEqual(sortPlayerStatistics(records).map(({ id }) => id), ["steady", "veteran", "perfect"]);
  assert.deepEqual(sortPlayerStatistics(records, "winRate", "desc").map(({ id }) => id), ["perfect", "steady", "veteran"]);
  assert.deepEqual(sortPlayerStatistics(records, "played", "asc").map(({ id }) => id), ["perfect", "steady", "veteran"]);
  assert.deepEqual(sortPlayerStatistics(records, "losses", "desc").map(({ id }) => id), ["veteran", "steady", "perfect"]);
  assert.deepEqual(sortPlayerStatistics(records, "wins", "asc").map(({ id }) => id), ["perfect", "steady", "veteran"]);
  assert.deepEqual(sortPlayerStatistics(records).map(({ rank }) => rank), [1, 2, 3]);
  assert.deepEqual(records.map(({ rank }) => rank), [0, 0, 0]);
  assert.throws(() => sortPlayerStatistics(records, "unknown"), /ölçütü/);
  assert.throws(() => sortPlayerStatistics(records, "wins", "sideways"), /yönü/);
});

test("keeps every registered player while vacant slots do not affect statistics", () => {
  const state = structuredClone(fixtureState);
  state.matches[0].teams.cortinyanlar[0] = { playerId: "", civilization: "Random" };
  const statistics = calculateStatistics(state);
  assert.equal(statistics.totalMatches, 2);
  assert.deepEqual(statistics.teams, { cortinyanlar: 2, bakracogullari: 0 });
  const zombi = statistics.players.find((player) => player.id === "zombi");
  assert.ok(zombi);
  assert.deepEqual(
    { played: zombi?.played, wins: zombi?.wins, losses: zombi?.losses, winRate: zombi?.winRate },
    { played: 0, wins: 0, losses: 0, winRate: 0 },
  );
});

test("includes newly added and passive zero-match players with unique ranks", () => {
  const state = upsertPlayer(fixtureState, { name: "Yedek" });
  state.players.find((player) => player.name === "Yedek").active = false;
  const statistics = calculateStatistics(validateState(state));
  const yedek = statistics.players.find((player) => player.name === "Yedek");
  assert.deepEqual(
    { active: yedek?.active, played: yedek?.played, wins: yedek?.wins, losses: yedek?.losses, winRate: yedek?.winRate, favoriteCivilization: yedek?.favoriteCivilization },
    { active: false, played: 0, wins: 0, losses: 0, winRate: 0, favoriteCivilization: "Random" },
  );
  assert.equal(new Set(statistics.players.map((player) => player.rank)).size, statistics.players.length);
});

test("finds latest and favorite civilizations with newest-match tie breaking", () => {
  assert.equal(latestCivilizationForPlayer(fixtureState, "buyukekrem"), "Huns");
  assert.equal(latestCivilizationForPlayer(fixtureState, "buyukekrem", {
    matchId: fixtureState.matches[1].id,
    teamId: "cortinyanlar",
    index: 0,
  }), "Random");
  assert.equal(favoriteCivilizationForPlayer(fixtureState, "buyukekrem"), "Huns");

  const withNewPlayer = upsertPlayer(fixtureState, { name: "Yedek" });
  const yedek = withNewPlayer.players.find((player) => player.name === "Yedek");
  assert.equal(latestCivilizationForPlayer(withNewPlayer, yedek.id), "Random");
  assert.equal(favoriteCivilizationForPlayer(withNewPlayer, yedek.id), "Random");
});

test("returns only active roster entries in Turkish sort order", () => {
  const state = structuredClone(fixtureState);
  state.players.find((player) => player.id === "zombi").active = false;
  const roster = activeRoster(validateState(state));
  assert.equal(roster.some((player) => player.id === "zombi"), false);
  assert.deepEqual(roster, [...roster].sort((a, b) => a.name.localeCompare(b.name, "tr-TR")));
});

test("creates eight vacant fixed slots with Random civilizations", () => {
  const match = createEmptyMatch(validateState(fixtureState), "2026-07-27");
  assert.equal(match.date, "2026-07-27");
  assert.equal(match.teams.cortinyanlar.length, 4);
  assert.equal(match.teams.bakracogullari.length, 4);
  assert.ok(Object.values(match.teams).flat().every((slot) => slot.playerId === ""));
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

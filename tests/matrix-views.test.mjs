import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  orderedMatchRecords,
  orderedTeamSlots,
  renderEditableMatrix,
  renderMatchMatrix,
} from "../docs/lib/matrix.js";

const fixture = JSON.parse(await readFile(new URL("../docs/data/state.json", import.meta.url)));

test("renders every match once, newest first, with eight player cells and one result", () => {
  const state = structuredClone(fixture);
  state.matches[0].date = "2026-07-19";
  state.matches[1].date = "2026-07-26";
  const html = renderMatchMatrix(state);
  assert.equal((html.match(/data-match-column=/g) ?? []).length, 2);
  assert.ok(html.indexOf("2026-07-26") < html.indexOf("2026-07-19"));
  assert.equal((html.match(/class="matrix-player(?: |")/g) ?? []).length, 16);
  assert.equal((html.match(/class="matrix-result(?: |")/g) ?? []).length, 2);
});

test("numbers same-Saturday matches chronologically while rendering newest first", () => {
  const state = structuredClone(fixture);
  const first = structuredClone(state.matches[0]);
  const second = structuredClone(state.matches[1]);
  const third = structuredClone(state.matches[0]);
  first.id = "same-day-1";
  second.id = "same-day-2";
  third.id = "same-day-3";
  first.date = second.date = third.date = "2026-08-01";
  state.matches = [first, second, third];

  const records = orderedMatchRecords(state);
  assert.deepEqual(records.map(({ match, sequence }) => [match.id, sequence]), [
    ["same-day-3", 3],
    ["same-day-2", 2],
    ["same-day-1", 1],
  ]);

  const html = renderMatchMatrix(state);
  assert.ok(html.indexOf("same-day-3") < html.indexOf("same-day-2"));
  assert.ok(html.indexOf("same-day-2") < html.indexOf("same-day-1"));
  assert.deepEqual(
    [...html.matchAll(/class="match-sequence"> \((\d+)\)<\/span>/g)].map((match) => Number(match[1])),
    [3, 2, 1],
  );
  assert.match(html, /aria-label="01 Ağustos 2026, 3\. maç"/);
});

test("labels a one-match Saturday as the first game", () => {
  const state = structuredClone(fixture);
  state.matches = [state.matches[0]];
  state.matches[0].date = "2026-08-01";
  assert.match(renderMatchMatrix(state), /01 Ağu 2026<span class="match-sequence"> \(1\)<\/span>/);
});

test("keeps only empty colored team bands in the rail", () => {
  const html = renderMatchMatrix(fixture);
  const rail = html.match(/<aside class="matrix-rail"[\s\S]*?<\/aside>/)[0];
  assert.match(rail, /rail-team--blue/);
  assert.match(rail, /rail-team--red/);
  assert.doesNotMatch(rail, /<strong|Cortinyanlar|Bakracoğulları|medal\.svg/);
  assert.doesNotMatch(html, />Takım<|>Slot<|>P1<|>P2<|>P3<|>P4<|>Kazanan</);
});

test("shows one local winner medal beside every public result", () => {
  const publicHtml = renderMatchMatrix(fixture);
  const editHtml = renderEditableMatrix(fixture);
  assert.equal((publicHtml.match(/matrix-result__medal/g) ?? []).length, fixture.matches.length);
  assert.equal((publicHtml.match(/assets\/icons\/medal\.svg/g) ?? []).length, fixture.matches.length);
  assert.match(publicHtml, /matrix-result__medal[\s\S]*Cortinyanlar|matrix-result__medal[\s\S]*Bakracoğulları/);
  assert.doesNotMatch(editHtml, /matrix-result__medal/);
});

test("renders player names, civilization names, and local crests", () => {
  const html = renderMatchMatrix(fixture);
  assert.match(html, /BuyukEkrem/);
  assert.match(html, /Huns/);
  assert.match(html, /assets\/civs\/huns\.png/);
  assert.match(html, /assets\/civs\/random\.svg/);
});

test("makes only filled public match players detail buttons", () => {
  const state = structuredClone(fixture);
  state.matches = [state.matches[0]];
  state.matches[0].teams.cortinyanlar[0] = { playerId: "", civilization: "Random" };
  const publicHtml = renderMatchMatrix(state);
  const editHtml = renderEditableMatrix(state);
  assert.equal((publicHtml.match(/data-player-details=/g) ?? []).length, 7);
  assert.match(publicHtml, /<button[^>]*class="matrix-player"[^>]*data-player-details=/);
  assert.doesNotMatch(editHtml, /data-player-details=/);
});

test("editable matrix keeps one column per match and exposes complete controls", () => {
  const html = renderEditableMatrix(fixture);
  assert.equal((html.match(/data-edit-match=/g) ?? []).length, 2);
  assert.equal((html.match(/data-player-select=/g) ?? []).length, 16);
  assert.equal((html.match(/data-civilization-select=/g) ?? []).length, 16);
  assert.equal((html.match(/data-winner-select=/g) ?? []).length, 2);
  assert.match(html, /Yeni oyuncu ekle/);
});

test("orders both public and editable team rows alphabetically while preserving slot indexes", () => {
  const state = structuredClone(fixture);
  state.matches = [state.matches[0]];
  const slots = state.matches[0].teams.cortinyanlar;
  const ordered = orderedTeamSlots(state, slots);
  const players = new Map(state.players.map((player) => [player.id, player.name]));
  assert.deepEqual(ordered.map(({ slot }) => players.get(slot.playerId)), [
    "Alman General",
    "Italyan Aygiri",
    "Neudzulab",
    "Zombi",
  ]);

  const publicHtml = renderMatchMatrix(state);
  const publicBlue = publicHtml.match(/matrix-team--blue[^>]*>([\s\S]*?)<\/section>/)[1];
  assert.deepEqual([...publicBlue.matchAll(/data-slot="(\d+)"/g)].map((match) => Number(match[1])), [3, 1, 2, 0]);

  const editHtml = renderEditableMatrix(state);
  const editBlue = editHtml.match(/matrix-team--blue[^>]*>([\s\S]*?)<\/section>/)[1];
  assert.deepEqual([...editBlue.matchAll(/data-edit-slot="[^"]+:(\d+)"/g)].map((match) => Number(match[1])), [3, 1, 2, 0]);
});

test("puts vacant rows last and exposes the dash option without a public crest", () => {
  const state = structuredClone(fixture);
  state.matches = [state.matches[0]];
  state.matches[0].teams.cortinyanlar[1] = { playerId: "", civilization: "Random" };
  state.matches[0].teams.cortinyanlar[3] = { playerId: "", civilization: "Random" };

  const ordered = orderedTeamSlots(state, state.matches[0].teams.cortinyanlar);
  assert.deepEqual(ordered.map(({ slot }) => slot.playerId === ""), [false, false, true, true]);

  const publicHtml = renderMatchMatrix(state);
  assert.equal((publicHtml.match(/matrix-player--empty/g) ?? []).length, 2);
  assert.doesNotMatch(publicHtml, /Bilinmeyen/);
  assert.match(publicHtml, /matrix-player--empty[^>]*>-<\/div>/);

  const editHtml = renderEditableMatrix(state);
  assert.equal((editHtml.match(/<option value="" selected>-<\/option>/g) ?? []).length, 2);
  assert.equal((editHtml.match(/data-civilization-select="[^"]+" disabled/g) ?? []).length, 2);
});

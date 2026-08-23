import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { calculateStatistics, validateState } from "../docs/lib/model.js";
import {
  escapeHtml,
  formatMatchDate,
  formatMatchDateLong,
  renderScoreStrip,
  renderStatsTable,
  renderTopControl,
} from "../docs/lib/views.js";

const state = validateState(JSON.parse(await readFile(new URL("../docs/data/state.json", import.meta.url), "utf8")));
const stats = calculateStatistics(state);

test("formats compact and accessible Turkish match dates", () => {
  assert.equal(formatMatchDate("2026-08-01"), "01 Ağu 2026");
  assert.equal(formatMatchDateLong("2026-08-01"), "01 Ağustos 2026");
});

test("renders labeled blue-red scores without redundant copy", () => {
  const html = renderScoreStrip(state, stats);
  assert.equal((html.match(/class="score-team-name"/g) ?? []).length, 2);
  assert.equal((html.match(/class="score-value"/g) ?? []).length, 2);
  assert.match(html, /class="score-team-name">Cortinyanlar</);
  assert.match(html, /class="score-team-name">Bakracoğulları</);
  assert.match(html, /class="score-value">2</);
  assert.match(html, /score-dash/);
  assert.doesNotMatch(html, /VS|maç|önde/);
});

test("renders one contextual top control", () => {
  const html = renderTopControl({ view: "matches", editing: false });
  assert.match(html, />Maçlar</);
  assert.match(html, />Sıralama</);
  assert.match(html, /data-enter-edit/);
  assert.doesNotMatch(html, /53|Haftalık|Görüntüle/);
});

test("renders rank, records, and win rate", () => {
  const html = renderStatsTable(stats);
  const general = stats.players.find((player) => player.name === "Alman General");
  assert.equal(stats.players.length, state.players.length);
  assert.deepEqual(stats.players.map((player) => player.rank), stats.players.map((_, index) => index + 1));
  assert.equal(general.favoriteCivilization, "Random");
  assert.match(html, /100%/);
  assert.match(html, /class="stats-player"[\s\S]*assets\/civs\/random\.svg[\s\S]*Alman General/);
  assert.match(html, /class="stats-sort__label">O<\/span>/);
  assert.match(html, /class="stats-sort__label">G<\/span>/);
  assert.match(html, /class="stats-sort__label">M<\/span>/);
  assert.match(html, /class="stats-sort__label">%<\/span>/);
  assert.equal((html.match(/data-sort-standings=/g) ?? []).length, 4);
  assert.match(html, /<th class="stats-sort-cell" scope="col" aria-sort="descending"><button[^>]*class="stats-sort is-active"[^>]*data-sort-standings="wins"[\s\S]*?↓/);
  assert.match(html, /data-sort-standings="played"/);
  assert.match(html, /data-sort-standings="losses"/);
  assert.match(html, /data-sort-standings="winRate"/);

  const rateHtml = renderStatsTable(stats, { key: "winRate", direction: "asc" });
  assert.match(rateHtml, /<th class="stats-sort-cell" scope="col" aria-sort="ascending"><button[^>]*class="stats-sort is-active"[^>]*data-sort-standings="winRate"[\s\S]*?↑/);
  assert.deepEqual(
    [...rateHtml.matchAll(/class="rank-number">(\d+)</g)].map((match) => Number(match[1])),
    stats.players.map((_, index) => index + 1),
  );
});

test("escapes player-controlled text", () => {
  assert.equal(escapeHtml(`<img src=x onerror="alert(1)">&`), "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;");
});

test("renders useful empty-state copy", () => {
  assert.match(renderStatsTable({ players: [] }), /Henüz oyuncu yok/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { calculateStatistics, validateState } from "../docs/lib/model.js";
import { escapeHtml, renderScoreStrip, renderStatsTable, renderTopControl } from "../docs/lib/views.js";

const state = validateState(JSON.parse(await readFile(new URL("../docs/data/state.json", import.meta.url), "utf8")));
const stats = calculateStatistics(state);

test("renders only the blue-red score", () => {
  const html = renderScoreStrip(state, stats);
  assert.match(html, /Cortinyanlar/);
  assert.match(html, /Bakracoğulları/);
  assert.match(html, />2</);
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
  assert.match(html, /100%/);
  assert.match(html, /<th[^>]*>O<\/th>/);
  assert.match(html, /<th[^>]*>G<\/th>/);
  assert.match(html, /<th[^>]*>M<\/th>/);
  assert.match(html, /<th[^>]*>%<\/th>/);
});

test("escapes player-controlled text", () => {
  assert.equal(escapeHtml(`<img src=x onerror="alert(1)">&`), "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;");
});

test("renders useful empty-state copy", () => {
  assert.match(renderStatsTable({ players: [] }), /Henüz oyuncu yok/);
});

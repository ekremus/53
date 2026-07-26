import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { calculateStatistics, validateState } from "../docs/lib/model.js";
import {
  escapeHtml,
  renderArchive,
  renderLatestMatch,
  renderLeaderboard,
  renderRecentMatches,
  renderScoreboard,
} from "../docs/lib/views.js";

const state = validateState(JSON.parse(await readFile(
  new URL("../docs/data/state.json", import.meta.url),
  "utf8",
)));
const stats = calculateStatistics(state);

test("renders the named rivalry and totals", () => {
  const html = renderScoreboard(state, stats);
  assert.match(html, /Cortinyanlar/);
  assert.match(html, /Bakracoğulları/);
  assert.match(html, />2</);
  assert.match(html, /data-total-matches>2</);
});

test("renders the latest full 4v4 sheet with known civilization assets", () => {
  const html = renderLatestMatch(state);
  assert.match(html, /BuyukEkrem/);
  assert.match(html, /huns\.png/);
  assert.match(html, /random\.svg/);
  assert.equal((html.match(/class="lineup-row/g) ?? []).length, 8);
  assert.doesNotMatch(html, /Kırmızı Takım|Mavi Takım/);
});

test("renders compact recent results and complete match archive", () => {
  const recent = renderRecentMatches(state, 5);
  assert.equal((recent.match(/data-match-id/g) ?? []).length, 2);
  assert.match(recent, /Kazanan/);
  const archive = renderArchive(state, stats, "matches");
  assert.match(archive, /e88b49b3-eb44-46e6-9082-afe329199074/);
  assert.match(archive, /12131315-d162-4312-ab54-98570e741613/);
});

test("renders rank, records, and win rate", () => {
  const html = renderLeaderboard(stats, 8);
  assert.match(html, /100%/);
  assert.match(html, /<th[^>]*>O<\/th>/);
  assert.match(html, /<th[^>]*>G<\/th>/);
  assert.match(html, /<th[^>]*>%<\/th>/);
  assert.match(renderArchive(state, stats, "players"), /Oyuncu/);
});

test("escapes player-controlled text", () => {
  assert.equal(escapeHtml(`<img src=x onerror="alert(1)">&`), "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;");
  const unsafe = structuredClone(state);
  unsafe.players.find((player) => player.id === "buyukekrem").name = "<script>alert(1)</script>";
  const html = renderLatestMatch(unsafe);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});

test("renders useful empty-state copy", () => {
  const empty = structuredClone(state);
  empty.matches = [];
  assert.match(renderLatestMatch(empty), /Henüz maç yok/);
  assert.match(renderRecentMatches(empty), /Henüz maç yok/);
});

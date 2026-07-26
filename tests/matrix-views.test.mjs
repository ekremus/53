import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { renderEditableMatrix, renderMatchMatrix } from "../docs/lib/matrix.js";

const fixture = JSON.parse(await readFile(new URL("../docs/data/state.json", import.meta.url)));

test("renders every match once, newest first, with eight player cells and one winner", () => {
  const state = structuredClone(fixture);
  state.matches[0].date = "2026-07-19";
  state.matches[1].date = "2026-07-26";
  const html = renderMatchMatrix(state);
  assert.equal((html.match(/data-match-column=/g) ?? []).length, 2);
  assert.ok(html.indexOf("2026-07-26") < html.indexOf("2026-07-19"));
  assert.equal((html.match(/class="matrix-player"/g) ?? []).length, 16);
  assert.equal((html.match(/class="matrix-winner/g) ?? []).length, 2);
});

test("renders player names, civilization names, and local crests", () => {
  const html = renderMatchMatrix(fixture);
  assert.match(html, /BuyukEkrem/);
  assert.match(html, /Huns/);
  assert.match(html, /assets\/civs\/huns\.png/);
  assert.match(html, /assets\/civs\/random\.svg/);
});

test("editable matrix keeps one column per match and exposes complete controls", () => {
  const html = renderEditableMatrix(fixture);
  assert.equal((html.match(/data-edit-match=/g) ?? []).length, 2);
  assert.equal((html.match(/data-player-select=/g) ?? []).length, 16);
  assert.equal((html.match(/data-civilization-select=/g) ?? []).length, 16);
  assert.equal((html.match(/data-winner-select=/g) ?? []).length, 2);
  assert.match(html, /Yeni oyuncu ekle/);
});

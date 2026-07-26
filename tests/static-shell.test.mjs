import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../docs/index.html", import.meta.url), "utf8");
const editHtml = await readFile(new URL("../docs/edit/index.html", import.meta.url), "utf8");
const statsHtml = await readFile(new URL("../docs/stats/index.html", import.meta.url), "utf8");

test("ships the exact identity and mobile Vercel shell", () => {
  assert.match(html, /Bu Ecof Empires🏹🪓⚔️/);
  assert.match(html, /Cortinyanlar/);
  assert.match(html, /Bakracoğulları/);
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /href="\.\/styles\.css"/);
  assert.match(html, /type="module" src="\.\/app\.js"/);
  assert.doesNotMatch(html, /chatgpt\.site|fabled-clove|github\.io/i);
});

test("exposes one match system without repeated dashboard sections", () => {
  assert.match(html, /id="score-strip"/);
  assert.match(html, /id="matrix-root"/);
  assert.match(html, /href="\.\/edit\/"/);
  assert.match(html, /href="\.\/stats\/"/);
  assert.doesNotMatch(html, /Son maç|Son maçlar|Tümü|archive-dialog|credential-dialog/);
  assert.doesNotMatch(html, /<header|<footer|sidebar|bottom-nav/i);
});

test("ships open edit and separate statistics routes", () => {
  assert.match(editHtml, /id="editor-matrix-root"/);
  assert.match(editHtml, /data-publish/);
  assert.match(editHtml, /data-add-match/);
  assert.match(editHtml, /data-open-players/);
  assert.match(editHtml, /href="\.\.\/"/);
  assert.doesNotMatch(editHtml, /token|password|PIN|credential/i);

  assert.match(statsHtml, /id="stats-root"/);
  assert.match(statsHtml, /\.\.\/stats\.js/);
  assert.doesNotMatch(statsHtml, /matrix-player|data-match-column/);
});

test("keeps scripts and styles CSP-safe", () => {
  for (const source of [html, editHtml, statsHtml]) {
    assert.match(source, /Content-Security-Policy/);
    assert.doesNotMatch(source, /\son\w+\s*=/i);
    assert.doesNotMatch(source, /<style\b/i);
    assert.equal((source.match(/<script\b/g) ?? []).length, 1);
  }
});

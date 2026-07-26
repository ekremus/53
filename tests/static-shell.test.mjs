import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../docs/index.html", import.meta.url), "utf8");
const editHtml = await readFile(new URL("../docs/edit/index.html", import.meta.url), "utf8");
const statsHtml = await readFile(new URL("../docs/stats/index.html", import.meta.url), "utf8");

test("ships one minimal mobile SPA shell", () => {
  assert.match(html, /Bu Ecof Empires🏹🪓⚔️/);
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /id="top-control"/);
  assert.match(html, /class="brand-header"/);
  assert.match(html, /class="brand-wordmark"/);
  assert.match(html, /src="\.\/assets\/wordmark-ecof\.png"/);
  assert.match(html, /alt="Bu Ecof Empires🏹🪓⚔️"/);
  assert.match(html, /id="score-strip"/);
  assert.match(html, /id="surface-root"/);
  assert.match(html, /type="module" src="\.\/app\.js"/);
  assert.doesNotMatch(html, /tracker-identity|matrix-title-row|action-menu|action-seal|publish-seal/);
  assert.doesNotMatch(html, /Haftalık 4v4|Maç Defteri|Eski haftalar sağda|Alanlara dokunarak değiştir/);
});

test("keeps legacy routes as SPA redirects", () => {
  assert.match(editHtml, /data-legacy-target="matches-edit"/);
  assert.match(statsHtml, /data-legacy-target="standings"/);
  for (const source of [editHtml, statsHtml]) {
    assert.match(source, /\.\.\/legacy\.js/);
    assert.doesNotMatch(source, /editor-matrix-root|stats-root|data-publish|data-open-players/);
  }
});

test("keeps scripts and styles CSP-safe", () => {
  for (const source of [html, editHtml, statsHtml]) {
    assert.match(source, /Content-Security-Policy/);
    assert.doesNotMatch(source, /\son\w+\s*=/i);
    assert.doesNotMatch(source, /<style\b/i);
    assert.equal((source.match(/<script\b/g) ?? []).length, 1);
  }
});

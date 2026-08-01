import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../docs/styles.css", import.meta.url), "utf8");

test("owns phone safe areas and horizontal overflow inside the matrix", () => {
  assert.match(css, /env\(safe-area-inset-top\)/);
  assert.match(css, /100dvh/);
  assert.match(css, /\.match-matrix[\s\S]*overflow-x:\s*auto/);
  assert.match(css, /html[\s\S]*overflow-x:\s*clip/);
  assert.match(css, /\.surface-root[\s\S]*overflow-x:\s*clip/);
  assert.match(css, /\.matrix-rail[\s\S]*position:\s*sticky/);
  assert.match(css, /scroll-snap-type:\s*x\s+mandatory/);
});

test("binds the compact matrix geometry", () => {
  assert.match(css, /:root\s*{[\s\S]*--rail:\s*31px/);
  assert.match(css, /:root\s*{[\s\S]*--week:\s*164px/);
  assert.match(css, /@media\s*\(min-width:\s*920px\)[\s\S]*--rail:\s*48px/);
  assert.match(css, /@media\s*\(min-width:\s*920px\)[\s\S]*--week:\s*232px/);
  assert.match(css, /--player-row:\s*54px/);
  assert.match(css, /--date-row:\s*34px/);
  assert.match(css, /--result-row:\s*38px/);
  assert.match(css, /writing-mode:\s*vertical-rl/);
  assert.match(css, /\.matrix-player--empty[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(css, /\.stats-player img[\s\S]*width:\s*28px/);
});

test("ships one blue-red parchment token system", () => {
  for (const token of ["--paper", "--ink", "--rule", "--bronze", "--blue", "--red"]) {
    assert.match(css, new RegExp(`${token}:`));
  }
  assert.match(css, /background-image:\s*url\("\.\/assets\/paper-continuous\.jpg"\)/);
  assert.doesNotMatch(css, /--orange|score-versus|action-seal|tracker-identity|winner-green/i);
});

test("adds a compact brand row without breaking the first viewport", () => {
  assert.match(css, /--brand-row:\s*40px/);
  assert.match(css, /\.brand-header[\s\S]*height:\s*calc\(var\(--brand-row\) \+ env\(safe-area-inset-top\)\)/);
  assert.match(css, /\.brand-wordmark[\s\S]*max-height:\s*30px/);
});

test("draws one inset walnut boundary between the teams", () => {
  assert.match(css, /--team-divider:\s*#5c4326/);
  assert.match(css, /\.rail-team--blue[\s\S]*inset 0 -3px 0 var\(--team-divider\)/);
  assert.match(css, /\.matrix-team--blue[\s\S]*inset 0 -3px 0 var\(--team-divider\)/);
});

test("keeps parchment continuous behind long surfaces", () => {
  assert.match(css, /paper-continuous\.jpg/);
  assert.match(css, /body::before[\s\S]*position:\s*fixed/);
  assert.match(css, /body::before[\s\S]*background-size:\s*cover/);
  assert.doesNotMatch(css, /background-image:\s*url\("\.\/assets\/paper\.jpg"\)/);
});

test("ships visible focus, touch targets, and reduced motion", () => {
  assert.match(css, /:focus-visible/);
  assert.match(css, /--touch:\s*44px/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});

test("is mobile first with one bounded desktop enhancement", () => {
  assert.match(css, /@media\s*\(min-width:\s*920px\)/);
  assert.match(css, /width:\s*min\(100%,\s*1440px\)/);
});

test("vendors Merriweather and avoids rejected generic patterns", () => {
  assert.match(css, /merriweather-latin-400\.woff2/);
  assert.match(css, /merriweather-latin-ext-700\.woff2/);
  assert.doesNotMatch(css, /@import\s+url\(https?:/i);
  assert.doesNotMatch(css, /backdrop-filter|background-clip:\s*text/i);
  assert.doesNotMatch(css, /sidebar|bottom-nav/i);
  assert.doesNotMatch(css, /linear-gradient|radial-gradient/i);
});

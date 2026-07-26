import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../docs/styles.css", import.meta.url), "utf8");

test("covers iPhone safe areas and owns horizontal overflow inside the matrix", () => {
  assert.match(css, /env\(safe-area-inset-top\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /100dvh/);
  assert.match(css, /\.match-matrix[\s\S]*overflow-x:\s*auto/);
  assert.match(css, /\.matrix-rail[\s\S]*position:\s*sticky/);
  assert.match(css, /scroll-snap-type:\s*x\s+mandatory/);
});

test("ships visible focus, touch targets, and reduced motion", () => {
  assert.match(css, /:focus-visible/);
  assert.match(css, /--touch:\s*44px/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});

test("is mobile first with one bounded desktop enhancement", () => {
  assert.match(css, /@media\s*\(min-width:\s*920px\)/);
  assert.match(css, /width:\s*min\(100%,\s*1440px\)/);
  assert.match(css, /--rail:\s*108px/);
  assert.match(css, /--week:\s*260px/);
});

test("avoids rejected generic visual patterns", () => {
  assert.doesNotMatch(css, /backdrop-filter|gradient\s*text|background-clip:\s*text/i);
  assert.doesNotMatch(css, /sidebar|bottom-nav/i);
  assert.doesNotMatch(css, /border-(left|right):\s*[2-9][0-9]*px\s+solid/i);
});

test("vendors the declared typography", () => {
  assert.match(css, /alegreya-700\.woff2/);
  assert.match(css, /alegreya-sans-400\.woff2/);
  assert.doesNotMatch(css, /@import\s+url\(https?:/i);
});

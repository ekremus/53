import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

test("build contains the AoE2 Weekly product shell", async () => {
  const [layout, page, css, serverFiles] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readdir(new URL("../dist/server/", import.meta.url)),
  ]);

  assert.match(layout, /lang="tr"/i);
  assert.match(layout, /AoE2 Weekly — Haftalık 4v4 Maçları/);
  assert.match(page, /Dostluk baki/);
  assert.match(page, /Meydan hazırlanıyor/);
  assert.match(page, /\/api\/matches/);
  assert.match(css, /@media \(max-width: 700px\)/);
  assert.ok(serverFiles.includes("index.js"));
  assert.doesNotMatch(`${layout}\n${page}`, /codex-preview|react-loading-skeleton|Starter Project/i);
  await access(new URL("../dist/client/", import.meta.url));
});

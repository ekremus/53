import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import test from "node:test";

test("build contains the 53 product shell", async () => {
  const [layout, page, css, serverFiles] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readdir(new URL("../dist/server/", import.meta.url)),
  ]);

  assert.match(layout, /lang="tr"/i);
  assert.match(layout, /title: "53"/);
  assert.match(page, /AppSidebar/);
  assert.match(page, /DashboardView/);
  assert.match(page, /MatchesView/);
  assert.match(page, /LeaderboardView/);
  assert.match(page, /\/api\/matches/);
  assert.match(css, /--sidebar-width: 62px/);
  assert.match(css, /@media \(min-width: 720px\)/);
  assert.ok(serverFiles.includes("index.js"));
  assert.doesNotMatch(`${layout}\n${page}`, /Dostluk baki|codex-preview|react-loading-skeleton|Starter Project/i);
  assert.doesNotMatch(page, /<header|<footer/i);
  await access(new URL("../dist/client/", import.meta.url));
});

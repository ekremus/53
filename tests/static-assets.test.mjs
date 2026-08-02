import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";
import { CIVILIZATIONS, civilizationAssetName } from "../docs/lib/civilizations.js";

const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

test("vendors a valid PNG for every supported civilization", async () => {
  assert.equal(CIVILIZATIONS.length, 56);
  for (const civilization of CIVILIZATIONS) {
    const bytes = await readFile(new URL(`../docs/assets/civs/${civilizationAssetName(civilization)}`, import.meta.url));
    assert.deepEqual(bytes.subarray(0, 8), pngSignature, `${civilization} PNG imzası`);
  }
});

test("ships every critical local application resource", async () => {
  for (const path of [
    "../docs/app.js",
    "../docs/legacy.js",
    "../docs/edit/index.html",
    "../docs/stats/index.html",
    "../docs/lib/state-api.js",
    "../docs/styles.css",
    "../docs/manifest.webmanifest",
    "../docs/data/state.json",
    "../docs/assets/paper.jpg",
    "../docs/assets/paper-continuous.jpg",
    "../docs/assets/wordmark-ecof.png",
    "../docs/assets/icon-192.png",
    "../docs/assets/icon-512.png",
    "../docs/assets/civs/random.svg",
    "../docs/assets/fonts/merriweather-latin-400.woff2",
    "../docs/assets/fonts/merriweather-latin-ext-400.woff2",
    "../docs/assets/fonts/merriweather-latin-700.woff2",
    "../docs/assets/fonts/merriweather-latin-ext-700.woff2",
    "../docs/assets/icons/pencil.svg",
    "../docs/assets/icons/check.svg",
    "../docs/assets/icons/x.svg",
    "../docs/assets/icons/plus.svg",
    "../docs/assets/icons/trash.svg",
    "../docs/assets/icons/medal.svg",
    "../docs/assets/icons/NOTICE.md",
  ]) {
    assert.ok((await stat(new URL(path, import.meta.url))).size > 0, `${path} boş olmamalı`);
  }
});

test("ships valid wordmark and continuous parchment images", async () => {
  const wordmark = await readFile(new URL("../docs/assets/wordmark-ecof.png", import.meta.url));
  const parchment = await readFile(new URL("../docs/assets/paper-continuous.jpg", import.meta.url));
  assert.deepEqual(wordmark.subarray(0, 8), pngSignature);
  assert.deepEqual(parchment.subarray(0, 3), Buffer.from([0xff, 0xd8, 0xff]));
});

test("manifest is a root-scoped standalone Vercel app", async () => {
  const manifest = JSON.parse(await readFile(new URL("../docs/manifest.webmanifest", import.meta.url), "utf8"));
  assert.equal(manifest.short_name, "53");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.icons.length, 2);
});

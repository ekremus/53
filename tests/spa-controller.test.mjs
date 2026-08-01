import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildAppUrl, parseAppLocation } from "../docs/app.js";

test("parses and builds matches and standings states", () => {
  assert.deepEqual(parseAppLocation({ search: "?view=standings&edit=1" }), { view: "standings", editing: true });
  assert.equal(buildAppUrl({ view: "matches", editing: false }), "/");
  assert.equal(buildAppUrl({ view: "standings", editing: false }), "/?view=standings");
  assert.equal(buildAppUrl({ view: "matches", editing: true }), "/?view=matches&edit=1");
});

test("one controller owns view switching and contextual editing", async () => {
  const source = await readFile(new URL("../docs/app.js", import.meta.url), "utf8");
  for (const contract of [
    "data-set-view",
    "data-enter-edit",
    "data-save",
    "data-exit-edit",
    "data-add-match",
    "data-player-select",
    "data-civilization-select",
    "data-player-rename",
    "playerDialog.addEventListener(\"cancel\"",
    "kaldırılsın mı?",
    "pushState",
  ]) assert.ok(source.includes(contract), `missing controller contract: ${contract}`);
  assert.match(source, /latestCivilizationForPlayer\(state, input\.value, key\)/);
  assert.match(source, /slot\.civilization = civilization/);
  assert.doesNotMatch(source, /Başka biri önce yayınladı|Yayınlandı/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildAppUrl, nextStandingsSort, parseAppLocation } from "../docs/app.js";

test("parses and builds matches and standings states", () => {
  assert.deepEqual(parseAppLocation({ search: "?view=standings&edit=1" }), { view: "standings", editing: true });
  assert.equal(buildAppUrl({ view: "matches", editing: false }), "/");
  assert.equal(buildAppUrl({ view: "standings", editing: false }), "/?view=standings");
  assert.equal(buildAppUrl({ view: "matches", editing: true }), "/?view=matches&edit=1");
});

test("switches standings measures descending first and toggles the active direction", () => {
  const initial = { key: "wins", direction: "desc" };
  assert.deepEqual(nextStandingsSort(initial, "played"), { key: "played", direction: "desc" });
  assert.deepEqual(nextStandingsSort(initial, "wins"), { key: "wins", direction: "asc" });
  assert.deepEqual(nextStandingsSort({ key: "wins", direction: "asc" }, "wins"), { key: "wins", direction: "desc" });
  assert.throws(() => nextStandingsSort(initial, "name"), /ölçütü/);
});

test("one controller owns view switching and contextual editing", async () => {
  const source = await readFile(new URL("../docs/app.js", import.meta.url), "utf8");
  for (const contract of [
    "data-set-view",
    "data-enter-edit",
    "edit-auth-dialog",
    "client.authenticate",
    "data-save",
    "data-exit-edit",
    "data-add-match",
    "data-player-select",
    "data-civilization-select",
    "data-player-rename",
    "data-sort-standings",
    "standingsSort",
    "nextStandingsSort",
    "playerDialog.addEventListener(\"cancel\"",
    "confirmDestructive",
    "Emin misin?",
    "kalıcı olarak silinecek",
    "geçmiş maçları korunacak",
    "pushState",
  ]) assert.ok(source.includes(contract), `missing controller contract: ${contract}`);
  assert.match(source, /latestCivilizationForPlayer\(state, input\.value, key\)/);
  assert.match(source, /slot\.civilization = civilization/);
  assert.doesNotMatch(source, /Başka biri önce yayınladı|Yayınlandı/);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
  assert.doesNotMatch(source, /params\.set\(["']sort/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createDraftController } from "../docs/lib/editor.js";

const fixture = JSON.parse(await readFile(new URL("../docs/data/state.json", import.meta.url)));

test("mutates locally and publishes the complete draft once", async () => {
  let writes = 0;
  const client = {
    async write(state, etag) {
      writes += 1;
      assert.equal(etag, '"r3"');
      return { state: { ...state, revision: 4 }, etag: '"r4"' };
    },
  };
  const controller = createDraftController({ state: fixture, etag: '"r3"', client });
  controller.renamePlayer("emre", "Emre 53");
  assert.equal(writes, 0);
  assert.equal(controller.getSnapshot().dirty, true);
  await controller.publish();
  assert.equal(writes, 1);
  assert.equal(controller.getSnapshot().etag, '"r4"');
  assert.equal(controller.getSnapshot().dirty, false);
});

test("keeps the draft when a concurrent publish wins", async () => {
  const error = Object.assign(new Error("Veri başka biri tarafından güncellendi."), { status: 409 });
  const controller = createDraftController({ state: fixture, etag: '"r3"', client: { write: async () => { throw error; } } });
  controller.renamePlayer("emre", "Emre 53");
  await assert.rejects(() => controller.publish(), /başka biri/);
  assert.equal(controller.getState().players.find((player) => player.id === "emre").name, "Emre 53");
  assert.equal(controller.getSnapshot().dirty, true);
});

test("creates a complete new match from the latest lineup", () => {
  const controller = createDraftController({ state: fixture, etag: '"r3"', client: { write: async () => {} } });
  const match = controller.createMatch("2026-08-02");
  assert.equal(Object.values(match.teams).flat().length, 8);
  assert.equal(new Set(Object.values(match.teams).flat().map((slot) => slot.playerId)).size, 8);
  assert.ok(Object.values(match.teams).flat().every((slot) => slot.civilization === "Random"));
});

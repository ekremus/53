import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createDraftController } from "../docs/lib/editor.js";

const fixture = JSON.parse(await readFile(new URL("../docs/data/state.json", import.meta.url)));

test("mutates locally and publishes the complete draft once", async () => {
  let writes = 0;
  const client = {
    async write(state) {
      writes += 1;
      return { state: { ...state, revision: 4 } };
    },
  };
  const controller = createDraftController({ state: fixture, client });
  controller.renamePlayer("emre", "Emre 53");
  assert.equal(writes, 0);
  assert.equal(controller.getSnapshot().dirty, true);
  await controller.publish();
  assert.equal(writes, 1);
  assert.equal(controller.getSnapshot().dirty, false);
});

test("keeps the draft when a write fails", async () => {
  const error = new Error("Bağlantı kurulamadı.");
  const controller = createDraftController({ state: fixture, client: { write: async () => { throw error; } } });
  controller.renamePlayer("emre", "Emre 53");
  await assert.rejects(() => controller.publish(), /Bağlantı/);
  assert.equal(controller.getState().players.find((player) => player.id === "emre").name, "Emre 53");
  assert.equal(controller.getSnapshot().dirty, true);
});

test("civilization change becomes dirty and persists in the complete write", async () => {
  let written;
  const client = {
    async write(state) {
      written = structuredClone(state);
      return { state: { ...state, revision: state.revision + 1 } };
    },
  };
  const controller = createDraftController({ state: fixture, client });
  const changed = structuredClone(controller.getState().matches[0]);
  changed.teams.cortinyanlar[0].civilization = "Armenians";
  controller.saveMatch(changed);
  assert.equal(controller.getSnapshot().dirty, true);
  await controller.publish();
  assert.equal(written.matches[0].teams.cortinyanlar[0].civilization, "Armenians");
  assert.equal(controller.getSnapshot().dirty, false);
});

test("creates a complete new match from the latest lineup", () => {
  const controller = createDraftController({ state: fixture, client: { write: async () => {} } });
  const match = controller.createMatch("2026-08-02");
  assert.equal(Object.values(match.teams).flat().length, 8);
  assert.equal(new Set(Object.values(match.teams).flat().map((slot) => slot.playerId)).size, 8);
  assert.ok(Object.values(match.teams).flat().every((slot) => slot.civilization === "Random"));
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createEmptyMatch, validateState } from "../docs/lib/model.js";
import { renderPlayerManager, validateMatchDraft } from "../docs/lib/editor.js";
import { parseSlotKey } from "../docs/edit.js";

const fixture = validateState(JSON.parse(await readFile(new URL("../docs/data/state.json", import.meta.url), "utf8")));

function completeDraft(state = fixture) {
  const draft = createEmptyMatch(state, "2026-08-02");
  const ids = state.players.filter((player) => player.active).map((player) => player.id);
  state.teams.forEach((team, teamIndex) => {
    draft.teams[team.id].forEach((slot, index) => { slot.playerId = ids[teamIndex * 4 + index]; });
  });
  return draft;
}

test("rejects incomplete and duplicate match participants", () => {
  assert.throws(() => validateMatchDraft(createEmptyMatch(fixture, "2026-08-02"), fixture), /sekiz oyuncu/);
  const duplicate = completeDraft();
  duplicate.teams.bakracogullari[3].playerId = duplicate.teams.cortinyanlar[0].playerId;
  assert.throws(() => validateMatchDraft(duplicate, fixture), /iki kez/);
});

test("renders active and passive player management actions", () => {
  const state = structuredClone(fixture);
  state.players.find((player) => player.id === "zombi").active = false;
  const html = renderPlayerManager(state);
  assert.match(html, /data-player-rename="buyukekrem"/);
  assert.match(html, /data-player-remove="buyukekrem"/);
  assert.match(html, /data-player-reactivate="zombi"/);
  assert.match(html, /Pasif yap/);
});

test("parses the one matrix slot key format", () => {
  assert.deepEqual(parseSlotKey("match-53:cortinyanlar:2"), { matchId: "match-53", teamId: "cortinyanlar", index: 2 });
});

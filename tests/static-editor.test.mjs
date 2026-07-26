import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createEmptyMatch, validateState } from "../docs/lib/model.js";
import {
  createEditorController,
  renderMatchForm,
  renderPlayerManager,
  validateMatchDraft,
} from "../docs/lib/editor.js";

const fixture = validateState(JSON.parse(await readFile(
  new URL("../docs/data/state.json", import.meta.url),
  "utf8",
)));

function completeDraft(state = fixture) {
  const draft = createEmptyMatch(state, "2026-08-02");
  const ids = state.players.filter((player) => player.active).map((player) => player.id);
  state.teams.forEach((team, teamIndex) => {
    draft.teams[team.id].forEach((slot, index) => {
      slot.playerId = ids[teamIndex * 4 + index];
    });
  });
  draft.teams.cortinyanlar[0].civilization = "Vikings";
  draft.winner = "bakracogullari";
  return draft;
}

test("renders eight reusable player and civilization selectors", () => {
  const html = renderMatchForm(completeDraft(), fixture);
  assert.equal((html.match(/data-player-select=/g) ?? []).length, 8);
  assert.equal((html.match(/data-civilization-select=/g) ?? []).length, 8);
  assert.match(html, /＋ Yeni oyuncu/);
  assert.match(html, /Vikings/);
  assert.match(html, /vikings\.png/);
  assert.match(html, /Cortinyanlar/);
  assert.match(html, /Bakracoğulları/);
});

test("rejects incomplete and duplicate match participants", () => {
  const incomplete = createEmptyMatch(fixture, "2026-08-02");
  assert.throws(() => validateMatchDraft(incomplete, fixture), /sekiz oyuncu/);
  const duplicate = completeDraft();
  duplicate.teams.bakracogullari[3].playerId = duplicate.teams.cortinyanlar[0].playerId;
  assert.throws(() => validateMatchDraft(duplicate, fixture), /iki kez/);
});

test("marks already selected players unavailable in other slots", () => {
  const html = renderMatchForm(completeDraft(), fixture);
  assert.match(html, /option value="alman-general" disabled/);
});

test("renders active and passive player management actions", () => {
  const state = structuredClone(fixture);
  state.players.find((player) => player.id === "zombi").active = false;
  const html = renderPlayerManager(state);
  assert.match(html, /data-player-rename="buyukekrem"/);
  assert.match(html, /data-player-remove="buyukekrem"/);
  assert.match(html, /data-player-reactivate="zombi"/);
  assert.match(html, /Geçmişte kullanıldığı için pasif yapılır/);
});

test("connects once and commits a complete new match once", async () => {
  let remote = structuredClone(fixture);
  let sha = "base-sha";
  let commitCalls = 0;
  const github = {
    verifyRepositoryAccess: async () => true,
    readRemoteState: async () => ({ state: structuredClone(remote), sha }),
    commitRemoteState: async ({ state, sha: suppliedSha, message }) => {
      assert.equal(suppliedSha, sha);
      assert.match(message, /add match/);
      commitCalls += 1;
      remote = structuredClone(state);
      sha = "next-sha";
      return { sha };
    },
  };
  const renders = [];
  const controller = createEditorController({ state: fixture, github, render: (value) => renders.push(value) });
  await controller.connect("secret");
  await controller.saveMatch(completeDraft());
  assert.equal(commitCalls, 1);
  assert.equal(controller.getState().matches.length, fixture.matches.length + 1);
  assert.equal(controller.getSnapshot().sha, "next-sha");
  assert.ok(renders.length >= 2);
});

test("renames identities, deactivates used players, and deletes unused players", async () => {
  let remote = structuredClone(fixture);
  remote.players.push({ id: "yedek", name: "Yedek", active: true });
  let sha = "s0";
  const github = {
    verifyRepositoryAccess: async () => true,
    readRemoteState: async () => ({ state: structuredClone(remote), sha }),
    commitRemoteState: async ({ state }) => {
      remote = structuredClone(state);
      sha = `${sha}x`;
      return { sha };
    },
  };
  const controller = createEditorController({ state: remote, github });
  await controller.connect("secret");
  await controller.renamePlayer("buyukekrem", "Büyük Ekrem");
  assert.equal(controller.getState().players.find((player) => player.id === "buyukekrem").name, "Büyük Ekrem");
  await controller.removePlayer("buyukekrem");
  assert.equal(controller.getState().players.find((player) => player.id === "buyukekrem").active, false);
  await controller.removePlayer("yedek");
  assert.equal(controller.getState().players.some((player) => player.id === "yedek"), false);
});

test("refuses a stale SHA before committing", async () => {
  let reads = 0;
  let commits = 0;
  const github = {
    verifyRepositoryAccess: async () => true,
    readRemoteState: async () => ({ state: fixture, sha: reads++ === 0 ? "base" : "changed" }),
    commitRemoteState: async () => { commits += 1; },
  };
  const controller = createEditorController({ state: fixture, github });
  await controller.connect("secret");
  await assert.rejects(() => controller.saveMatch(completeDraft()), /başka biri tarafından güncellendi/);
  assert.equal(commits, 0);
});

test("requires an explicit connection for mutations", async () => {
  const controller = createEditorController({ state: fixture, github: {} });
  await assert.rejects(() => controller.saveMatch(completeDraft()), /kilitli/);
});

import { civilizationAssetName } from "./lib/civilizations.js";
import { createDraftController, renderPlayerManager } from "./lib/editor.js";
import { renderEditableMatrix, renderMatchMatrix } from "./lib/matrix.js";
import { calculateStatistics } from "./lib/model.js";
import { createStateClient } from "./lib/state-api.js";
import { escapeHtml, renderScoreStrip, renderStatsTable, renderTopControl } from "./lib/views.js";

function todayIso() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseSlotKey(value) {
  const [matchId, teamId, index] = String(value).split(":");
  return { matchId, teamId, index: Number(index) };
}

export function parseAppLocation(locationLike = globalThis.location) {
  const params = new URLSearchParams(locationLike?.search ?? "");
  return {
    view: params.get("view") === "standings" ? "standings" : "matches",
    editing: params.get("edit") === "1",
  };
}

export function buildAppUrl({ view = "matches", editing = false } = {}) {
  const params = new URLSearchParams();
  if (view === "standings") params.set("view", "standings");
  if (editing) {
    if (view === "matches") params.set("view", "matches");
    params.set("edit", "1");
  }
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

function openDialog(dialog) {
  if (typeof dialog?.showModal === "function") dialog.showModal();
  else dialog?.setAttribute("open", "");
}

function closeDialog(dialog) {
  if (typeof dialog?.close === "function") dialog.close();
  else dialog?.removeAttribute("open");
}

export async function startApp(documentRoot = document, {
  client = createStateClient(),
  locationLike = globalThis.location,
  historyLike = globalThis.history,
  confirmAction = (message) => globalThis.confirm?.(message) ?? true,
} = {}) {
  const topRoot = documentRoot.querySelector("#top-control");
  const scoreRoot = documentRoot.querySelector("#score-strip");
  const surfaceRoot = documentRoot.querySelector("#surface-root");
  const noticeRegion = documentRoot.querySelector("#notice-region");
  const playerDialog = documentRoot.querySelector("#player-dialog");
  const dialogPlayerForm = documentRoot.querySelector("#dialog-player-form");
  let route = parseAppLocation(locationLike);
  let controller;
  let saving = false;
  let pendingPlayerSlot = null;
  let noticeTimer;

  function notify(message, tone = "error") {
    globalThis.clearTimeout?.(noticeTimer);
    noticeRegion.innerHTML = `<div class="notice notice--${escapeHtml(tone)}" role="status">${escapeHtml(message)}</div>`;
    noticeTimer = globalThis.setTimeout?.(() => { noticeRegion.innerHTML = ""; }, 2600);
  }

  function syncUrl({ replace = false } = {}) {
    const method = replace ? "replaceState" : "pushState";
    historyLike?.[method]?.(null, "", buildAppUrl(route));
  }

  function render() {
    if (!controller) return;
    const state = controller.getState();
    const snapshot = controller.getSnapshot();
    const stats = calculateStatistics(state);
    topRoot.innerHTML = renderTopControl({ ...route, dirty: snapshot.dirty, saving });
    scoreRoot.hidden = route.view !== "matches";
    if (route.view === "matches") scoreRoot.innerHTML = renderScoreStrip(state, stats);
    if (route.view === "matches") surfaceRoot.innerHTML = route.editing ? renderEditableMatrix(state) : renderMatchMatrix(state);
    else surfaceRoot.innerHTML = route.editing ? renderPlayerManager(state, { includeAdd: true }) : renderStatsTable(stats);
    scoreRoot.removeAttribute("aria-busy");
    surfaceRoot.removeAttribute("aria-busy");
    documentRoot.body?.toggleAttribute("data-editing", route.editing);
    documentRoot.body?.setAttribute("data-view", route.view);
  }

  function editMatch(matchId, mutator) {
    const state = controller.getState();
    const match = state.matches.find((candidate) => candidate.id === matchId);
    if (!match) throw new Error("Maç bulunamadı.");
    const next = structuredClone(match);
    mutator(next);
    controller.saveMatch(next);
  }

  function enterEdit() {
    controller.reset();
    route = { ...route, editing: true };
    syncUrl();
    render();
  }

  function exitEdit() {
    if (controller.getSnapshot().dirty && !confirmAction("Kaydedilmemiş değişiklikler silinsin mi?")) return;
    controller.reset();
    route = { ...route, editing: false };
    syncUrl();
    render();
  }

  async function save() {
    const snapshot = controller.getSnapshot();
    if (!snapshot.dirty || saving) return;
    saving = true;
    render();
    try {
      await controller.publish();
      route = { ...route, editing: false };
      syncUrl({ replace: true });
    } catch (error) {
      notify(error.message ? `Kaydedilemedi · ${error.message}` : "Kaydedilemedi · tekrar dene");
    } finally {
      saving = false;
      render();
    }
  }

  try {
    const { state } = await client.read();
    controller = createDraftController({ state, client, render, notify });
    render();
  } catch (error) {
    scoreRoot.hidden = true;
    surfaceRoot.innerHTML = `<div class="load-error"><strong>Açılamadı</strong><button type="button" data-retry>Tekrar dene</button></div>`;
    surfaceRoot.removeAttribute("aria-busy");
    notify(error.message ?? "Veriye ulaşılamadı.");
    return null;
  }

  documentRoot.addEventListener("click", (event) => {
    const target = event.target.closest("button,a");
    if (!target) return;
    try {
      if (target.matches("[data-set-view]")) {
        route = { view: target.dataset.setView, editing: false };
        syncUrl();
        render();
      } else if (target.matches("[data-enter-edit]")) enterEdit();
      else if (target.matches("[data-exit-edit]")) exitEdit();
      else if (target.matches("[data-save]")) void save();
      else if (target.matches("[data-add-match]")) {
        const match = controller.createMatch(todayIso());
        controller.saveMatch(match);
        surfaceRoot.querySelector(`[data-edit-match="${CSS.escape(match.id)}"]`)?.scrollIntoView({ inline: "start", block: "nearest" });
      } else if (target.matches("[data-delete-match]")) {
        const id = target.dataset.deleteMatch;
        const match = controller.getState().matches.find((candidate) => candidate.id === id);
        if (match && confirmAction(`${match.date} tarihli maç silinsin mi?`)) controller.deleteMatch(id);
      } else if (target.matches("[data-player-rename]")) {
        const id = target.dataset.playerRename;
        const input = surfaceRoot.querySelector(`[data-player-name="${CSS.escape(id)}"]`);
        controller.renamePlayer(id, input.value);
      } else if (target.matches("[data-player-remove]")) {
        controller.removePlayer(target.dataset.playerRemove);
      } else if (target.matches("[data-player-reactivate]")) {
        controller.reactivatePlayer(target.dataset.playerReactivate);
      } else if (target.matches("[data-close-player-dialog]")) {
        pendingPlayerSlot = null;
        closeDialog(playerDialog);
      }
    } catch (error) {
      notify(error.message);
      render();
    }
  });

  surfaceRoot.addEventListener("change", (event) => {
    const input = event.target;
    try {
      if (input.matches("[data-match-date]")) editMatch(input.dataset.matchDate, (match) => { match.date = input.value; });
      else if (input.matches("[data-winner-select]")) editMatch(input.dataset.winnerSelect, (match) => { match.winner = input.value; });
      else if (input.matches("[data-player-select]")) {
        const key = parseSlotKey(input.dataset.playerSelect);
        if (input.value === "__new__") {
          pendingPlayerSlot = key;
          dialogPlayerForm.reset();
          openDialog(playerDialog);
          dialogPlayerForm.elements.name.focus();
          return;
        }
        editMatch(key.matchId, (match) => { match.teams[key.teamId][key.index].playerId = input.value; });
      } else if (input.matches("[data-civilization-select]")) {
        const key = parseSlotKey(input.dataset.civilizationSelect);
        input.closest(".matrix-player")?.querySelector("[data-civilization-preview]")?.setAttribute("src", `./assets/civs/${civilizationAssetName(input.value)}`);
        editMatch(key.matchId, (match) => { match.teams[key.teamId][key.index].civilization = input.value; });
      }
    } catch (error) {
      notify(error.message);
      render();
    }
  });

  surfaceRoot.addEventListener("submit", (event) => {
    const form = event.target.closest("[data-add-player-form]");
    if (!form) return;
    event.preventDefault();
    try {
      controller.addPlayer(form.elements.name.value);
      form.reset();
    } catch (error) {
      notify(error.message);
    }
  });

  dialogPlayerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      const before = new Set(controller.getState().players.map((player) => player.id));
      const nextState = controller.addPlayer(dialogPlayerForm.elements.name.value);
      const added = nextState.players.find((player) => !before.has(player.id));
      if (pendingPlayerSlot && added) {
        const key = pendingPlayerSlot;
        pendingPlayerSlot = null;
        editMatch(key.matchId, (match) => { match.teams[key.teamId][key.index].playerId = added.id; });
      }
      dialogPlayerForm.reset();
      closeDialog(playerDialog);
    } catch (error) {
      notify(error.message);
    }
  });

  globalThis.addEventListener?.("popstate", () => {
    if (controller.getSnapshot().dirty && !confirmAction("Kaydedilmemiş değişiklikler silinsin mi?")) return;
    controller.reset();
    route = parseAppLocation(globalThis.location);
    render();
  });

  globalThis.addEventListener?.("beforeunload", (event) => {
    if (!controller.getSnapshot().dirty) return;
    event.preventDefault();
    event.returnValue = "";
  });

  return { getRoute: () => ({ ...route }), getState: () => controller.getState(), render };
}

if (typeof document !== "undefined") startApp();

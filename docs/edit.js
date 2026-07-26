import { civilizationAssetName } from "./lib/civilizations.js";
import { createDraftController, renderPlayerManager } from "./lib/editor.js";
import { renderEditableMatrix } from "./lib/matrix.js";
import { calculateStatistics, validateState } from "./lib/model.js";
import { createStateClient } from "./lib/state-api.js";
import { escapeHtml, renderScoreStrip } from "./lib/views.js";

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

function openDialog(dialog) {
  if (typeof dialog?.showModal === "function") dialog.showModal();
  else dialog?.setAttribute("open", "");
}

function closeDialog(dialog) {
  if (typeof dialog?.close === "function") dialog.close();
  else dialog?.removeAttribute("open");
}

export async function startEditPage(documentRoot = document, { client = createStateClient() } = {}) {
  const matrixRoot = documentRoot.querySelector("#editor-matrix-root");
  const scoreRoot = documentRoot.querySelector("#score-strip");
  const publishButton = documentRoot.querySelector("[data-publish]");
  const menuButton = documentRoot.querySelector(".action-seal");
  const menu = documentRoot.querySelector("#action-menu");
  const playersDialog = documentRoot.querySelector("#players-dialog");
  const playerManager = documentRoot.querySelector("[data-player-manager]");
  const newPlayerForm = documentRoot.querySelector("#new-player-form");
  const confirmDialog = documentRoot.querySelector("#confirm-dialog");
  const noticeRegion = documentRoot.querySelector("#notice-region");
  let controller;
  let pendingPlayerSlot = null;
  let noticeTimer;

  function notify(message, tone = "error") {
    globalThis.clearTimeout?.(noticeTimer);
    noticeRegion.innerHTML = `<div class="notice notice--${escapeHtml(tone)}" role="status">${escapeHtml(message)}</div>`;
    noticeTimer = globalThis.setTimeout?.(() => { noticeRegion.innerHTML = ""; }, 4500);
  }

  function closeMenu({ focus = false } = {}) {
    menu.hidden = true;
    menuButton.setAttribute("aria-expanded", "false");
    if (focus) menuButton.focus();
  }

  function render(nextState) {
    const normalized = validateState(nextState);
    matrixRoot.innerHTML = renderEditableMatrix(normalized);
    scoreRoot.innerHTML = renderScoreStrip(normalized, calculateStatistics(normalized));
    matrixRoot.removeAttribute("aria-busy");
    scoreRoot.removeAttribute("aria-busy");
    const snapshot = controller?.getSnapshot();
    if (snapshot) publishButton.textContent = snapshot.dirty ? "Yayınla" : "Yayınlandı";
    if (playersDialog?.open) playerManager.innerHTML = renderPlayerManager(normalized);
  }

  function editMatch(matchId, mutator) {
    const state = controller.getState();
    const match = state.matches.find((candidate) => candidate.id === matchId);
    if (!match) throw new Error("Maç bulunamadı.");
    const next = structuredClone(match);
    mutator(next);
    controller.saveMatch(next);
  }

  function askDelete(matchId) {
    const match = controller.getState().matches.find((candidate) => candidate.id === matchId);
    if (!match) return;
    documentRoot.querySelector("[data-confirm-copy]").textContent = `${match.date} tarihli maç taslaktan kaldırılacak.`;
    openDialog(confirmDialog);
    const accept = documentRoot.querySelector("[data-confirm-accept]");
    const cancel = documentRoot.querySelector("[data-confirm-cancel]");
    const cleanup = () => {
      accept.removeEventListener("click", confirm);
      cancel.removeEventListener("click", dismiss);
    };
    const confirm = () => {
      cleanup();
      closeDialog(confirmDialog);
      controller.deleteMatch(matchId);
    };
    const dismiss = () => {
      cleanup();
      closeDialog(confirmDialog);
    };
    accept.addEventListener("click", confirm);
    cancel.addEventListener("click", dismiss);
  }

  try {
    const { state, etag } = await client.read();
    controller = createDraftController({ state, etag, client, render, notify });
    render(controller.getState());
  } catch (error) {
    matrixRoot.innerHTML = `<div class="load-error"><strong>Düzenleme açılamadı</strong><span>${escapeHtml(error.message ?? "Tekrar dene.")}</span></div>`;
    scoreRoot.removeAttribute("aria-busy");
    return null;
  }

  menuButton.addEventListener("click", () => {
    const open = menu.hidden;
    menu.hidden = !open;
    menuButton.setAttribute("aria-expanded", String(open));
    if (open) menu.querySelector("button,a")?.focus();
  });

  documentRoot.addEventListener("click", (event) => {
    if (!menu.hidden && !menu.contains(event.target) && !menuButton.contains(event.target)) closeMenu();
  });
  documentRoot.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !menu.hidden) closeMenu({ focus: true });
  });

  documentRoot.querySelector("[data-add-match]").addEventListener("click", () => {
    try {
      const match = controller.createMatch(todayIso());
      controller.saveMatch(match);
      closeMenu();
      matrixRoot.querySelector(`[data-edit-match="${CSS.escape(match.id)}"]`)?.scrollIntoView({ inline: "start", block: "nearest" });
    } catch (error) {
      notify(error.message);
    }
  });

  documentRoot.querySelector("[data-open-players]").addEventListener("click", () => {
    playerManager.innerHTML = renderPlayerManager(controller.getState());
    closeMenu();
    openDialog(playersDialog);
  });
  documentRoot.querySelector("[data-close-dialog]").addEventListener("click", () => closeDialog(playersDialog));

  matrixRoot.addEventListener("change", (event) => {
    const input = event.target;
    try {
      if (input.matches("[data-match-date]")) editMatch(input.dataset.matchDate, (match) => { match.date = input.value; });
      if (input.matches("[data-winner-select]")) editMatch(input.dataset.winnerSelect, (match) => { match.winner = input.value; });
      if (input.matches("[data-player-select]")) {
        const key = parseSlotKey(input.dataset.playerSelect);
        if (input.value === "__new__") {
          pendingPlayerSlot = key;
          playerManager.innerHTML = renderPlayerManager(controller.getState());
          openDialog(playersDialog);
          newPlayerForm.elements.name.focus();
          return;
        }
        editMatch(key.matchId, (match) => { match.teams[key.teamId][key.index].playerId = input.value; });
      }
      if (input.matches("[data-civilization-select]")) {
        const key = parseSlotKey(input.dataset.civilizationSelect);
        input.closest(".matrix-player")?.querySelector("[data-civilization-preview]")?.setAttribute("src", `../assets/civs/${civilizationAssetName(input.value)}`);
        editMatch(key.matchId, (match) => { match.teams[key.teamId][key.index].civilization = input.value; });
      }
    } catch (error) {
      notify(error.message);
      render(controller.getState());
    }
  });

  matrixRoot.addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-match]");
    if (button) askDelete(button.dataset.deleteMatch);
  });

  newPlayerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      const before = new Set(controller.getState().players.map((player) => player.id));
      const nextState = controller.addPlayer(newPlayerForm.elements.name.value);
      const added = nextState.players.find((player) => !before.has(player.id));
      newPlayerForm.reset();
      if (pendingPlayerSlot && added) {
        const key = pendingPlayerSlot;
        pendingPlayerSlot = null;
        editMatch(key.matchId, (match) => { match.teams[key.teamId][key.index].playerId = added.id; });
        closeDialog(playersDialog);
      } else {
        playerManager.innerHTML = renderPlayerManager(controller.getState());
      }
    } catch (error) {
      notify(error.message);
    }
  });

  playerManager.addEventListener("click", (event) => {
    const rename = event.target.closest("[data-player-rename]");
    const remove = event.target.closest("[data-player-remove]");
    const reactivate = event.target.closest("[data-player-reactivate]");
    try {
      if (rename) {
        const input = playerManager.querySelector(`[data-player-name="${CSS.escape(rename.dataset.playerRename)}"]`);
        controller.renamePlayer(rename.dataset.playerRename, input.value);
      }
      if (remove) controller.removePlayer(remove.dataset.playerRemove);
      if (reactivate) controller.reactivatePlayer(reactivate.dataset.playerReactivate);
      playerManager.innerHTML = renderPlayerManager(controller.getState());
    } catch (error) {
      notify(error.message);
    }
  });

  publishButton.addEventListener("click", async () => {
    if (!controller.getSnapshot().dirty) {
      notify("Yayınlanacak yeni değişiklik yok.", "success");
      return;
    }
    publishButton.setAttribute("aria-busy", "true");
    publishButton.textContent = "Yayınlanıyor";
    try {
      await controller.publish();
    } catch (error) {
      if (error.status === 409) notify("Başka biri önce yayınladı. Taslağın duruyor; güncel veriyi yükleyip değişiklikleri tekrar uygula.");
      else notify(error.message ?? "Yayınlama tamamlanamadı.");
    } finally {
      publishButton.removeAttribute("aria-busy");
      publishButton.textContent = controller.getSnapshot().dirty ? "Yayınla" : "Yayınlandı";
    }
  });

  globalThis.addEventListener?.("beforeunload", (event) => {
    if (!controller.getSnapshot().dirty) return;
    event.preventDefault();
    event.returnValue = "";
  });

  return controller;
}

if (typeof document !== "undefined") startEditPage();

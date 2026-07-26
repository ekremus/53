import { createGitHubClient } from "./lib/github.js";
import { civilizationAssetName } from "./lib/civilizations.js";
import { createEditorController, renderMatchForm, renderPlayerManager } from "./lib/editor.js";
import { calculateStatistics, validateState } from "./lib/model.js";
import {
  escapeHtml,
  renderArchive,
  renderLatestMatch,
  renderLeaderboard,
  renderRecentMatches,
  renderScoreboard,
} from "./lib/views.js";

function openDialog(dialog) {
  if (!dialog || dialog.open) return;
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

function closeDialog(dialog) {
  if (!dialog || !dialog.open) return;
  if (typeof dialog.close === "function") dialog.close();
  else dialog.removeAttribute("open");
}

function todayIso() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function nameKey(value) {
  return String(value).trim().replace(/\s+/g, " ").toLocaleLowerCase("tr-TR");
}

export async function startApp(documentRoot = document, dependencies = {}) {
  const fetchImplementation = dependencies.fetch ?? globalThis.fetch;
  const github = dependencies.github ?? createGitHubClient();
  const targets = {
    scoreboard: documentRoot.querySelector("#scoreboard"),
    latest: documentRoot.querySelector("#latest-match"),
    recent: documentRoot.querySelector("#recent-matches"),
    leaderboard: documentRoot.querySelector("#leaderboard"),
    archive: documentRoot.querySelector("#archive-dialog"),
    archiveTitle: documentRoot.querySelector("[data-archive-title]"),
    archiveContent: documentRoot.querySelector("[data-archive-content]"),
    edit: documentRoot.querySelector("#edit-dialog"),
    editTitle: documentRoot.querySelector("[data-edit-title]"),
    matchForm: documentRoot.querySelector("#match-form"),
    matchFields: documentRoot.querySelector("[data-match-form-fields]"),
    deleteMatch: documentRoot.querySelector("[data-delete-match]"),
    players: documentRoot.querySelector("#players-dialog"),
    playerManager: documentRoot.querySelector("[data-player-manager]"),
    newPlayerForm: documentRoot.querySelector("#new-player-form"),
    credential: documentRoot.querySelector("#credential-dialog"),
    credentialForm: documentRoot.querySelector("#credential-form"),
    credentialTitle: documentRoot.querySelector("[data-credential-title]"),
    credentialCopy: documentRoot.querySelector("[data-credential-copy]"),
    tokenField: documentRoot.querySelector("[data-token-field]"),
    tokenHelp: documentRoot.querySelector("[data-token-help]"),
    forgetCredential: documentRoot.querySelector("[data-forget-credential]"),
    credentialActionLabel: documentRoot.querySelector("[data-credential-action-label]"),
    confirm: documentRoot.querySelector("#confirm-dialog"),
    confirmTitle: documentRoot.querySelector("[data-confirm-title]"),
    confirmCopy: documentRoot.querySelector("[data-confirm-copy]"),
    fab: documentRoot.querySelector("#fab"),
    fabMenu: documentRoot.querySelector("#fab-menu"),
    notice: documentRoot.querySelector("#notice-region"),
  };

  let state;
  let editor;
  let currentDraft = null;
  let pendingAction = null;
  let pendingPlayerSlot = null;
  let playerDialogReturnsToEditor = false;
  let noticeTimer = null;

  function notify(message, tone = "error") {
    if (!targets.notice) return;
    if (noticeTimer) globalThis.clearTimeout?.(noticeTimer);
    targets.notice.innerHTML = `<div class="notice notice--${escapeHtml(tone)}" role="status">${escapeHtml(message)}</div>`;
    noticeTimer = globalThis.setTimeout?.(() => { targets.notice.innerHTML = ""; }, 4200);
  }

  function setBusy(form, busy) {
    form?.querySelectorAll("button").forEach((control) => { control.disabled = busy; });
    form?.classList.toggle("is-busy", busy);
    form?.setAttribute("aria-busy", String(busy));
  }

  function updateEditorChrome() {
    const unlocked = Boolean(editor?.isUnlocked());
    documentRoot.documentElement?.classList.toggle("editor-unlocked", unlocked);
    targets.credentialActionLabel.textContent = unlocked ? "Kilitle" : "GitHub bağlantısı";
  }

  function renderPublic(nextState = state) {
    state = validateState(nextState);
    const stats = calculateStatistics(state);
    const editable = Boolean(editor?.isUnlocked());
    targets.scoreboard.innerHTML = renderScoreboard(state, stats);
    targets.latest.innerHTML = renderLatestMatch(state, { editable });
    targets.recent.innerHTML = renderRecentMatches(state, 5, { editable });
    targets.leaderboard.innerHTML = renderLeaderboard(stats, 8);
    for (const target of [targets.scoreboard, targets.latest, targets.recent, targets.leaderboard]) {
      target?.removeAttribute("aria-busy");
    }
    updateEditorChrome();
    return stats;
  }

  try {
    const response = await fetchImplementation(`./data/state.json?ts=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Maç kayıtları yüklenemedi.");
    state = validateState(await response.json());
  } catch (error) {
    notify(error instanceof Error ? error.message : "Maç kayıtları yüklenemedi.");
    targets.latest.innerHTML = `<div class="empty-state"><strong>Kayıtlar yüklenemedi</strong><button class="text-action" type="button" data-retry>Tekrar dene</button></div>`;
    documentRoot.querySelector("[data-retry]")?.addEventListener("click", () => globalThis.location?.reload());
    return null;
  }

  editor = createEditorController({ state, github, render: renderPublic, notify });
  renderPublic(state);

  function closeFabMenu({ focus = false } = {}) {
    targets.fabMenu.hidden = true;
    targets.fab.classList.remove("is-open");
    targets.fab.setAttribute("aria-expanded", "false");
    targets.fab.setAttribute("aria-label", "Düzenle");
    targets.fab.querySelector("span").textContent = "＋";
    if (focus) targets.fab.focus();
  }

  function toggleFabMenu() {
    const willOpen = targets.fabMenu.hidden;
    if (willOpen) {
      targets.fabMenu.hidden = false;
      targets.fab.classList.add("is-open");
      targets.fab.setAttribute("aria-expanded", "true");
      targets.fab.setAttribute("aria-label", "Menüyü kapat");
      targets.fab.querySelector("span").textContent = "×";
      targets.fabMenu.querySelector("button")?.focus();
    } else closeFabMenu({ focus: true });
  }

  function configureCredentialDialog() {
    const saved = github.readCredential();
    const tokenInput = targets.credentialForm.elements.token;
    targets.tokenField.hidden = Boolean(saved);
    targets.tokenHelp.hidden = Boolean(saved);
    targets.forgetCredential.hidden = !saved;
    targets.credentialTitle.textContent = saved ? "Düzenlemeyi aç" : "GitHub bağlantısı";
    targets.credentialCopy.textContent = saved
      ? "Bu cihazdaki şifreli GitHub bağlantısını 53 ile aç."
      : "Bu cihazı bir kez GitHub reposuna bağla. Token yalnızca bu cihazda şifreli saklanır.";
    tokenInput.required = !saved;
    tokenInput.value = "";
    targets.credentialForm.elements.pin.value = "";
  }

  function showCredential(nextAction = null) {
    pendingAction = nextAction;
    configureCredentialDialog();
    openDialog(targets.credential);
    globalThis.setTimeout?.(() => {
      const saved = github.readCredential();
      (saved ? targets.credentialForm.elements.pin : targets.credentialForm.elements.token)?.focus();
    }, 0);
  }

  async function requireEditor(action) {
    closeFabMenu();
    if (editor.isUnlocked()) await action();
    else showCredential(action);
  }

  function renderDraft() {
    targets.matchFields.innerHTML = renderMatchForm(currentDraft, editor.getState());
    targets.editTitle.textContent = state.matches.some((match) => match.id === currentDraft.id) ? "Maçı düzenle" : "Yeni maç";
    targets.deleteMatch.hidden = !state.matches.some((match) => match.id === currentDraft.id);
  }

  function openMatchEditor(matchId = null) {
    const source = matchId ? editor.getState().matches.find((match) => match.id === matchId) : null;
    if (matchId && !source) throw new Error("Maç bulunamadı.");
    currentDraft = source ? structuredClone(source) : editor.createMatch(todayIso());
    renderDraft();
    closeDialog(targets.archive);
    openDialog(targets.edit);
  }

  function syncPlayerAvailability() {
    const selects = [...targets.matchFields.querySelectorAll("[data-player-select]")];
    const selections = selects.map((select) => select.value).filter((value) => value && value !== "__new__");
    selects.forEach((select) => {
      select.querySelectorAll("option").forEach((option) => {
        if (!option.value || option.value === "__new__") return;
        option.disabled = option.value !== select.value && selections.includes(option.value);
      });
    });
  }

  function renderPlayers() {
    targets.playerManager.innerHTML = renderPlayerManager(editor.getState());
  }

  function openPlayers({ returnToEditor = false } = {}) {
    playerDialogReturnsToEditor = returnToEditor;
    renderPlayers();
    if (returnToEditor) closeDialog(targets.edit);
    openDialog(targets.players);
  }

  function askConfirmation(title, copy) {
    targets.confirmTitle.textContent = title;
    targets.confirmCopy.textContent = copy;
    targets.confirm.returnValue = "cancel";
    openDialog(targets.confirm);
    return new Promise((resolve) => {
      targets.confirm.addEventListener("close", () => resolve(targets.confirm.returnValue === "confirm"), { once: true });
    });
  }

  async function perform(action, form = null) {
    try {
      if (form) setBusy(form, true);
      await action();
    } catch (error) {
      notify(error instanceof Error ? error.message : "İşlem tamamlanamadı.");
    } finally {
      if (form) setBusy(form, false);
    }
  }

  targets.fab.addEventListener("click", toggleFabMenu);

  targets.fabMenu.addEventListener("click", (event) => {
    const button = event.target.closest("[data-fab-action]");
    if (!button) return;
    const action = button.dataset.fabAction;
    if (action === "new-match") requireEditor(() => openMatchEditor());
    if (action === "players") requireEditor(() => openPlayers());
    if (action === "credential") {
      closeFabMenu();
      if (editor.isUnlocked()) {
        editor.lock();
        renderPublic(editor.getState());
      } else showCredential();
    }
  });

  targets.credentialForm.addEventListener("submit", (event) => {
    event.preventDefault();
    perform(async () => {
      const form = new FormData(targets.credentialForm);
      const pin = String(form.get("pin") ?? "");
      if (pin !== "53") throw new Error("PIN yanlış.");
      const saved = github.readCredential();
      let token;
      if (saved) token = await github.decryptCredential(saved, pin);
      else {
        token = String(form.get("token") ?? "").trim();
        if (!token) throw new Error("GitHub tokenı gerekli.");
      }
      await editor.connect(token);
      if (!saved) github.saveCredential(await github.encryptCredential(token, pin));
      closeDialog(targets.credential);
      const next = pendingAction;
      pendingAction = null;
      updateEditorChrome();
      if (next) await next();
    }, targets.credentialForm);
  });

  targets.forgetCredential.addEventListener("click", () => {
    github.clearCredential();
    configureCredentialDialog();
    notify("Bu cihazdaki GitHub bağlantısı silindi.", "success");
  });

  targets.matchFields.addEventListener("change", (event) => {
    const input = event.target;
    if (input.matches("input[name='date']")) currentDraft.date = input.value;
    if (input.matches("input[name='winner']")) currentDraft.winner = input.value;
    if (input.matches("[data-player-select]")) {
      const [teamId, indexText] = input.dataset.playerSelect.split(":");
      const index = Number(indexText);
      if (input.value === "__new__") {
        input.value = currentDraft.teams[teamId][index].playerId;
        pendingPlayerSlot = { teamId, index };
        openPlayers({ returnToEditor: true });
        targets.newPlayerForm.elements.name.focus();
        return;
      }
      currentDraft.teams[teamId][index].playerId = input.value;
      syncPlayerAvailability();
    }
    if (input.matches("[data-civilization-select]")) {
      const [teamId, indexText] = input.dataset.civilizationSelect.split(":");
      const index = Number(indexText);
      currentDraft.teams[teamId][index].civilization = input.value;
      input.closest(".civilization-field").querySelector("[data-civilization-preview]").src = `./assets/civs/${civilizationAssetName(input.value)}`;
    }
  });

  targets.matchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    perform(async () => {
      await editor.saveMatch(currentDraft);
      closeDialog(targets.edit);
      currentDraft = null;
    }, targets.matchForm);
  });

  targets.deleteMatch.addEventListener("click", async () => {
    if (!currentDraft) return;
    const confirmed = await askConfirmation("Maçı sil?", "Bu maç kaydı ve ona bağlı istatistikler silinecek.");
    if (!confirmed) return;
    perform(async () => {
      await editor.deleteMatch(currentDraft.id);
      closeDialog(targets.edit);
      currentDraft = null;
    }, targets.matchForm);
  });

  targets.newPlayerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    perform(async () => {
      const name = targets.newPlayerForm.elements.name.value;
      const beforeIds = new Set(editor.getState().players.map((player) => player.id));
      const next = await editor.addPlayer(name);
      const added = next.players.find((player) => !beforeIds.has(player.id) && nameKey(player.name) === nameKey(name));
      targets.newPlayerForm.reset();
      renderPlayers();
      if (pendingPlayerSlot && added && currentDraft) {
        currentDraft.teams[pendingPlayerSlot.teamId][pendingPlayerSlot.index].playerId = added.id;
        pendingPlayerSlot = null;
        playerDialogReturnsToEditor = false;
        closeDialog(targets.players);
        renderDraft();
        openDialog(targets.edit);
      }
    }, targets.newPlayerForm);
  });

  targets.playerManager.addEventListener("click", async (event) => {
    const rename = event.target.closest("[data-player-rename]");
    const remove = event.target.closest("[data-player-remove]");
    const reactivate = event.target.closest("[data-player-reactivate]");
    if (rename) {
      const id = rename.dataset.playerRename;
      const input = targets.playerManager.querySelector(`[data-player-name="${CSS.escape(id)}"]`);
      await perform(async () => { await editor.renamePlayer(id, input.value); renderPlayers(); });
    }
    if (remove) {
      const id = remove.dataset.playerRemove;
      const row = remove.closest("[data-player-id]");
      const name = row.querySelector("[data-player-name]").value;
      const confirmed = await askConfirmation(`${name} kaldırılsın mı?`, remove.textContent.trim() === "Sil" ? "Bu oyuncu henüz maçta kullanılmadı ve tamamen silinecek." : "Geçmiş maçlar korunacak; oyuncu yeni seçimlerde görünmeyecek.");
      if (confirmed) await perform(async () => { await editor.removePlayer(id); renderPlayers(); });
    }
    if (reactivate) {
      await perform(async () => { await editor.reactivatePlayer(reactivate.dataset.playerReactivate); renderPlayers(); });
    }
  });

  documentRoot.addEventListener("click", (event) => {
    const archiveButton = event.target.closest("[data-open-archive]");
    if (archiveButton) {
      const view = archiveButton.dataset.openArchive;
      const stats = calculateStatistics(state);
      targets.archiveTitle.textContent = view === "players" ? "Tüm oyuncular" : "Tüm maçlar";
      targets.archiveContent.innerHTML = renderArchive(state, stats, view, { editable: editor.isUnlocked() });
      openDialog(targets.archive);
      return;
    }
    const editButton = event.target.closest("[data-edit-match]");
    if (editButton) {
      requireEditor(() => openMatchEditor(editButton.dataset.editMatch));
      return;
    }
    const closeButton = event.target.closest("[data-close-dialog]");
    if (closeButton) closeDialog(closeButton.closest("dialog"));
    if (!targets.fabMenu.hidden && !targets.fabMenu.contains(event.target) && !targets.fab.contains(event.target)) closeFabMenu();
  });

  for (const dialog of documentRoot.querySelectorAll("dialog")) {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) closeDialog(dialog);
    });
    dialog.addEventListener("close", () => {
      if (dialog === targets.players && playerDialogReturnsToEditor && currentDraft) {
        playerDialogReturnsToEditor = false;
        pendingPlayerSlot = null;
        renderDraft();
        openDialog(targets.edit);
      }
      if (dialog === targets.credential && !editor.isUnlocked()) pendingAction = null;
      if (![targets.confirm, targets.archive].includes(dialog)) targets.fab.focus({ preventScroll: true });
    });
  }

  documentRoot.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !targets.fabMenu.hidden) closeFabMenu({ focus: true });
  });

  return {
    getState: () => structuredClone(state),
    render: renderPublic,
    notify,
    editor,
  };
}

if (typeof document !== "undefined") {
  startApp(document);
}

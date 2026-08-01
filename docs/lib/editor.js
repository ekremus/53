import {
  createEmptyMatch,
  removeOrDeactivatePlayer,
  upsertPlayer,
  validateState,
} from "./model.js";
import { escapeHtml } from "./views.js";

function clone(value) {
  return structuredClone(value);
}

function allSelectedPlayerIds(draft) {
  return Object.values(draft.teams).flat().map((slot) => slot.playerId).filter(Boolean);
}

export function validateMatchDraft(draft, state) {
  if (!draft || typeof draft !== "object" || !draft.teams) throw new Error("Maç kaydı eksik.");
  const selected = allSelectedPlayerIds(draft);
  if (new Set(selected).size !== selected.length) throw new Error("Bir oyuncu maçta iki kez yer alamaz.");

  const normalized = validateState(state);
  const candidate = clone(normalized);
  const index = candidate.matches.findIndex((match) => match.id === draft.id);
  if (index === -1) candidate.matches.push(clone(draft));
  else candidate.matches[index] = clone(draft);
  return validateState(candidate).matches.find((match) => match.id === draft.id);
}

function playerUsage(state, playerId) {
  return state.matches.reduce((count, match) => count + Object.values(match.teams).flat().filter((slot) => slot.playerId === playerId).length, 0);
}

export function renderPlayerManager(state, { includeAdd = false } = {}) {
  const players = [...state.players].sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, "tr-TR"));
  const add = includeAdd ? `<form class="player-add" data-add-player-form novalidate><label class="sr-only" for="new-player-name">Yeni oyuncu</label><input id="new-player-name" name="name" type="text" maxlength="40" autocomplete="off" placeholder="Yeni oyuncu" required><button type="submit"><img src="./assets/icons/plus.svg" alt="" width="18" height="18"><span>Ekle</span></button></form>` : "";
  if (!players.length) return `<div class="player-manager">${add}</div>`;
  return `<div class="player-manager">${add}${players.map((player) => {
    const usage = playerUsage(state, player.id);
    return `<div class="player-row${player.active ? "" : " is-passive"}" data-player-id="${escapeHtml(player.id)}">
      <div class="player-row__identity"><input type="text" value="${escapeHtml(player.name)}" maxlength="40" aria-label="${escapeHtml(player.name)} adını değiştir" data-player-name="${escapeHtml(player.id)}"${player.active ? "" : " disabled"}>${player.active ? "" : "<span>Pasif</span>"}</div>
      <div class="player-row__actions">${player.active ? `<button type="button" data-player-rename="${escapeHtml(player.id)}">Uygula</button><button class="danger-action" type="button" data-player-remove="${escapeHtml(player.id)}">${usage ? "Pasif yap" : "Sil"}</button>` : `<button type="button" data-player-reactivate="${escapeHtml(player.id)}">Etkinleştir</button>`}</div>
    </div>`;
  }).join("")}</div>`;
}

export function createDraftController({ state, client, render = () => {}, notify = () => {} } = {}) {
  let baseline = validateState(state);
  let draft = clone(baseline);
  let publishing = false;

  function update(mutator) {
    draft = validateState(mutator(clone(draft)));
    render(draft);
    return clone(draft);
  }

  async function publish() {
    if (publishing) return null;
    publishing = true;
    try {
      const result = await client.write(validateState(draft));
      baseline = validateState(result.state);
      draft = clone(baseline);
      render(draft);
      notify("Kaydedildi", "success");
      return clone(draft);
    } finally {
      publishing = false;
    }
  }

  return {
    getState: () => clone(draft),
    getSnapshot: () => ({
      state: clone(draft),
      dirty: JSON.stringify(draft) !== JSON.stringify(baseline),
      publishing,
    }),
    reset: () => {
      draft = clone(baseline);
      render(draft);
    },
    createMatch: (date) => createEmptyMatch(draft, date),
    saveMatch: (match) => update((next) => {
      const valid = validateMatchDraft(match, next);
      const index = next.matches.findIndex((candidate) => candidate.id === valid.id);
      if (index === -1) next.matches.push(valid);
      else next.matches[index] = valid;
      return next;
    }),
    deleteMatch: (id) => update((next) => ({
      ...next,
      matches: next.matches.filter((match) => match.id !== id),
    })),
    addPlayer: (name) => update((next) => upsertPlayer(next, { name })),
    renamePlayer: (id, name) => update((next) => upsertPlayer(next, { id, name })),
    removePlayer: (id) => update((next) => removeOrDeactivatePlayer(next, id)),
    reactivatePlayer: (id) => update((next) => {
      const player = next.players.find((candidate) => candidate.id === id);
      if (!player) throw new Error("Oyuncu bulunamadı.");
      return upsertPlayer(next, { id, name: player.name, active: true });
    }),
    publish,
  };
}

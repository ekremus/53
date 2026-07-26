import { CIVILIZATION_OPTIONS, civilizationAssetName } from "./civilizations.js";
import {
  activeRoster,
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
  if (selected.length !== 8) throw new Error("Maç için sekiz oyuncu seçilmeli.");
  if (new Set(selected).size !== 8) throw new Error("Bir oyuncu maçta iki kez yer alamaz.");

  const normalized = validateState(state);
  const candidate = clone(normalized);
  const index = candidate.matches.findIndex((match) => match.id === draft.id);
  if (index === -1) candidate.matches.push(clone(draft));
  else candidate.matches[index] = clone(draft);
  return validateState(candidate).matches.find((match) => match.id === draft.id);
}

function renderPlayerOptions(state, currentPlayerId, selectedElsewhere) {
  const current = state.players.find((player) => player.id === currentPlayerId);
  const choices = activeRoster(state);
  if (current && !current.active && !choices.some((player) => player.id === current.id)) choices.push(current);
  const options = choices
    .sort((a, b) => a.name.localeCompare(b.name, "tr-TR"))
    .map((player) => {
      const selected = player.id === currentPlayerId;
      const disabled = !selected && selectedElsewhere.has(player.id);
      return `<option value="${escapeHtml(player.id)}"${disabled ? " disabled" : ""}${selected ? " selected" : ""}>${escapeHtml(player.name)}${player.active ? "" : " (pasif)"}</option>`;
    }).join("");
  return `<option value="">Oyuncu seç</option>${options}<option value="__new__">＋ Yeni oyuncu</option>`;
}

function renderCivilizationOptions(current) {
  return CIVILIZATION_OPTIONS.map((civilization) => `<option value="${escapeHtml(civilization)}"${civilization === current ? " selected" : ""}>${escapeHtml(civilization)}</option>`).join("");
}

function renderTeamFields(team, draft, state, allSelected) {
  return `
    <fieldset class="team-editor team-editor--${escapeHtml(team.tone)}">
      <legend>${escapeHtml(team.name)}</legend>
      <div class="team-editor__slots">
        ${draft.teams[team.id].map((slot, index) => {
          const selectedElsewhere = new Set(allSelected.filter((playerId) => playerId !== slot.playerId));
          return `<div class="editor-slot" data-team-slot="${escapeHtml(team.id)}:${index}">
            <span class="editor-slot__number">P${index + 1}</span>
            <label>
              <span class="sr-only">${escapeHtml(team.name)} ${index + 1}. oyuncu</span>
              <select name="${escapeHtml(team.id)}-${index}-player" data-player-select="${escapeHtml(team.id)}:${index}" required>
                ${renderPlayerOptions(state, slot.playerId, selectedElsewhere)}
              </select>
            </label>
            <label class="civilization-field">
              <img src="./assets/civs/${civilizationAssetName(slot.civilization)}" alt="" width="44" height="44" data-civilization-preview>
              <span class="sr-only">${escapeHtml(team.name)} ${index + 1}. uygarlık</span>
              <select name="${escapeHtml(team.id)}-${index}-civilization" data-civilization-select="${escapeHtml(team.id)}:${index}" required>
                ${renderCivilizationOptions(slot.civilization)}
              </select>
            </label>
          </div>`;
        }).join("")}
      </div>
    </fieldset>
  `;
}

export function renderMatchForm(draft, state) {
  const selected = allSelectedPlayerIds(draft);
  return `
    <input type="hidden" name="match-id" value="${escapeHtml(draft.id)}">
    <label class="date-field">
      <span>Maç tarihi</span>
      <input name="date" type="date" value="${escapeHtml(draft.date)}" required>
    </label>
    <div class="match-editor-grid">
      ${state.teams.map((team) => renderTeamFields(team, draft, state, selected)).join("")}
    </div>
    <fieldset class="winner-field">
      <legend>Kazanan takım</legend>
      <div class="winner-options">
        ${state.teams.map((team) => `<label class="winner-option winner-option--${escapeHtml(team.tone)}">
          <input type="radio" name="winner" value="${escapeHtml(team.id)}"${draft.winner === team.id ? " checked" : ""} required>
          <span>${escapeHtml(team.name)}</span>
        </label>`).join("")}
      </div>
    </fieldset>
  `;
}

function playerUsage(state, playerId) {
  return state.matches.reduce((count, match) => count + Object.values(match.teams).flat().filter((slot) => slot.playerId === playerId).length, 0);
}

export function renderPlayerManager(state) {
  const players = [...state.players].sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, "tr-TR"));
  if (!players.length) return `<div class="empty-state"><strong>Henüz oyuncu yok</strong></div>`;
  return `<div class="player-manager">
    ${players.map((player) => {
      const usage = playerUsage(state, player.id);
      return `<div class="player-row ${player.active ? "" : "is-passive"}" data-player-id="${escapeHtml(player.id)}">
        <div class="player-row__identity">
          <input type="text" value="${escapeHtml(player.name)}" maxlength="40" aria-label="${escapeHtml(player.name)} adını değiştir" data-player-name="${escapeHtml(player.id)}"${player.active ? "" : " disabled"}>
          <span>${usage} maç${player.active ? "" : " · pasif"}</span>
        </div>
        <div class="player-row__actions">
          ${player.active ? `<button type="button" data-player-rename="${escapeHtml(player.id)}">Kaydet</button>
            <button class="danger-action" type="button" data-player-remove="${escapeHtml(player.id)}" title="${usage ? "Geçmişte kullanıldığı için pasif yapılır" : "Kalıcı olarak silinir"}">${usage ? "Pasif yap" : "Sil"}</button>` : `<button type="button" data-player-reactivate="${escapeHtml(player.id)}">Tekrar etkinleştir</button>`}
        </div>
      </div>`;
    }).join("")}
  </div>`;
}

export function createEditorController({
  state,
  baseSha = null,
  github,
  render = () => {},
  notify = () => {},
  now = () => new Date(),
} = {}) {
  let currentState = validateState(state);
  let sha = baseSha;
  let token = null;

  function requireConnection() {
    if (!token) throw new Error("Düzenleme kilitli. Önce 53 PIN’i ile aç.");
  }

  async function connect(nextToken) {
    if (typeof nextToken !== "string" || !nextToken) throw new Error("GitHub bağlantısı gerekli.");
    await github.verifyRepositoryAccess(nextToken);
    const remote = await github.readRemoteState(nextToken);
    currentState = validateState(remote.state);
    sha = remote.sha;
    token = nextToken;
    render(currentState);
    notify("Düzenleme açıldı.", "success");
    return currentState;
  }

  function lock() {
    token = null;
    notify("Düzenleme kilitlendi.", "success");
  }

  async function saveMutation(mutator, message) {
    requireConnection();
    const remote = await github.readRemoteState(token);
    if (sha && remote.sha !== sha) {
      throw new Error("Veri başka biri tarafından güncellendi. Sayfayı yenileyip tekrar dene.");
    }
    let next = validateState(mutator(clone(currentState)));
    next.revision = remote.state.revision + 1;
    next.updatedAt = now().toISOString();
    next = validateState(next);
    const result = await github.commitRemoteState({ token, state: next, sha: remote.sha, message });
    if (!result?.sha) throw new Error("GitHub yeni dosya sürümünü döndürmedi. Sayfayı yenile.");
    currentState = next;
    sha = result.sha;
    render(currentState);
    notify("Değişiklik GitHub’a kaydedildi.", "success");
    return currentState;
  }

  async function saveMatch(draft) {
    const match = validateMatchDraft(draft, currentState);
    const exists = currentState.matches.some((candidate) => candidate.id === match.id);
    return saveMutation((next) => {
      const index = next.matches.findIndex((candidate) => candidate.id === match.id);
      if (index === -1) next.matches.push(match);
      else next.matches[index] = match;
      return next;
    }, `data: ${exists ? "update" : "add"} match ${match.date}`);
  }

  async function deleteMatch(matchId) {
    if (!currentState.matches.some((match) => match.id === matchId)) throw new Error("Maç bulunamadı.");
    return saveMutation((next) => {
      next.matches = next.matches.filter((match) => match.id !== matchId);
      return next;
    }, "data: delete match");
  }

  async function addPlayer(name) {
    return saveMutation((next) => upsertPlayer(next, { name }), "data: update players");
  }

  async function renamePlayer(playerId, name) {
    return saveMutation((next) => upsertPlayer(next, { id: playerId, name }), "data: update players");
  }

  async function removePlayer(playerId) {
    return saveMutation((next) => removeOrDeactivatePlayer(next, playerId), "data: update players");
  }

  async function reactivatePlayer(playerId) {
    const player = currentState.players.find((candidate) => candidate.id === playerId);
    if (!player) throw new Error("Oyuncu bulunamadı.");
    return saveMutation((next) => upsertPlayer(next, { id: playerId, name: player.name, active: true }), "data: update players");
  }

  return {
    connect,
    lock,
    isUnlocked: () => Boolean(token),
    getState: () => clone(currentState),
    getSnapshot: () => ({ connected: Boolean(token), sha }),
    createMatch: (date) => createEmptyMatch(currentState, date),
    saveMatch,
    deleteMatch,
    addPlayer,
    renamePlayer,
    removePlayer,
    reactivatePlayer,
  };
}

import { CIVILIZATION_OPTIONS, civilizationAssetName } from "./civilizations.js";
import { activeRoster } from "./model.js";
import { escapeHtml, formatMatchDate } from "./views.js";

export function orderedMatches(state) {
  return state.matches
    .map((match, index) => ({ match, index }))
    .sort((a, b) => b.match.date.localeCompare(a.match.date) || b.index - a.index)
    .map(({ match }) => match);
}

function roster(state) {
  return new Map(state.players.map((player) => [player.id, player]));
}

function railMarkup(state) {
  return `<aside class="matrix-rail" aria-hidden="true">
    <div class="rail-date"></div>
    ${state.teams.map((team, index) => `<div class="rail-team rail-team--${index === 0 ? "blue" : "red"}"><strong>${escapeHtml(team.name)}</strong></div>`).join("")}
    <div class="rail-result"></div>
  </aside>`;
}

function publicPlayerCell(players, slot, teamId, index) {
  const player = players.get(slot.playerId);
  return `<div class="matrix-player" data-team="${escapeHtml(teamId)}" data-slot="${index}">
    <img src="./assets/civs/${civilizationAssetName(slot.civilization)}" alt="" width="42" height="42">
    <span><strong>${escapeHtml(player?.name ?? "Bilinmeyen")}</strong><small>${escapeHtml(slot.civilization)}</small></span>
  </div>`;
}

function publicMatchColumn(state, match, players) {
  const winner = state.teams.find((team) => team.id === match.winner);
  const winnerIndex = state.teams.findIndex((team) => team.id === match.winner);
  return `<article class="match-column" data-match-column="${escapeHtml(match.id)}">
    <div class="match-column__date"><time datetime="${escapeHtml(match.date)}" data-iso-date="${escapeHtml(match.date)}">${escapeHtml(formatMatchDate(match.date))}</time></div>
    ${state.teams.map((team, index) => `<section class="matrix-team matrix-team--${index === 0 ? "blue" : "red"}" aria-label="${escapeHtml(team.name)}">${match.teams[team.id].map((slot, slotIndex) => publicPlayerCell(players, slot, team.id, slotIndex)).join("")}</section>`).join("")}
    <div class="matrix-result matrix-result--${winnerIndex === 0 ? "blue" : "red"}"><strong>${escapeHtml(winner?.name ?? "")}</strong></div>
  </article>`;
}

export function renderMatchMatrix(state) {
  const matches = orderedMatches(state);
  if (!matches.length) return `<div class="matrix-empty"><strong>Henüz maç yok</strong></div>`;
  const players = roster(state);
  return `<div class="match-matrix" role="region" tabindex="0" aria-label="Haftalık maçlar; eski haftalar için sağa kaydır">
    ${railMarkup(state)}
    <div class="matrix-weeks">${matches.map((match) => publicMatchColumn(state, match, players)).join("")}</div>
  </div>`;
}

function playerOptions(state, currentPlayerId, selectedElsewhere) {
  const current = state.players.find((player) => player.id === currentPlayerId);
  const choices = activeRoster(state);
  if (current && !current.active && !choices.some((player) => player.id === current.id)) choices.push(current);
  return `<option value="">Oyuncu seç</option>${choices.map((player) => {
    const selected = player.id === currentPlayerId;
    const disabled = !selected && selectedElsewhere.has(player.id);
    return `<option value="${escapeHtml(player.id)}"${selected ? " selected" : ""}${disabled ? " disabled" : ""}>${escapeHtml(player.name)}${player.active ? "" : " (pasif)"}</option>`;
  }).join("")}<option value="__new__">Yeni oyuncu ekle</option>`;
}

function civilizationOptions(current) {
  return CIVILIZATION_OPTIONS.map((civilization) => `<option value="${escapeHtml(civilization)}"${civilization === current ? " selected" : ""}>${escapeHtml(civilization)}</option>`).join("");
}

function editableMatchColumn(state, match) {
  const selected = Object.values(match.teams).flat().map((slot) => slot.playerId).filter(Boolean);
  return `<article class="match-column match-column--editable" data-edit-match="${escapeHtml(match.id)}">
    <div class="match-column__date"><input type="date" value="${escapeHtml(match.date)}" data-match-date="${escapeHtml(match.id)}" aria-label="Maç tarihi"></div>
    ${state.teams.map((team, teamIndex) => `<section class="matrix-team matrix-team--${teamIndex === 0 ? "blue" : "red"}" aria-label="${escapeHtml(team.name)}">${match.teams[team.id].map((slot, index) => {
      const key = `${match.id}:${team.id}:${index}`;
      const selectedElsewhere = new Set(selected.filter((playerId) => playerId !== slot.playerId));
      return `<div class="matrix-player matrix-player--editable" data-edit-slot="${escapeHtml(key)}">
        <img data-civilization-preview src="../assets/civs/${civilizationAssetName(slot.civilization)}" alt="" width="42" height="42">
        <label><span class="sr-only">Oyuncu</span><select data-player-select="${escapeHtml(key)}">${playerOptions(state, slot.playerId, selectedElsewhere)}</select></label>
        <label><span class="sr-only">Uygarlık</span><select data-civilization-select="${escapeHtml(key)}">${civilizationOptions(slot.civilization)}</select></label>
      </div>`;
    }).join("")}</section>`).join("")}
    <div class="matrix-result matrix-result--editable"><label><span class="sr-only">Kazanan</span><select data-winner-select="${escapeHtml(match.id)}">${state.teams.map((team) => `<option value="${escapeHtml(team.id)}"${match.winner === team.id ? " selected" : ""}>${escapeHtml(team.name)}</option>`).join("")}</select></label><button class="icon-button icon-button--danger" type="button" data-delete-match="${escapeHtml(match.id)}" aria-label="Maçı sil"><img src="./assets/icons/trash.svg" alt="" width="18" height="18"></button></div>
  </article>`;
}

export function renderEditableMatrix(state) {
  const matches = orderedMatches(state);
  const addAction = `<button class="add-action" type="button" data-add-match><img src="./assets/icons/plus.svg" alt="" width="18" height="18"><span>Maç ekle</span></button>`;
  if (!matches.length) return `<div class="matrix-empty">${addAction}</div>`;
  return `<div class="edit-toolbar">${addAction}</div><div class="match-matrix match-matrix--editable" role="region" tabindex="0" aria-label="Düzenlenebilir maçlar">${railMarkup(state)}<div class="matrix-weeks">${matches.map((match) => editableMatchColumn(state, match)).join("")}</div></div>`;
}

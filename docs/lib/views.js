import { civilizationAssetName } from "./civilizations.js";
import { sortPlayerStatistics } from "./model.js";

const compactDateFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const longDateFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function utcDate(value) {
  const [year, month, day] = String(value).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function formatMatchDate(value) {
  return compactDateFormatter.format(utcDate(value));
}

export function formatMatchDateLong(value) {
  return longDateFormatter.format(utcDate(value));
}

export function renderScoreStrip(state, stats) {
  const [blue, red] = state.teams;
  const score = (team, color) => `<div class="score-number score-number--${color}" aria-label="${escapeHtml(team.name)} ${stats.teams[team.id]}"><span class="score-team-name">${escapeHtml(team.name)}</span><strong class="score-value">${stats.teams[team.id]}</strong></div>`;
  return `${score(blue, "blue")}
    <span class="score-dash" aria-hidden="true">–</span>
    ${score(red, "red")}`;
}

export function renderTopControl({ view = "matches", editing = false, dirty = false, saving = false } = {}) {
  const viewButton = (value, label) => `<button type="button" role="tab" aria-selected="${view === value}" class="view-switch__option${view === value ? " is-active" : ""}" data-set-view="${value}"${editing ? " disabled" : ""}>${label}</button>`;
  const actions = editing
    ? `<button class="icon-button icon-button--save${dirty ? " is-ready" : ""}" type="button" data-save aria-label="Kaydet"${!dirty || saving ? " disabled" : ""}><img src="./assets/icons/check.svg" alt="" width="20" height="20"></button><button class="icon-button" type="button" data-exit-edit aria-label="Düzenlemeyi kapat"${saving ? " disabled" : ""}><img src="./assets/icons/x.svg" alt="" width="20" height="20"></button>`
    : `<button class="icon-button" type="button" data-enter-edit aria-label="Düzenle"><img src="./assets/icons/pencil.svg" alt="" width="20" height="20"></button>`;
  return `<div class="view-switch" role="tablist" aria-label="View">${viewButton("matches", "Matches")}${viewButton("standings", "Standings")}</div><div class="top-actions">${actions}</div>`;
}

const STANDINGS_SORT_COLUMNS = [
  { key: "played", label: "P", name: "Played" },
  { key: "wins", label: "W", name: "Wins" },
  { key: "losses", label: "L", name: "Losses" },
  { key: "winRate", label: "%", name: "Win rate" },
];

function renderStandingsSortHeader(column, sort) {
  const active = sort.key === column.key;
  const ariaSort = active ? (sort.direction === "desc" ? "descending" : "ascending") : "none";
  const nextDirection = active && sort.direction === "desc" ? "sort ascending" : "sort descending";
  const direction = active
    ? `<span class="stats-sort__direction" aria-hidden="true">${sort.direction === "desc" ? "↓" : "↑"}</span>`
    : "";
  const label = `${column.name}: ${nextDirection}`;
  return `<th class="stats-sort-cell" scope="col" aria-sort="${ariaSort}"><button class="stats-sort${active ? " is-active" : ""}" type="button" data-sort-standings="${column.key}" aria-label="${label}" title="${label}"><span class="stats-sort__label">${column.label}</span>${direction}</button></th>`;
}

export function renderStatsTable(stats, sort = { key: "wins", direction: "desc" }) {
  if (!stats.players.length) return `<div class="empty-state"><strong>Henüz oyuncu yok</strong></div>`;
  const players = sortPlayerStatistics(stats.players, sort.key, sort.direction);
  return `<div class="table-scroller"><table class="stats-table"><colgroup><col class="stats-col-rank"><col class="stats-col-player"><col class="stats-col-number"><col class="stats-col-number"><col class="stats-col-number"><col class="stats-col-rate"></colgroup><thead><tr><th scope="col">#</th><th scope="col">Player</th>${STANDINGS_SORT_COLUMNS.map((column) => renderStandingsSortHeader(column, sort)).join("")}</tr></thead><tbody>${players.map((player) => `<tr><td class="rank-number">${player.rank}</td><th scope="row"><button class="stats-player" type="button" data-player-details="${escapeHtml(player.id)}" aria-label="View ${escapeHtml(player.name)} statistics"><img src="./assets/civs/${civilizationAssetName(player.favoriteCivilization)}" alt="" width="28" height="28"><span>${escapeHtml(player.name)}</span></button></th><td>${player.played}</td><td>${player.wins}</td><td>${player.losses}</td><td><strong>${player.winRate}%</strong></td></tr>`).join("")}</tbody></table></div>`;
}

function resultSeals(lastFive) {
  if (!lastFive.length) return `<span class="player-form__empty">—</span>`;
  return lastFive.map((result) => `<span class="player-form__result player-form__result--${result.toLowerCase()}">${result}</span>`).join("");
}

function detailSectionLabel(first, second) {
  return `<h3><span class="player-details__label-line">${first}</span><span class="player-details__label-line">${second}</span></h3>`;
}

function detailStat(record) {
  return `${record.wins}/${record.played} · ${record.winRate}%`;
}

function civilizationDetailRecord(kind, record) {
  if (!record) return "";
  return `<div class="player-detail-record"><img src="./assets/civs/${civilizationAssetName(record.name)}" alt="" width="36" height="36"><span class="player-detail-record__copy"><small class="player-detail-record__kind">${kind}</small><strong>${escapeHtml(record.name)}</strong></span><small class="player-detail-record__stat">${detailStat(record)}</small></div>`;
}

function duoDetailRecord(kind, record) {
  if (!record) return "";
  return `<div class="player-detail-record player-detail-record--duo"><span class="player-detail-record__copy"><small class="player-detail-record__kind">${kind}</small><strong>${escapeHtml(record.name)}</strong></span><small class="player-detail-record__stat">${detailStat(record)}</small></div>`;
}

function detailRecordList(records, renderer) {
  const content = [
    renderer("Most Wins", records.mostWins),
    renderer("Best Rate", records.bestRate),
  ].filter(Boolean).join("");
  return content
    ? `<div class="player-detail-list">${content}</div>`
    : `<span class="player-detail-empty">No data</span>`;
}

export function renderPlayerDetails(details) {
  return `<article class="player-details">
    <header class="player-details__header"><img src="./assets/civs/${civilizationAssetName(details.favoriteCivilization)}" alt="" width="48" height="48"><h2 id="player-details-title">${escapeHtml(details.player.name)}</h2><button class="icon-button" type="button" data-close-player-details aria-label="Close"><img src="./assets/icons/x.svg" alt="" width="20" height="20"></button></header>
    <section class="player-details__section">${detailSectionLabel("Last", "5")}<div class="player-form">${resultSeals(details.lastFive)}</div></section>
    <section class="player-details__section">${detailSectionLabel("Win", "Streak")}<dl class="streak-record"><div><dt>Current Streak</dt><dd>${details.currentWinStreak}</dd></div><div><dt>Best Streak</dt><dd>${details.longestWinStreak}</dd></div></dl></section>
    <section class="player-details__section player-details__section--records">${detailSectionLabel("Best", "Civ")}${detailRecordList(details.bestCivilizations, civilizationDetailRecord)}</section>
    <section class="player-details__section player-details__section--records">${detailSectionLabel("Best", "Duo")}${detailRecordList(details.bestDuos, duoDetailRecord)}</section>
  </article>`;
}

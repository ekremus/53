import { civilizationAssetName } from "./civilizations.js";

const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function formatMatchDate(value) {
  const [year, month, day] = String(value).split("-").map(Number);
  return dateFormatter.format(new Date(Date.UTC(year, month - 1, day)));
}

export function renderScoreStrip(state, stats) {
  const [blue, red] = state.teams;
  return `<div class="score-number score-number--blue" aria-label="${escapeHtml(blue.name)} ${stats.teams[blue.id]}">${stats.teams[blue.id]}</div>
    <span class="score-dash" aria-hidden="true">–</span>
    <div class="score-number score-number--red" aria-label="${escapeHtml(red.name)} ${stats.teams[red.id]}">${stats.teams[red.id]}</div>`;
}

export function renderTopControl({ view = "matches", editing = false, dirty = false, saving = false } = {}) {
  const viewButton = (value, label) => `<button type="button" role="tab" aria-selected="${view === value}" class="view-switch__option${view === value ? " is-active" : ""}" data-set-view="${value}"${editing ? " disabled" : ""}>${label}</button>`;
  const actions = editing
    ? `<button class="icon-button icon-button--save${dirty ? " is-ready" : ""}" type="button" data-save aria-label="Kaydet"${!dirty || saving ? " disabled" : ""}><img src="./assets/icons/check.svg" alt="" width="20" height="20"></button><button class="icon-button" type="button" data-exit-edit aria-label="Düzenlemeyi kapat"${saving ? " disabled" : ""}><img src="./assets/icons/x.svg" alt="" width="20" height="20"></button>`
    : `<button class="icon-button" type="button" data-enter-edit aria-label="Düzenle"><img src="./assets/icons/pencil.svg" alt="" width="20" height="20"></button>`;
  return `<div class="view-switch" role="tablist" aria-label="Görünüm">${viewButton("matches", "Maçlar")}${viewButton("standings", "Sıralama")}</div><div class="top-actions">${actions}</div>`;
}

export function renderStatsTable(stats) {
  if (!stats.players.length) return `<div class="empty-state"><strong>Henüz oyuncu yok</strong></div>`;
  return `<div class="table-scroller"><table class="stats-table"><colgroup><col class="stats-col-rank"><col class="stats-col-player"><col class="stats-col-number"><col class="stats-col-number"><col class="stats-col-number"><col class="stats-col-rate"></colgroup><thead><tr><th scope="col">#</th><th scope="col">Oyuncu</th><th scope="col" title="Oynanan maç">O</th><th scope="col" title="Galibiyet">G</th><th scope="col" title="Mağlubiyet">M</th><th scope="col">%</th></tr></thead><tbody>${stats.players.map((player) => `<tr><td class="rank-number">${player.rank}</td><th scope="row"><span class="stats-player"><img src="./assets/civs/${civilizationAssetName(player.favoriteCivilization)}" alt="" width="28" height="28"><span>${escapeHtml(player.name)}</span></span></th><td>${player.played}</td><td>${player.wins}</td><td>${player.losses}</td><td><strong>${player.winRate}%</strong></td></tr>`).join("")}</tbody></table></div>`;
}

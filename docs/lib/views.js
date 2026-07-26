import { civilizationAssetName, civilizationSet } from "./civilizations.js";

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

function playersById(state) {
  return new Map(state.players.map((player) => [player.id, player]));
}

function orderedMatches(state) {
  return state.matches
    .map((match, index) => ({ match, index }))
    .sort((a, b) => b.match.date.localeCompare(a.match.date) || b.index - a.index)
    .map(({ match }) => match);
}

function teamById(state, teamId) {
  return state.teams.find((team) => team.id === teamId);
}

function safeCivAsset(civilization) {
  return civilizationAssetName(civilizationSet.has(civilization) ? civilization : "Random");
}

function resultWord(match, teamId) {
  return match.winner === teamId ? "Kazandı" : "Kaybetti";
}

function renderCivIcon(civilization, size = "regular") {
  const safeName = civilizationSet.has(civilization) ? civilization : "Random";
  return `<img class="civ-icon civ-icon--${size}" src="./assets/civs/${safeCivAsset(safeName)}" alt="" width="48" height="48"><span class="civ-name">${escapeHtml(safeName)}</span>`;
}

export function renderScoreboard(state, stats) {
  const [blue, orange] = state.teams;
  return `
    <div class="score-team score-team--${escapeHtml(blue.tone)} ${stats.leader === blue.id ? "is-leading" : ""}">
      <span>${escapeHtml(blue.name)}</span>
      <strong data-score="${escapeHtml(blue.id)}">${stats.teams[blue.id]}</strong>
    </div>
    <div class="score-seal" aria-label="Toplam ${stats.totalMatches} maç">
      <span>VS</span>
      <strong data-total-matches>${stats.totalMatches}</strong>
      <small>maç</small>
    </div>
    <div class="score-team score-team--${escapeHtml(orange.tone)} ${stats.leader === orange.id ? "is-leading" : ""}">
      <span>${escapeHtml(orange.name)}</span>
      <strong data-score="${escapeHtml(orange.id)}">${stats.teams[orange.id]}</strong>
    </div>
  `;
}

function renderLineup(state, match, team) {
  const roster = playersById(state);
  const won = match.winner === team.id;
  return `
    <section class="lineup lineup--${escapeHtml(team.tone)} ${won ? "is-winner" : ""}" aria-label="${escapeHtml(team.name)}">
      <div class="lineup-heading">
        <h3>${escapeHtml(team.name)}</h3>
        <span class="result-mark">${won ? "Kazanan" : "Mağlup"}</span>
      </div>
      <ol class="lineup-list">
        ${match.teams[team.id].map((slot, index) => {
          const player = roster.get(slot.playerId);
          return `<li class="lineup-row">
            <span class="slot-number">P${index + 1}</span>
            ${renderCivIcon(slot.civilization)}
            <strong>${escapeHtml(player?.name ?? "Bilinmeyen")}</strong>
          </li>`;
        }).join("")}
      </ol>
    </section>
  `;
}

export function renderMatchSheet(state, match, { editable = false } = {}) {
  const winner = teamById(state, match.winner);
  return `
    <article class="match-sheet" data-match-id="${escapeHtml(match.id)}">
      <div class="match-meta">
        <time datetime="${escapeHtml(match.date)}">${escapeHtml(formatMatchDate(match.date))}</time>
        <span><b>${escapeHtml(winner?.name ?? "")}</b> kazandı</span>
        ${editable ? `<button class="text-action" type="button" data-edit-match="${escapeHtml(match.id)}">Düzenle</button>` : ""}
      </div>
      <div class="lineups">
        ${state.teams.map((team) => renderLineup(state, match, team)).join("")}
      </div>
    </article>
  `;
}

export function renderLatestMatch(state, options = {}) {
  const latest = orderedMatches(state)[0];
  if (!latest) return `<div class="empty-state"><strong>Henüz maç yok</strong><span>İlk meydan kaydını düzenleme menüsünden ekleyebilirsin.</span></div>`;
  return renderMatchSheet(state, latest, options);
}

function compactLineup(state, match, teamId) {
  const roster = playersById(state);
  return match.teams[teamId]
    .map((slot) => roster.get(slot.playerId)?.name ?? "Bilinmeyen")
    .map(escapeHtml)
    .join(" · ");
}

export function renderRecentMatches(state, limit = 5, { editable = false } = {}) {
  const matches = orderedMatches(state).slice(0, limit);
  if (!matches.length) return `<div class="empty-state"><strong>Henüz maç yok</strong></div>`;
  return matches.map((match) => {
    const winner = teamById(state, match.winner);
    return `
      <article class="result-row" data-match-id="${escapeHtml(match.id)}">
        <div class="result-date">
          <time datetime="${escapeHtml(match.date)}">${escapeHtml(formatMatchDate(match.date))}</time>
          <span>Kazanan <b>${escapeHtml(winner?.name ?? "")}</b></span>
        </div>
        <div class="compact-versus">
          ${state.teams.map((team) => `<div class="compact-team compact-team--${escapeHtml(team.tone)} ${match.winner === team.id ? "is-winner" : ""}">
            <span class="compact-team__name">${escapeHtml(team.name)}</span>
            <strong>${resultWord(match, team.id)}</strong>
            <small>${compactLineup(state, match, team.id)}</small>
          </div>`).join("")}
        </div>
        ${editable ? `<button class="row-edit-action" type="button" data-edit-match="${escapeHtml(match.id)}">Maçı düzenle</button>` : ""}
      </article>
    `;
  }).join("");
}

export function renderLeaderboard(stats, limit = 8) {
  const players = stats.players.slice(0, limit);
  if (!players.length) return `<div class="empty-state"><strong>Henüz oyuncu istatistiği yok</strong></div>`;
  return `
    <div class="table-scroller">
      <table>
        <thead>
          <tr><th scope="col">#</th><th scope="col">Oyuncu</th><th scope="col" title="Oynanan maç">O</th><th scope="col" title="Galibiyet">G</th><th scope="col" title="Mağlubiyet">M</th><th scope="col">%</th></tr>
        </thead>
        <tbody>
          ${players.map((player) => `<tr>
            <td class="rank-number">${player.rank}</td>
            <th scope="row">${escapeHtml(player.name)}</th>
            <td>${player.played}</td>
            <td>${player.wins}</td>
            <td>${player.losses}</td>
            <td><strong>${player.winRate}%</strong></td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;
}

export function renderArchive(state, stats, view, options = {}) {
  if (view === "players") {
    return `<div class="archive-ranking"><p class="archive-count">${stats.players.length} oyuncu</p>${renderLeaderboard(stats, stats.players.length)}</div>`;
  }
  const matches = orderedMatches(state);
  if (!matches.length) return `<div class="empty-state"><strong>Henüz maç yok</strong></div>`;
  return `<div class="archive-matches">${matches.map((match) => renderMatchSheet(state, match, options)).join("")}</div>`;
}

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
  const [blue, orange] = state.teams;
  return `<div class="score-team score-team--${escapeHtml(blue.tone)}${stats.leader === blue.id ? " is-leading" : ""}"><span>${escapeHtml(blue.name)}</span><strong>${stats.teams[blue.id]}</strong></div>
    <div class="score-versus"><span>VS</span><strong>${stats.totalMatches}</strong><small>maç</small></div>
    <div class="score-team score-team--${escapeHtml(orange.tone)}${stats.leader === orange.id ? " is-leading" : ""}"><span>${escapeHtml(orange.name)}</span><strong>${stats.teams[orange.id]}</strong></div>`;
}

export function renderStatsTable(stats) {
  if (!stats.players.length) return `<div class="empty-state"><strong>Henüz oyuncu istatistiği yok</strong></div>`;
  return `<div class="table-scroller"><table class="stats-table"><colgroup><col class="stats-col-rank"><col class="stats-col-player"><col class="stats-col-number"><col class="stats-col-number"><col class="stats-col-number"><col class="stats-col-rate"></colgroup><thead><tr><th scope="col">#</th><th scope="col">Oyuncu</th><th scope="col" title="Oynanan maç">O</th><th scope="col" title="Galibiyet">G</th><th scope="col" title="Mağlubiyet">M</th><th scope="col">%</th></tr></thead><tbody>${stats.players.map((player) => `<tr><td class="rank-number">${player.rank}</td><th scope="row">${escapeHtml(player.name)}</th><td>${player.played}</td><td>${player.wins}</td><td>${player.losses}</td><td><strong>${player.winRate}%</strong></td></tr>`).join("")}</tbody></table></div>`;
}

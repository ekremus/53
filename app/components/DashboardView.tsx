import type { Match } from "../../lib/matches";
import type { Statistics } from "../../lib/statistics";

type Props = {
  matches: Match[];
  statistics: Statistics;
  onOpenMatches: () => void;
  onAddMatch: () => void;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function DashboardView({ matches, statistics, onOpenMatches, onAddMatch }: Props) {
  const latest = [...matches].sort((a, b) => b.date.localeCompare(a.date))[0];
  const leader = statistics.leader === "red" ? "Kırmızı" : statistics.leader === "blue" ? "Mavi" : statistics.leader === "tie" ? "Berabere" : "—";

  return (
    <section className="app-view dashboard-view" aria-labelledby="dashboard-title">
      <div className="view-title">
        <p>SEZON</p>
        <h1 id="dashboard-title">Dashboard</h1>
      </div>

      <div className="season-score" aria-label="Genel takım skoru">
        <div className="score-team red">
          <span>Kırmızı</span>
          <strong>{statistics.redWins}</strong>
        </div>
        <div className="score-vs">
          <span>VS</span>
          <small>{statistics.totalMatches} MAÇ</small>
        </div>
        <div className="score-team blue">
          <span>Mavi</span>
          <strong>{statistics.blueWins}</strong>
        </div>
      </div>

      <div className="dashboard-metrics">
        <div><span>Lider</span><strong>{leader}</strong></div>
        <div><span>Oyuncu</span><strong>{statistics.players.length}</strong></div>
        <div><span>Son maç</span><strong>{latest ? formatDate(latest.date) : "—"}</strong></div>
      </div>

      <div className="latest-block">
        <div className="block-title">
          <h2>Son maç</h2>
          {latest && <button onClick={onOpenMatches}>Tümünü gör</button>}
        </div>

        {latest ? (
          <article className="latest-match">
            <div className={latest.winner === "red" ? "latest-team winner red" : "latest-team red"}>
              <span>Kırmızı {latest.winner === "red" && <b>GALİP</b>}</span>
              <ul>
                {latest.redTeam.map((player, index) => (
                  <li key={player}><strong>{player}</strong><small>{latest.redCivilizations[index]}</small></li>
                ))}
              </ul>
            </div>
            <div className={latest.winner === "blue" ? "latest-team winner blue" : "latest-team blue"}>
              <span>Mavi {latest.winner === "blue" && <b>GALİP</b>}</span>
              <ul>
                {latest.blueTeam.map((player, index) => (
                  <li key={player}><strong>{player}</strong><small>{latest.blueCivilizations[index]}</small></li>
                ))}
              </ul>
            </div>
          </article>
        ) : (
          <div className="empty-state compact">
            <strong>Henüz maç yok</strong>
            <button className="game-button" onClick={onAddMatch}>İlk maçı ekle</button>
          </div>
        )}
      </div>
    </section>
  );
}

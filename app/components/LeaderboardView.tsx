import type { PlayerStat } from "../../lib/statistics";

export function LeaderboardView({ players }: { players: PlayerStat[] }) {
  return (
    <section className="app-view leaderboard-view" aria-labelledby="leaderboard-title">
      <div className="view-title with-count">
        <div><p>OYUNCULAR</p><h1 id="leaderboard-title">Sıralama</h1></div>
        <span>{players.length}</span>
      </div>

      {players.length ? (
        <div className="leaderboard-table-wrap">
          <table className="app-leaderboard">
            <thead>
              <tr><th>#</th><th>Oyuncu</th><th>Maç</th><th>G</th><th>M</th><th>Oran</th></tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <tr key={player.name.toLocaleLowerCase("tr-TR")}>
                  <td><span className={player.rank === 1 ? "rank first" : "rank"}>{player.rank}</span></td>
                  <th scope="row"><strong>{player.name}</strong><small>{player.wins}G · {player.losses}M</small></th>
                  <td>{player.played}</td><td>{player.wins}</td><td>{player.losses}</td>
                  <td><span className="win-rate"><b>{player.winRate}%</b><i><em style={{ width: `${player.winRate}%` }} /></i></span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state"><strong>Sıralama boş</strong><span>İlk maçtan sonra otomatik oluşur.</span></div>
      )}
    </section>
  );
}

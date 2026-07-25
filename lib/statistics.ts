import type { Match, Team } from "./matches";

export type PlayerStat = {
  name: string;
  played: number;
  wins: number;
  losses: number;
  winRate: number;
  rank: number;
};

export type Statistics = {
  totalMatches: number;
  redWins: number;
  blueWins: number;
  leader: Team | "tie" | null;
  players: PlayerStat[];
};

export function calculateStatistics(matches: Match[]): Statistics {
  const players = new Map<string, Omit<PlayerStat, "rank" | "winRate">>();
  let redWins = 0;
  let blueWins = 0;

  for (const match of matches) {
    if (match.winner === "red") redWins += 1;
    else blueWins += 1;

    const teams: Array<[Team, Match["redTeam"]]> = [
      ["red", match.redTeam],
      ["blue", match.blueTeam],
    ];

    for (const [team, names] of teams) {
      for (const name of names) {
        const key = name.trim().toLocaleLowerCase("tr-TR");
        const current = players.get(key) ?? {
          name: name.trim(),
          played: 0,
          wins: 0,
          losses: 0,
        };
        current.played += 1;
        if (match.winner === team) current.wins += 1;
        else current.losses += 1;
        players.set(key, current);
      }
    }
  }

  const sorted = [...players.values()]
    .map((player) => ({
      ...player,
      winRate: player.played ? Math.round((player.wins / player.played) * 100) : 0,
      rank: 0,
    }))
    .sort(
      (a, b) =>
        b.winRate - a.winRate ||
        b.wins - a.wins ||
        b.played - a.played ||
        a.name.localeCompare(b.name, "tr-TR"),
    );

  let lastRank = 0;
  sorted.forEach((player, index) => {
    const previous = sorted[index - 1];
    const tied =
      previous &&
      previous.winRate === player.winRate &&
      previous.wins === player.wins &&
      previous.played === player.played;
    if (!tied) lastRank = index + 1;
    player.rank = lastRank;
  });

  return {
    totalMatches: matches.length,
    redWins,
    blueWins,
    leader:
      matches.length === 0
        ? null
        : redWins === blueWins
          ? "tie"
          : redWins > blueWins
            ? "red"
            : "blue",
    players: sorted,
  };
}

import assert from "node:assert/strict";
import test from "node:test";
import type { Match } from "../lib/matches";
import { calculateStatistics } from "../lib/statistics";

const matches: Match[] = [
  {
    id: "one",
    date: "2026-07-18",
    redTeam: ["Eko", "Can", "Mert", "Ali"],
    blueTeam: ["Bora", "Cem", "Deniz", "Emre"],
    winner: "red",
  },
  {
    id: "two",
    date: "2026-07-25",
    redTeam: ["Bora", "Can", "Deniz", "Ali"],
    blueTeam: ["EKO", "Cem", "Mert", "Emre"],
    winner: "blue",
  },
];

test("derives team totals and merges player names case-insensitively", () => {
  const result = calculateStatistics(matches);
  assert.equal(result.totalMatches, 2);
  assert.equal(result.redWins, 1);
  assert.equal(result.blueWins, 1);
  assert.equal(result.leader, "tie");
  assert.equal(result.players.length, 8);

  const eko = result.players.find((player) => player.name.toLocaleLowerCase("tr-TR") === "eko");
  assert.deepEqual(
    { played: eko?.played, wins: eko?.wins, losses: eko?.losses, winRate: eko?.winRate },
    { played: 2, wins: 2, losses: 0, winRate: 100 },
  );
});

test("uses competition ranking for tied player records", () => {
  const result = calculateStatistics(matches);
  const perfect = result.players.filter((player) => player.winRate === 100);
  assert.ok(perfect.length > 1);
  assert.ok(perfect.every((player) => player.rank === 1));
  const firstImperfect = result.players.find((player) => player.winRate < 100);
  assert.equal(firstImperfect?.rank, perfect.length + 1);
});

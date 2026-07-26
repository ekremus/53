import assert from "node:assert/strict";
import test from "node:test";
import { CIVILIZATIONS } from "../lib/civilizations";
import { playerRoster, validateMatches } from "../lib/matches";

const legacyMatch = {
  id: "legacy",
  date: "2026-07-25",
  redTeam: ["Eko", "Can", "Mert", "Ali"],
  blueTeam: ["Bora", "Cem", "Deniz", "Emre"],
  winner: "red",
};

test("ships the current 53 standard DE civilizations", () => {
  assert.equal(CIVILIZATIONS.length, 53);
  assert.ok(CIVILIZATIONS.includes("Mapuche"));
  assert.ok(CIVILIZATIONS.includes("Muisca"));
  assert.ok(CIVILIZATIONS.includes("Tupi"));
});

test("normalizes legacy records to Random civilizations on read", () => {
  const [match] = validateMatches([legacyMatch], { allowMissingCivilizations: true });
  assert.deepEqual(match.redCivilizations, ["Random", "Random", "Random", "Random"]);
  assert.deepEqual(match.blueCivilizations, ["Random", "Random", "Random", "Random"]);
});

test("requires valid civilization choices on write", () => {
  assert.throws(() => validateMatches([legacyMatch]), /uygarlık seçilmeli/);
  assert.throws(
    () => validateMatches([{
      ...legacyMatch,
      redCivilizations: ["Turks", "Franks", "Mongols", "Unknown"],
      blueCivilizations: ["Vikings", "Celts", "Spanish", "Japanese"],
    }]),
    /geçersiz bir uygarlık/,
  );
});

test("builds a case-insensitive sorted roster from history", () => {
  const matches = validateMatches([
    {
      ...legacyMatch,
      redCivilizations: ["Turks", "Franks", "Mongols", "Britons"],
      blueCivilizations: ["Vikings", "Celts", "Spanish", "Japanese"],
    },
    {
      ...legacyMatch,
      id: "second",
      redTeam: ["EKO", "Can", "Mert", "Ali"],
      redCivilizations: ["Turks", "Franks", "Mongols", "Britons"],
      blueTeam: ["Bora", "Cem", "Deniz", "Emre"],
      blueCivilizations: ["Vikings", "Celts", "Spanish", "Japanese"],
    },
  ]);
  const roster = playerRoster(matches);
  assert.equal(roster.length, 8);
  assert.equal(roster.filter((name) => name.toLocaleLowerCase("tr-TR") === "eko").length, 1);
});

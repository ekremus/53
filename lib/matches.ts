import { civilizationSet, type Civilization } from "./civilizations";

export type Team = "red" | "blue";

export type CivilizationTuple = [Civilization, Civilization, Civilization, Civilization];

export type Match = {
  id: string;
  date: string;
  redTeam: [string, string, string, string];
  blueTeam: [string, string, string, string];
  redCivilizations: CivilizationTuple;
  blueCivilizations: CivilizationTuple;
  winner: Team;
};

export type MatchState = {
  matches: Match[];
  revision: number;
  updatedAt: string | null;
};

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

function isRealDate(value: string) {
  if (!isoDate.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function normalizeTeam(value: unknown, label: string) {
  if (!Array.isArray(value) || value.length !== 4) {
    throw new Error(`${label} takımında tam 4 oyuncu olmalı.`);
  }

  const players = value.map((player) =>
    typeof player === "string" ? player.trim().replace(/\s+/g, " ") : "",
  );

  if (players.some((player) => player.length === 0)) {
    throw new Error(`${label} takımındaki tüm oyuncu adlarını doldur.`);
  }

  if (players.some((player) => player.length > 40)) {
    throw new Error("Oyuncu adları 40 karakterden kısa olmalı.");
  }

  return players as Match["redTeam"];
}

function normalizeCivilizations(
  value: unknown,
  label: string,
  allowMissingCivilizations: boolean,
): CivilizationTuple {
  if (value === undefined && allowMissingCivilizations) {
    return ["Random", "Random", "Random", "Random"];
  }

  if (!Array.isArray(value) || value.length !== 4) {
    throw new Error(`${label} takımında her oyuncu için bir uygarlık seçilmeli.`);
  }

  return value.map((civilization) => {
    if (typeof civilization !== "string" || !civilizationSet.has(civilization)) {
      throw new Error(`${label} takımında geçersiz bir uygarlık var.`);
    }
    return civilization as Civilization;
  }) as CivilizationTuple;
}

type ValidationOptions = { allowMissingCivilizations?: boolean };

export function validateMatches(value: unknown, options: ValidationOptions = {}): Match[] {
  if (!Array.isArray(value)) throw new Error("Maç listesi geçersiz.");
  if (value.length > 500) throw new Error("En fazla 500 maç saklanabilir.");

  const ids = new Set<string>();

  return value.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`${index + 1}. maç geçersiz.`);
    }

    const candidate = item as Record<string, unknown>;
    const id = typeof candidate.id === "string" ? candidate.id.trim() : "";
    const date = typeof candidate.date === "string" ? candidate.date : "";

    if (!id || id.length > 80 || ids.has(id)) {
      throw new Error(`${index + 1}. maçın kimliği geçersiz.`);
    }
    ids.add(id);

    if (!isRealDate(date)) {
      throw new Error(`${index + 1}. maçın tarihi geçersiz.`);
    }

    const redTeam = normalizeTeam(candidate.redTeam, "Kırmızı");
    const blueTeam = normalizeTeam(candidate.blueTeam, "Mavi");
    const redCivilizations = normalizeCivilizations(
      candidate.redCivilizations,
      "Kırmızı",
      options.allowMissingCivilizations === true,
    );
    const blueCivilizations = normalizeCivilizations(
      candidate.blueCivilizations,
      "Mavi",
      options.allowMissingCivilizations === true,
    );
    const allPlayers = [...redTeam, ...blueTeam].map((name) =>
      name.toLocaleLowerCase("tr-TR"),
    );

    if (new Set(allPlayers).size !== allPlayers.length) {
      throw new Error(`${index + 1}. maçta bir oyuncu iki kez yer alamaz.`);
    }

    if (candidate.winner !== "red" && candidate.winner !== "blue") {
      throw new Error(`${index + 1}. maçın kazananını seç.`);
    }

    return {
      id,
      date,
      redTeam,
      blueTeam,
      redCivilizations,
      blueCivilizations,
      winner: candidate.winner,
    };
  });
}

export function playerRoster(matches: Match[]) {
  const roster = new Map<string, string>();
  for (const match of matches) {
    for (const name of [...match.redTeam, ...match.blueTeam]) {
      const clean = name.trim().replace(/\s+/g, " ");
      if (!clean) continue;
      const key = clean.toLocaleLowerCase("tr-TR");
      if (!roster.has(key)) roster.set(key, clean);
    }
  }
  return [...roster.values()].sort((a, b) => a.localeCompare(b, "tr-TR"));
}

export async function isEditPasswordValid(value: unknown, expected: string) {
  if (typeof value !== "string") return false;
  const encoder = new TextEncoder();
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(value)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const provided = new Uint8Array(providedHash);
  const target = new Uint8Array(expectedHash);
  let difference = provided.length ^ target.length;
  for (let index = 0; index < Math.min(provided.length, target.length); index += 1) {
    difference |= provided[index] ^ target[index];
  }
  return difference === 0;
}

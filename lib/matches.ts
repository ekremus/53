export type Team = "red" | "blue";

export type Match = {
  id: string;
  date: string;
  redTeam: [string, string, string, string];
  blueTeam: [string, string, string, string];
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

export function validateMatches(value: unknown): Match[] {
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
    const allPlayers = [...redTeam, ...blueTeam].map((name) =>
      name.toLocaleLowerCase("tr-TR"),
    );

    if (new Set(allPlayers).size !== allPlayers.length) {
      throw new Error(`${index + 1}. maçta bir oyuncu iki kez yer alamaz.`);
    }

    if (candidate.winner !== "red" && candidate.winner !== "blue") {
      throw new Error(`${index + 1}. maçın kazananını seç.`);
    }

    return { id, date, redTeam, blueTeam, winner: candidate.winner };
  });
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

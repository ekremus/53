import { civilizationSet } from "./civilizations.js";

const TEAM_IDS = Object.freeze(["cortinyanlar", "bakracogullari"]);
const TEAM_NAMES = Object.freeze(["Cortinyanlar", "Bakracoğulları"]);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,79}$/;

function clone(value) {
  return structuredClone(value);
}

function cleanName(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function nameKey(value) {
  return cleanName(value).toLocaleLowerCase("tr-TR");
}

function isRealDate(value) {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

function normalizeId(value, label) {
  const id = typeof value === "string" ? value.trim() : "";
  if (!ID_PATTERN.test(id)) throw new Error(`${label} kimliği geçersiz.`);
  return id;
}

function normalizePlayer(value, index) {
  if (!value || typeof value !== "object") throw new Error(`${index + 1}. oyuncu geçersiz.`);
  const id = normalizeId(value.id, `${index + 1}. oyuncu`);
  const name = cleanName(value.name);
  if (!name || name.length > 40) throw new Error(`${index + 1}. oyuncunun adı 1–40 karakter olmalı.`);
  if (typeof value.active !== "boolean") throw new Error(`${name} için aktiflik değeri geçersiz.`);
  return { id, name, active: value.active };
}

function normalizeSlot(value, label, playersById) {
  if (!value || typeof value !== "object") throw new Error(`${label} oyuncu satırı geçersiz.`);
  const playerId = typeof value.playerId === "string" ? value.playerId.trim() : "";
  if (!playerId) return { playerId: "", civilization: "Random" };
  if (!playersById.has(playerId)) throw new Error(`${label} oyuncusu kayıtlı değil.`);
  const civilization = typeof value.civilization === "string" ? value.civilization : "";
  if (!civilizationSet.has(civilization)) throw new Error(`${label} için uygarlık seçimi geçersiz.`);
  return { playerId, civilization };
}

function normalizeMatch(value, index, playersById, seenIds) {
  if (!value || typeof value !== "object") throw new Error(`${index + 1}. maç geçersiz.`);
  const id = typeof value.id === "string" ? value.id.trim() : "";
  if (!id || id.length > 80 || seenIds.has(id)) throw new Error(`${index + 1}. maçın kimliği geçersiz.`);
  seenIds.add(id);
  if (!isRealDate(value.date)) throw new Error(`${index + 1}. maçın tarihi geçersiz.`);
  if (!value.teams || typeof value.teams !== "object") throw new Error(`${index + 1}. maçın takımları geçersiz.`);

  const teams = {};
  const allPlayerIds = [];
  for (const teamId of TEAM_IDS) {
    const slots = value.teams[teamId];
    if (!Array.isArray(slots) || slots.length !== 4) {
      throw new Error(`${index + 1}. maçta ${teamId === TEAM_IDS[0] ? TEAM_NAMES[0] : TEAM_NAMES[1]} tam 4 oyuncu içermeli.`);
    }
    teams[teamId] = slots.map((slot, slotIndex) => normalizeSlot(
      slot,
      `${index + 1}. maç ${slotIndex + 1}. sıra`,
      playersById,
    ));
    allPlayerIds.push(...teams[teamId].map((slot) => slot.playerId));
  }
  const selectedPlayerIds = allPlayerIds.filter(Boolean);
  if (new Set(selectedPlayerIds).size !== selectedPlayerIds.length) {
    throw new Error(`${index + 1}. maçta bir oyuncu iki kez yer alamaz.`);
  }
  if (!TEAM_IDS.includes(value.winner)) throw new Error(`${index + 1}. maçın kazananı geçersiz.`);
  return { id, date: value.date, teams, winner: value.winner };
}

export function validateState(value) {
  if (!value || typeof value !== "object") throw new Error("Maç verisi geçersiz.");
  if (value.schemaVersion !== 1) throw new Error("Veri şeması desteklenmiyor.");
  if (!Number.isInteger(value.revision) || value.revision < 0) throw new Error("Veri revizyonu geçersiz.");
  if (value.updatedAt !== null && (typeof value.updatedAt !== "string" || Number.isNaN(Date.parse(value.updatedAt)))) {
    throw new Error("Güncelleme tarihi geçersiz.");
  }
  if (!Array.isArray(value.teams) || value.teams.length !== 2) throw new Error("Tam iki takım tanımlanmalı.");
  const teams = value.teams.map((team, index) => {
    if (!team || typeof team !== "object") throw new Error(`${index + 1}. takım geçersiz.`);
    if (team.id !== TEAM_IDS[index] || team.name !== TEAM_NAMES[index]) throw new Error("Takım adları değiştirilemez.");
    const acceptedTone = index === 0 ? team.tone === "blue" : team.tone === "red" || team.tone === "orange";
    if (!acceptedTone) throw new Error(`${team.name} renk tonu geçersiz.`);
    return { id: team.id, name: team.name, tone: index === 0 ? "blue" : "red" };
  });
  if (!Array.isArray(value.players)) throw new Error("Oyuncu listesi geçersiz.");
  const players = value.players.map(normalizePlayer);
  const playerIds = new Set();
  const playerNames = new Set();
  for (const player of players) {
    if (playerIds.has(player.id)) throw new Error(`${player.name} oyuncu kimliği iki kez kullanılmış.`);
    const key = nameKey(player.name);
    if (playerNames.has(key)) throw new Error(`${player.name} oyuncusu zaten var.`);
    playerIds.add(player.id);
    playerNames.add(key);
  }
  if (!Array.isArray(value.matches) || value.matches.length > 500) throw new Error("Maç listesi geçersiz.");
  const seenMatchIds = new Set();
  const matches = value.matches.map((match, index) => normalizeMatch(match, index, playerIds, seenMatchIds));
  return {
    schemaVersion: 1,
    revision: value.revision,
    updatedAt: value.updatedAt,
    teams,
    players,
    matches,
  };
}

export function activeRoster(state) {
  return validateState(state).players
    .filter((player) => player.active)
    .sort((a, b) => a.name.localeCompare(b.name, "tr-TR"));
}

function newestFirstMatchRecords(matches) {
  return matches
    .map((match, index) => ({ match, index }))
    .sort((a, b) => b.match.date.localeCompare(a.match.date) || b.index - a.index);
}

function civilizationHistoryMap(state) {
  const histories = new Map();
  for (const { match } of newestFirstMatchRecords(state.matches)) {
    for (const teamId of TEAM_IDS) {
      for (const slot of match.teams[teamId]) {
        if (!slot.playerId) continue;
        const history = histories.get(slot.playerId) ?? [];
        history.push(slot.civilization);
        histories.set(slot.playerId, history);
      }
    }
  }
  return histories;
}

function favoriteFromHistory(history = []) {
  if (!history.length) return "Random";
  const counts = new Map();
  for (const civilization of history) {
    counts.set(civilization, (counts.get(civilization) ?? 0) + 1);
  }
  return history.reduce((best, civilization) => (
    counts.get(civilization) > counts.get(best) ? civilization : best
  ), history[0]);
}

function assertKnownPlayer(state, playerId) {
  if (!state.players.some((player) => player.id === playerId)) throw new Error("Oyuncu bulunamadı.");
}

function roundedRate(wins, played) {
  return played ? Math.round((wins / played) * 100) : 0;
}

function rankedDetailRecord(records, minimumPlayed, labelKey) {
  const values = [...records.values()];
  const qualified = values.filter(({ played }) => played >= minimumPlayed);
  const pool = qualified.length ? qualified : values;
  const best = pool.sort((a, b) => (
    b.winRate - a.winRate
    || b.wins - a.wins
    || b.played - a.played
    || a[labelKey].localeCompare(b[labelKey], "tr-TR")
  ))[0];
  return best ? { ...best, smallSample: qualified.length === 0 } : null;
}

function playerMatchResult(match, playerId) {
  for (const teamId of TEAM_IDS) {
    const slot = match.teams[teamId].find((candidate) => candidate.playerId === playerId);
    if (slot) return { teamId, slot, won: match.winner === teamId };
  }
  return null;
}

export function latestCivilizationForPlayer(state, playerId, excludedSlot = {}) {
  const normalized = validateState(state);
  if (!playerId) return "Random";
  assertKnownPlayer(normalized, playerId);
  for (const { match } of newestFirstMatchRecords(normalized.matches)) {
    for (const teamId of TEAM_IDS) {
      for (const [index, slot] of match.teams[teamId].entries()) {
        const excluded = match.id === excludedSlot.matchId
          && teamId === excludedSlot.teamId
          && index === excludedSlot.index;
        if (!excluded && slot.playerId === playerId) return slot.civilization;
      }
    }
  }
  return "Random";
}

export function favoriteCivilizationForPlayer(state, playerId) {
  const normalized = validateState(state);
  assertKnownPlayer(normalized, playerId);
  return favoriteFromHistory(civilizationHistoryMap(normalized).get(playerId));
}

export function calculatePlayerDetails(state, playerId) {
  const normalized = validateState(state);
  assertKnownPlayer(normalized, playerId);
  const player = normalized.players.find((candidate) => candidate.id === playerId);
  const players = new Map(normalized.players.map((candidate) => [candidate.id, candidate]));
  const records = newestFirstMatchRecords(normalized.matches)
    .map(({ match }) => ({ match, result: playerMatchResult(match, playerId) }))
    .filter(({ result }) => result);
  const outcomes = records.map(({ result }) => result.won ? "W" : "L");

  let currentWinStreak = 0;
  while (outcomes[currentWinStreak] === "W") currentWinStreak += 1;
  let longestWinStreak = 0;
  let runningWinStreak = 0;
  for (const outcome of [...outcomes].reverse()) {
    runningWinStreak = outcome === "W" ? runningWinStreak + 1 : 0;
    longestWinStreak = Math.max(longestWinStreak, runningWinStreak);
  }

  const civilizations = new Map();
  const duos = new Map();
  for (const { match, result } of records) {
    if (result.slot.civilization !== "Random") {
      const civilization = civilizations.get(result.slot.civilization) ?? {
        name: result.slot.civilization,
        played: 0,
        wins: 0,
        winRate: 0,
      };
      civilization.played += 1;
      civilization.wins += Number(result.won);
      civilization.winRate = roundedRate(civilization.wins, civilization.played);
      civilizations.set(civilization.name, civilization);
    }

    for (const teammate of match.teams[result.teamId]) {
      if (!teammate.playerId || teammate.playerId === playerId) continue;
      const teammatePlayer = players.get(teammate.playerId);
      const duo = duos.get(teammate.playerId) ?? {
        playerId: teammate.playerId,
        name: teammatePlayer.name,
        played: 0,
        wins: 0,
        winRate: 0,
      };
      duo.played += 1;
      duo.wins += Number(result.won);
      duo.winRate = roundedRate(duo.wins, duo.played);
      duos.set(duo.playerId, duo);
    }
  }

  return {
    player: { ...player },
    lastFive: outcomes.slice(0, 5),
    currentWinStreak,
    longestWinStreak,
    bestCivilization: rankedDetailRecord(civilizations, 3, "name"),
    bestDuo: rankedDetailRecord(duos, 5, "name"),
  };
}

const PLAYER_STAT_KEYS = new Set(["played", "wins", "losses", "winRate"]);

export function sortPlayerStatistics(players, key = "wins", direction = "desc") {
  if (!PLAYER_STAT_KEYS.has(key)) throw new Error("Sıralama ölçütü geçersiz.");
  if (!["asc", "desc"].includes(direction)) throw new Error("Sıralama yönü geçersiz.");
  const multiplier = direction === "desc" ? -1 : 1;
  const ordered = players.map((player) => ({ ...player })).sort((a, b) => (
    (a[key] - b[key]) * multiplier
    || (key === "wins" ? a.losses - b.losses : b.wins - a.wins)
    || a.losses - b.losses
    || a.name.localeCompare(b.name, "tr-TR")
  ));

  ordered.forEach((player, index) => {
    player.rank = index + 1;
  });
  return ordered;
}

export function calculateStatistics(state) {
  const normalized = validateState(state);
  const civilizationHistories = civilizationHistoryMap(normalized);
  const statsByPlayer = new Map(normalized.players.map((player) => [player.id, {
    id: player.id,
    name: player.name,
    active: player.active,
    played: 0,
    wins: 0,
    losses: 0,
  }]));
  const teams = Object.fromEntries(TEAM_IDS.map((teamId) => [teamId, 0]));

  for (const match of normalized.matches) {
    teams[match.winner] += 1;
    for (const teamId of TEAM_IDS) {
      for (const slot of match.teams[teamId]) {
        if (!slot.playerId) continue;
        const current = statsByPlayer.get(slot.playerId);
        current.played += 1;
        if (teamId === match.winner) current.wins += 1;
        else current.losses += 1;
        statsByPlayer.set(slot.playerId, current);
      }
    }
  }

  const players = sortPlayerStatistics([...statsByPlayer.values()]
    .map((player) => ({
      ...player,
      favoriteCivilization: favoriteFromHistory(civilizationHistories.get(player.id)),
      winRate: player.played ? Math.round((player.wins / player.played) * 100) : 0,
      rank: 0,
    })), "wins", "desc");

  return {
    totalMatches: normalized.matches.length,
    teams,
    leader: normalized.matches.length === 0
      ? null
      : teams[TEAM_IDS[0]] === teams[TEAM_IDS[1]]
        ? "tie"
        : teams[TEAM_IDS[0]] > teams[TEAM_IDS[1]] ? TEAM_IDS[0] : TEAM_IDS[1],
    players,
  };
}

export function createEmptyMatch(state, date) {
  const normalized = validateState(state);
  if (!isRealDate(date)) throw new Error("Maç tarihi geçersiz.");
  const teams = Object.fromEntries(normalized.teams.map((team) => [
    team.id,
    Array.from({ length: 4 }, () => ({ playerId: "", civilization: "Random" })),
  ]));
  return {
    id: crypto.randomUUID(),
    date,
    teams,
    winner: normalized.teams[0].id,
  };
}

function slugifyName(name) {
  const substitutions = { ı: "i", İ: "i", ş: "s", Ş: "s", ğ: "g", Ğ: "g", ü: "u", Ü: "u", ö: "o", Ö: "o", ç: "c", Ç: "c" };
  return [...name].map((character) => substitutions[character] ?? character).join("")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "oyuncu";
}

export function upsertPlayer(state, input) {
  const normalized = validateState(state);
  const name = cleanName(input?.name);
  if (!name || name.length > 40) throw new Error("Oyuncu adı 1–40 karakter olmalı.");
  const key = nameKey(name);
  const existingWithName = normalized.players.find((player) => nameKey(player.name) === key && player.id !== input?.id);
  if (existingWithName) throw new Error(`${name} oyuncusu zaten var.`);

  if (input?.id) {
    const player = normalized.players.find((candidate) => candidate.id === input.id);
    if (!player) throw new Error("Oyuncu bulunamadı.");
    player.name = name;
    if (typeof input.active === "boolean") player.active = input.active;
    return validateState(normalized);
  }

  const base = slugifyName(name).slice(0, 70);
  let id = base;
  let suffix = 2;
  const ids = new Set(normalized.players.map((player) => player.id));
  while (ids.has(id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }
  normalized.players.push({ id, name, active: input?.active !== false });
  return validateState(normalized);
}

export function removeOrDeactivatePlayer(state, playerId) {
  const normalized = validateState(state);
  const index = normalized.players.findIndex((player) => player.id === playerId);
  if (index === -1) throw new Error("Oyuncu bulunamadı.");
  const referenced = normalized.matches.some((match) => Object.values(match.teams).flat().some((slot) => slot.playerId === playerId));
  if (referenced) normalized.players[index].active = false;
  else normalized.players.splice(index, 1);
  return validateState(normalized);
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppSidebar, type AppView } from "./components/AppSidebar";
import { DashboardView } from "./components/DashboardView";
import { LeaderboardView } from "./components/LeaderboardView";
import { MatchesView } from "./components/MatchesView";
import { UnlockModal } from "./components/UnlockModal";
import type { Civilization } from "../lib/civilizations";
import {
  playerRoster,
  validateMatches,
  type Match,
  type MatchState,
} from "../lib/matches";
import { calculateStatistics } from "../lib/statistics";

const emptyState: MatchState = { matches: [], revision: 0, updatedAt: null };
const views = new Set<AppView>(["dashboard", "matches", "leaderboard"]);

function localToday() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function newMatch(): Match {
  return {
    id: crypto.randomUUID(),
    date: localToday(),
    redTeam: ["", "", "", ""],
    blueTeam: ["", "", "", ""],
    redCivilizations: ["Random", "Random", "Random", "Random"],
    blueCivilizations: ["Random", "Random", "Random", "Random"],
    winner: "red",
  };
}

function cloneMatches(matches: Match[]) {
  return matches.map((match) => ({
    ...match,
    redTeam: [...match.redTeam] as Match["redTeam"],
    blueTeam: [...match.blueTeam] as Match["blueTeam"],
    redCivilizations: [...match.redCivilizations] as Match["redCivilizations"],
    blueCivilizations: [...match.blueCivilizations] as Match["blueCivilizations"],
  }));
}

async function readJson(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : "Bir şeyler ters gitti.");
  return body;
}

function hashView(): AppView {
  if (typeof window === "undefined") return "dashboard";
  const value = window.location.hash.slice(1) as AppView;
  return views.has(value) ? value : "dashboard";
}

export default function Home() {
  const [state, setState] = useState<MatchState>(emptyState);
  const [draft, setDraft] = useState<Match[]>([]);
  const [activeView, setActiveView] = useState<AppView>("dashboard");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [editing, setEditing] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [unlockIntent, setUnlockIntent] = useState<"edit" | "add">("edit");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const navigate = useCallback((view: AppView) => {
    setActiveView(view);
    if (typeof window !== "undefined" && window.location.hash !== `#${view}`) window.location.hash = view;
  }, []);

  const loadMatches = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const next = await readJson(await fetch("/api/matches", { cache: "no-store" })) as MatchState;
      setState(next);
      setDraft(cloneMatches(next.matches));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Maçlar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setActiveView(hashView());
    const onHashChange = () => setActiveView(hashView());
    window.addEventListener("hashchange", onHashChange);
    void loadMatches();
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [loadMatches]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const statistics = useMemo(() => calculateStatistics(state.matches), [state.matches]);
  const roster = useMemo(() => playerRoster([...state.matches, ...draft]), [state.matches, draft]);
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(state.matches), [draft, state.matches]);

  function requestEdit(addMatch = false) {
    if (editing) {
      navigate("matches");
      if (addMatch) setDraft((current) => [newMatch(), ...current]);
      return;
    }
    setUnlockIntent(addMatch ? "add" : "edit");
    setPassword("");
    setPasswordError("");
    setUnlockOpen(true);
  }

  async function unlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUnlocking(true);
    setPasswordError("");
    try {
      await readJson(await fetch("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      }));
      const nextDraft = cloneMatches(state.matches);
      setDraft(unlockIntent === "add" ? [newMatch(), ...nextDraft] : nextDraft);
      setEditing(true);
      setUnlockOpen(false);
      navigate("matches");
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "Şifre doğrulanamadı.");
    } finally {
      setUnlocking(false);
    }
  }

  function cancelEdit() {
    if (dirty && !window.confirm("Kaydedilmemiş değişiklikler silinsin mi?")) return;
    setDraft(cloneMatches(state.matches));
    setPassword("");
    setEditing(false);
  }

  function updateMatch(id: string, update: Partial<Match>) {
    setDraft((current) => current.map((match) => match.id === id ? { ...match, ...update } : match));
  }

  function updatePlayer(id: string, team: "redTeam" | "blueTeam", index: number, value: string) {
    setDraft((current) => current.map((match) => {
      if (match.id !== id) return match;
      const players = [...match[team]] as Match["redTeam"];
      players[index] = value;
      return { ...match, [team]: players };
    }));
  }

  function updateCivilization(id: string, team: "redCivilizations" | "blueCivilizations", index: number, value: Civilization) {
    setDraft((current) => current.map((match) => {
      if (match.id !== id) return match;
      const civilizations = [...match[team]] as Match["redCivilizations"];
      civilizations[index] = value;
      return { ...match, [team]: civilizations };
    }));
  }

  function swapPlayers(id: string, index: number) {
    setDraft((current) => current.map((match) => {
      if (match.id !== id) return match;
      const redTeam = [...match.redTeam] as Match["redTeam"];
      const blueTeam = [...match.blueTeam] as Match["blueTeam"];
      const redCivilizations = [...match.redCivilizations] as Match["redCivilizations"];
      const blueCivilizations = [...match.blueCivilizations] as Match["blueCivilizations"];
      [redTeam[index], blueTeam[index]] = [blueTeam[index], redTeam[index]];
      [redCivilizations[index], blueCivilizations[index]] = [blueCivilizations[index], redCivilizations[index]];
      return { ...match, redTeam, blueTeam, redCivilizations, blueCivilizations };
    }));
  }

  function removeMatch(id: string) {
    if (!window.confirm("Bu maç silinsin mi?")) return;
    setDraft((current) => current.filter((match) => match.id !== id));
  }

  async function saveChanges() {
    setNotice(null);
    let matches: Match[];
    try {
      matches = validateMatches(draft);
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Alanları kontrol et." });
      return;
    }

    setSaving(true);
    try {
      const next = await readJson(await fetch("/api/matches", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-edit-password": password },
        body: JSON.stringify({ matches, revision: state.revision }),
      })) as MatchState;
      setState(next);
      setDraft(cloneMatches(next.matches));
      setNotice({ type: "success", text: "Kaydedildi." });
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Kaydedilemedi." });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="system-screen"><span className="system-mark">53</span><p>Yükleniyor…</p></main>;
  }

  if (loadError) {
    return <main className="system-screen"><span className="system-mark">53</span><strong>Bağlantı kurulamadı</strong><p>{loadError}</p><button className="game-button" onClick={() => void loadMatches()}>Tekrar dene</button></main>;
  }

  return (
    <main className="app-shell">
      <AppSidebar activeView={activeView} editing={editing} dirty={dirty} onNavigate={navigate} onEdit={() => requestEdit(false)} />
      <div className="app-content">
        {activeView === "dashboard" && <DashboardView matches={state.matches} statistics={statistics} onOpenMatches={() => navigate("matches")} onAddMatch={() => requestEdit(true)} />}
        {activeView === "matches" && (
          <MatchesView
            matches={state.matches}
            draft={draft}
            roster={roster}
            editing={editing}
            dirty={dirty}
            saving={saving}
            onRequestEdit={requestEdit}
            onAddMatch={() => setDraft((current) => [newMatch(), ...current])}
            onUpdateMatch={updateMatch}
            onUpdatePlayer={updatePlayer}
            onUpdateCivilization={updateCivilization}
            onSwapPlayers={swapPlayers}
            onRemoveMatch={removeMatch}
            onCancel={cancelEdit}
            onSave={() => void saveChanges()}
          />
        )}
        {activeView === "leaderboard" && <LeaderboardView players={statistics.players} />}
      </div>

      <UnlockModal
        open={unlockOpen}
        password={password}
        error={passwordError}
        loading={unlocking}
        onPasswordChange={(value) => { setPassword(value); setPasswordError(""); }}
        onClose={() => setUnlockOpen(false)}
        onSubmit={(event) => void unlock(event)}
      />

      {notice && <div className={`notice ${notice.type}`} role="status"><b>{notice.type === "success" ? "✓" : "!"}</b>{notice.text}</div>}
    </main>
  );
}

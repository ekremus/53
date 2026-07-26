"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  validateMatches,
  type Match,
  type MatchState,
  type Team,
} from "../lib/matches";
import { calculateStatistics } from "../lib/statistics";

const emptyState: MatchState = { matches: [], revision: 0, updatedAt: null };

function localToday() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function newMatch(): Match {
  return {
    id: crypto.randomUUID(),
    date: localToday(),
    redTeam: ["", "", "", ""],
    blueTeam: ["", "", "", ""],
    winner: "red",
  };
}

function cloneMatches(matches: Match[]) {
  return matches.map((match) => ({
    ...match,
    redTeam: [...match.redTeam] as Match["redTeam"],
    blueTeam: [...match.blueTeam] as Match["blueTeam"],
  }));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatShortDate(value: string | null) {
  if (!value) return "Henüz kayıt yok";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

async function readJson(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof body.error === "string" ? body.error : "Bir şeyler ters gitti.");
  }
  return body;
}

export default function Home() {
  const [state, setState] = useState<MatchState>(emptyState);
  const [draft, setDraft] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [editing, setEditing] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
    void loadMatches();
  }, [loadMatches]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!passwordOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !unlocking) setPasswordOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [passwordOpen, unlocking]);

  const statistics = useMemo(() => calculateStatistics(state.matches), [state.matches]);
  const sortedMatches = useMemo(
    () => [...state.matches].sort((a, b) => b.date.localeCompare(a.date)),
    [state.matches],
  );
  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(state.matches),
    [draft, state.matches],
  );

  async function unlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUnlocking(true);
    setPasswordError("");
    try {
      await readJson(
        await fetch("/api/edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        }),
      );
      setDraft(cloneMatches(state.matches));
      setEditing(true);
      setPasswordOpen(false);
      setNotice({ type: "success", text: "Düzenleme açıldı." });
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "Parola doğrulanamadı.");
    } finally {
      setUnlocking(false);
    }
  }

  function exitEdit() {
    if (dirty && !window.confirm("Kaydedilmemiş değişikliklerden vazgeçilsin mi?")) return;
    setDraft(cloneMatches(state.matches));
    setPassword("");
    setEditing(false);
  }

  function updateMatch(id: string, update: Partial<Match>) {
    setDraft((current) =>
      current.map((match) => (match.id === id ? { ...match, ...update } : match)),
    );
  }

  function updatePlayer(id: string, team: "redTeam" | "blueTeam", index: number, name: string) {
    setDraft((current) =>
      current.map((match) => {
        if (match.id !== id) return match;
        const players = [...match[team]] as Match["redTeam"];
        players[index] = name;
        return { ...match, [team]: players };
      }),
    );
  }

  function swapPlayers(id: string, index: number) {
    setDraft((current) =>
      current.map((match) => {
        if (match.id !== id) return match;
        const redTeam = [...match.redTeam] as Match["redTeam"];
        const blueTeam = [...match.blueTeam] as Match["blueTeam"];
        [redTeam[index], blueTeam[index]] = [blueTeam[index], redTeam[index]];
        return { ...match, redTeam, blueTeam };
      }),
    );
  }

  function removeMatch(id: string) {
    if (!window.confirm("Bu maç listeden silinsin mi?")) return;
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
      const next = await readJson(
        await fetch("/api/matches", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "x-edit-password": password,
          },
          body: JSON.stringify({ matches, revision: state.revision }),
        }),
      ) as MatchState;
      setState(next);
      setDraft(cloneMatches(next.matches));
      setNotice({ type: "success", text: "Değişiklikler kaydedildi." });
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Kaydedilemedi." });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="loading-page" aria-busy="true">
        <div className="brand-seal" aria-hidden="true">II</div>
        <p className="eyebrow">HAFTALIK 4V4 KAYITLARI</p>
        <h1>Meydan hazırlanıyor.</h1>
        <span className="loading-line" />
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="error-page">
        <div className="brand-seal" aria-hidden="true">II</div>
        <p className="eyebrow">BAĞLANTI KURULAMADI</p>
        <h1>Maç kayıtlarına ulaşılamadı.</h1>
        <p>{loadError}</p>
        <button className="button button-primary" onClick={() => void loadMatches()}>Tekrar dene</button>
      </main>
    );
  }

  return (
    <main id="top">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="53 ana sayfa">
          <span className="brand-seal" aria-hidden="true">II</span>
          <span>
            <strong>53</strong>
            <small>Haftalık 4v4 kayıtları</small>
          </span>
        </a>
        <div className="header-actions">
          {editing ? (
            <>
              <span className={`save-state ${dirty ? "is-dirty" : ""}`}>
                {dirty ? "Kaydedilmemiş değişiklik" : "Tüm değişiklikler kayıtlı"}
              </span>
              <button className="button button-quiet" onClick={exitEdit} disabled={saving}>Çık</button>
              <button className="button button-primary" onClick={() => void saveChanges()} disabled={saving || !dirty}>
                {saving ? "Kaydediliyor…" : "Kaydet"}
              </button>
            </>
          ) : (
            <button className="button button-edit" onClick={() => {
              setPassword("");
              setPasswordError("");
              setPasswordOpen(true);
            }}>
              <span aria-hidden="true">✦</span> Düzenle
            </button>
          )}
        </div>
      </header>

      <section className="hero" aria-labelledby="season-title">
        <div className="hero-copy">
          <p className="eyebrow">MEYDAN DEFTERİ · {new Date().getFullYear()}</p>
          <h1 id="season-title">Dostluk baki.<br />Skor kayıt altında.</h1>
          <p className="hero-intro">
            Her haftanın 4v4 mücadelesi, takım dengesi ve oyuncu formu tek bir yerde.
          </p>
        </div>

        <div className="scoreboard" aria-label="Genel takım skoru">
          <div className={`score-side score-red ${statistics.leader === "red" ? "is-leading" : ""}`}>
            <span>Kırmızı Takım</span>
            <strong>{statistics.redWins}</strong>
            <small>{statistics.leader === "red" ? "Önde" : "galibiyet"}</small>
          </div>
          <div className="score-middle">
            <span>{statistics.totalMatches}</span>
            <small>toplam<br />maç</small>
          </div>
          <div className={`score-side score-blue ${statistics.leader === "blue" ? "is-leading" : ""}`}>
            <span>Mavi Takım</span>
            <strong>{statistics.blueWins}</strong>
            <small>{statistics.leader === "blue" ? "Önde" : "galibiyet"}</small>
          </div>
        </div>

        <div className="hero-meta">
          <span>Son kayıt</span>
          <strong>{formatShortDate(state.updatedAt)}</strong>
        </div>
      </section>

      <section className="section leaderboard-section" aria-labelledby="leaderboard-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">OYUNCULAR</p>
            <h2 id="leaderboard-title">Meydan sıralaması</h2>
          </div>
          <p>Galibiyet oranına göre · eşitlikte galibiyet ve maç sayısı</p>
        </div>

        {statistics.players.length ? (
          <div className="table-wrap">
            <table className="leaderboard">
              <thead>
                <tr>
                  <th scope="col">Sıra</th>
                  <th scope="col">Oyuncu</th>
                  <th scope="col">Maç</th>
                  <th scope="col">G</th>
                  <th scope="col">M</th>
                  <th scope="col">Galibiyet</th>
                </tr>
              </thead>
              <tbody>
                {statistics.players.map((player) => (
                  <tr key={player.name.toLocaleLowerCase("tr-TR")}>
                    <td><span className={`rank rank-${player.rank}`}>{player.rank}</span></td>
                    <th scope="row">{player.name}</th>
                    <td>{player.played}</td>
                    <td>{player.wins}</td>
                    <td>{player.losses}</td>
                    <td>
                      <span className="rate"><strong>{player.winRate}%</strong><i style={{ width: `${player.winRate}%` }} /></span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-inline">
            <span aria-hidden="true">Ⅰ</span>
            <p>İlk maç kaydedildiğinde oyuncu sıralaması burada oluşacak.</p>
          </div>
        )}
      </section>

      <section className={`section history-section ${editing ? "is-editing" : ""}`} aria-labelledby="history-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">MAÇ DEFTERİ</p>
            <h2 id="history-title">{editing ? "Kayıtları düzenle" : "Haftalık karşılaşmalar"}</h2>
          </div>
          {editing ? (
            <button className="button button-add" onClick={() => setDraft((current) => [newMatch(), ...current])}>
              <span aria-hidden="true">＋</span> Yeni maç
            </button>
          ) : (
            <p>{statistics.totalMatches ? `${statistics.totalMatches} karşılaşma` : "Henüz karşılaşma yok"}</p>
          )}
        </div>

        {editing ? (
          <div className="editor-list">
            {draft.map((match, matchIndex) => (
              <article className="match-editor" key={match.id}>
                <div className="editor-topline">
                  <span className="match-number">MAÇ {draft.length - matchIndex}</span>
                  <label className="date-field">
                    <span>Tarih</span>
                    <input type="date" value={match.date} onChange={(event) => updateMatch(match.id, { date: event.target.value })} />
                  </label>
                  <fieldset className="winner-field">
                    <legend>Kazanan</legend>
                    <div>
                      {(["red", "blue"] as Team[]).map((team) => (
                        <button
                          type="button"
                          key={team}
                          className={match.winner === team ? `selected ${team}` : ""}
                          aria-pressed={match.winner === team}
                          onClick={() => updateMatch(match.id, { winner: team })}
                        >
                          {team === "red" ? "Kırmızı" : "Mavi"}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <button className="delete-button" onClick={() => removeMatch(match.id)} aria-label={`${formatDate(match.date)} maçını sil`}>
                    Sil
                  </button>
                </div>

                <div className="editor-labels" aria-hidden="true">
                  <span>Kırmızı Takım</span><span /><span>Mavi Takım</span>
                </div>
                <div className="player-grid">
                  {[0, 1, 2, 3].map((playerIndex) => (
                    <div className="player-pair" key={playerIndex}>
                      <label>
                        <span className="sr-only">Kırmızı takım {playerIndex + 1}. oyuncu</span>
                        <b>{playerIndex + 1}</b>
                        <input
                          value={match.redTeam[playerIndex]}
                          maxLength={40}
                          placeholder="Oyuncu adı"
                          onChange={(event) => updatePlayer(match.id, "redTeam", playerIndex, event.target.value)}
                        />
                      </label>
                      <button
                        className="swap-button"
                        type="button"
                        onClick={() => swapPlayers(match.id, playerIndex)}
                        aria-label={`${playerIndex + 1}. sıradaki oyuncuları takımlar arasında değiştir`}
                        title="Takımlar arasında değiştir"
                      >
                        ⇄
                      </button>
                      <label>
                        <span className="sr-only">Mavi takım {playerIndex + 1}. oyuncu</span>
                        <b>{playerIndex + 1}</b>
                        <input
                          value={match.blueTeam[playerIndex]}
                          maxLength={40}
                          placeholder="Oyuncu adı"
                          onChange={(event) => updatePlayer(match.id, "blueTeam", playerIndex, event.target.value)}
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </article>
            ))}
            {!draft.length && (
              <div className="empty-editor">
                <span aria-hidden="true">＋</span>
                <h3>İlk karşılaşmayı ekle.</h3>
                <p>Tarihi, iki takımın oyuncularını ve kazananı girmen yeterli.</p>
                <button className="button button-primary" onClick={() => setDraft([newMatch()])}>Yeni maç ekle</button>
              </div>
            )}
          </div>
        ) : sortedMatches.length ? (
          <div className="match-list">
            {sortedMatches.map((match, index) => (
              <article className="match-row" key={match.id}>
                <div className={`match-team match-team-red ${match.winner === "red" ? "winner" : ""}`}>
                  <div className="team-title">
                    <span>Kırmızı Takım</span>
                    {match.winner === "red" && <small>GALİP</small>}
                  </div>
                  <ul>{match.redTeam.map((player) => <li key={player}>{player}</li>)}</ul>
                </div>
                <div className="match-center">
                  <span>MAÇ {sortedMatches.length - index}</span>
                  <time dateTime={match.date}>{formatDate(match.date)}</time>
                  <b aria-hidden="true">×</b>
                </div>
                <div className={`match-team match-team-blue ${match.winner === "blue" ? "winner" : ""}`}>
                  <div className="team-title">
                    <span>Mavi Takım</span>
                    {match.winner === "blue" && <small>GALİP</small>}
                  </div>
                  <ul>{match.blueTeam.map((player) => <li key={player}>{player}</li>)}</ul>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-history">
            <span className="empty-crest" aria-hidden="true">II</span>
            <p className="eyebrow">DEFTER HENÜZ BOŞ</p>
            <h3>İlk meydan savaşı bekleniyor.</h3>
            <p>Haftalık maç bittiğinde sonucu birkaç saniyede kaydedebilirsin.</p>
            <button className="button button-primary" onClick={() => setPasswordOpen(true)}>İlk maçı ekle</button>
          </div>
        )}
      </section>

      <footer>
        <span>53</span>
        <p>Arkadaşlık için oynanır. Skor için kaydedilir.</p>
        <a href="#top">Yukarı dön ↑</a>
      </footer>

      {passwordOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !unlocking) setPasswordOpen(false);
        }}>
          <section className="password-modal" role="dialog" aria-modal="true" aria-labelledby="password-title">
            <button className="modal-close" aria-label="Kapat" onClick={() => setPasswordOpen(false)} disabled={unlocking}>×</button>
            <div className="modal-mark" aria-hidden="true">✦</div>
            <p className="eyebrow">DÜZENLEME MODU</p>
            <h2 id="password-title">Meydan defterini aç</h2>
            <p>Maç kayıtlarını değiştirmek için ortak parolayı gir.</p>
            <form onSubmit={(event) => void unlock(event)}>
              <label htmlFor="edit-password">Parola</label>
              <input
                id="edit-password"
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                autoFocus
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setPasswordError("");
                }}
                aria-invalid={Boolean(passwordError)}
                aria-describedby={passwordError ? "password-error" : undefined}
              />
              {passwordError && <span className="field-error" id="password-error">{passwordError}</span>}
              <button className="button button-primary" disabled={!password || unlocking}>
                {unlocking ? "Kontrol ediliyor…" : "Düzenlemeyi aç"}
              </button>
            </form>
          </section>
        </div>
      )}

      {notice && (
        <div className={`notice notice-${notice.type}`} role="status">
          <span aria-hidden="true">{notice.type === "success" ? "✓" : "!"}</span>
          {notice.text}
        </div>
      )}
    </main>
  );
}

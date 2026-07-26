import { useMemo, useState } from "react";
import { CIVILIZATION_OPTIONS, type Civilization } from "../../lib/civilizations";
import type { Match, Team } from "../../lib/matches";

type TeamKey = "redTeam" | "blueTeam";
type CivilizationKey = "redCivilizations" | "blueCivilizations";

type Props = {
  matches: Match[];
  draft: Match[];
  roster: string[];
  editing: boolean;
  dirty: boolean;
  saving: boolean;
  onRequestEdit: (addMatch?: boolean) => void;
  onAddMatch: () => void;
  onUpdateMatch: (id: string, update: Partial<Match>) => void;
  onUpdatePlayer: (id: string, team: TeamKey, index: number, value: string) => void;
  onUpdateCivilization: (id: string, team: CivilizationKey, index: number, value: Civilization) => void;
  onSwapPlayers: (id: string, index: number) => void;
  onRemoveMatch: (id: string) => void;
  onCancel: () => void;
  onSave: () => void;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function PlayerPicker({ value, roster, usedNames, onChange }: {
  value: string;
  roster: string[];
  usedNames: Set<string>;
  onChange: (value: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const currentKey = value.toLocaleLowerCase("tr-TR");

  if (adding) {
    return (
      <form className="new-player-field" onSubmit={(event) => {
        event.preventDefault();
        const clean = newName.trim().replace(/\s+/g, " ");
        if (!clean) return;
        onChange(clean);
        setNewName("");
        setAdding(false);
      }}>
        <input value={newName} onChange={(event) => setNewName(event.target.value)} maxLength={40} autoFocus placeholder="Yeni oyuncu" aria-label="Yeni oyuncu adı" />
        <button aria-label="Oyuncuyu ekle">＋</button>
        <button type="button" onClick={() => setAdding(false)} aria-label="Vazgeç">×</button>
      </form>
    );
  }

  return (
    <select
      className="player-select"
      value={value}
      onChange={(event) => {
        if (event.target.value === "__new__") setAdding(true);
        else onChange(event.target.value);
      }}
      aria-label="Oyuncu seç"
    >
      <option value="">Oyuncu seç</option>
      {roster.map((name) => {
        const key = name.toLocaleLowerCase("tr-TR");
        return <option key={key} value={name} disabled={usedNames.has(key) && key !== currentKey}>{name}</option>;
      })}
      <option value="__new__">＋ Yeni oyuncu</option>
    </select>
  );
}

function ParticipantEditor({ match, team, civilizationTeam, index, roster, usedNames, onUpdatePlayer, onUpdateCivilization, onSwapPlayers }: {
  match: Match;
  team: TeamKey;
  civilizationTeam: CivilizationKey;
  index: number;
  roster: string[];
  usedNames: Set<string>;
  onUpdatePlayer: Props["onUpdatePlayer"];
  onUpdateCivilization: Props["onUpdateCivilization"];
  onSwapPlayers: Props["onSwapPlayers"];
}) {
  return (
    <div className="participant-editor">
      <span className="slot-number">{index + 1}</span>
      <div className="participant-fields">
        <PlayerPicker value={match[team][index]} roster={roster} usedNames={usedNames} onChange={(value) => onUpdatePlayer(match.id, team, index, value)} />
        <select
          className="civilization-select"
          value={match[civilizationTeam][index]}
          onChange={(event) => onUpdateCivilization(match.id, civilizationTeam, index, event.target.value as Civilization)}
          aria-label={`${match[team][index] || `${index + 1}. oyuncu`} uygarlığı`}
        >
          {CIVILIZATION_OPTIONS.map((civilization) => <option key={civilization} value={civilization}>{civilization}</option>)}
        </select>
      </div>
      <button className="slot-swap" type="button" onClick={() => onSwapPlayers(match.id, index)} aria-label={`${index + 1}. sıradaki oyuncuları takımlar arasında değiştir`}>⇄</button>
    </div>
  );
}

function MatchEditor({ match, number, roster, onUpdateMatch, onUpdatePlayer, onUpdateCivilization, onSwapPlayers, onRemoveMatch }: {
  match: Match;
  number: number;
  roster: string[];
  onUpdateMatch: Props["onUpdateMatch"];
  onUpdatePlayer: Props["onUpdatePlayer"];
  onUpdateCivilization: Props["onUpdateCivilization"];
  onSwapPlayers: Props["onSwapPlayers"];
  onRemoveMatch: Props["onRemoveMatch"];
}) {
  const usedNames = useMemo(
    () => new Set([...match.redTeam, ...match.blueTeam].filter(Boolean).map((name) => name.toLocaleLowerCase("tr-TR"))),
    [match.redTeam, match.blueTeam],
  );

  return (
    <article className="match-editor">
      <div className="match-editor-tools">
        <span>MAÇ {number}</span>
        <input type="date" value={match.date} onChange={(event) => onUpdateMatch(match.id, { date: event.target.value })} aria-label="Maç tarihi" />
        <fieldset>
          <legend>Kazanan</legend>
          {(["red", "blue"] as Team[]).map((team) => (
            <button type="button" key={team} className={match.winner === team ? `selected ${team}` : ""} onClick={() => onUpdateMatch(match.id, { winner: team })}>
              {team === "red" ? "Kırmızı" : "Mavi"}
            </button>
          ))}
        </fieldset>
        <button className="remove-match" onClick={() => onRemoveMatch(match.id)}>Sil</button>
      </div>

      <div className="editor-teams">
        {([
          ["redTeam", "redCivilizations", "Kırmızı Takım", "red"],
          ["blueTeam", "blueCivilizations", "Mavi Takım", "blue"],
        ] as const).map(([team, civilizationTeam, label, color]) => (
          <section className={`team-editor ${color}`} key={team}>
            <h3>{label}</h3>
            {[0, 1, 2, 3].map((index) => (
              <ParticipantEditor
                key={index}
                match={match}
                team={team}
                civilizationTeam={civilizationTeam}
                index={index}
                roster={roster}
                usedNames={usedNames}
                onUpdatePlayer={onUpdatePlayer}
                onUpdateCivilization={onUpdateCivilization}
                onSwapPlayers={onSwapPlayers}
              />
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}

function PublicMatch({ match, number }: { match: Match; number: number }) {
  return (
    <article className="match-record">
      <div className="match-record-meta"><span>MAÇ {number}</span><time dateTime={match.date}>{formatDate(match.date)}</time></div>
      <div className="record-teams">
        {([
          ["red", "Kırmızı", match.redTeam, match.redCivilizations],
          ["blue", "Mavi", match.blueTeam, match.blueCivilizations],
        ] as const).map(([team, label, players, civilizations]) => (
          <section className={`record-team ${team} ${match.winner === team ? "winner" : ""}`} key={team}>
            <h3><span>{label}</span>{match.winner === team && <b>GALİP</b>}</h3>
            <ul>{players.map((player, index) => <li key={player}><strong>{player}</strong><small>{civilizations[index]}</small></li>)}</ul>
          </section>
        ))}
      </div>
    </article>
  );
}

export function MatchesView(props: Props) {
  const sorted = useMemo(() => [...props.matches].sort((a, b) => b.date.localeCompare(a.date)), [props.matches]);

  return (
    <section className={`app-view matches-view ${props.editing ? "editing" : ""}`} aria-labelledby="matches-title">
      <div className="view-title with-action">
        <div><p>ARŞİV</p><h1 id="matches-title">Maçlar</h1></div>
        <button className="game-button small" onClick={() => props.editing ? props.onAddMatch() : props.onRequestEdit(true)}>＋ Yeni maç</button>
      </div>

      {props.editing ? (
        <div className="match-editor-list">
          {props.draft.map((match, index) => (
            <MatchEditor
              key={match.id}
              match={match}
              number={props.draft.length - index}
              roster={props.roster}
              onUpdateMatch={props.onUpdateMatch}
              onUpdatePlayer={props.onUpdatePlayer}
              onUpdateCivilization={props.onUpdateCivilization}
              onSwapPlayers={props.onSwapPlayers}
              onRemoveMatch={props.onRemoveMatch}
            />
          ))}
          {!props.draft.length && <div className="empty-state"><strong>Maç yok</strong><button className="game-button" onClick={props.onAddMatch}>Maç ekle</button></div>}
        </div>
      ) : sorted.length ? (
        <div className="match-record-list">{sorted.map((match, index) => <PublicMatch key={match.id} match={match} number={sorted.length - index} />)}</div>
      ) : (
        <div className="empty-state"><strong>Henüz maç yok</strong><button className="game-button" onClick={() => props.onRequestEdit(true)}>İlk maçı ekle</button></div>
      )}

      {props.editing && (
        <div className="edit-dock">
          <span className={props.dirty ? "dirty" : ""}>{props.dirty ? "Kaydedilmemiş değişiklik" : "Güncel"}</span>
          <button onClick={props.onCancel} disabled={props.saving}>Vazgeç</button>
          <button className="game-button" onClick={props.onSave} disabled={!props.dirty || props.saving}>{props.saving ? "Kaydediliyor…" : "Kaydet"}</button>
        </div>
      )}
    </section>
  );
}

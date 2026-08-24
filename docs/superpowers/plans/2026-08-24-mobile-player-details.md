# Mobile Player Details Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one mobile-first player details dialog that opens from public Matches and Standings, while translating the requested navigation and standings labels to English and preserving production data byte-for-byte.

**Architecture:** A pure `calculatePlayerDetails(state, playerId)` model function derives recent form, streaks, best civilization, and best duo from the existing state without persistence. Existing matrix and standings renderers expose semantic player buttons; one native `<dialog>` and the SPA controller render the shared detail view. No new state fields, API endpoints, dependencies, routes, or persistence mechanisms are introduced.

**Tech Stack:** HTML5 native dialog, CSS custom properties, vanilla ES modules, Node.js 22 built-in test runner, Chrome CDP visual QA, Vercel production hosting.

## Global Constraints

- Production state must not change: no `PUT /api/state` during implementation or QA.
- Before implementation, save exact production JSON and SHA-256 and push tag `backup/pre-player-details-20260824`.
- Player details are available only in public Matches and public Standings, never in edit controls.
- Details are derived in browser memory only; do not use URL parameters, local storage, session storage, or schema changes.
- Keep the existing AoE2 parchment, ink, bronze, fixed blue, and fixed red design system.
- Mobile acceptance sizes are 320×700 and 390×844; desktop acceptance size is 1440×1000.
- Player controls and dialog close control have at least 44px touch targets.
- The dialog has at least 12px viewport gutters, stays within the safe viewport, and scrolls internally only when its content exceeds that height.
- Requested public copy is exactly `Matches`, `Standings`, `Player`, `P`, `W`, `L`, `%`.
- Civilization eligibility threshold is 3 games; duo eligibility threshold is 5 shared games. Below-threshold fallbacks are labeled `Small sample`.
- `Random` is excluded from best-civilization selection.

---

### Task 1: Protect Production State and Derive Player Details

**Files:**
- Modify: `docs/lib/model.js`
- Modify: `tests/static-model.test.mjs`
- Create ignored backup: `.qa/production-state-before-player-details-2026-08-24.json`
- Create ignored headers: `.qa/production-state-before-player-details-2026-08-24.headers`

**Interfaces:**
- Consumes: validated schema-v1 state and a registered `playerId: string`.
- Produces: `calculatePlayerDetails(state, playerId)` returning `{ player, lastFive, currentWinStreak, longestWinStreak, bestCivilization, bestDuo }`.
- `bestCivilization` is `null` or `{ name, played, wins, winRate, smallSample }`.
- `bestDuo` is `null` or `{ playerId, name, played, wins, winRate, smallSample }`.

- [ ] **Step 1: Save and validate the exact production baseline**

Run:

```bash
mkdir -p .qa
curl -fsS -D .qa/production-state-before-player-details-2026-08-24.headers \
  https://53aoe.vercel.app/api/state \
  -o .qa/production-state-before-player-details-2026-08-24.json
node -e 'const fs=require("node:fs"); const value=JSON.parse(fs.readFileSync(".qa/production-state-before-player-details-2026-08-24.json","utf8")); if(!value.state || !Array.isArray(value.state.players) || !Array.isArray(value.state.matches)) process.exit(1); console.log(JSON.stringify({revision:value.state.revision,updatedAt:value.state.updatedAt,players:value.state.players.length,matches:value.state.matches.length}))'
shasum -a 256 .qa/production-state-before-player-details-2026-08-24.json | tee .qa/production-state-before-player-details-2026-08-24.sha256
git tag backup/pre-player-details-20260824
git push github backup/pre-player-details-20260824
```

Expected: HTTP 200 headers, valid state summary, one SHA-256 line, and a pushed tag pointing to the approved-spec commit.

- [ ] **Step 2: Add failing tests for recent form and streak ordering**

Add `calculatePlayerDetails` to the model imports and add this test helper and test to `tests/static-model.test.mjs`:

```js
function playerDetailState(results) {
  const state = structuredClone(fixtureState);
  const template = structuredClone(state.matches[0]);
  state.matches = results.map(({ date, won, civilization = "Huns", teammate = "italyan-aygiri", extraTeammate = "" }, index) => {
    const match = structuredClone(template);
    match.id = `detail-${index}`;
    match.date = date;
    match.winner = won ? "cortinyanlar" : "bakracogullari";
    match.teams.cortinyanlar = [
      { playerId: "buyukekrem", civilization },
      { playerId: teammate, civilization: "Random" },
      { playerId: extraTeammate, civilization: "Random" },
      { playerId: "", civilization: "Random" },
    ];
    match.teams.bakracogullari = [
      { playerId: "alman-general", civilization: "Random" },
      { playerId: "emre", civilization: "Random" },
      { playerId: "", civilization: "Random" },
      { playerId: "", civilization: "Random" },
    ];
    return match;
  });
  return validateState(state);
}

test("derives newest-first last five and current and record win streaks", () => {
  const state = playerDetailState([
    { date: "2026-08-01", won: true },
    { date: "2026-08-01", won: true },
    { date: "2026-08-08", won: false },
    { date: "2026-08-15", won: true },
    { date: "2026-08-15", won: true },
    { date: "2026-08-22", won: true },
  ]);
  const details = calculatePlayerDetails(state, "buyukekrem");
  assert.deepEqual(details.lastFive, ["W", "W", "W", "L", "W"]);
  assert.equal(details.currentWinStreak, 3);
  assert.equal(details.longestWinStreak, 3);
});

test("returns explicit empty detail values and rejects an unknown player", () => {
  const state = playerDetailState([]);
  const details = calculatePlayerDetails(state, "buyukekrem");
  assert.deepEqual(details.lastFive, []);
  assert.equal(details.currentWinStreak, 0);
  assert.equal(details.longestWinStreak, 0);
  assert.equal(details.bestCivilization, null);
  assert.equal(details.bestDuo, null);
  assert.throws(() => calculatePlayerDetails(state, "unknown"), /Oyuncu bulunamadı/);
});
```

- [ ] **Step 3: Run the focused tests and verify RED**

Run:

```bash
node --test --test-name-pattern='player|streak|recent|detail' tests/static-model.test.mjs
```

Expected: FAIL because `calculatePlayerDetails` is not exported.

- [ ] **Step 4: Add failing civilization and duo threshold tests**

Append to `tests/static-model.test.mjs`:

```js
test("selects best civilization by qualified win rate and excludes Random", () => {
  const state = playerDetailState([
    { date: "2026-07-04", won: true, civilization: "Huns" },
    { date: "2026-07-11", won: true, civilization: "Huns" },
    { date: "2026-07-18", won: false, civilization: "Huns" },
    { date: "2026-07-25", won: true, civilization: "Franks" },
    { date: "2026-08-01", won: true, civilization: "Franks" },
    { date: "2026-08-08", won: true, civilization: "Random" },
  ]);
  assert.deepEqual(calculatePlayerDetails(state, "buyukekrem").bestCivilization, {
    name: "Huns", played: 3, wins: 2, winRate: 67, smallSample: false,
  });
});

test("marks civilization and duo fallbacks as small samples", () => {
  const state = playerDetailState([
    { date: "2026-08-01", won: true, civilization: "Franks", teammate: "italyan-aygiri" },
    { date: "2026-08-08", won: false, civilization: "Franks", teammate: "italyan-aygiri" },
  ]);
  const details = calculatePlayerDetails(state, "buyukekrem");
  assert.equal(details.bestCivilization.smallSample, true);
  assert.deepEqual(details.bestDuo, {
    playerId: "italyan-aygiri", name: "Italyan Aygiri", played: 2, wins: 1, winRate: 50, smallSample: true,
  });
});

test("selects a qualified duo from same-team games only", () => {
  const state = playerDetailState(Array.from({ length: 5 }, (_, index) => ({
    date: `2026-08-${String(index + 1).padStart(2, "0")}`,
    won: index < 4,
    teammate: "italyan-aygiri",
  })));
  assert.deepEqual(calculatePlayerDetails(state, "buyukekrem").bestDuo, {
    playerId: "italyan-aygiri", name: "Italyan Aygiri", played: 5, wins: 4, winRate: 80, smallSample: false,
  });
});

test("uses wins, games, and localized names as deterministic detail tie-breaks", () => {
  const civilizations = ["Huns", "Huns", "Huns", "Franks", "Franks", "Franks"];
  const state = playerDetailState(civilizations.map((civilization, index) => ({
    date: `2026-07-${String(index + 1).padStart(2, "0")}`,
    won: index % 3 !== 2,
    civilization,
    teammate: "italyan-aygiri",
    extraTeammate: "neudzulab",
  })));
  const details = calculatePlayerDetails(state, "buyukekrem");
  assert.equal(details.bestCivilization.name, "Franks");
  assert.equal(details.bestDuo.name, "Italyan Aygiri");
});
```

- [ ] **Step 5: Implement the pure model calculation**

Add private helpers below `assertKnownPlayer` in `docs/lib/model.js`:

```js
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
```

Export this function below `favoriteCivilizationForPlayer`:

```js
export function calculatePlayerDetails(state, playerId) {
  const normalized = validateState(state);
  assertKnownPlayer(normalized, playerId);
  const player = normalized.players.find((candidate) => candidate.id === playerId);
  const roster = new Map(normalized.players.map((candidate) => [candidate.id, candidate]));
  const records = newestFirstMatchRecords(normalized.matches)
    .map(({ match }) => ({ match, result: playerMatchResult(match, playerId) }))
    .filter(({ result }) => result);
  const outcomes = records.map(({ result }) => result.won ? "W" : "L");

  let currentWinStreak = 0;
  while (outcomes[currentWinStreak] === "W") currentWinStreak += 1;
  let longestWinStreak = 0;
  let running = 0;
  for (const outcome of [...outcomes].reverse()) {
    running = outcome === "W" ? running + 1 : 0;
    longestWinStreak = Math.max(longestWinStreak, running);
  }

  const civilizations = new Map();
  const duos = new Map();
  for (const { match, result } of records) {
    if (result.slot.civilization !== "Random") {
      const civilization = civilizations.get(result.slot.civilization) ?? {
        name: result.slot.civilization, played: 0, wins: 0, winRate: 0,
      };
      civilization.played += 1;
      civilization.wins += Number(result.won);
      civilization.winRate = roundedRate(civilization.wins, civilization.played);
      civilizations.set(civilization.name, civilization);
    }
    for (const teammate of match.teams[result.teamId]) {
      if (!teammate.playerId || teammate.playerId === playerId) continue;
      const teammatePlayer = roster.get(teammate.playerId);
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
```

- [ ] **Step 6: Run model tests and verify GREEN**

Run:

```bash
node --test tests/static-model.test.mjs
```

Expected: all model tests PASS, including exact recent-form, threshold, fallback, and empty-state assertions.

- [ ] **Step 7: Commit the model unit**

Run:

```bash
git add docs/lib/model.js tests/static-model.test.mjs
git commit -m "feat: derive player detail statistics"
```

Expected: one focused feature commit; ignored `.qa` backup files remain outside Git.

---

### Task 2: Translate Public Labels and Expose Player Detail Triggers

**Files:**
- Modify: `docs/lib/views.js`
- Modify: `docs/lib/matrix.js`
- Modify: `tests/static-views.test.mjs`
- Modify: `tests/matrix-views.test.mjs`

**Interfaces:**
- Consumes: existing statistics records and `calculatePlayerDetails` return shape.
- Produces: `renderPlayerDetails(details): string` and public buttons carrying `data-player-details="<playerId>"`.
- Keeps: existing `data-sort-standings` keys and sorting behavior unchanged.

- [ ] **Step 1: Write failing English-copy and dialog-view tests**

Update imports in `tests/static-views.test.mjs` to include `calculatePlayerDetails` and `renderPlayerDetails`, then replace the Turkish top-control/header expectations and append:

```js
test("renders English public navigation and standings headers", () => {
  const controls = renderTopControl({ view: "matches", editing: false });
  const table = renderStatsTable(stats);
  assert.match(controls, />Matches</);
  assert.match(controls, />Standings</);
  assert.match(table, /<th scope="col">Player<\/th>/);
  for (const label of ["P", "W", "L", "%"]) assert.match(table, new RegExp(`stats-sort__label">${label}<`));
  for (const name of ["Played", "Wins", "Losses", "Win rate"]) assert.match(table, new RegExp(name));
});

test("renders compact escaped player details with form, streak, civilization, and duo", () => {
  const details = calculatePlayerDetails(state, "buyukekrem");
  const html = renderPlayerDetails(details);
  assert.match(html, /id="player-details-title"/);
  assert.match(html, /Last 5/);
  assert.match(html, /Win Streak/);
  assert.match(html, /Best Civilization/);
  assert.match(html, /Best Duo/);
  assert.match(html, /data-close-player-details/);
  assert.match(html, /assets\/civs\//);
});

test("renders explicit no-data player details", () => {
  const emptyState = structuredClone(state);
  emptyState.matches = [];
  const html = renderPlayerDetails(calculatePlayerDetails(emptyState, "buyukekrem"));
  assert.match(html, /player-form__empty">—/);
  assert.equal((html.match(/>No data</g) ?? []).length, 2);
});
```

- [ ] **Step 2: Write failing trigger-markup tests**

Append to `tests/matrix-views.test.mjs`:

```js
test("makes only filled public match players detail buttons", () => {
  const state = structuredClone(fixture);
  state.matches = [state.matches[0]];
  state.matches[0].teams.cortinyanlar[0] = { playerId: "", civilization: "Random" };
  const publicHtml = renderMatchMatrix(state);
  const editHtml = renderEditableMatrix(state);
  assert.equal((publicHtml.match(/data-player-details=/g) ?? []).length, 7);
  assert.match(publicHtml, /<button[^>]*class="matrix-player"[^>]*data-player-details=/);
  assert.doesNotMatch(editHtml, /data-player-details=/);
});
```

In the standings view test assert:

```js
assert.equal((html.match(/data-player-details=/g) ?? []).length, stats.players.length);
assert.match(html, /class="stats-player"[^>]*data-player-details="buyukekrem"/);
```

- [ ] **Step 3: Run focused tests and verify RED**

Run:

```bash
node --test tests/static-views.test.mjs tests/matrix-views.test.mjs
```

Expected: FAIL on English labels, missing `renderPlayerDetails`, and missing detail triggers.

- [ ] **Step 4: Implement English labels and shared player-details renderer**

In `docs/lib/views.js`:

```js
export function renderTopControl({ view = "matches", editing = false, dirty = false, saving = false } = {}) {
  const viewButton = (value, label) => `<button type="button" role="tab" aria-selected="${view === value}" class="view-switch__option${view === value ? " is-active" : ""}" data-set-view="${value}"${editing ? " disabled" : ""}>${label}</button>`;
  const actions = editing
    ? `<button class="icon-button icon-button--save${dirty ? " is-ready" : ""}" type="button" data-save aria-label="Kaydet"${!dirty || saving ? " disabled" : ""}><img src="./assets/icons/check.svg" alt="" width="20" height="20"></button><button class="icon-button" type="button" data-exit-edit aria-label="Düzenlemeyi kapat"${saving ? " disabled" : ""}><img src="./assets/icons/x.svg" alt="" width="20" height="20"></button>`
    : `<button class="icon-button" type="button" data-enter-edit aria-label="Düzenle"><img src="./assets/icons/pencil.svg" alt="" width="20" height="20"></button>`;
  return `<div class="view-switch" role="tablist" aria-label="View">${viewButton("matches", "Matches")}${viewButton("standings", "Standings")}</div><div class="top-actions">${actions}</div>`;
}

const STANDINGS_SORT_COLUMNS = [
  { key: "played", label: "P", name: "Played" },
  { key: "wins", label: "W", name: "Wins" },
  { key: "losses", label: "L", name: "Losses" },
  { key: "winRate", label: "%", name: "Win rate" },
];
```

In `renderStandingsSortHeader`, translate the complete accessible action label while preserving sort behavior:

```js
const nextDirection = active && sort.direction === "desc" ? "sort ascending" : "sort descending";
const label = `${column.name}: ${nextDirection}`;
```

Render the standings identity as:

```js
<button class="stats-player" type="button" data-player-details="${escapeHtml(player.id)}" aria-label="View ${escapeHtml(player.name)} statistics"><img src="./assets/civs/${civilizationAssetName(player.favoriteCivilization)}" alt="" width="28" height="28"><span>${escapeHtml(player.name)}</span></button>
```

Change the column heading to `<th scope="col">Player</th>` and implement:

```js
function resultSeals(lastFive) {
  if (!lastFive.length) return `<span class="player-form__empty">—</span>`;
  return lastFive.map((result) => `<span class="player-form__result player-form__result--${result.toLowerCase()}">${result}</span>`).join("");
}

function sampleLabel(record) {
  return record?.smallSample ? `<small class="sample-note">Small sample</small>` : "";
}

export function renderPlayerDetails(details) {
  const civilization = details.bestCivilization;
  const crest = civilization?.name ?? "Random";
  const civilizationContent = civilization
    ? `<div class="player-detail-record"><img src="./assets/civs/${civilizationAssetName(civilization.name)}" alt="" width="42" height="42"><span><strong>${escapeHtml(civilization.name)}</strong><small>${civilization.wins}/${civilization.played} · ${civilization.winRate}%</small></span>${sampleLabel(civilization)}</div>`
    : `<span class="player-detail-empty">No data</span>`;
  const duo = details.bestDuo;
  const duoContent = duo
    ? `<div class="player-detail-record player-detail-record--duo"><span><strong>${escapeHtml(duo.name)}</strong><small>${duo.wins}/${duo.played} · ${duo.winRate}%</small></span>${sampleLabel(duo)}</div>`
    : `<span class="player-detail-empty">No data</span>`;
  return `<article class="player-details">
    <header class="player-details__header"><img src="./assets/civs/${civilizationAssetName(crest)}" alt="" width="48" height="48"><h2 id="player-details-title">${escapeHtml(details.player.name)}</h2><button class="icon-button" type="button" data-close-player-details aria-label="Close"><img src="./assets/icons/x.svg" alt="" width="20" height="20"></button></header>
    <section class="player-details__section"><h3>Last 5</h3><div class="player-form">${resultSeals(details.lastFive)}</div></section>
    <section class="player-details__section"><h3>Win Streak</h3><dl class="streak-record"><div><dt>Current</dt><dd>${details.currentWinStreak}</dd></div><div><dt>Best</dt><dd>${details.longestWinStreak}</dd></div></dl></section>
    <section class="player-details__section"><h3>Best Civilization</h3>${civilizationContent}</section>
    <section class="player-details__section"><h3>Best Duo</h3>${duoContent}</section>
  </article>`;
}
```

- [ ] **Step 5: Render semantic match-player buttons without touching edit cells**

Replace the non-empty return of `publicPlayerCell` in `docs/lib/matrix.js` with:

```js
return `<button class="matrix-player" type="button" data-team="${escapeHtml(teamId)}" data-slot="${index}" data-player-details="${escapeHtml(slot.playerId)}" aria-label="View ${escapeHtml(player?.name ?? "Unknown")} statistics">
  <img src="./assets/civs/${civilizationAssetName(slot.civilization)}" alt="" width="42" height="42">
  <span><strong>${escapeHtml(player?.name ?? "Unknown")}</strong><small>${escapeHtml(slot.civilization)}</small></span>
</button>`;
```

- [ ] **Step 6: Run focused tests and verify GREEN**

Run:

```bash
node --test tests/static-views.test.mjs tests/matrix-views.test.mjs
```

Expected: all view and matrix tests PASS; edit markup contains zero `data-player-details` attributes.

- [ ] **Step 7: Commit the public markup unit**

Run:

```bash
git add docs/lib/views.js docs/lib/matrix.js tests/static-views.test.mjs tests/matrix-views.test.mjs
git commit -m "feat: expose player detail views"
```

---

### Task 3: Wire the Native Dialog and Mobile Styling

**Files:**
- Modify: `docs/index.html`
- Modify: `docs/app.js`
- Modify: `docs/styles.css`
- Modify: `tests/static-shell.test.mjs`
- Modify: `tests/spa-controller.test.mjs`
- Modify: `tests/static-css.test.mjs`

**Interfaces:**
- Consumes: `data-player-details`, `calculatePlayerDetails`, and `renderPlayerDetails`.
- Produces: native `#player-details-dialog` with shared content and deterministic close/focus behavior.
- Preserves: route, standings sort object, match-matrix scroll position, edit behavior, and state snapshot.

- [ ] **Step 1: Add failing shell and controller contract tests**

Add to `tests/static-shell.test.mjs`:

```js
assert.match(html, /id="player-details-dialog"/);
assert.match(html, /id="player-details-content"/);
assert.match(html, /aria-labelledby="player-details-title"/);
```

Add these controller contracts in `tests/spa-controller.test.mjs`:

```js
for (const contract of [
  "data-player-details",
  "calculatePlayerDetails",
  "renderPlayerDetails",
  "playerDetailsDialog",
  "data-close-player-details",
  "event.target === playerDetailsDialog",
  "detailsOpener?.isConnected",
]) assert.ok(source.includes(contract), `missing player details contract: ${contract}`);
assert.doesNotMatch(source, /setItem\(|params\.set\(["']player/);
```

- [ ] **Step 2: Add failing mobile CSS contract tests**

Append to `tests/static-css.test.mjs`:

```js
test("keeps player detail triggers and dialog mobile safe", () => {
  assert.match(css, /button\.matrix-player[\s\S]*min-height:\s*var\(--player-row\)/);
  assert.match(css, /\.stats-player[\s\S]*min-height:\s*var\(--touch\)/);
  assert.match(css, /\.player-details-dialog\s*{[\s\S]*width:\s*min\(calc\(100% - 24px\),\s*420px\)/);
  assert.match(css, /\.player-details-dialog\s*{[\s\S]*max-height:\s*calc\(100dvh - 24px - env\(safe-area-inset-top\) - env\(safe-area-inset-bottom\)\)/);
  assert.match(css, /\.player-details\s*{[\s\S]*overflow-y:\s*auto/);
  assert.match(css, /\.player-form__result[\s\S]*min-width:\s*28px/);
});
```

- [ ] **Step 3: Run focused tests and verify RED**

Run:

```bash
node --test tests/static-shell.test.mjs tests/spa-controller.test.mjs tests/static-css.test.mjs
```

Expected: FAIL because the dialog shell, controller wiring, and responsive CSS do not exist.

- [ ] **Step 4: Add the reusable dialog shell**

Insert before `#notice-region` in `docs/index.html`:

```html
<dialog id="player-details-dialog" class="player-details-dialog" aria-labelledby="player-details-title">
  <div id="player-details-content"></div>
</dialog>
```

- [ ] **Step 5: Wire open, close, backdrop, Escape, and focus restoration**

Update imports in `docs/app.js`:

```js
import { calculatePlayerDetails, calculateStatistics, latestCivilizationForPlayer } from "./lib/model.js";
import { escapeHtml, renderPlayerDetails, renderScoreStrip, renderStatsTable, renderTopControl } from "./lib/views.js";
```

Query and store the dialog beside the existing dialogs:

```js
const playerDetailsDialog = documentRoot.querySelector("#player-details-dialog");
const playerDetailsContent = documentRoot.querySelector("#player-details-content");
let detailsOpener = null;
```

Add controller helpers inside `startApp`:

```js
function showPlayerDetails(playerId, opener) {
  if (route.editing) return;
  const details = calculatePlayerDetails(controller.getState(), playerId);
  playerDetailsContent.innerHTML = renderPlayerDetails(details);
  detailsOpener = opener;
  openDialog(playerDetailsDialog);
}

function hidePlayerDetails() {
  closeDialog(playerDetailsDialog);
}
```

Add these branches before view switching in the delegated click handler:

```js
if (target.matches("[data-player-details]") && !route.editing) {
  showPlayerDetails(target.dataset.playerDetails, target);
} else if (target.matches("[data-close-player-details]")) {
  hidePlayerDetails();
} else if (target.matches("[data-sort-standings]") && route.view === "standings" && !route.editing) {
```

Add native dialog listeners after the existing dialog listeners:

```js
playerDetailsDialog.addEventListener("click", (event) => {
  if (event.target === playerDetailsDialog) hidePlayerDetails();
});

playerDetailsDialog.addEventListener("close", () => {
  playerDetailsContent.innerHTML = "";
  if (detailsOpener?.isConnected) detailsOpener.focus();
  detailsOpener = null;
});
```

Native `cancel` remains unprevented so `Escape` closes the dialog and produces the same `close` focus restoration.

- [ ] **Step 6: Add flat AoE2 mobile styles**

Add to `docs/styles.css` near the existing dialog rules:

```css
button.matrix-player {
  width: 100%;
  min-height: var(--player-row);
  border: 0;
  border-bottom: 1px solid rgb(59 40 20 / 54%);
  border-radius: 0;
  color: inherit;
  font: inherit;
  text-align: left;
}

button.matrix-player:hover,
button.matrix-player:active,
.stats-player:hover,
.stats-player:active {
  background-color: rgb(120 83 39 / 12%);
}

.stats-player {
  width: 100%;
  min-height: var(--touch);
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
}

.player-details-dialog {
  width: min(calc(100% - 24px), 420px);
  max-height: calc(100dvh - 24px - env(safe-area-inset-top) - env(safe-area-inset-bottom));
  overflow: hidden;
}

.player-details {
  max-height: inherit;
  overflow-y: auto;
  overscroll-behavior: contain;
}

#player-details-content {
  max-height: inherit;
}

.player-details__header {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) var(--touch);
  min-height: 60px;
  align-items: center;
  gap: 8px;
  padding-left: 12px;
  background: var(--furniture-deep);
  color: #fff3d6;
}

.player-details__header > img {
  width: 42px;
  height: 42px;
  object-fit: contain;
}

.player-details__header h2 {
  overflow: hidden;
  margin: 0;
  font-size: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-details__section {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  min-height: 58px;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid rgb(59 40 20 / 48%);
}

.player-details__section:last-child {
  border-bottom: 0;
}

.player-details__section h3 {
  margin: 0;
  color: var(--ink-muted);
  font-size: 10px;
  letter-spacing: 0.04em;
  line-height: 1.25;
  text-transform: uppercase;
}

.player-form {
  display: flex;
  gap: 5px;
}

.player-form__result {
  display: inline-grid;
  min-width: 28px;
  height: 28px;
  place-items: center;
  border: 1px solid var(--rule);
  background: var(--furniture);
  color: #fff3d6;
  font-size: 11px;
  font-weight: 700;
}

.player-form__result--l {
  background: var(--red);
}

.streak-record {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 0;
}

.streak-record div {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 6px;
  padding-right: 10px;
}

.streak-record dt,
.player-detail-record small,
.sample-note {
  color: var(--ink-muted);
  font-size: 10px;
}

.streak-record dd {
  margin: 0;
  font-weight: 700;
}

.player-detail-record {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
}

.player-detail-record--duo {
  grid-template-columns: minmax(0, 1fr) auto;
}

.player-detail-record > img {
  width: 42px;
  height: 42px;
  object-fit: contain;
}

.player-detail-record > span {
  display: grid;
  min-width: 0;
}

.player-detail-record strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sample-note {
  max-width: 48px;
  text-align: right;
}

.player-detail-empty,
.player-form__empty {
  color: var(--ink-muted);
}

@media (max-width: 359px) {
  .player-details__section {
    grid-template-columns: 78px minmax(0, 1fr);
    padding-inline: 10px;
  }

  .player-form__result {
    min-width: 26px;
  }
}
```

- [ ] **Step 7: Run focused tests and verify GREEN**

Run:

```bash
node --test tests/static-shell.test.mjs tests/spa-controller.test.mjs tests/static-css.test.mjs
```

Expected: all shell, controller-contract, and CSS tests PASS.

- [ ] **Step 8: Run syntax and complete regression checks**

Run:

```bash
node --check docs/app.js
node --check docs/lib/model.js
node --check docs/lib/views.js
node --check docs/lib/matrix.js
npm test
git diff --check
```

Expected: syntax checks exit 0, full suite PASS, and diff check prints nothing.

- [ ] **Step 9: Commit the dialog interaction unit**

Run:

```bash
git add docs/index.html docs/app.js docs/styles.css tests/static-shell.test.mjs tests/spa-controller.test.mjs tests/static-css.test.mjs
git commit -m "feat: add mobile player details dialog"
```

---

### Task 4: Document, Visually Verify, Push, Deploy, and Prove No Data Loss

**Files:**
- Modify: `DESIGN.md`
- Modify: `scripts/visual-qa.mjs`

**Interfaces:**
- Consumes: completed dialog feature and production read endpoint.
- Produces: design-system documentation, automated mobile screenshots/metrics, GitHub commits, Vercel deployment, and exact data-integrity proof.

- [ ] **Step 1: Document the interaction and design-system contract**

Add a `Player details` subsection to `DESIGN.md` containing these exact rules:

```md
### Player details

- Public match and standings player identities are 44px-or-taller semantic buttons.
- Both surfaces open the same native dialog; edit controls never open it.
- The dialog uses the existing parchment, ink, bronze, blue, and red tokens and has 12px minimum mobile viewport gutters.
- Sections remain compact: Last 5, current/record win streak, best civilization, and best duo.
- Civilization rates require 3 games and duo rates require 5 shared games; smaller fallbacks say `Small sample`.
- Derived details never persist to state, storage, URL, or API.
- Requested public data copy is English: Matches, Standings, Player, P, W, L, and %.
```

- [ ] **Step 2: Extend visual QA metrics and checks**

Add these fields to `metrics()` in `scripts/visual-qa.mjs`:

```js
const playerDetailsDialog = document.querySelector('#player-details-dialog');
const detailsRect = playerDetailsDialog?.open ? playerDetailsDialog.getBoundingClientRect() : null;
```

```js
playerDetailsOpen: Boolean(playerDetailsDialog?.open),
playerDetailsWidth: detailsRect?.width ?? null,
playerDetailsHeight: detailsRect?.height ?? null,
playerDetailsTop: detailsRect?.top ?? null,
playerDetailsBottom: detailsRect?.bottom ?? null,
playerDetailsSections: [...document.querySelectorAll('.player-details__section h3')].map((element) => element.textContent.trim()),
playerDetailTriggers: document.querySelectorAll('[data-player-details]').length,
focusedPlayerId: document.activeElement?.dataset?.playerDetails ?? null,
```

Add checks:

```js
{ route: "/", width: 320, height: 700, name: "player-details-match-320", action: `document.querySelector('[data-player-details]').click()` },
{ route: "/", width: 390, height: 844, name: "player-details-match-scrolled-390", action: `document.querySelector('.match-matrix').scrollLeft = 260; document.querySelector('[data-player-details]').click()` },
{ route: "/?view=standings", width: 390, height: 844, name: "player-details-standings-390", action: `document.querySelector('[data-player-details]').click()` },
{ route: "/?view=standings", width: 1440, height: 1000, name: "player-details-standings-1440", action: `document.querySelector('[data-player-details]').click()` },
{ route: "/", width: 390, height: 844, name: "player-details-close-focus-390", action: `(() => { const matrix = document.querySelector('.match-matrix'); const trigger = document.querySelector('[data-player-details]'); matrix.scrollLeft = 260; trigger.focus(); trigger.click(); document.querySelector('[data-close-player-details]').click(); })()` },
{ route: "/?view=standings", width: 390, height: 844, name: "player-details-backdrop-390", action: `(() => { document.querySelector('[data-player-details]').click(); document.querySelector('#player-details-dialog').dispatchEvent(new MouseEvent('click', { bubbles: true })); })()` },
```

- [ ] **Step 3: Run local visual QA and inspect all new screenshots**

Start the static app and Chrome CDP in separate terminal sessions, then run:

```bash
PORT=4173 npm run dev
```

```bash
chromium --headless=new --remote-debugging-port=9223 --user-data-dir="$(mktemp -d)" about:blank
```

```bash
for check in player-details-match-320 player-details-match-scrolled-390 player-details-standings-390 player-details-standings-1440 player-details-close-focus-390 player-details-backdrop-390; do
  QA_CHECK="$check" APP_URL=http://127.0.0.1:4173/ npm run qa:visual
done
```

Expected for the four open-dialog results: `playerDetailsOpen: true`, correct four section labels, no failed images, no runtime errors, no document horizontal overflow, dialog left/right gutters ≥12px, top ≥ safe-area boundary, and bottom ≤ viewport. For `player-details-close-focus-390`, expect the original player id in `focusedPlayerId`, the matrix scroll position unchanged, and no open dialog. For `player-details-backdrop-390`, expect no open dialog. Inspect each open-dialog PNG for clipped copy, excessive height, broken parchment continuity, or inconsistent focus treatment.

- [ ] **Step 4: Commit documentation and QA coverage**

Run:

```bash
git add DESIGN.md scripts/visual-qa.mjs
git commit -m "test: cover mobile player details"
```

- [ ] **Step 5: Run the complete pre-deploy gate**

Run:

```bash
npm test
node --check docs/app.js
node --check docs/lib/model.js
node --check docs/lib/views.js
node --check docs/lib/matrix.js
node --check scripts/visual-qa.mjs
git diff --check
git status --short
```

Expected: complete suite PASS, every syntax check exits 0, no whitespace errors, and clean worktree.

- [ ] **Step 6: Push GitHub and deploy the exact commit to Vercel**

Run:

```bash
git push github main
local_sha=$(git rev-parse HEAD)
remote_sha=$(git ls-remote github refs/heads/main | cut -f1)
test "$local_sha" = "$remote_sha"
deployment_url=$(vercel --prod --yes)
vercel alias set "$deployment_url" 53aoe.vercel.app
```

Expected: local and GitHub main SHAs match; Vercel reports a production deployment and `https://53aoe.vercel.app` alias.

- [ ] **Step 7: Run production visual QA**

Run the same four checks with:

```bash
QA_CHECK=player-details-match-320 APP_URL=https://53aoe.vercel.app/ npm run qa:visual
QA_CHECK=player-details-match-scrolled-390 APP_URL=https://53aoe.vercel.app/ npm run qa:visual
QA_CHECK=player-details-standings-390 APP_URL=https://53aoe.vercel.app/ npm run qa:visual
QA_CHECK=player-details-standings-1440 APP_URL=https://53aoe.vercel.app/ npm run qa:visual
QA_CHECK=player-details-close-focus-390 APP_URL=https://53aoe.vercel.app/ npm run qa:visual
QA_CHECK=player-details-backdrop-390 APP_URL=https://53aoe.vercel.app/ npm run qa:visual
```

Expected: the same clean metrics as local QA, plus HTTP 200 and zero runtime errors.

- [ ] **Step 8: Prove production data is byte-for-byte unchanged**

Run:

```bash
curl -fsS https://53aoe.vercel.app/api/state -o .qa/production-state-after-player-details-2026-08-24.json
cmp .qa/production-state-before-player-details-2026-08-24.json .qa/production-state-after-player-details-2026-08-24.json
shasum -a 256 .qa/production-state-before-player-details-2026-08-24.json .qa/production-state-after-player-details-2026-08-24.json
curl -fsSI https://53aoe.vercel.app/ | rg -i '^(HTTP|x-robots-tag)'
```

Expected: `cmp` exits 0; both hashes are identical; site returns HTTP 200 and retains `x-robots-tag: noindex, nofollow, noarchive, nosnippet, noimageindex`.

- [ ] **Step 9: Final completion audit**

Check each approved requirement directly:

```text
[ ] Player detail opens from public Matches.
[ ] Player detail opens from public Standings.
[ ] Edit controls do not open the dialog.
[ ] Last 5 renders newest-first W/L.
[ ] Current and record win streaks are correct.
[ ] Best civilization uses win rate, excludes Random, and applies the 3-game rule.
[ ] Best duo applies the 5-game rule.
[ ] Matches, Standings, Player, P/W/L/% are English.
[ ] 320px and 390px layouts have ≥12px gutters and no page overflow.
[ ] Sorting and match scroll positions survive modal open/close.
[ ] Full tests pass and production has no runtime/image errors.
[ ] Production state bytes and SHA-256 are unchanged.
[ ] GitHub main and deployed commit match.
```

Do not declare completion until all boxes are evidenced.

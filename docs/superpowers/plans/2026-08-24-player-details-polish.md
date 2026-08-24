# Player Details Statistics and Visual Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing mobile player-details dialog clearer and more useful with distinct Most Wins/Best Rate civilization and duo results, a Standings-consistent crest, stronger streak presentation, and calmer parchment styling.

**Architecture:** Keep all statistics derived from validated in-memory state in `docs/lib/model.js`, return an explicit view model to `docs/lib/views.js`, and limit visual changes to the existing player-details dialog selectors in `docs/styles.css`. Do not change the API, state schema, editor, saved data, or public trigger behavior.

**Tech Stack:** HTML5 dialog, mobile-first CSS, browser ES modules, Node.js built-in test runner, Vercel CLI.

## Global Constraints

- Production state must not change: never issue `PUT /api/state`, run `npm run data:seed`, or call a seed/migration script.
- Save an exact production JSON backup and SHA-256 before implementation; compare the exact response bytes after deployment.
- Civilization and duo eligibility requires at least 3 played/shared matches; there is no small-sample fallback.
- `Random` is excluded from Best Civ candidates, but the modal header crest must exactly match the existing Standings favorite-civilization result, including `Random`.
- `Most Wins` and `Best Rate` must be different records; show only one result when only one eligible record exists.
- Preserve Matches/Standings triggers, dialog close behavior, focus restoration, horizontal scroll, standings sorting, edit behavior, and all 44px touch targets.
- Keep the AoE2 parchment/ink/bronze design system, with no gradients, nested cards, new navigation, state migration, or dependency.
- The dialog must fit without document-level horizontal overflow at 320×700, 390×844, and desktop widths.

---

## File Map

- Modify `docs/lib/model.js`: replace the single rate-ranked detail helper with strict, distinct Most Wins/Best Rate selection and expose the existing favorite-civilization result in player details.
- Modify `tests/static-model.test.mjs`: lock down strict three-match eligibility, exact tie-breaks, distinct results, empty/single-result behavior, and the shared Standings/modal crest.
- Modify `docs/lib/views.js`: render the new view-model shape, two-line section labels, two streak measures, and up to two civilization/duo rows.
- Modify `tests/static-views.test.mjs`: verify copy, repeated-record prevention, header crest source, and no-data output.
- Modify `docs/styles.css`: add the quieter modal-only parchment overlay, narrow label rail, larger streak values, stronger record stats, and safe taller mobile layout.
- Modify `tests/static-css.test.mjs`: enforce the responsive geometry and visual tokens without screenshot-only assertions.
- Create ignored QA artifacts under `.qa/player-details-polish-2026-08-24/`: exact before/after production JSON, headers, SHA files, and screenshots. These must never be committed.

---

### Task 1: Protect Production Data and Establish the Baseline

**Files:**
- Create locally, ignored by Git: `.qa/player-details-polish-2026-08-24/before.json`
- Create locally, ignored by Git: `.qa/player-details-polish-2026-08-24/before.headers`
- Create locally, ignored by Git: `.qa/player-details-polish-2026-08-24/before.sha256`

**Interfaces:**
- Consumes: public `GET https://53aoe.vercel.app/api/state`, current `main` commit.
- Produces: immutable byte-level baseline and tag `backup/pre-player-details-polish-20260824`.

- [ ] **Step 1: Confirm a clean source baseline and run all tests**

Run:

```bash
git status --short
npm test
```

Expected: `git status --short` prints nothing and all current tests pass with zero failures.

- [ ] **Step 2: Save and inspect the exact production response**

Run:

```bash
mkdir -p .qa/player-details-polish-2026-08-24
curl --fail --silent --show-error \
  -D .qa/player-details-polish-2026-08-24/before.headers \
  https://53aoe.vercel.app/api/state \
  -o .qa/player-details-polish-2026-08-24/before.json
shasum -a 256 .qa/player-details-polish-2026-08-24/before.json \
  | tee .qa/player-details-polish-2026-08-24/before.sha256
node -e 'const fs=require("node:fs");const value=JSON.parse(fs.readFileSync(".qa/player-details-polish-2026-08-24/before.json","utf8"));if(!value.state||!Array.isArray(value.state.players)||!Array.isArray(value.state.matches))process.exit(1);console.log(JSON.stringify({revision:value.state.revision,updatedAt:value.state.updatedAt,players:value.state.players.length,matches:value.state.matches.length}))'
```

Expected: valid JSON with `state.players` and `state.matches`; record the printed revision, updatedAt, counts, and SHA in the task log. Do not transform or pretty-print `before.json`.

- [ ] **Step 3: Create and push the rollback tag**

Run:

```bash
git tag backup/pre-player-details-polish-20260824
git push github backup/pre-player-details-polish-20260824
```

Expected: GitHub accepts the tag and it points to the clean pre-implementation `main` commit.

---

### Task 2: Derive Distinct Qualified Civilization and Duo Records

**Files:**
- Modify: `tests/static-model.test.mjs:150-220`
- Modify: `docs/lib/model.js:180-285`

**Interfaces:**
- Consumes: `calculatePlayerDetails(state, playerId)`, existing `favoriteFromHistory(history)` behavior, validated state.
- Produces:

```js
{
  player: { id, name, active },
  favoriteCivilization: string,
  lastFive: Array<"W" | "L">,
  currentWinStreak: number,
  longestWinStreak: number,
  bestCivilizations: {
    mostWins: { name, played, wins, winRate } | null,
    bestRate: { name, played, wins, winRate } | null,
  },
  bestDuos: {
    mostWins: { playerId, name, played, wins, winRate } | null,
    bestRate: { playerId, name, played, wins, winRate } | null,
  },
}
```

- [ ] **Step 1: Replace the old model assertions with failing strict/distinct assertions**

In `tests/static-model.test.mjs`, keep the streak test and replace the single `bestCivilization`/`bestDuo` expectations with tests covering this exact contract:

```js
test("returns the same favorite civilization used by standings", () => {
  const details = calculatePlayerDetails(fixtureState, "buyukekrem");
  const standing = calculateStatistics(fixtureState).players
    .find((player) => player.id === "buyukekrem");
  assert.equal(details.favoriteCivilization, standing.favoriteCivilization);
});

test("selects distinct qualified civilizations by wins and exact rate", () => {
  const results = [
    ...Array.from({ length: 6 }, (_, index) => ({
      date: `2026-06-${String(index + 1).padStart(2, "0")}`,
      civilization: "Huns",
      won: index < 4,
    })),
    ...Array.from({ length: 3 }, (_, index) => ({
      date: `2026-07-${String(index + 1).padStart(2, "0")}`,
      civilization: "Franks",
      won: index < 3,
    })),
    { date: "2026-08-01", civilization: "Khmer", won: true },
    { date: "2026-08-02", civilization: "Khmer", won: true },
    { date: "2026-08-03", civilization: "Random", won: true },
  ];
  const details = calculatePlayerDetails(playerDetailState(results), "buyukekrem");
  assert.deepEqual(details.bestCivilizations, {
    mostWins: { name: "Huns", played: 6, wins: 4, winRate: 67 },
    bestRate: { name: "Franks", played: 3, wins: 3, winRate: 100 },
  });
});

test("requires three civilization games and never repeats one candidate", () => {
  const belowThreshold = playerDetailState([
    { date: "2026-08-01", civilization: "Franks", won: true },
    { date: "2026-08-02", civilization: "Franks", won: true },
  ]);
  assert.deepEqual(calculatePlayerDetails(belowThreshold, "buyukekrem").bestCivilizations, {
    mostWins: null,
    bestRate: null,
  });

  const oneCandidate = playerDetailState([
    { date: "2026-08-01", civilization: "Huns", won: true },
    { date: "2026-08-02", civilization: "Huns", won: true },
    { date: "2026-08-03", civilization: "Huns", won: false },
  ]);
  assert.equal(calculatePlayerDetails(oneCandidate, "buyukekrem").bestCivilizations.bestRate, null);
});

test("selects distinct qualified duos by shared wins and exact rate", () => {
  const results = [
    ...Array.from({ length: 6 }, (_, index) => ({
      date: `2026-06-${String(index + 1).padStart(2, "0")}`,
      won: index < 4,
      teammate: "italyan-aygiri",
    })),
    ...Array.from({ length: 3 }, (_, index) => ({
      date: `2026-07-${String(index + 1).padStart(2, "0")}`,
      won: index < 3,
      teammate: "neudzulab",
    })),
  ];
  const details = calculatePlayerDetails(playerDetailState(results), "buyukekrem");
  assert.deepEqual(details.bestDuos, {
    mostWins: { playerId: "italyan-aygiri", name: "Italyan Aygiri", played: 6, wins: 4, winRate: 67 },
    bestRate: { playerId: "neudzulab", name: "Neudzulab", played: 3, wins: 3, winRate: 100 },
  });
});

test("requires three shared games and returns only one qualified duo once", () => {
  const belowThreshold = playerDetailState([
    { date: "2026-08-01", won: true, teammate: "italyan-aygiri" },
    { date: "2026-08-02", won: false, teammate: "italyan-aygiri" },
  ]);
  assert.deepEqual(calculatePlayerDetails(belowThreshold, "buyukekrem").bestDuos, {
    mostWins: null,
    bestRate: null,
  });

  const oneCandidate = playerDetailState([
    { date: "2026-08-01", won: true, teammate: "italyan-aygiri" },
    { date: "2026-08-02", won: true, teammate: "italyan-aygiri" },
    { date: "2026-08-03", won: false, teammate: "italyan-aygiri" },
  ]);
  assert.equal(calculatePlayerDetails(oneCandidate, "buyukekrem").bestDuos.bestRate, null);
});

test("uses localized names as the final deterministic detail tie-break", () => {
  const civilizations = ["Huns", "Huns", "Huns", "Franks", "Franks", "Franks"];
  const state = playerDetailState(civilizations.map((civilization, index) => ({
    date: `2026-07-${String(index + 1).padStart(2, "0")}`,
    won: index % 3 !== 2,
    civilization,
    teammate: "italyan-aygiri",
    extraTeammate: "neudzulab",
  })));
  const details = calculatePlayerDetails(state, "buyukekrem");
  assert.equal(details.bestCivilizations.mostWins.name, "Franks");
  assert.equal(details.bestCivilizations.bestRate.name, "Huns");
  assert.equal(details.bestDuos.mostWins.name, "Italyan Aygiri");
  assert.equal(details.bestDuos.bestRate.name, "Neudzulab");
});
```

Also change the empty-details test to expect both record groups with two null values instead of the removed singular properties.

```js
test("returns explicit empty detail values and rejects an unknown player", () => {
  const state = playerDetailState([]);
  const details = calculatePlayerDetails(state, "buyukekrem");
  assert.deepEqual(details.lastFive, []);
  assert.equal(details.currentWinStreak, 0);
  assert.equal(details.longestWinStreak, 0);
  assert.deepEqual(details.bestCivilizations, { mostWins: null, bestRate: null });
  assert.deepEqual(details.bestDuos, { mostWins: null, bestRate: null });
  assert.throws(() => calculatePlayerDetails(state, "unknown"), /Oyuncu bulunamadı/);
});
```

- [ ] **Step 2: Run the focused model tests and verify failure**

Run:

```bash
node --test tests/static-model.test.mjs
```

Expected: FAIL because `favoriteCivilization`, `bestCivilizations`, and `bestDuos` are not yet returned.

- [ ] **Step 3: Implement exact-rate, strict, distinct selection**

In `docs/lib/model.js`, replace `rankedDetailRecord` with:

```js
function compareDetailRate(a, b, labelKey) {
  return (b.wins * a.played) - (a.wins * b.played)
    || b.wins - a.wins
    || b.played - a.played
    || a[labelKey].localeCompare(b[labelKey], "tr-TR");
}

function compareDetailWins(a, b, labelKey) {
  return b.wins - a.wins
    || compareDetailRate(a, b, labelKey);
}

function rankedDistinctDetailRecords(records, minimumPlayed, labelKey) {
  const qualified = [...records.values()]
    .filter(({ played }) => played >= minimumPlayed);
  const mostWins = [...qualified].sort((a, b) => compareDetailWins(a, b, labelKey))[0] ?? null;
  const bestRate = [...qualified]
    .filter((candidate) => candidate !== mostWins)
    .sort((a, b) => compareDetailRate(a, b, labelKey))[0] ?? null;
  return {
    mostWins: mostWins ? { ...mostWins } : null,
    bestRate: bestRate ? { ...bestRate } : null,
  };
}
```

Change the `calculatePlayerDetails` return object to:

```js
return {
  player: { ...player },
  favoriteCivilization: favoriteFromHistory(
    civilizationHistoryMap(normalized).get(playerId),
  ),
  lastFive: outcomes.slice(0, 5),
  currentWinStreak,
  longestWinStreak,
  bestCivilizations: rankedDistinctDetailRecords(civilizations, 3, "name"),
  bestDuos: rankedDistinctDetailRecords(duos, 3, "name"),
};
```

Keep excluding `Random` from the `civilizations` map exactly as the existing loop does. Do not change `favoriteFromHistory`, `calculateStatistics`, or saved state.

- [ ] **Step 4: Run model tests and the full suite**

Run:

```bash
node --test tests/static-model.test.mjs
npm test
```

Expected: focused model tests pass. The full suite may still fail only in old player-detail view assertions that consume the removed singular properties.

- [ ] **Step 5: Commit the model contract**

Run:

```bash
git add docs/lib/model.js tests/static-model.test.mjs
git commit -m "feat: rank distinct player detail records"
```

Expected: one commit containing only model logic and model tests.

---

### Task 3: Render the New Player Detail Hierarchy

**Files:**
- Modify: `tests/static-views.test.mjs:79-100`
- Modify: `docs/lib/views.js:90-135`

**Interfaces:**
- Consumes: the `calculatePlayerDetails` object defined in Task 2 and `civilizationAssetName(name)`.
- Produces: semantic HTML with `.player-details__label-line`, `.player-detail-list`, `.player-detail-record__kind`, and the existing dialog IDs/events.

- [ ] **Step 1: Write failing view assertions for copy, crest, and distinct rows**

Replace the old compact-detail test with assertions equivalent to:

```js
test("renders the polished player detail hierarchy and favorite crest", () => {
  const details = {
    player: { id: "buyukekrem", name: "BuyukEkrem", active: true },
    favoriteCivilization: "Huns",
    lastFive: ["W", "L", "W"],
    currentWinStreak: 2,
    longestWinStreak: 7,
    bestCivilizations: {
      mostWins: { name: "Huns", played: 7, wins: 4, winRate: 57 },
      bestRate: { name: "Franks", played: 3, wins: 3, winRate: 100 },
    },
    bestDuos: {
      mostWins: { playerId: "emre", name: "Emre", played: 8, wins: 5, winRate: 63 },
      bestRate: { playerId: "neudzulab", name: "Neudzulab", played: 3, wins: 3, winRate: 100 },
    },
  };
  const html = renderPlayerDetails(details);
  assert.match(html, /assets\/civs\/huns\.svg/);
  for (const label of ["Last", "Win", "Best", "Civ", "Duo", "Current Streak", "Best Streak", "Most Wins", "Best Rate"]) {
    assert.match(html, new RegExp(label));
  }
  assert.doesNotMatch(html, /Best Civilization/);
  assert.equal((html.match(/player-detail-record__kind">Most Wins/g) ?? []).length, 2);
  assert.equal((html.match(/player-detail-record__kind">Best Rate/g) ?? []).length, 2);
  assert.match(html, /4\/7 · 57%/);
  assert.match(html, /3\/3 · 100%/);
  assert.match(html, />Emre</);
  assert.match(html, />Neudzulab</);
});
```

Update the no-data test to pass the real `calculatePlayerDetails` output and still require exactly two `No data` strings:

```js
test("renders explicit no-data player details", () => {
  const emptyState = structuredClone(state);
  emptyState.matches = [];
  const html = renderPlayerDetails(calculatePlayerDetails(emptyState, "buyukekrem"));
  assert.match(html, /player-form__empty">—/);
  assert.equal((html.match(/>No data</g) ?? []).length, 2);
});
```

- [ ] **Step 2: Run the focused view test and verify failure**

Run:

```bash
node --test tests/static-views.test.mjs
```

Expected: FAIL on old `Best Civilization`, crest selection, and missing list/category markup.

- [ ] **Step 3: Implement small render helpers and the new dialog markup**

In `docs/lib/views.js`, remove `sampleLabel` and replace the singular record rendering with these helpers:

```js
function detailSectionLabel(first, second) {
  return `<h3><span class="player-details__label-line">${first}</span><span class="player-details__label-line">${second}</span></h3>`;
}

function detailStat(record) {
  return `${record.wins}/${record.played} · ${record.winRate}%`;
}

function civilizationDetailRecord(kind, record) {
  if (!record) return "";
  return `<div class="player-detail-record"><img src="./assets/civs/${civilizationAssetName(record.name)}" alt="" width="36" height="36"><span class="player-detail-record__copy"><small class="player-detail-record__kind">${kind}</small><strong>${escapeHtml(record.name)}</strong></span><small class="player-detail-record__stat">${detailStat(record)}</small></div>`;
}

function duoDetailRecord(kind, record) {
  if (!record) return "";
  return `<div class="player-detail-record player-detail-record--duo"><span class="player-detail-record__copy"><small class="player-detail-record__kind">${kind}</small><strong>${escapeHtml(record.name)}</strong></span><small class="player-detail-record__stat">${detailStat(record)}</small></div>`;
}

function detailRecordList(records, renderer) {
  const content = [
    renderer("Most Wins", records.mostWins),
    renderer("Best Rate", records.bestRate),
  ].filter(Boolean).join("");
  return content
    ? `<div class="player-detail-list">${content}</div>`
    : `<span class="player-detail-empty">No data</span>`;
}
```

Render the article with the existing IDs and event attributes but this structure:

```js
export function renderPlayerDetails(details) {
  return `<article class="player-details">
    <header class="player-details__header"><img src="./assets/civs/${civilizationAssetName(details.favoriteCivilization)}" alt="" width="48" height="48"><h2 id="player-details-title">${escapeHtml(details.player.name)}</h2><button class="icon-button" type="button" data-close-player-details aria-label="Close"><img src="./assets/icons/x.svg" alt="" width="20" height="20"></button></header>
    <section class="player-details__section">${detailSectionLabel("Last", "5")}<div class="player-form">${resultSeals(details.lastFive)}</div></section>
    <section class="player-details__section">${detailSectionLabel("Win", "Streak")}<dl class="streak-record"><div><dt>Current Streak</dt><dd>${details.currentWinStreak}</dd></div><div><dt>Best Streak</dt><dd>${details.longestWinStreak}</dd></div></dl></section>
    <section class="player-details__section player-details__section--records">${detailSectionLabel("Best", "Civ")}${detailRecordList(details.bestCivilizations, civilizationDetailRecord)}</section>
    <section class="player-details__section player-details__section--records">${detailSectionLabel("Best", "Duo")}${detailRecordList(details.bestDuos, duoDetailRecord)}</section>
  </article>`;
}
```

- [ ] **Step 4: Run focused and full tests**

Run:

```bash
node --test tests/static-views.test.mjs
npm test
```

Expected: view tests pass; full suite has zero failures before styling changes.

- [ ] **Step 5: Commit the view markup**

Run:

```bash
git add docs/lib/views.js tests/static-views.test.mjs
git commit -m "feat: present dual player detail rankings"
```

Expected: one view-only commit with its tests.

---

### Task 4: Polish the Mobile Dialog Surface

**Files:**
- Modify: `tests/static-css.test.mjs:70-85`
- Modify: `docs/styles.css:897-1075,1118-1128`

**Interfaces:**
- Consumes: markup classes introduced in Task 3 and existing CSS tokens `--paper`, `--ink`, `--ink-muted`, `--rule`, `--bronze`, `--furniture-deep`, `--touch`.
- Produces: a 420px-bounded, viewport-safe dialog with a 56px section-label column and modal-only subdued texture.

- [ ] **Step 1: Read the impeccable design skill before styling**

Run:

```bash
sed -n '1,360p' /Users/eko/.codex/skills/impeccable/SKILL.md
```

Expected: apply its hierarchy, spacing, typography, responsive, and anti-pattern checks without changing the approved AoE2 direction.

- [ ] **Step 2: Write failing CSS contract assertions**

Extend `keeps player detail triggers and dialog mobile safe` in `tests/static-css.test.mjs` with:

```js
assert.match(css, /\.player-details-dialog\s*\{[\s\S]*background-image:\s*none/);
assert.match(css, /\.player-details-dialog::before\s*\{[\s\S]*opacity:\s*0\.14/);
assert.match(css, /\.player-details__section\s*\{[\s\S]*grid-template-columns:\s*56px minmax\(0,\s*1fr\)/);
assert.match(css, /\.player-details__label-line\s*\{[\s\S]*display:\s*block/);
assert.match(css, /\.streak-record dd\s*\{[\s\S]*font-size:\s*26px/);
assert.match(css, /\.player-detail-record__stat\s*\{[\s\S]*font-size:\s*12px[\s\S]*font-weight:\s*700/);
assert.match(css, /\.player-details__section--records\s*\{[\s\S]*min-height:\s*124px/);
assert.doesNotMatch(css, /@media\s*\(max-width:\s*359px\)[\s\S]*grid-template-columns:\s*78px/);
```

- [ ] **Step 3: Run the CSS test and verify failure**

Run:

```bash
node --test tests/static-css.test.mjs
```

Expected: FAIL because the modal still inherits the strong generic paper texture and uses the old 92/78px label column.

- [ ] **Step 4: Implement the calmer, taller, mobile-safe ledger layout**

Update only player-details selectors in `docs/styles.css`; leave generic password/editor dialogs untouched. Use this geometry and hierarchy:

```css
.player-details-dialog {
  position: relative;
  width: min(calc(100% - 24px), 420px);
  max-height: calc(100dvh - 24px - env(safe-area-inset-top) - env(safe-area-inset-bottom));
  overflow: hidden;
  background-color: #ead3a3;
  background-image: none;
  isolation: isolate;
}

.player-details-dialog::before {
  position: absolute;
  z-index: -1;
  inset: 0;
  background: url("./assets/paper-continuous.jpg") center / cover;
  content: "";
  opacity: 0.14;
  pointer-events: none;
}

.player-details__section {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  min-height: 72px;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid rgb(59 40 20 / 48%);
}

.player-details__section--records {
  min-height: 124px;
}

.player-details__label-line {
  display: block;
}

.streak-record {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
}

.streak-record div {
  display: grid;
  gap: 2px;
  padding: 0;
}

.streak-record dt,
.player-detail-record__kind {
  color: var(--ink-muted);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1.15;
  text-transform: uppercase;
}

.streak-record dd {
  margin: 0;
  color: var(--ink);
  font-size: 26px;
  font-weight: 700;
  line-height: 1;
}

.player-detail-list {
  display: grid;
  gap: 6px;
}

.player-detail-record {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) auto;
  min-height: 40px;
  align-items: center;
  gap: 8px;
}

.player-detail-record--duo {
  grid-template-columns: minmax(0, 1fr) auto;
}

.player-detail-record > img {
  width: 36px;
  height: 36px;
  object-fit: contain;
}

.player-detail-record__copy {
  display: grid;
  min-width: 0;
  gap: 1px;
}

.player-detail-record__copy strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-detail-record__stat {
  color: var(--ink);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}
```

Delete the obsolete `.sample-note` rules and the complete `@media (max-width: 359px)` block. Five 28px Last 5 seals fit in the new right column at 320px, so no narrow-width geometry override is added.

- [ ] **Step 5: Run CSS and full regression tests**

Run:

```bash
node --test tests/static-css.test.mjs
npm test
node --check docs/lib/model.js
node --check docs/lib/views.js
git diff --check
```

Expected: all tests and syntax checks pass; `git diff --check` prints nothing.

- [ ] **Step 6: Commit visual polish**

Run:

```bash
git add docs/styles.css tests/static-css.test.mjs
git commit -m "style: polish mobile player details"
```

Expected: one CSS-only production change plus its contract test.

---

### Task 5: Perform Local Functional and Visual QA

**Files:**
- Create locally, ignored by Git: `.qa/player-details-polish-2026-08-24/mobile-320.png`
- Create locally, ignored by Git: `.qa/player-details-polish-2026-08-24/mobile-390.png`
- Create locally, ignored by Git: `.qa/player-details-polish-2026-08-24/desktop.png`
- Modify only if QA exposes a defect: the Task 2–4 source/test files.

**Interfaces:**
- Consumes: completed dialog implementation and unchanged public state fetch.
- Produces: evidence that both trigger paths and responsive sizes work without overflow or runtime errors.

- [ ] **Step 1: Start the Vercel-compatible local app**

Run:

```bash
vercel dev --listen 4173
```

Expected: the linked project serves `/`, `/?view=standings`, and `/api/state` on `http://127.0.0.1:4173` without startup errors. Keep this PTY session open for QA.

- [ ] **Step 2: Verify the Matches trigger at 320×700**

In browser QA, set viewport to 320×700, open `/`, tap a populated match player, and verify:

```text
- The header crest equals that player's crest in Standings.
- LAST/5, WIN/STREAK, BEST/CIV, and BEST/DUO occupy the narrow left rail.
- Current Streak and Best Streak values are large and legible.
- Most Wins and Best Rate never repeat the same civ or player.
- Any civ/duo with fewer than 3 matches is absent.
- The modal has at least 12px left/right viewport space.
- document.documentElement.scrollWidth === document.documentElement.clientWidth.
- Closing by X restores focus and preserves the match matrix horizontal scroll position.
```

Save the screenshot to `.qa/player-details-polish-2026-08-24/mobile-320.png`.

- [ ] **Step 3: Verify the Standings trigger at 390×844**

Open `/?view=standings`, tap the same player, and verify the modal crest matches the row crest pixel-for-pixel in asset URL, the modal contains no clipped copy, backdrop click closes it, focus returns to the row button, the selected standings sort remains unchanged, and the console contains zero errors. Save `.qa/player-details-polish-2026-08-24/mobile-390.png`.

- [ ] **Step 4: Verify a wide viewport and empty/one-result cases**

At 1280×900, open the dialog from both public views and verify the width never exceeds 420px and content is not stretched. Use fixture-driven rendered HTML or a temporary in-memory state in tests—not a production save—to confirm `No data` and one-result sections do not leave broken spacing. Save `.qa/player-details-polish-2026-08-24/desktop.png`.

- [ ] **Step 5: Inspect screenshots and fix only demonstrated defects**

Open all three screenshots with the local image viewer. If a defect is found, first add or tighten a corresponding model/view/CSS test, verify it fails, apply the smallest source correction, rerun the focused test and `npm test`, then create a narrowly named fix commit.

- [ ] **Step 6: Stop local processes and confirm the tree**

Stop the Vercel dev PTY with Ctrl-C. Run:

```bash
git status --short
git log --oneline -6
```

Expected: no `.qa` file is tracked; only deliberate commits are present and the working tree is clean.

---

### Task 6: Push, Deploy, and Prove Production Data Is Unchanged

**Files:**
- Create locally, ignored by Git: `.qa/player-details-polish-2026-08-24/after.json`
- Create locally, ignored by Git: `.qa/player-details-polish-2026-08-24/after.sha256`

**Interfaces:**
- Consumes: clean, tested `main`; Vercel project link; production baseline from Task 1.
- Produces: pushed GitHub `main`, production alias `53aoe.vercel.app`, and exact data-integrity proof.

- [ ] **Step 1: Run the final pre-push gate**

Run:

```bash
npm test
node --check docs/lib/model.js
node --check docs/lib/views.js
git diff --check
git status --short
```

Expected: all tests pass, syntax checks succeed, no whitespace errors, and the worktree is clean.

- [ ] **Step 2: Push source and verify the remote SHA**

Run:

```bash
git push github main
local_sha=$(git rev-parse HEAD)
remote_sha=$(git ls-remote github refs/heads/main | awk '{print $1}')
test "$local_sha" = "$remote_sha"
```

Expected: the equality check exits zero.

- [ ] **Step 3: Deploy the exact commit and set the public alias**

Run:

```bash
deployment_url=$(vercel deploy --prod --yes)
vercel alias set "$deployment_url" 53aoe.vercel.app
printf '%s\n' "$deployment_url"
```

Expected: Vercel returns an immutable HTTPS deployment URL and confirms the `53aoe.vercel.app` alias. Do not run any command that writes state.

- [ ] **Step 4: Verify production routes and search-engine blocking**

Run:

```bash
curl -fsSI https://53aoe.vercel.app/ | rg -i 'HTTP/|x-robots-tag'
curl -fsSI 'https://53aoe.vercel.app/?view=standings' | rg -i 'HTTP/|x-robots-tag'
curl -fsS https://53aoe.vercel.app/robots.txt
curl -fsS https://53aoe.vercel.app/api/state > /dev/null
```

Expected: routes return success, `X-Robots-Tag` remains `noindex, nofollow, noarchive, nosnippet, noimageindex`, and `robots.txt` continues to disallow crawling.

- [ ] **Step 5: Compare production state byte-for-byte**

Run:

```bash
curl --fail --silent --show-error \
  https://53aoe.vercel.app/api/state \
  -o .qa/player-details-polish-2026-08-24/after.json
cmp \
  .qa/player-details-polish-2026-08-24/before.json \
  .qa/player-details-polish-2026-08-24/after.json
shasum -a 256 \
  .qa/player-details-polish-2026-08-24/before.json \
  .qa/player-details-polish-2026-08-24/after.json \
  | tee .qa/player-details-polish-2026-08-24/after.sha256
node -e 'const fs=require("node:fs");for(const name of ["before","after"]){const value=JSON.parse(fs.readFileSync(`.qa/player-details-polish-2026-08-24/${name}.json`,"utf8"));console.log(name,JSON.stringify({revision:value.state.revision,updatedAt:value.state.updatedAt,players:value.state.players.length,matches:value.state.matches.length}))}'
```

Expected: `cmp` exits zero, both SHA-256 values are identical, and revision/updatedAt/player/match counts match exactly. Any difference stops completion; never overwrite or restore production automatically because the difference may be a legitimate concurrent user edit.

- [ ] **Step 6: Run final production visual smoke QA**

At 320×700 and 390×844, open the live alias from Matches and Standings. Confirm the deployed dialog matches local QA, both trigger paths work, focus/scroll are preserved, there is no document overflow, images load, and the browser console is clean.

- [ ] **Step 7: Report the release evidence**

Report the final commit SHA, immutable Vercel deployment URL, `53aoe.vercel.app` alias status, test count, before/after SHA-256, revision, updatedAt, player count, match count, and the confirmed noindex headers. Link the modified local source files in the handoff.

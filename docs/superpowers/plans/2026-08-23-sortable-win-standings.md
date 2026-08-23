# Sortable Win Standings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make wins the default standings order and let users sort by played, wins, losses, or win rate through large mobile-friendly table headers.

**Architecture:** Keep statistics derived from schema-version-1 state. Add one pure model sorter, render the table from an explicit sort descriptor, and keep that descriptor in page memory inside `startApp`; no persistence or API write path changes.

**Tech Stack:** HTML, CSS, vanilla JavaScript ES modules, Node test runner, Vercel production deployment.

## Global Constraints

- Preserve the exact production revision-39 backup with 15 players and 49 matches.
- Never issue `PUT /api/state`, seed production data, or alter the shared schema.
- Default sort is `{ key: "wins", direction: "desc" }`.
- Sortable keys are exactly `played`, `wins`, `losses`, and `winRate`.
- Numeric headers remain inside the existing single standings table and use 44px touch rows.
- Sorting state remains in page memory only; it does not enter the URL or browser storage.
- At 390px and 320px, the document must not overflow horizontally.

---

### Task 1: Pure standings order

**Files:**
- Modify: `docs/lib/model.js`
- Test: `tests/static-model.test.mjs`

**Interfaces:**
- Produces: `sortPlayerStatistics(players, key = "wins", direction = "desc") -> cloned ranked player[]`.
- Consumes: calculated player records with `played`, `wins`, `losses`, `winRate`, and `name`.

- [ ] **Step 1: Write failing model tests**

Add a test where a player with 8 wins and 50% rate ranks above a player with 1 win and 100% rate. Add direct sorter assertions for all four keys, both directions, deterministic ties, non-mutation, and sequential rank values.

```js
const records = [
  { id: "perfect", name: "Az Maç", played: 1, wins: 1, losses: 0, winRate: 100, rank: 0 },
  { id: "veteran", name: "Çok Galibiyet", played: 16, wins: 8, losses: 8, winRate: 50, rank: 0 },
  { id: "steady", name: "Eşit Galibiyet", played: 10, wins: 8, losses: 2, winRate: 80, rank: 0 },
];
assert.deepEqual(sortPlayerStatistics(records).map(({ id }) => id), ["steady", "veteran", "perfect"]);
assert.deepEqual(sortPlayerStatistics(records, "winRate", "desc").map(({ id }) => id), ["perfect", "steady", "veteran"]);
assert.deepEqual(sortPlayerStatistics(records, "played", "asc").map(({ id }) => id), ["perfect", "steady", "veteran"]);
assert.deepEqual(sortPlayerStatistics(records, "losses", "desc").map(({ id }) => id), ["veteran", "steady", "perfect"]);
assert.deepEqual(sortPlayerStatistics(records).map(({ rank }) => rank), [1, 2, 3]);
assert.deepEqual(records.map(({ rank }) => rank), [0, 0, 0]);
```

- [ ] **Step 2: Run the focused model test and verify failure**

Run: `node --test tests/static-model.test.mjs`

Expected: FAIL because `sortPlayerStatistics` is not exported and the current default order starts with win rate.

- [ ] **Step 3: Implement the pure sorter**

Add the following contract to `docs/lib/model.js`:

```js
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
  ordered.forEach((player, index) => { player.rank = index + 1; });
  return ordered;
}
```

Replace the win-rate-first sorting block in `calculateStatistics` with `sortPlayerStatistics(players, "wins", "desc")`.

- [ ] **Step 4: Run focused tests**

Run: `node --test tests/static-model.test.mjs`

Expected: all model tests PASS.

---

### Task 2: Sortable table rendering and controller state

**Files:**
- Modify: `docs/lib/views.js`
- Modify: `docs/app.js`
- Test: `tests/static-views.test.mjs`
- Test: `tests/spa-controller.test.mjs`

**Interfaces:**
- Consumes: `sortPlayerStatistics(players, sort.key, sort.direction)`.
- Produces: `renderStatsTable(stats, { key, direction })`, four `[data-sort-standings]` buttons, and page-memory `standingsSort` state.

- [ ] **Step 1: Write failing renderer/controller tests**

Assert that the default table contains four sort buttons; `G` has `is-active`, `aria-sort="descending"`, and a downward direction marker. Assert that another descriptor marks its own column active and renders ranks in that order. Extend the controller source contract to require `data-sort-standings`, `standingsSort`, and direction toggling without `localStorage` or `sessionStorage`.

```js
const defaultHtml = renderStatsTable(stats);
assert.equal((defaultHtml.match(/data-sort-standings=/g) ?? []).length, 4);
assert.match(defaultHtml, /aria-sort="descending"[\s\S]*data-sort-standings="wins"[\s\S]*is-active/);
assert.match(defaultHtml, /data-sort-standings="wins"[\s\S]*↓/);

const rateHtml = renderStatsTable(stats, { key: "winRate", direction: "asc" });
assert.match(rateHtml, /aria-sort="ascending"[\s\S]*data-sort-standings="winRate"[\s\S]*is-active/);

const source = await readFile(new URL("../docs/app.js", import.meta.url), "utf8");
for (const contract of ["standingsSort", "data-sort-standings", 'direction === "desc" ? "asc" : "desc"']) {
  assert.ok(source.includes(contract), `missing sorting contract: ${contract}`);
}
```

- [ ] **Step 2: Run focused tests and verify failure**

Run: `node --test tests/static-views.test.mjs tests/spa-controller.test.mjs`

Expected: FAIL because table headers are plain text and the app has no sort state.

- [ ] **Step 3: Implement renderer controls**

Import `sortPlayerStatistics` in `docs/lib/views.js`. Change the signature to:

```js
export function renderStatsTable(stats, sort = { key: "wins", direction: "desc" })
```

Use a small local header renderer that emits `<th aria-sort>` containing a button with `data-sort-standings`, `is-active`, a visible `↑/↓` marker on the active key, and an accessible next-action label. Render rows from `sortPlayerStatistics(stats.players, sort.key, sort.direction)`.

- [ ] **Step 4: Implement page-memory interaction**

In `startApp`, initialize:

```js
let standingsSort = { key: "wins", direction: "desc" };
```

Pass it to `renderStatsTable`. In the delegated click handler, add:

```js
if (target.matches("[data-sort-standings]")) {
  const key = target.dataset.sortStandings;
  standingsSort = standingsSort.key === key
    ? { key, direction: standingsSort.direction === "desc" ? "asc" : "desc" }
    : { key, direction: "desc" };
  render();
}
```

The branch must not run in editing mode and must not call the client.

- [ ] **Step 5: Run focused tests**

Run: `node --test tests/static-views.test.mjs tests/spa-controller.test.mjs`

Expected: all focused tests PASS.

---

### Task 3: Mobile touch styling and QA instrumentation

**Files:**
- Modify: `docs/styles.css`
- Modify: `DESIGN.md`
- Modify: `scripts/visual-qa.mjs`
- Test: `tests/static-css.test.mjs`

**Interfaces:**
- Consumes: `.stats-sort`, `.stats-sort.is-active`, `.stats-sort__direction`, and numeric column classes.
- Produces: 44px full-cell touch controls, 14px labels, gold underline, and production QA metrics.

- [ ] **Step 1: Write the failing CSS contract**

Assert `.stats-sort` has `min-height: var(--touch)`, `width: 100%`, and `font-size: 14px`; assert `.stats-sort.is-active` uses a bottom gold inset/line. Assert numeric and rate columns are 44px and rank is reduced without changing table width.

```js
assert.match(css, /\.stats-sort\s*{[\s\S]*width:\s*100%[\s\S]*min-height:\s*var\(--touch\)[\s\S]*font-size:\s*14px/);
assert.match(css, /\.stats-sort\.is-active[\s\S]*inset 0 -2px 0 var\(--bronze\)/);
assert.match(css, /\.stats-col-number[\s\S]*width:\s*44px/);
assert.match(css, /\.stats-col-rate[\s\S]*width:\s*44px/);
```

- [ ] **Step 2: Run CSS test and verify failure**

Run: `node --test tests/static-css.test.mjs`

Expected: FAIL because the sortable classes do not exist.

- [ ] **Step 3: Add minimal design-system styling**

Style the button as a flat transparent control inheriting the dark header color and Merriweather type. Keep the entire 44px row clickable, use a restrained gold underline only on the active header, preserve visible focus, and avoid radius, shadow, or extra header height.

```css
.stats-sort {
  width: 100%;
  min-height: var(--touch);
  padding: 0;
  border: 0;
  color: inherit;
  background: transparent;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
}

.stats-sort.is-active {
  box-shadow: inset 0 -2px 0 var(--bronze);
}
```

- [ ] **Step 4: Document and instrument**

Update `DESIGN.md` standings rules with win-first sorting and the button interaction. Add QA metrics for active sort key, `aria-sort`, visible direction, first player name, numeric header heights/widths, and current rank sequence.

- [ ] **Step 5: Run focused tests**

Run: `node --test tests/static-css.test.mjs tests/static-views.test.mjs`

Expected: all focused tests PASS.

---

### Task 4: Full verification and safe deployment

**Files:**
- Verify: all changed source and tests
- Verify: `.qa/production-state-before-standings-sort-2026-08-23.json`

**Interfaces:**
- Consumes: tested commits and the production backup digest.
- Produces: GitHub main commit, Vercel production deployment, and evidence that live data did not change.

- [ ] **Step 1: Run the complete automated suite**

Run:

```bash
npm test
node --check docs/lib/model.js
node --check docs/lib/views.js
node --check docs/app.js
node --check scripts/visual-qa.mjs
git diff --check
```

Expected: every test passes and every syntax/diff check exits 0.

- [ ] **Step 2: Run final design detector**

Run the Impeccable detector once against `docs/lib/views.js` and `docs/styles.css`. Review advisories; do not add unrelated design-system changes.

- [ ] **Step 3: Commit and push**

Commit feature/test changes, push `main`, and verify local/remote SHAs match. Do not push `.qa` artifacts.

- [ ] **Step 4: Deploy code only**

Deploy with Vercel, point `53aoe.vercel.app` at the new deployment, and verify the served JS/CSS includes the new sorting contracts. Do not call production PUT.

- [ ] **Step 5: Verify production at 390px and 320px**

Run visual QA for default standings, a clicked `%` sort, and a second `%` click. Confirm 15 rows, sequential ranks, selected header/direction changes, no broken images, no runtime errors, and no document overflow. Inspect screenshots visually.

- [ ] **Step 6: Prove data preservation**

Fetch `GET /api/state` again and compare its exact response body SHA-256, revision, updatedAt, players, and matches with the pre-deploy backup. Any difference stops completion and requires inspection; never overwrite a newer user edit.

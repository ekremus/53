# Flexible Team Slots and Last Civilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Support 3v3 and 4v4 matches with vacant `-` slots, alphabetize each displayed team, restore a selected player's latest civilization, show favorite-civilization crests in standings, and narrow mobile match columns without changing or deleting existing production data.

**Architecture:** Keep schema version 1 and the fixed four-slot arrays per team. Represent vacancies as `{ playerId: "", civilization: "Random" }`, derive history-based civilization values in the pure model, sort only renderer descriptors so stored slot indexes never move, and keep the existing Vercel Blob API and last-writer-wins publish flow unchanged.

**Tech Stack:** HTML5, mobile-first CSS, browser ES modules, Node.js 22 built-in test runner, private Vercel Blob, Vercel CLI, Chrome DevTools Protocol visual QA.

## Global Constraints

- Never run `npm run data:seed`, `scripts/seed-vercel-blob.mjs`, or any manual `PUT /api/state` during implementation, QA, or deployment.
- Never edit `docs/data/state.json` to mimic production and never restore a backup over newer live data.
- Keep `schemaVersion: 1`, exactly four slot objects per team, and all current non-empty production records byte-for-byte compatible.
- Empty `playerId` is the only vacant representation; do not create a fake player named `-`.
- Every vacant slot normalizes to `civilization: "Random"`; unknown non-empty players and invalid civilizations still fail validation.
- Alphabetical ordering is presentation-only. Every editable row must retain its original slot index in `data-edit-slot`.
- `Random` participates in favorite-civilization counts. Ties use the most recent appearance; no history falls back to `Random`.
- Mobile match columns are 164px; the existing 920px breakpoint restores 232px. Player-row height and 38px match crest size stay unchanged.
- Do not reintroduce ETag/stale-write UI, authentication, migration code, a seed path, extra copy, or any redesign beyond the approved feature states.
- Use `apply_patch` for source edits. Run the focused failing test before implementation, then the focused passing test, then commit each task.

---

### Task 1: Capture a Read-Only Production Baseline

**Files:**
- Create locally, ignored by Git: `.qa/data-safety-2026-08-02/before.headers`
- Create locally, ignored by Git: `.qa/data-safety-2026-08-02/before.json`
- Create locally, ignored by Git: `.qa/data-safety-2026-08-02/before.sha256`
- Create locally, ignored by Git: `.qa/data-safety-2026-08-02/before.summary.json`

**Interfaces:**
- Reads: `GET https://53aoe.vercel.app/api/state`
- Writes: local ignored QA artifacts only
- Must not call: production `PUT /api/state`

- [ ] **Step 1: Confirm the worktree and current revision**

Run:

```bash
git status --short
git branch --show-current
git log -1 --oneline
```

Expected: clean worktree, branch `main`, and the latest planning commit visible. If unrelated user changes exist, preserve them and stop before overlapping edits.

- [ ] **Step 2: Fetch production once using GET only**

Run:

```bash
mkdir -p .qa/data-safety-2026-08-02
curl --fail --silent --show-error \
  --dump-header .qa/data-safety-2026-08-02/before.headers \
  --output .qa/data-safety-2026-08-02/before.json \
  https://53aoe.vercel.app/api/state
shasum -a 256 .qa/data-safety-2026-08-02/before.json > .qa/data-safety-2026-08-02/before.sha256
```

Expected: HTTP 200 in `before.headers`; no request method other than GET.

- [ ] **Step 3: Validate and summarize the exact live payload**

Run:

```bash
node --input-type=module - <<'NODE' > .qa/data-safety-2026-08-02/before.summary.json
import { readFile } from "node:fs/promises";
import { validateState } from "./docs/lib/model.js";
const payload = JSON.parse(await readFile(".qa/data-safety-2026-08-02/before.json", "utf8"));
const state = validateState(payload.state);
console.log(JSON.stringify({
  schemaVersion: state.schemaVersion,
  revision: state.revision,
  updatedAt: state.updatedAt,
  players: state.players.length,
  matches: state.matches.length,
}, null, 2));
NODE
cat .qa/data-safety-2026-08-02/before.summary.json
```

Expected: valid schema 1 state. Record the observed counts; do not replace them with the older 12-player/5-match design-time observation if production has legitimately changed.

- [ ] **Step 4: Run the untouched baseline test suite**

Run `npm test`.

Expected: all existing tests pass with `# fail 0` before source changes.

---

### Task 2: Make Vacant Slots and Civilization History First-Class Model Behavior

**Files:**
- Modify: `docs/lib/model.js`
- Test: `tests/static-model.test.mjs`
- Test: `tests/api-state.test.mjs`

**Interfaces:**
- `validateState(state) -> normalizedState`
- `latestCivilizationForPlayer(state, playerId, excludedSlot?) -> civilization`
- `favoriteCivilizationForPlayer(state, playerId) -> civilization`
- `calculateStatistics(state).players[].favoriteCivilization`
- Vacant normalized slot: `{ playerId: "", civilization: "Random" }`

- [ ] **Step 1: Add failing model tests for vacancies and history**

Extend the model imports:

```js
import {
  activeRoster,
  calculateStatistics,
  createEmptyMatch,
  favoriteCivilizationForPlayer,
  latestCivilizationForPlayer,
  removeOrDeactivatePlayer,
  upsertPlayer,
  validateState,
} from "../docs/lib/model.js";
```

Keep the existing incomplete-array assertion, then add these tests:

```js
test("accepts multiple vacant slots, normalizes their civilizations, and still rejects duplicate players", () => {
  const vacant = structuredClone(fixtureState);
  vacant.matches[0].teams.cortinyanlar[0] = { playerId: "", civilization: "Huns" };
  vacant.matches[0].teams.bakracogullari[0] = { playerId: "", civilization: "Random" };
  const normalized = validateState(vacant);
  assert.deepEqual(normalized.matches[0].teams.cortinyanlar[0], { playerId: "", civilization: "Random" });
  assert.deepEqual(normalized.matches[0].teams.bakracogullari[0], { playerId: "", civilization: "Random" });

  const duplicate = structuredClone(fixtureState);
  duplicate.matches[0].teams.bakracogullari[0].playerId = duplicate.matches[0].teams.cortinyanlar[0].playerId;
  assert.throws(() => validateState(duplicate), /iki kez/);
});

test("skips vacant slots in player statistics without changing match totals", () => {
  const state = structuredClone(fixtureState);
  state.matches[0].teams.cortinyanlar[0] = { playerId: "", civilization: "Random" };
  const statistics = calculateStatistics(state);
  assert.equal(statistics.totalMatches, 2);
  assert.deepEqual(statistics.teams, { cortinyanlar: 2, bakracogullari: 0 });
  assert.equal(statistics.players.some((player) => player.id === "zombi"), false);
});

test("finds latest and favorite civilizations with newest-match tie breaking", () => {
  assert.equal(latestCivilizationForPlayer(fixtureState, "buyukekrem"), "Huns");
  assert.equal(latestCivilizationForPlayer(fixtureState, "buyukekrem", {
    matchId: fixtureState.matches[1].id,
    teamId: "cortinyanlar",
    index: 0,
  }), "Random");
  assert.equal(favoriteCivilizationForPlayer(fixtureState, "buyukekrem"), "Huns");

  const withNewPlayer = upsertPlayer(fixtureState, { name: "Yedek" });
  const yedek = withNewPlayer.players.find((player) => player.name === "Yedek");
  assert.equal(latestCivilizationForPlayer(withNewPlayer, yedek.id), "Random");
  assert.equal(favoriteCivilizationForPlayer(withNewPlayer, yedek.id), "Random");
});
```

Extend the existing empty-match assertion:

```js
assert.ok(Object.values(match.teams).flat().every((slot) => slot.playerId === ""));
```

- [ ] **Step 2: Add a failing API compatibility test**

Append to `tests/api-state.test.mjs`:

```js
test("PUT accepts vacant slots and canonicalizes them to Random", async () => {
  const submitted = structuredClone(fixture);
  submitted.matches[0].teams.cortinyanlar[0] = { playerId: "", civilization: "Huns" };
  const handle = createStateHandler({ store: memoryStore() });
  const response = await handle({
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(submitted),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.state.matches[0].teams.cortinyanlar[0], {
    playerId: "",
    civilization: "Random",
  });
});
```

- [ ] **Step 3: Verify the focused tests fail**

Run:

```bash
node --test tests/static-model.test.mjs tests/api-state.test.mjs
```

Expected: FAIL because empty IDs are rejected and the history helpers are not exported.

- [ ] **Step 4: Normalize empty slots without weakening real-player validation**

Replace `normalizeSlot` in `docs/lib/model.js` with:

```js
function normalizeSlot(value, label, playersById) {
  if (!value || typeof value !== "object") throw new Error(`${label} oyuncu satırı geçersiz.`);
  const playerId = typeof value.playerId === "string" ? value.playerId.trim() : "";
  if (!playerId) return { playerId: "", civilization: "Random" };
  if (!playersById.has(playerId)) throw new Error(`${label} oyuncusu kayıtlı değil.`);
  const civilization = typeof value.civilization === "string" ? value.civilization : "";
  if (!civilizationSet.has(civilization)) throw new Error(`${label} için uygarlık seçimi geçersiz.`);
  return { playerId, civilization };
}
```

Change duplicate detection in `normalizeMatch` to ignore vacancies:

```js
const selectedPlayerIds = allPlayerIds.filter(Boolean);
if (new Set(selectedPlayerIds).size !== selectedPlayerIds.length) {
  throw new Error(`${index + 1}. maçta bir oyuncu iki kez yer alamaz.`);
}
```

- [ ] **Step 5: Add deterministic newest-first civilization derivation**

Add these private helpers after `activeRoster`:

```js
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
```

Add the public helpers:

```js
export function latestCivilizationForPlayer(state, playerId, excludedSlot = {}) {
  const normalized = validateState(state);
  if (!playerId) return "Random";
  assertKnownPlayer(normalized, playerId);
  for (const { match } of newestFirstMatchRecords(normalized.matches)) {
    for (const teamId of TEAM_IDS) {
      for (const [index, slot] of match.teams[teamId].entries()) {
        const excluded = match.id === excludedSlot.matchId && teamId === excludedSlot.teamId && index === excludedSlot.index;
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
```

The state-index descending tie-break matches the matrix's existing newest-first behavior when dates are equal.

- [ ] **Step 6: Skip vacancies and attach favorite civilizations to statistics**

At the start of `calculateStatistics`, derive histories once:

```js
const civilizationHistories = civilizationHistoryMap(normalized);
```

Inside the slot loop, add this before reading `playersById`:

```js
if (!slot.playerId) continue;
```

When mapping the final player records, add:

```js
favoriteCivilization: favoriteFromHistory(civilizationHistories.get(player.id)),
```

- [ ] **Step 7: Pass focused tests and commit**

Run:

```bash
node --test tests/static-model.test.mjs tests/api-state.test.mjs
git diff --check
```

Expected: all focused tests pass; existing fixture stays valid and unchanged on disk.

Commit:

```bash
git add docs/lib/model.js tests/static-model.test.mjs tests/api-state.test.mjs
git commit -m "feat: support vacant match slots and civilization history"
```

---

### Task 3: Start New Matches Empty and Restore Civilization on Player Selection

**Files:**
- Modify: `docs/lib/editor.js`
- Modify: `docs/app.js`
- Test: `tests/static-editor.test.mjs`
- Test: `tests/open-editor.test.mjs`
- Test: `tests/spa-controller.test.mjs`

**Interfaces:**
- `validateMatchDraft` accepts zero or more unique real players across eight fixed slots.
- `createDraftController().createMatch(date)` returns eight vacant `Random` slots.
- Player selection writes both `playerId` and latest civilization in one draft update.
- Selecting `-` writes `{ playerId: "", civilization: "Random" }`.

- [ ] **Step 1: Rewrite the failing draft tests around flexible participation**

Replace the first test in `tests/static-editor.test.mjs` with:

```js
test("accepts vacant slots and still rejects duplicate real players", () => {
  const vacant = createEmptyMatch(fixture, "2026-08-02");
  assert.equal(validateMatchDraft(vacant, fixture).teams.cortinyanlar[0].playerId, "");

  const duplicate = completeDraft();
  duplicate.teams.bakracogullari[3].playerId = duplicate.teams.cortinyanlar[0].playerId;
  assert.throws(() => validateMatchDraft(duplicate, fixture), /iki kez/);
});
```

Replace the new-match test in `tests/open-editor.test.mjs` with:

```js
test("creates every new match with eight vacant Random slots", () => {
  const controller = createDraftController({ state: fixture, client: { write: async () => {} } });
  const match = controller.createMatch("2026-08-02");
  const slots = Object.values(match.teams).flat();
  assert.equal(slots.length, 8);
  assert.ok(slots.every((slot) => slot.playerId === ""));
  assert.ok(slots.every((slot) => slot.civilization === "Random"));
});
```

Extend the source contract in `tests/spa-controller.test.mjs`:

```js
assert.match(source, /latestCivilizationForPlayer\(state, input\.value, key\)/);
assert.match(source, /slot\.civilization = civilization/);
```

- [ ] **Step 2: Verify the focused tests fail**

Run:

```bash
node --test tests/static-editor.test.mjs tests/open-editor.test.mjs tests/spa-controller.test.mjs
```

Expected: FAIL because empty drafts are rejected, new matches copy the latest lineup, and the app does not call the history helper.

- [ ] **Step 3: Remove eight-player enforcement and lineup prefill**

In `docs/lib/editor.js`, remove `activeRoster` from the import. Reduce `validateMatchDraft` to:

```js
export function validateMatchDraft(draft, state) {
  if (!draft || typeof draft !== "object" || !draft.teams) throw new Error("Maç kaydı eksik.");
  const selected = allSelectedPlayerIds(draft);
  if (new Set(selected).size !== selected.length) throw new Error("Bir oyuncu maçta iki kez yer alamaz.");

  const normalized = validateState(state);
  const candidate = clone(normalized);
  const index = candidate.matches.findIndex((match) => match.id === draft.id);
  if (index === -1) candidate.matches.push(clone(draft));
  else candidate.matches[index] = clone(draft);
  return validateState(candidate).matches.find((match) => match.id === draft.id);
}
```

Delete `prefilledMatch` and change the controller method to:

```js
createMatch: (date) => createEmptyMatch(draft, date),
```

- [ ] **Step 4: Apply player and civilization together in `docs/app.js`**

Change the model import to:

```js
import { calculateStatistics, latestCivilizationForPlayer } from "./lib/model.js";
```

Replace the real/empty player selection branch with:

```js
const state = controller.getState();
const civilization = latestCivilizationForPlayer(state, input.value, key);
editMatch(key.matchId, (match) => {
  const slot = match.teams[key.teamId][key.index];
  slot.playerId = input.value;
  slot.civilization = civilization;
});
```

Keep the `__new__` dialog branch before this lookup. In the dialog submit handler, initialize the new player's slot in one update:

```js
editMatch(key.matchId, (match) => {
  const slot = match.teams[key.teamId][key.index];
  slot.playerId = added.id;
  slot.civilization = "Random";
});
```

- [ ] **Step 5: Pass focused tests and commit**

Run:

```bash
node --test tests/static-editor.test.mjs tests/open-editor.test.mjs tests/spa-controller.test.mjs
git diff --check
```

Expected: all focused tests pass. No test or implementation calls the network.

Commit:

```bash
git add docs/lib/editor.js docs/app.js tests/static-editor.test.mjs tests/open-editor.test.mjs tests/spa-controller.test.mjs
git commit -m "feat: create blank matches and restore last civilization"
```

---

### Task 4: Alphabetize Team Rows and Render Vacancies Last

**Files:**
- Modify: `docs/lib/matrix.js`
- Test: `tests/matrix-views.test.mjs`

**Interfaces:**
- `orderedTeamSlots(state, slots) -> [{ slot, index }]`
- Public vacancy: `.matrix-player.matrix-player--empty` containing only `-`
- Edit vacancy: selected `<option value="">-</option>` and disabled civilization select
- Stored slot arrays remain in their original order.

- [ ] **Step 1: Add failing render-order and vacant-state tests**

Import the new helper:

```js
import { orderedTeamSlots, renderEditableMatrix, renderMatchMatrix } from "../docs/lib/matrix.js";
```

Add:

```js
test("orders both public and editable team rows alphabetically while preserving slot indexes", () => {
  const state = structuredClone(fixture);
  state.matches = [state.matches[0]];
  const slots = state.matches[0].teams.cortinyanlar;
  const ordered = orderedTeamSlots(state, slots);
  const players = new Map(state.players.map((player) => [player.id, player.name]));
  assert.deepEqual(ordered.map(({ slot }) => players.get(slot.playerId)), [
    "Alman General",
    "Italyan Aygiri",
    "Neudzulab",
    "Zombi",
  ]);

  const publicHtml = renderMatchMatrix(state);
  const publicBlue = publicHtml.match(/matrix-team--blue[^>]*>([\s\S]*?)<\/section>/)[1];
  assert.deepEqual([...publicBlue.matchAll(/data-slot="(\d+)"/g)].map((match) => Number(match[1])), [3, 1, 2, 0]);

  const editHtml = renderEditableMatrix(state);
  const editBlue = editHtml.match(/matrix-team--blue[^>]*>([\s\S]*?)<\/section>/)[1];
  assert.deepEqual([...editBlue.matchAll(/data-edit-slot="[^"]+:(\d+)"/g)].map((match) => Number(match[1])), [3, 1, 2, 0]);
});

test("puts vacant rows last and exposes the dash option without a public crest", () => {
  const state = structuredClone(fixture);
  state.matches = [state.matches[0]];
  state.matches[0].teams.cortinyanlar[1] = { playerId: "", civilization: "Random" };
  state.matches[0].teams.cortinyanlar[3] = { playerId: "", civilization: "Random" };

  const ordered = orderedTeamSlots(state, state.matches[0].teams.cortinyanlar);
  assert.deepEqual(ordered.map(({ slot }) => slot.playerId === ""), [false, false, true, true]);

  const publicHtml = renderMatchMatrix(state);
  assert.equal((publicHtml.match(/matrix-player--empty/g) ?? []).length, 2);
  assert.doesNotMatch(publicHtml, /Bilinmeyen/);
  assert.match(publicHtml, /matrix-player--empty[^>]*>-<\/div>/);

  const editHtml = renderEditableMatrix(state);
  assert.equal((editHtml.match(/<option value="" selected>-<\/option>/g) ?? []).length, 2);
  assert.equal((editHtml.match(/data-civilization-select="[^"]+" disabled/g) ?? []).length, 2);
});
```

Update the existing player-cell count so it accepts the modifier class:

```js
assert.equal((html.match(/class="matrix-player(?: |")/g) ?? []).length, 16);
```

- [ ] **Step 2: Verify the focused test fails**

Run `node --test tests/matrix-views.test.mjs`.

Expected: FAIL because rows use stored order, public vacancies say `Bilinmeyen`, and no selected `-` option exists.

- [ ] **Step 3: Add a stable presentation-only sorter**

Add after `roster` in `docs/lib/matrix.js`:

```js
export function orderedTeamSlots(state, slots) {
  const players = roster(state);
  return slots
    .map((slot, index) => ({ slot, index, player: players.get(slot.playerId) }))
    .sort((a, b) => {
      if (!a.slot.playerId && b.slot.playerId) return 1;
      if (a.slot.playerId && !b.slot.playerId) return -1;
      if (!a.slot.playerId && !b.slot.playerId) return a.index - b.index;
      return a.player.name.localeCompare(b.player.name, "tr-TR") || a.index - b.index;
    })
    .map(({ slot, index }) => ({ slot, index }));
}
```

Do not mutate `slots` and do not save the sorted order back to the controller.

- [ ] **Step 4: Render public vacancies and sorted public rows**

Start `publicPlayerCell` with:

```js
if (!slot.playerId) {
  return `<div class="matrix-player matrix-player--empty" data-team="${escapeHtml(teamId)}" data-slot="${index}">-</div>`;
}
```

Then replace the public team mapping with:

```js
orderedTeamSlots(state, match.teams[team.id])
  .map(({ slot, index: slotIndex }) => publicPlayerCell(players, slot, team.id, slotIndex))
  .join("")
```

- [ ] **Step 5: Render sorted editable rows with original data keys**

Change the initial option in `playerOptions` to:

```js
<option value=""${currentPlayerId ? "" : " selected"}>-</option>
```

Replace the editable team slot mapping with:

```js
orderedTeamSlots(state, match.teams[team.id]).map(({ slot, index }) => {
  const key = `${match.id}:${team.id}:${index}`;
  const selectedElsewhere = new Set(selected.filter((playerId) => playerId !== slot.playerId));
  return `<div class="matrix-player matrix-player--editable" data-edit-slot="${escapeHtml(key)}">
    <img data-civilization-preview src="../assets/civs/${civilizationAssetName(slot.civilization)}" alt="" width="42" height="42">
    <label><span class="sr-only">Oyuncu</span><select data-player-select="${escapeHtml(key)}">${playerOptions(state, slot.playerId, selectedElsewhere)}</select></label>
    <label><span class="sr-only">Uygarlık</span><select data-civilization-select="${escapeHtml(key)}"${slot.playerId ? "" : " disabled"}>${civilizationOptions(slot.civilization)}</select></label>
  </div>`;
}).join("")
```

Add the vacancy-disabled state to the civilization select:

```js
<select data-civilization-select="${escapeHtml(key)}"${slot.playerId ? "" : " disabled"}>${civilizationOptions(slot.civilization)}</select>
```

- [ ] **Step 6: Pass focused tests and commit**

Run:

```bash
node --test tests/matrix-views.test.mjs
git diff --check
```

Expected: public and edit outputs are Turkish-alphabetical, `-` rows are last, and edit keys still point to original indexes.

Commit:

```bash
git add docs/lib/matrix.js tests/matrix-views.test.mjs
git commit -m "feat: alphabetize teams and render vacant slots"
```

---

### Task 5: Add Favorite-Civilization Crests and Narrow Mobile Match Columns

**Files:**
- Modify: `docs/lib/views.js`
- Modify: `docs/styles.css`
- Modify: `scripts/visual-qa.mjs`
- Test: `tests/static-views.test.mjs`
- Test: `tests/static-css.test.mjs`

**Interfaces:**
- Standings nickname cell: `.stats-player` containing a 28px local crest then text.
- Base `--week`: `164px`
- `@media (min-width: 920px)` `--week`: `232px`
- Visual metrics: no document overflow and `Alman General` text fits at 390px.

- [ ] **Step 1: Add failing standings and geometry tests**

In `tests/static-views.test.mjs`, extend the standings assertion:

```js
const general = stats.players.find((player) => player.name === "Alman General");
assert.equal(general.favoriteCivilization, "Random");
assert.match(html, /class="stats-player"/);
assert.match(html, /assets\/civs\/random\.svg/);
assert.ok(html.indexOf("assets/civs/random.svg") < html.indexOf("Alman General"));
```

In `tests/static-css.test.mjs`, replace the broad 232px geometry assertion with breakpoint-specific contracts:

```js
assert.match(css, /:root\s*{[\s\S]*--week:\s*164px/);
assert.match(css, /@media\s*\(min-width:\s*920px\)[\s\S]*--week:\s*232px/);
assert.match(css, /\.matrix-player--empty[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
assert.match(css, /\.stats-player img[\s\S]*width:\s*28px/);
```

- [ ] **Step 2: Verify focused tests fail**

Run:

```bash
node --test tests/static-views.test.mjs tests/static-css.test.mjs
```

Expected: FAIL because standings have no crest wrapper and the base match width is still 232px.

- [ ] **Step 3: Render local favorite-civilization crests**

Add to the top of `docs/lib/views.js`:

```js
import { civilizationAssetName } from "./civilizations.js";
```

Replace the standings row-name cell with:

```js
<th scope="row"><span class="stats-player"><img src="./assets/civs/${civilizationAssetName(player.favoriteCivilization)}" alt="" width="28" height="28"><span>${escapeHtml(player.name)}</span></span></th>
```

The image `alt` stays empty because the adjacent nickname is the row label and the crest is supplementary.

- [ ] **Step 4: Apply the approved mobile geometry and component styles**

Change only the base token in `:root`:

```css
--week: 164px;
```

Keep the existing 920px override at 232px. Add:

```css
.matrix-player--empty {
  grid-template-columns: minmax(0, 1fr);
  place-items: center;
  color: var(--ink-muted);
  font-weight: 700;
}

.stats-player {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
}

.stats-player img {
  display: block;
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  object-fit: contain;
}

.stats-player span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

Do not reduce `--player-row`, the public 38px crest, or desktop width.

- [ ] **Step 5: Update visual QA routes and measured acceptance fields**

In `scripts/visual-qa.mjs`, replace legacy routes with:

```js
{ route: "/?view=matches&edit=1", width: 390, height: 844, name: "edit-390", action: `document.querySelector('[data-add-match]').click()` },
{ route: "/?view=standings", width: 390, height: 844, name: "standings-390" },
```

Remove the obsolete `data-open-players` action. Add these fields inside `metrics`:

```js
const firstMatch = document.querySelector("[data-match-column], [data-edit-match]");
const longestName = [...document.querySelectorAll(".matrix-player strong")]
  .find((element) => element.textContent.trim() === "Alman General");
```

Return:

```js
firstMatchWidth: firstMatch?.getBoundingClientRect().width ?? null,
almanGeneralFits: longestName ? longestName.scrollWidth <= longestName.clientWidth : null,
```

- [ ] **Step 6: Pass focused tests and commit**

Run:

```bash
node --test tests/static-views.test.mjs tests/static-css.test.mjs
git diff --check
```

Expected: standings crest and CSS contracts pass.

Commit:

```bash
git add docs/lib/views.js docs/styles.css scripts/visual-qa.mjs tests/static-views.test.mjs tests/static-css.test.mjs
git commit -m "feat: add favorite civ crests and compact mobile columns"
```

---

### Task 6: Refresh Product Documentation and Run Complete Local QA

**Files:**
- Modify: `README.md`
- Modify: `DESIGN.md`
- Verify only: all source, API, and test files
- Generated locally, ignored by Git: `.impeccable/qa/*.png`

**Interfaces:**
- Documentation must describe 3v3/4v4 behavior, vacant slots, automatic latest civilization, favorite crest, 164px mobile width, 232px desktop width, and unchanged last-writer-wins persistence.

- [ ] **Step 1: Update `README.md` without adding UI copy**

Change the opening description to:

```markdown
Haftalık Age of Empires II: Definitive Edition 3v3 ve 4v4 maçları için telefon öncelikli ortak maç defteri.
```

Extend the player workflow paragraph with:

```markdown
Yeni maç sekiz boş `-` satırıyla açılır; 3v3 için kullanılmayan iki satır boş bırakılır. Bir oyuncu seçildiğinde son oynadığı uygarlık otomatik gelir. Takım satırları yalnız görünümde alfabetik sıralanır ve boş satırlar en sonda kalır. Sıralamada her oyuncunun en sık seçtiği uygarlığın arması gösterilir.
```

- [ ] **Step 2: Bring `DESIGN.md` geometry and component rules up to date**

Make these exact conceptual changes:

- Replace “4v4 matrix” with “fixed four-slot-per-team matrix supporting 3v3 and 4v4.”
- Base phone match columns are 164px; 920px-and-up columns are 232px.
- Four 54px rows per team always remain visible; vacant rows display `-` and sort last.
- Real players sort Turkish-alphabetically in public and edit renderers, without rewriting stored slot arrays.
- Player selection includes `-`; its civilization control is disabled; real selections restore latest history.
- Standings nickname cells include a 28px favorite-civilization crest.
- Keep the existing explicit last-writer-wins warning against stale-conflict chrome.

Update the YAML `components.matrix-player` description only if necessary; do not introduce new colors, radii, or spacing tokens.

- [ ] **Step 3: Run the complete automated suite**

Run:

```bash
npm test
git diff --check
```

Expected: every test passes with `# fail 0`; no whitespace errors.

- [ ] **Step 4: Run local read-only visual QA at the required viewports**

Start the existing Vercel development server with the linked local environment and a headless Chrome CDP session, then run:

```bash
npm run qa:visual
```

Expected at 390 × 844:

- `firstMatchWidth` is 164 in match and match-edit views;
- `almanGeneralFits` is `true` in the public match view;
- `documentScrollWidth` equals `innerWidth`;
- matrix `scrollWidth` is larger than its `clientWidth` when enough matches exist;
- `railLeftBefore` equals `railLeftAfter`;
- `failedImages`, `runtimeErrors`, and `openDialogs` are empty;
- standings crests load and appear before nicknames;
- empty new-match rows show `-`, stay last, and do not compress row height.

Inspect `.impeccable/qa/public-390.png`, `.impeccable/qa/edit-390.png`, and `.impeccable/qa/standings-390.png` visually. Do not click Save and do not issue an API PUT.

- [ ] **Step 5: Commit documentation**

```bash
git add README.md DESIGN.md
git commit -m "docs: document flexible weekly match slots"
```

---

### Task 7: Deploy Without Mutating Production State

**Files:**
- Verify only: Git history and tracked project files
- Create locally, ignored by Git: `.qa/data-safety-2026-08-02/predeploy.*`
- Create locally, ignored by Git: `.qa/data-safety-2026-08-02/after.*`

**Interfaces:**
- Git remote: `github` / `main`
- Production: `https://53aoe.vercel.app`
- State verification: GET only

- [ ] **Step 1: Capture a fresh pre-deploy GET baseline**

Run:

```bash
curl --fail --silent --show-error \
  --dump-header .qa/data-safety-2026-08-02/predeploy.headers \
  --output .qa/data-safety-2026-08-02/predeploy.json \
  https://53aoe.vercel.app/api/state
shasum -a 256 .qa/data-safety-2026-08-02/predeploy.json > .qa/data-safety-2026-08-02/predeploy.sha256
```

Validate it with the same read-only Node script from Task 1. Treat this fresh file—not the design-time counts—as the authoritative pre-deploy baseline.

- [ ] **Step 2: Confirm the exact release contents**

Run:

```bash
git status --short
git log --oneline ea9e4ca..HEAD
npm test
```

Expected: clean worktree and only the planned feature commits after the spec correction. No changes to `docs/data/state.json`, seed scripts, Blob credentials, or Vercel environment files.

- [ ] **Step 3: Push source to GitHub and deploy the committed tree**

Run:

```bash
git push github main
vercel deploy --prod --yes
```

Expected: GitHub accepts `main`; Vercel returns a successful production deployment for the same committed source. The deployment process must not run `npm run data:seed`.

- [ ] **Step 4: Fetch production state after deployment using GET only**

Run:

```bash
curl --fail --silent --show-error \
  --dump-header .qa/data-safety-2026-08-02/after.headers \
  --output .qa/data-safety-2026-08-02/after.json \
  https://53aoe.vercel.app/api/state
shasum -a 256 .qa/data-safety-2026-08-02/after.json > .qa/data-safety-2026-08-02/after.sha256
```

- [ ] **Step 5: Compare all live data semantically**

Run:

```bash
node --input-type=module - <<'NODE'
import { readFile } from "node:fs/promises";
import { validateState } from "./docs/lib/model.js";
const readState = async (path) => validateState(JSON.parse(await readFile(path, "utf8")).state);
const before = await readState(".qa/data-safety-2026-08-02/predeploy.json");
const after = await readState(".qa/data-safety-2026-08-02/after.json");
const result = {
  playersEqual: JSON.stringify(before.players) === JSON.stringify(after.players),
  matchesEqual: JSON.stringify(before.matches) === JSON.stringify(after.matches),
  revisionEqual: before.revision === after.revision,
  updatedAtEqual: before.updatedAt === after.updatedAt,
  before: { players: before.players.length, matches: before.matches.length, revision: before.revision, updatedAt: before.updatedAt },
  after: { players: after.players.length, matches: after.matches.length, revision: after.revision, updatedAt: after.updatedAt },
};
console.log(JSON.stringify(result, null, 2));
if (!result.playersEqual || !result.matchesEqual || !result.revisionEqual || !result.updatedAtEqual) process.exitCode = 1;
NODE
```

Expected: all four equality fields are `true`. If any value differs, do not restore `predeploy.json`; a real user may have edited during deployment. Fetch again, inspect the newer revision, and report the concurrent change without issuing a write.

- [ ] **Step 6: Verify production UI and headers read-only**

Open these routes without entering edit/save flows:

```text
https://53aoe.vercel.app/
https://53aoe.vercel.app/?view=standings
```

Verify:

- current matches and player data are present;
- mobile match columns are 164px and teams are alphabetic;
- any vacant rows appear as trailing `-` rows;
- standings crests load from local assets;
- `Alman General` is fully visible in a match row at 390px;
- `X-Robots-Tag` still contains `noindex, nofollow, noarchive, nosnippet, noimageindex`;
- `/robots.txt` still disallows `/`.

Do not press the pencil, Save, or any delete action during production verification.

- [ ] **Step 7: Record the final release state**

Run:

```bash
git status --short
git log -6 --oneline
```

Expected: clean worktree, all feature/documentation commits present on `main`, production URL healthy, and production state unchanged by deployment.

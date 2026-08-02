# Compact Team Rail and Labeled Score Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the wide named matrix rail with an 8px/12px color rail, move the medal beside each public winner, and add subtle team names to a 68px score strip.

**Architecture:** Keep the existing pure renderers and single CSS geometry system. `views.js` adds semantic score children, `matrix.js` moves decorative medal markup from the shared rail into valid public results, and `styles.css` owns all size and alignment changes. No state, API, controller, authentication, or persistence code changes.

**Tech Stack:** Static HTML, CSS, JavaScript ES modules, Node.js 22 test runner, Vercel, local Tabler SVG assets.

## Global Constraints

- Preserve live state byte-for-byte; production state access is GET-only during verification.
- Keep match columns 164px on phones and 232px on desktop.
- Keep date/player/public-result rows at 34px/54px/38px.
- Set the score strip to exactly 68px.
- Set the sticky rail to exactly 8px below 920px and 12px from 920px.
- Render score team names at 10px and 50% opacity.
- Keep the medal local, decorative, 18px, and beside the public winner name only.
- Preserve the complete newest match at 390×844 and prevent document-level horizontal overflow.
- Do not modify model, API, controller, authentication, or persistence files.

---

### Task 1: Render labeled aggregate scores

**Files:**
- Modify: `tests/static-views.test.mjs:9-17`
- Modify: `docs/lib/views.js:24-29`

**Interfaces:**
- Consumes: `state.teams: Array<{id: string, name: string}>` and `stats.teams: Record<string, number>`.
- Produces: `renderScoreStrip(state, stats): string` with two `.score-team-name` spans and two `.score-value` strong elements.

- [ ] **Step 1: Strengthen the score renderer test**

Replace the current score test with:

```js
test("renders labeled blue-red scores without redundant copy", () => {
  const html = renderScoreStrip(state, stats);
  assert.equal((html.match(/class="score-team-name"/g) ?? []).length, 2);
  assert.equal((html.match(/class="score-value"/g) ?? []).length, 2);
  assert.match(html, /class="score-team-name">Cortinyanlar</);
  assert.match(html, /class="score-team-name">Bakracoğulları</);
  assert.match(html, /class="score-value">2</);
  assert.match(html, /score-dash/);
  assert.doesNotMatch(html, /VS|maç|önde/);
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run:

```bash
node --test tests/static-views.test.mjs
```

Expected: FAIL because `score-team-name` and `score-value` do not exist.

- [ ] **Step 3: Add score label and value markup**

Replace `renderScoreStrip` with:

```js
export function renderScoreStrip(state, stats) {
  const [blue, red] = state.teams;
  const score = (team, color) => `<div class="score-number score-number--${color}" aria-label="${escapeHtml(team.name)} ${stats.teams[team.id]}"><span class="score-team-name">${escapeHtml(team.name)}</span><strong class="score-value">${stats.teams[team.id]}</strong></div>`;
  return `${score(blue, "blue")}
    <span class="score-dash" aria-hidden="true">–</span>
    ${score(red, "red")}`;
}
```

- [ ] **Step 4: Run the focused test and verify pass**

Run:

```bash
node --test tests/static-views.test.mjs
```

Expected: all tests in `static-views.test.mjs` PASS.

- [ ] **Step 5: Commit the score renderer**

```bash
git add tests/static-views.test.mjs docs/lib/views.js
git commit -m "feat: label aggregate team scores"
```

---

### Task 2: Move the medal from the rail to public results

**Files:**
- Modify: `tests/matrix-views.test.mjs:18-33`
- Modify: `docs/lib/matrix.js:29-56`

**Interfaces:**
- Consumes: existing `renderMatchMatrix(state): string` and `renderEditableMatrix(state): string`.
- Produces: empty colored rail bands; `.matrix-result__medal` only inside valid public `.matrix-result` cells.

- [ ] **Step 1: Replace rail and medal assertions**

Replace the two rail/medal tests with:

```js
test("keeps only empty colored team bands in the rail", () => {
  const html = renderMatchMatrix(fixture);
  const rail = html.match(/<aside class="matrix-rail"[\s\S]*?<\/aside>/)[0];
  assert.match(rail, /rail-team--blue/);
  assert.match(rail, /rail-team--red/);
  assert.doesNotMatch(rail, /<strong|Cortinyanlar|Bakracoğulları|medal\.svg/);
  assert.doesNotMatch(html, />Takım<|>Slot<|>P1<|>P2<|>P3<|>P4<|>Kazanan</);
});

test("shows one local winner medal beside every public result", () => {
  const publicHtml = renderMatchMatrix(fixture);
  const editHtml = renderEditableMatrix(fixture);
  assert.equal((publicHtml.match(/matrix-result__medal/g) ?? []).length, fixture.matches.length);
  assert.equal((publicHtml.match(/assets\/icons\/medal\.svg/g) ?? []).length, fixture.matches.length);
  assert.match(publicHtml, /matrix-result__medal[\s\S]*Cortinyanlar|matrix-result__medal[\s\S]*Bakracoğulları/);
  assert.doesNotMatch(editHtml, /matrix-result__medal/);
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run:

```bash
node --test tests/matrix-views.test.mjs
```

Expected: FAIL because the rail still contains names and one `rail-result__medal`.

- [ ] **Step 3: Empty the rail and render valid-result medal markup**

Replace `railMarkup` with:

```js
function railMarkup(state) {
  return `<aside class="matrix-rail" aria-hidden="true">
    <div class="rail-date"></div>
    ${state.teams.map((_, index) => `<div class="rail-team rail-team--${index === 0 ? "blue" : "red"}"></div>`).join("")}
    <div class="rail-result"></div>
  </aside>`;
}
```

Inside `publicMatchColumn`, add this line after `winnerIndex`:

```js
const result = winner
  ? `<img class="matrix-result__medal" src="./assets/icons/medal.svg" alt="" width="18" height="18"><strong>${escapeHtml(winner.name)}</strong>`
  : "";
```

Replace the public result element with:

```js
<div class="matrix-result matrix-result--${winnerIndex === 0 ? "blue" : "red"}">${result}</div>
```

- [ ] **Step 4: Run the focused test and verify pass**

Run:

```bash
node --test tests/matrix-views.test.mjs
```

Expected: all tests in `matrix-views.test.mjs` PASS.

- [ ] **Step 5: Commit the matrix renderer**

```bash
git add tests/matrix-views.test.mjs docs/lib/matrix.js
git commit -m "feat: place medals beside match winners"
```

---

### Task 3: Apply compact geometry and update the durable design system

**Files:**
- Modify: `tests/static-css.test.mjs:17-29`
- Modify: `docs/styles.css:38-67,260-400,524-550,874-878`
- Modify: `DESIGN.md`

**Interfaces:**
- Consumes: `.score-team-name`, `.score-value`, and `.matrix-result__medal` from Tasks 1-2.
- Produces: `--score-row: 68px`, `--rail: 8px`, desktop `--rail: 12px`, and final score/result alignment.

- [ ] **Step 1: Replace geometry assertions**

In `binds the compact matrix geometry`, replace the rail assertions and remove the vertical-writing assertion:

```js
assert.match(css, /:root\s*{[\s\S]*--rail:\s*8px/);
assert.match(css, /:root\s*{[\s\S]*--score-row:\s*68px/);
assert.match(css, /:root\s*{[\s\S]*--week:\s*164px/);
assert.match(css, /@media\s*\(min-width:\s*920px\)[\s\S]*--rail:\s*12px/);
assert.match(css, /@media\s*\(min-width:\s*920px\)[\s\S]*--week:\s*232px/);
assert.doesNotMatch(css, /writing-mode:\s*vertical-rl/);
```

Add a new test:

```js
test("labels the taller score and aligns medals with winners", () => {
  assert.match(css, /\.score-strip[\s\S]*height:\s*var\(--score-row\)/);
  assert.match(css, /\.score-team-name[\s\S]*font-size:\s*10px[\s\S]*opacity:\s*0\.5/);
  assert.match(css, /\.matrix-result__medal[\s\S]*width:\s*18px/);
  assert.doesNotMatch(css, /rail-result__medal/);
});
```

- [ ] **Step 2: Run CSS tests and verify failure**

Run:

```bash
node --test tests/static-css.test.mjs
```

Expected: FAIL on the old 31px/48px rail, missing 68px score token, and missing result medal CSS.

- [ ] **Step 3: Update root tokens and score geometry**

Set the geometry tokens to:

```css
--touch: 44px;
--brand-row: 40px;
--score-row: 68px;
--rail: 8px;
--week: 164px;
```

Replace the score styles with:

```css
.score-strip {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 24px minmax(0, 1fr);
  height: var(--score-row);
  min-height: var(--score-row);
  border-bottom: 1px solid var(--rule);
}

.score-number {
  display: flex;
  min-width: 0;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  color: #fff8e7;
  text-shadow: 0 1px 0 rgb(0 0 0 / 45%);
}

.score-team-name {
  max-width: calc(100% - 12px);
  overflow: hidden;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  opacity: 0.5;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.score-value {
  font-size: 32px;
  font-weight: 700;
  line-height: 1;
}
```

In the public parchment filler, replace the literal `52px` subtraction with `var(--score-row)`.

- [ ] **Step 4: Simplify rail and align result content**

Keep `.rail-result` as a deep-brown blank cell, delete `.rail-result__medal` and `.rail-team strong`, and reduce `.rail-team` to:

```css
.rail-team {
  min-height: 0;
  overflow: hidden;
}
```

Replace the public result layout with:

```css
.matrix-result {
  display: flex;
  min-width: 0;
  height: var(--result-row);
  align-items: center;
  justify-content: center;
  gap: 5px;
  overflow: hidden;
  border-top: 1px solid var(--rule);
  color: #fff8e7;
  text-shadow: 0 1px 0 rgb(0 0 0 / 45%);
}

.matrix-result__medal {
  display: block;
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  filter: invert(70%) sepia(54%) saturate(623%) hue-rotate(2deg) brightness(91%);
}

.matrix-result strong {
  max-width: calc(100% - 31px);
  overflow: hidden;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

At the desktop breakpoint set:

```css
:root {
  --rail: 12px;
  --week: 232px;
}
```

- [ ] **Step 5: Update `DESIGN.md` to the approved geometry**

Make these durable replacements:

- score component heights: `52px` → `68px`;
- phone/desktop rail values: `31px/48px` → `8px/12px`;
- canonical stack: `40 + 44 + 68 + 504 = 656px`;
- score strip: visible 10px, 50%-opacity names above 32px totals;
- matrix rail: empty blue/red color bands with no vertical copy;
- winner result: 18px medal followed by exact team name;
- naming rule: exact team names remain visible in score and results, not in the rail.

Replace the two component paragraphs with:

```markdown
### Score Strip

The score is a fixed 68px three-part strip: flexible deep-blue total, 24px deep-brown dash, and flexible deep-red total. Each colored field places the exact 10px team name at 50% opacity above its dominant 32px total. Combined accessible labels announce each team name and score.

### Weekly Match Matrix

The sticky rail is 8px on phones and 12px from 920px. Its two empty color sections each span exactly four player rows: Cortinyanlar blue above Bakracoğulları red. The date and result rail cells remain blank deep brown; the rail contains no text or medal.

Each mobile 164px match column contains a centered date, eight player cells, and one named winner result; it grows to 232px on desktop. A valid public result centers one 18px local gold-filtered medal beside the exact winning team name. Editable results retain only the winner select and delete action.
```

- [ ] **Step 6: Run focused and full tests**

Run:

```bash
node --test tests/static-css.test.mjs tests/static-views.test.mjs tests/matrix-views.test.mjs
npm test
git diff --check
```

Expected: focused tests PASS, then all 68-or-more project tests PASS, and `git diff --check` emits no output.

- [ ] **Step 7: Commit geometry and design system**

```bash
git add tests/static-css.test.mjs docs/styles.css DESIGN.md
git commit -m "feat: compact team rail and expand score strip"
```

---

### Task 4: Measure, inspect, and ship without touching data

**Files:**
- Modify: `scripts/visual-qa.mjs:89-137`
- Generated and ignored: `.impeccable/qa/*.png`

**Interfaces:**
- Consumes: local or production app URL through `APP_URL`.
- Produces: measured score height, rail width, medal count, rail text, matrix bottom, overflow, failed-image, and runtime-error evidence.

- [ ] **Step 1: Extend QA metrics**

Add these queries before the returned metrics object:

```js
const scoreStrip = document.querySelector('.score-strip');
const railText = rail?.textContent.trim() ?? "";
const resultMedals = document.querySelectorAll('.matrix-result__medal').length;
```

Add these keys to the returned object:

```js
scoreStripHeight: scoreStrip?.getBoundingClientRect().height ?? null,
scoreLabels: document.querySelectorAll('.score-team-name').length,
railText,
resultMedals,
matrixBottom: matrix?.getBoundingClientRect().bottom ?? null,
```

- [ ] **Step 2: Start local Vercel and headless Chrome**

Run in separate terminal sessions:

```bash
npm run dev:vercel
```

```bash
qa_chrome_dir=$(mktemp -d /tmp/aoe53-compact-rail.XXXXXX)
'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' --headless=new --remote-debugging-port=9223 --user-data-dir="$qa_chrome_dir" --no-first-run --no-default-browser-check about:blank
```

Expected: Vercel ready on `http://localhost:4173`; DevTools ready on port 9223.

- [ ] **Step 3: Run one batched local visual QA pass**

Run:

```bash
node --env-file=.env.local scripts/visual-qa.mjs
```

Expected public checks:

- `scoreStripHeight === 68`;
- `scoreLabels === 2`;
- `railWidth === 8` at 320/390 and `12` at 1440;
- `railText === ""`;
- `resultMedals === 5` with current live development data;
- `matrixBottom <= 844` for `public-390`;
- `rootHasHorizontalOverflow === false`;
- `failedImages` and `runtimeErrors` are empty.

Expected edit checks: `resultMedals === 0`, rail remains sticky, and there is no document-level horizontal overflow.

Inspect `.impeccable/qa/public-320.png`, `public-390.png`, `public-1440.png`, and `edit-390.png` together. If one correction is necessary, apply all observed corrections in one patch and run one confirmation round only.

- [ ] **Step 4: Run the design detector once**

```bash
node /Users/eko/.codex/skills/impeccable/scripts/detect.mjs --json docs/index.html docs/styles.css
```

Expected: no new blocking findings attributable to this change; existing documented advisories may remain.

- [ ] **Step 5: Commit QA instrumentation**

```bash
git add scripts/visual-qa.mjs
git commit -m "test: measure compact score and result geometry"
```

- [ ] **Step 6: Record live state without writing**

Run:

```bash
curl -fsS https://53aoe.vercel.app/api/state | shasum -a 256
curl -fsS https://53aoe.vercel.app/api/state | jq '{revision:.state.revision, players:(.state.players|length), matches:(.state.matches|length), updatedAt:.state.updatedAt}'
```

Expected: record the SHA-256 plus revision/player/match counts for exact post-deploy comparison. Do not send POST or PUT.

- [ ] **Step 7: Push and deploy**

```bash
git push github main
deployment_url=$(vercel deploy --prod --yes)
vercel alias set "$deployment_url" 53aoe.vercel.app
```

Expected: GitHub `main` points to local HEAD and `https://53aoe.vercel.app` points to the new production deployment.

- [ ] **Step 8: Verify production UI and data**

Run:

```bash
APP_URL=https://53aoe.vercel.app/ QA_CHECK=public-390 node --env-file=.env.local scripts/visual-qa.mjs
curl -fsS https://53aoe.vercel.app/api/state | shasum -a 256
curl -fsS https://53aoe.vercel.app/api/state | jq '{revision:.state.revision, players:(.state.players|length), matches:(.state.matches|length), updatedAt:.state.updatedAt}'
git status --short
git rev-parse HEAD
git ls-remote github refs/heads/main
```

Expected: production metrics match local acceptance values; post-deploy SHA-256 and state summary exactly match Step 6; working tree is clean; local and GitHub hashes match.

- [ ] **Step 9: End wake lock and sleep the Mac**

Stop the active `caffeinate`, local Vercel, and headless Chrome sessions, then run:

```bash
pmset sleepnow
```

Expected: the Mac enters sleep only after all verification, push, deploy, and data-safety checks complete.

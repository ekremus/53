# Minimal AOE2 SPA Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current three-route tracker with one minimal mobile-first AOE2 SPA, fix civilization persistence, and remove stale-publish conflicts through last-write-wins storage.

**Architecture:** `docs/app.js` becomes the single browser controller for `Maçlar`, `Sıralama`, and their edit states. Existing model, matrix, editor, and state-client modules remain focused on data and markup. The Vercel API validates full-state writes and overwrites one private Blob document without browser-held ETag preconditions.

**Tech Stack:** Vanilla HTML/CSS/ES modules, Node 22 test runner, Vercel Functions, `@vercel/blob`, local Merriweather fonts, local AOE2 civilization and parchment assets.

## Global Constraints

- Public `Maçlar` contains only the top control, `2–0`-style score, and complete newest-first horizontal matrix.
- The top control contains `Maçlar | Sıralama` and one pencil edit action; there is no floating or bottom navigation.
- Remove `Haftalık 4v4`, `Maç Defteri`, explanatory copy, `Takım`, `Slot`, P1–P4, leader copy, and total-match copy.
- Cortinyanlar is always blue; Bakracoğulları is always red; orange is prohibited as a team role.
- Team names are vertical and the full newest match fits inside 390×844 without document-level vertical scrolling.
- Player rows are at most 54 px; match columns are 228–234 px; touch targets remain at least 44×44 px.
- Use local Merriweather, local parchment texture, black-brown ink, square controls, and fine dark/bronze rules measured from aoe2techtree.net.
- No framework, authentication, password, GitHub token, realtime merge, database, or new match statistics.
- Preserve existing production players, matches, civilization assets, calculated statistics, and Vercel Blob storage.
- Writes are last-write-wins and never show a stale-publish conflict.

## File Structure

- `docs/index.html`: canonical SPA shell and direction contract.
- `docs/app.js`: route/view/edit state, data loading, DOM event delegation, save lifecycle, and dialogs.
- `docs/lib/views.js`: pure score, standings, top-control, and notice markup.
- `docs/lib/matrix.js`: pure public/edit match matrix markup with vertical team rail.
- `docs/lib/editor.js`: draft controller and pure player manager markup.
- `docs/lib/state-api.js`: same-origin read/write client without ETag arguments.
- `docs/styles.css`: complete AOE2 paper design system and responsive geometry.
- `docs/edit/index.html`, `docs/stats/index.html`: legacy route redirects into SPA query state.
- `docs/legacy.js`: small external redirect controller compatible with CSP.
- `docs/assets/paper.jpg`: local parchment texture sourced from the AOE2 Tech Tree project.
- `docs/assets/icons/*.svg`: local MIT-licensed interface icons from one icon family.
- `docs/assets/icons/NOTICE.md`: icon provenance and license link.
- `api/lib/blob-store.js`: single-read metadata and unconditional fixed-path overwrite.
- `api/lib/state-handler.js`: last-write-wins validation and revision stamping.
- `tests/*.test.mjs`: API, draft, renderer, SPA shell, CSS, asset, and security regressions.

---

### Task 1: Last-write-wins state and civilization regression

**Files:**
- Modify: `tests/state-api.test.mjs`
- Modify: `tests/api-state.test.mjs`
- Modify: `tests/open-editor.test.mjs`
- Modify: `docs/lib/state-api.js`
- Modify: `docs/lib/editor.js`
- Modify: `api/lib/blob-store.js`
- Modify: `api/lib/state-handler.js`

**Interfaces:**
- Consumes: `validateState(state)`, `createDraftController({ state, client, render, notify })`.
- Produces: `client.write(state) -> Promise<{ state }>` and unconditional `store.write(state) -> Promise<{ state, etag }>`.

- [ ] **Step 1: Write failing client and API tests**

Replace the ETag-specific client assertion with:

```js
test("publishes complete JSON without a browser concurrency token", async () => {
  let request;
  const client = createStateClient({ fetchImplementation: async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({ state: { revision: 4 } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } });
  await client.write({ revision: 3 });
  assert.equal(request.options.method, "PUT");
  assert.equal(request.options.headers["If-Match"], undefined);
});
```

Add an API test that sends a state with an old revision and expects `200`, the server’s current revision plus one, and the submitted valid content.

- [ ] **Step 2: Write the failing civilization draft test**

Add to `tests/open-editor.test.mjs`:

```js
test("civilization change becomes dirty and persists in the complete write", async () => {
  let written;
  const client = {
    async write(state) {
      written = structuredClone(state);
      return { state: { ...state, revision: state.revision + 1 } };
    },
  };
  const controller = createDraftController({ state: fixture, client });
  const match = controller.getState().matches[0];
  const changed = structuredClone(match);
  changed.teams.cortinyanlar[0].civilization = "Armenians";
  controller.saveMatch(changed);
  assert.equal(controller.getSnapshot().dirty, true);
  await controller.publish();
  assert.equal(written.matches[0].teams.cortinyanlar[0].civilization, "Armenians");
  assert.equal(controller.getSnapshot().dirty, false);
});
```

- [ ] **Step 3: Run focused tests and verify failure**

Run: `node --test tests/state-api.test.mjs tests/api-state.test.mjs tests/open-editor.test.mjs`  
Expected: FAIL because the implementation still requires and compares ETags.

- [ ] **Step 4: Implement unconditional validated writes**

Change the browser client to:

```js
write: (state) => request({
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(state),
}),
```

Make `createBlobStateStore.read()` return the ETag on the same `getBlob()` result rather than racing `get()` and `head()`. Make `write()` omit `ifMatch`. In the handler, validate submitted content, replace its revision with `current.state.revision + 1`, stamp `updatedAt`, and write without returning `409` for stale state.

Update `createDraftController` to remove `currentEtag`; `publish()` calls `client.write(validateState(draft))` and replaces the baseline with the returned validated state.

- [ ] **Step 5: Run focused tests**

Run: `node --test tests/state-api.test.mjs tests/api-state.test.mjs tests/open-editor.test.mjs`  
Expected: all tests PASS, including the civilization persistence regression.

- [ ] **Step 6: Commit**

```bash
git add docs/lib/state-api.js docs/lib/editor.js api/lib/blob-store.js api/lib/state-handler.js tests/state-api.test.mjs tests/api-state.test.mjs tests/open-editor.test.mjs
git commit -m "fix: make shared edits persist without stale conflicts"
```

---

### Task 2: Minimal renderers and vertical match rail

**Files:**
- Modify: `tests/matrix-views.test.mjs`
- Modify: `tests/static-views.test.mjs`
- Modify: `docs/lib/views.js`
- Modify: `docs/lib/matrix.js`

**Interfaces:**
- Consumes: validated state and `calculateStatistics(state)` result.
- Produces: `renderTopControl({ view, editing, dirty, saving })`, `renderScoreStrip(state, stats)`, `renderStatsTable(stats)`, `renderMatchMatrix(state)`, and `renderEditableMatrix(state)`.

- [ ] **Step 1: Write failing renderer assertions**

Assert that score markup contains the blue and red win numbers joined by one separator and does not contain `VS`, `maç`, or `önde`. Assert that the rail contains the exact team names but not `Takım`, `Slot`, `P1`, `P2`, `P3`, `P4`, or `Kazanan`.

Add top-control assertions:

```js
const html = renderTopControl({ view: "matches", editing: false, dirty: false, saving: false });
assert.match(html, />Maçlar</);
assert.match(html, />Sıralama</);
assert.match(html, /data-enter-edit/);
assert.doesNotMatch(html, /53|Haftalık|Görüntüle/);
```

- [ ] **Step 2: Run renderer tests and verify failure**

Run: `node --test tests/matrix-views.test.mjs tests/static-views.test.mjs`  
Expected: FAIL on old score and rail copy.

- [ ] **Step 3: Implement score and top control**

Use semantic buttons for the view switch and an image-backed icon button for edit:

```js
export function renderScoreStrip(state, stats) {
  const [blue, red] = state.teams;
  return `<div class="score-number score-number--blue" aria-label="${escapeHtml(blue.name)} ${stats.teams[blue.id]}">${stats.teams[blue.id]}</div>
    <span class="score-dash" aria-hidden="true">–</span>
    <div class="score-number score-number--red" aria-label="${escapeHtml(red.name)} ${stats.teams[red.id]}">${stats.teams[red.id]}</div>`;
}
```

`renderTopControl` renders the active `Maçlar | Sıralama` segmented button state and either pencil, save, or close controls with Turkish `aria-label` values.

- [ ] **Step 4: Implement the compact matrix**

Replace `railMarkup` with two vertical team blocks only. Public player cells keep crest, player, and civilization. Winner markup contains only the winning team name or a compact result control; it uses `matrix-result--blue` or `matrix-result--red`, never green.

Editable markup keeps the same row count and exposes date, player, civilization, winner, and per-match delete actions. Player management is not rendered inside the match matrix.

- [ ] **Step 5: Run renderer tests**

Run: `node --test tests/matrix-views.test.mjs tests/static-views.test.mjs`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add docs/lib/views.js docs/lib/matrix.js tests/matrix-views.test.mjs tests/static-views.test.mjs
git commit -m "feat: distill the weekly match matrix"
```

---

### Task 3: Single-page shell and route state

**Files:**
- Modify: `tests/static-shell.test.mjs`
- Modify: `tests/static-editor.test.mjs`
- Modify: `docs/index.html`
- Create: `docs/legacy.js`
- Replace: `docs/edit/index.html`
- Replace: `docs/stats/index.html`
- Modify: `vercel.json`

**Interfaces:**
- Consumes: `docs/app.js` entrypoint and `styles.css`.
- Produces: `#top-control`, `#score-strip`, `#surface-root`, `#notice-region`, `#confirm-dialog`, and URL-derived initial state.

- [ ] **Step 1: Write failing shell tests**

Assert that the canonical shell contains exactly one main surface root and no `.tracker-identity`, `.matrix-title-row`, `.action-menu`, `.action-seal`, `.publish-seal`, `Haftalık 4v4`, or `Maç Defteri`.

Assert legacy HTML files contain only metadata plus `legacy.js` and a `data-legacy-target` value.

- [ ] **Step 2: Run shell tests and verify failure**

Run: `node --test tests/static-shell.test.mjs tests/static-editor.test.mjs`  
Expected: FAIL on old multi-route chrome.

- [ ] **Step 3: Replace the canonical shell**

The main structure is:

```html
<body>
  <main id="app" class="app-shell">
    <header id="top-control" class="top-control" aria-label="Görünüm ve düzenleme"></header>
    <section id="score-strip" class="score-strip" aria-label="Skor" aria-busy="true"></section>
    <section id="surface-root" class="surface-root" aria-live="polite" aria-busy="true"></section>
  </main>
  <dialog id="confirm-dialog"></dialog>
  <div id="notice-region" class="notice-region" aria-live="assertive"></div>
</body>
```

Keep the five-block direction contract in an HTML comment and update it to the approved minimal AOE2 SPA.

- [ ] **Step 4: Add legacy redirects**

`docs/legacy.js` reads `document.body.dataset.legacyTarget` and calls `location.replace()` with `/?view=standings` for `/stats/` or `/?view=matches&edit=1` for `/edit/`. The two legacy HTML files load only this external script under the existing CSP.

- [ ] **Step 5: Run shell tests**

Run: `node --test tests/static-shell.test.mjs tests/static-editor.test.mjs`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add docs/index.html docs/legacy.js docs/edit/index.html docs/stats/index.html vercel.json tests/static-shell.test.mjs tests/static-editor.test.mjs
git commit -m "feat: unify tracker navigation in one spa shell"
```

---

### Task 4: SPA controller and contextual editing

**Files:**
- Modify: `tests/static-model.test.mjs`
- Create: `tests/spa-controller.test.mjs`
- Modify: `docs/app.js`
- Delete: `docs/edit.js`
- Delete: `docs/stats.js`
- Modify: `docs/lib/editor.js`

**Interfaces:**
- Consumes: renderers from Task 2 and `createStateClient()` from Task 1.
- Produces: `parseAppLocation(locationLike) -> { view, editing }`, `buildAppUrl({ view, editing }) -> string`, and `startApp(documentRoot, options) -> Promise<AppController>`.

- [ ] **Step 1: Write failing pure route tests**

```js
test("parses and builds matches and standings states", () => {
  assert.deepEqual(parseAppLocation({ search: "?view=standings&edit=1" }), { view: "standings", editing: true });
  assert.equal(buildAppUrl({ view: "matches", editing: false }), "/");
  assert.equal(buildAppUrl({ view: "standings", editing: false }), "/?view=standings");
  assert.equal(buildAppUrl({ view: "matches", editing: true }), "/?view=matches&edit=1");
});
```

Add static assertions proving `docs/app.js` owns `data-set-view`, `data-enter-edit`, `data-save`, `data-exit-edit`, `data-add-match`, player editing, civilization editing, and history changes.

- [ ] **Step 2: Run controller tests and verify failure**

Run: `node --test tests/spa-controller.test.mjs tests/static-model.test.mjs`  
Expected: FAIL because the route helpers and unified controller do not exist.

- [ ] **Step 3: Implement state and rendering loop**

`startApp` reads shared state once, creates a draft controller, and owns `{ view, editing, saving }`. `render()` writes the top control, score only for matches, and one of four surface states:

```js
if (view === "matches" && !editing) renderMatchMatrix(state);
if (view === "matches" && editing) renderEditableMatrix(state);
if (view === "standings" && !editing) renderStatsTable(calculateStatistics(state));
if (view === "standings" && editing) renderPlayerManager(state);
```

Switching public views uses `history.pushState`; `popstate` re-renders from the URL. Entering edit creates a clean draft from the current baseline. Exiting a dirty edit requires confirmation.

- [ ] **Step 4: Implement contextual event delegation**

One document-level click/change/submit handler covers:

- segmented view buttons;
- pencil entry;
- save and close;
- match add/delete;
- date/winner/player/civilization changes;
- player add/rename/remove/reactivate only in standings edit;
- `Yeni oyuncu ekle` from a match player select through the player dialog.

After a civilization change, save the updated match through `controller.saveMatch` before rendering; the save control must immediately become dirty.

- [ ] **Step 5: Implement concise save feedback**

During write, disable save and render a busy icon/control. On success, exit edit and show a transient `Kaydedildi`. On failure, remain in edit with the dirty draft and show `Kaydedilemedi · tekrar dene`. Never render persistent `Yayınlandı` or stale-publish copy.

- [ ] **Step 6: Run controller and full unit tests**

Run: `npm test`  
Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add docs/app.js docs/lib/editor.js tests/spa-controller.test.mjs tests/static-model.test.mjs
git rm docs/edit.js docs/stats.js
git commit -m "feat: add contextual match and player editing"
```

---

### Task 5: Local AOE2 assets and design system

**Files:**
- Create: `docs/assets/paper.jpg`
- Create: `docs/assets/icons/pencil.svg`
- Create: `docs/assets/icons/check.svg`
- Create: `docs/assets/icons/x.svg`
- Create: `docs/assets/icons/plus.svg`
- Create: `docs/assets/icons/trash.svg`
- Create: `docs/assets/icons/NOTICE.md`
- Modify: `tests/static-assets.test.mjs`
- Modify: `tests/static-css.test.mjs`
- Replace: `docs/styles.css`
- Modify: `docs/manifest.webmanifest`

**Interfaces:**
- Consumes: class names emitted by Tasks 2–4.
- Produces: one tokenized AOE2 paper theme with fixed blue/red roles and 390×844 fit.

- [ ] **Step 1: Save licensed source assets locally**

Download the verified upstream files:

```bash
mkdir -p docs/assets/icons
curl -L --fail https://aoe2techtree.net/img/Backgrounds/bg_aoe2_hd_paper.jpg -o docs/assets/paper.jpg
curl -L --fail https://raw.githubusercontent.com/tabler/tabler-icons/main/icons/outline/pencil.svg -o docs/assets/icons/pencil.svg
curl -L --fail https://raw.githubusercontent.com/tabler/tabler-icons/main/icons/outline/check.svg -o docs/assets/icons/check.svg
curl -L --fail https://raw.githubusercontent.com/tabler/tabler-icons/main/icons/outline/x.svg -o docs/assets/icons/x.svg
curl -L --fail https://raw.githubusercontent.com/tabler/tabler-icons/main/icons/outline/plus.svg -o docs/assets/icons/plus.svg
curl -L --fail https://raw.githubusercontent.com/tabler/tabler-icons/main/icons/outline/trash.svg -o docs/assets/icons/trash.svg
```

Create `docs/assets/icons/NOTICE.md` with the exact five Tabler paths, the Tabler MIT license URL, the AOE2 Tech Tree background URL, the Siege Engineers repository URL, and its license notice. Do not hotlink or hand-draw replacements.

- [ ] **Step 2: Write failing asset and token tests**

Assert all local files exist and are non-empty. Assert CSS contains `--blue`, `--red`, `--paper`, `--ink`, `--rule`, and `--bronze`; does not contain `--orange`, `.score-versus`, `.action-seal`, `.tracker-identity`, or green winner selectors; and uses `background-image: url("./assets/paper.jpg")`.

- [ ] **Step 3: Run static tests and verify failure**

Run: `node --test tests/static-assets.test.mjs tests/static-css.test.mjs`  
Expected: FAIL until assets and replacement CSS exist.

- [ ] **Step 4: Implement the design system**

Replace the stylesheet around these binding dimensions:

```css
:root {
  --paper: #c7a86f;
  --paper-light: #d8bd88;
  --ink: #171009;
  --ink-muted: #4d3617;
  --rule: #3b2814;
  --bronze: #8a6935;
  --blue: #2b6f9d;
  --blue-deep: #174766;
  --red: #a33a2c;
  --red-deep: #6f2018;
  --rail-width: 44px;
  --week-width: 232px;
  --player-row: 54px;
}
```

Use local Merriweather for all text. Set the body parchment texture with no gradient. Make the top bar 44 px, score 52 px, date 34 px, player rows 54 px, result 38 px, vertical rails 44 px, and week columns 232 px. Use square fields, one-pixel rules, no component shadows, and only the segmented control’s small compound radius.

At 320 px, keep the 44/232 geometry and allow the next week edge to signal horizontal continuation. At desktop widths, show multiple 232 px columns without changing row heights.

- [ ] **Step 5: Run static and full tests**

Run: `npm test`  
Expected: all tests PASS.

- [ ] **Step 6: Run the Impeccable mechanical detector once**

Run:

```bash
node /Users/eko/.codex/skills/impeccable/scripts/detect.mjs --json docs/index.html docs/app.js docs/lib/views.js docs/lib/matrix.js docs/styles.css
```

Expected: no unresolved high-severity design-system violations.

- [ ] **Step 7: Commit**

```bash
git add docs/assets/paper.jpg docs/assets/icons docs/styles.css docs/manifest.webmanifest tests/static-assets.test.mjs tests/static-css.test.mjs
git commit -m "feat: establish the aoe2 paper design system"
```

---

### Task 6: Browser QA, reversible persistence check, documentation, and release

**Files:**
- Modify: `design-qa.md`
- Modify: `PRODUCT.md`
- Replace: `DESIGN.md`
- Modify: `.impeccable/design.json`
- Modify: `.impeccable/surfaces/docs-index-html.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: completed app, Vercel CLI project link, and production Blob state.
- Produces: verified preview, production deployment, updated design documentation, and synchronized GitHub main.

- [ ] **Step 1: Start the Vercel-backed local app**

Run: `npm run dev:vercel`  
Expected: local site and `/api/state` are available on port 4173 with no startup error.

- [ ] **Step 2: Capture the first bounded QA round**

In the in-app browser, capture public matches, standings, match edit, and player edit at 390×844; capture public matches at 1440×900. Compare the public captures beside the saved AOE2 Tech Tree reference at the same viewport. Check exact copy removal, paper texture, Merriweather, square rules, fixed blue/red roles, vertical rails, full first-match fit, and horizontal week scrolling.

- [ ] **Step 3: Fix all material findings in one batch**

Apply only evidence-backed fixes from the comparison: clipping, overflow, wrong row/column sizes, type mismatch, color inconsistency, missing assets, insufficient touch targets, or edit-state leakage. Do not add new copy or decorative chrome.

- [ ] **Step 4: Capture the final bounded QA round**

Repeat 390×844 and 1440×900 captures once. Verify no console errors and test all primary controls. Update `design-qa.md` with `final result: passed`; if any P0/P1/P2 remains, do not deploy.

- [ ] **Step 5: Run the shipped finish reviewer and documenter**

Send the original request, approved spec, changed files, direction contract, detector output, and screenshot paths to `impeccable_finish_reviewer`. Apply material fixes. Then send the final built artifact and direction contract to `impeccable_documenter` so `DESIGN.md`, `.impeccable/design.json`, and the surface brief describe shipped reality.

- [ ] **Step 6: Run complete verification**

Run:

```bash
npm test
git diff --check
git status --short
```

Expected: all tests PASS, no whitespace errors, and only intended tracked changes remain.

- [ ] **Step 7: Deploy preview and perform reversible CIV write**

Back up `GET /api/state`. On the Vercel preview, change one known civilization, save, reload, and verify both edit and public views. Restore the original civilization immediately and verify it after reload. No stale-publish message may appear.

- [ ] **Step 8: Deploy production and verify routes**

Deploy to the linked `53aoe` Vercel project. Verify HTTP 200 and working content at `/`, `/?view=standings`, `/?view=matches&edit=1`, `/stats/`, `/edit/`, and `/api/state`.

- [ ] **Step 9: Commit and push**

```bash
git add PRODUCT.md DESIGN.md .impeccable/design.json .impeccable/surfaces/docs-index-html.md README.md design-qa.md
git commit -m "docs: record the minimal aoe2 spa system"
git push github main
```

Expected: local `HEAD`, `github/main`, and deployed production contain the same verified implementation.

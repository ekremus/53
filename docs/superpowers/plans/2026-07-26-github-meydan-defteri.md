# Bu Ecof Empires GitHub Meydan Defteri Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the redirect and server-backed dashboard with a polished, mobile-first AoE2 match ledger that renders and edits repository JSON directly on GitHub Pages.

**Architecture:** A framework-free ES module app in `docs/` reads a normalized `docs/data/state.json`, derives match/team/player statistics in the browser, and renders one naturally scrolling public surface. Authorized collaborators save through the GitHub Contents API using a repo-scoped fine-grained token encrypted locally with Web Crypto; GitHub Pages remains the only host.

**Tech Stack:** Semantic HTML, modern CSS, vanilla ES modules, Web Crypto, GitHub REST Contents API, Node 22 test runner, GitHub Pages.

## Global Constraints

- Display the exact product name `Bu Ecof Empires🏹🪓⚔️`.
- Display team names `Cortinyanlar` and `Bakracoğulları`; never show `Kırmızı Takım` or `Mavi Takım`.
- Host the application, JSON state, images, fonts, and deployment entirely in `ekremus/53` on GitHub Pages.
- Do not ship a header, footer, sidebar, bottom navigation, runtime server call, external script, analytics, or embedded secret.
- Keep exactly four unique players and one valid civilization per team in every match.
- Use the current 53 standard AoE2 DE civilizations plus `Random`.
- Preserve the existing match and normalize its missing civilizations to `Random`.
- Keep the FAB above `env(safe-area-inset-bottom)` and prevent horizontal overflow from 320px upward.
- Treat `53` as the local credential-decryption PIN; GitHub write permission remains the authorization boundary.
- Use native controls, visible labels, at least 44px touch targets, 4.5:1 text contrast, and reduced-motion support.

---

### Task 1: Normalized repository state and domain model

**Files:**
- Create: `docs/data/state.json`
- Create: `docs/lib/civilizations.js`
- Create: `docs/lib/model.js`
- Create: `tests/static-model.test.mjs`

**Interfaces:**
- Produces: `CIVILIZATIONS`, `CIVILIZATION_OPTIONS`, `validateState(value)`, `calculateStatistics(state)`, `activeRoster(state)`, `createEmptyMatch(state, date)`, `upsertPlayer(state, input)`, and `removeOrDeactivatePlayer(state, playerId)`.
- Consumes: no browser APIs; every exported model function must run in Node tests.

- [ ] **Step 1: Write failing state-validation and statistics tests**

Create fixtures inline in `tests/static-model.test.mjs` and assert all of the following exact behaviors:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  activeRoster,
  calculateStatistics,
  removeOrDeactivatePlayer,
  validateState,
} from "../docs/lib/model.js";
import { CIVILIZATIONS } from "../docs/lib/civilizations.js";

const fixtureState = JSON.parse(await readFile(
  new URL("../docs/data/state.json", import.meta.url),
  "utf8",
));

test("ships 53 AoE2 DE civilizations", () => {
  assert.equal(CIVILIZATIONS.length, 53);
  for (const name of ["Mapuche", "Muisca", "Tupi", "Turks", "Vikings"]) {
    assert.ok(CIVILIZATIONS.includes(name));
  }
});

test("validates four unique players per team", () => {
  const state = structuredClone(fixtureState);
  state.matches[0].teams.cortinyanlar.pop();
  assert.throws(() => validateState(state), /tam 4 oyuncu/);
  state.matches[0].teams.cortinyanlar.push({ playerId: "buyukekrem", civilization: "Random" });
  assert.throws(() => validateState(state), /iki kez/);
});

test("derives team totals and player ranking", () => {
  const stats = calculateStatistics(validateState(fixtureState));
  assert.deepEqual(stats.teams, { cortinyanlar: 1, bakracogullari: 0 });
  assert.equal(stats.totalMatches, 1);
  assert.equal(stats.players[0].winRate, 100);
});

test("deactivates referenced players and deletes unused players", () => {
  const used = removeOrDeactivatePlayer(fixtureState, "buyukekrem");
  assert.equal(used.players.find((player) => player.id === "buyukekrem").active, false);
  const unusedFixture = structuredClone(fixtureState);
  unusedFixture.players.push({ id: "yedek", name: "Yedek", active: true });
  assert.equal(removeOrDeactivatePlayer(unusedFixture, "yedek").players.some((player) => player.id === "yedek"), false);
});
```

- [ ] **Step 2: Run the model test and verify it fails**

Run: `node --test tests/static-model.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `docs/lib/model.js`.

- [ ] **Step 3: Implement civilization and state contracts**

`docs/lib/civilizations.js` must export the alphabetized 53-name array and `CIVILIZATION_OPTIONS = ["Random", ...CIVILIZATIONS]`.

`docs/lib/model.js` must export these exact signatures:

```js
export function validateState(value)
export function calculateStatistics(state)
export function activeRoster(state)
export function createEmptyMatch(state, date)
export function upsertPlayer(state, { id, name })
export function removeOrDeactivatePlayer(state, playerId)
```

`validateState` returns a normalized structural clone or throws a Turkish `Error`. `calculateStatistics` returns `{ totalMatches, teams, leader, players }`. `activeRoster` returns active players sorted with the `tr-TR` locale. `createEmptyMatch` returns four blank Random-civilization slots for each configured team. `upsertPlayer` adds or renames case-insensitively. `removeOrDeactivatePlayer` soft-deletes referenced players and removes unused players. Validation must reject unknown players, unknown teams, invalid ISO dates, duplicate match IDs, duplicate player names ignoring Turkish case, duplicate players within a match, unknown civilizations, and winners outside the configured teams.

- [ ] **Step 4: Migrate the production match into repository JSON**

Create `docs/data/state.json` with schema version 1, the two exact teams, all eight current players, the current `2026-07-26` match, and eight `Random` civilizations. Set `winner` to `cortinyanlar` and preserve the existing match UUID and update timestamp.

- [ ] **Step 5: Run tests and commit the model**

Run: `node --test tests/static-model.test.mjs`

Expected: all model subtests PASS.

Commit:

```bash
git add docs/data/state.json docs/lib/civilizations.js docs/lib/model.js tests/static-model.test.mjs
git commit -m "feat: add GitHub ledger data model"
```

### Task 2: Secure GitHub collaborator storage

**Files:**
- Create: `docs/lib/github.js`
- Create: `tests/github-client.test.mjs`

**Interfaces:**
- Produces: `encryptCredential(token, pin)`, `decryptCredential(payload, pin)`, `saveCredential(payload)`, `readCredential()`, `clearCredential()`, `verifyRepositoryAccess(token)`, `readRemoteState(token)`, and `commitRemoteState({ token, state, sha, message })`.
- Consumes: global `crypto.subtle`, `fetch`, and `localStorage`; storage and fetch dependencies must be injectable in tests.

- [ ] **Step 1: Write failing credential and API tests**

```js
test("encrypts and decrypts a token without plaintext persistence", async () => {
  const payload = await encryptCredential("github_pat_example", "53");
  assert.doesNotMatch(JSON.stringify(payload), /github_pat_example/);
  assert.equal(await decryptCredential(payload, "53"), "github_pat_example");
  await assert.rejects(() => decryptCredential(payload, "wrong"), /PIN/);
});

test("maps stale SHA to a Turkish conflict error", async () => {
  const client = createGitHubClient({ fetch: async () => new Response(
    JSON.stringify({ message: "sha does not match" }),
    { status: 409, headers: { "content-type": "application/json" } },
  ) });
  await assert.rejects(
    () => client.commitRemoteState({ token: "x", state: fixtureState, sha: "old", message: "data: test" }),
    /başka biri tarafından güncellendi/,
  );
});
```

Also assert that authorization headers are present only on `api.github.com` requests and token text never appears in thrown errors.

- [ ] **Step 2: Run the GitHub client test and verify it fails**

Run: `node --test tests/github-client.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `docs/lib/github.js`.

- [ ] **Step 3: Implement Web Crypto credential storage**

Use `PBKDF2` with SHA-256, 250,000 iterations, 16 random salt bytes, AES-GCM 256, and a 12-byte IV. Serialize byte arrays as base64 strings. Store only `{ version: 1, salt, iv, ciphertext }` under `bu-ecof-empires.github-credential.v1`. Never export or log a decrypted token.

- [ ] **Step 4: Implement the GitHub Contents API client**

Use constants:

```js
const OWNER = "ekremus";
const REPO = "53";
const BRANCH = "main";
const STATE_PATH = "docs/data/state.json";
const API_VERSION = "2022-11-28";
```

`readRemoteState` must GET the content endpoint, decode UTF-8 base64 safely, validate JSON, and return `{ state, sha }`. `commitRemoteState` must PUT `{ message, content, sha, branch: "main" }` and map 401, 403, 409, and 422 to separate Turkish errors. `verifyRepositoryAccess` must read repository permissions and require `permissions.push === true`.

- [ ] **Step 5: Run tests and commit GitHub storage**

Run: `node --test tests/github-client.test.mjs`

Expected: all credential and API subtests PASS.

Commit:

```bash
git add docs/lib/github.js tests/github-client.test.mjs
git commit -m "feat: add secure GitHub data commits"
```

### Task 3: Local visual assets and semantic static shell

**Files:**
- Replace: `docs/index.html`
- Replace: `docs/404.html`
- Create: `docs/manifest.webmanifest`
- Create: `docs/assets/hero-53.png`
- Create: `docs/assets/civs/*.png`
- Create: `docs/assets/civs/random.svg`
- Create: `docs/assets/civs/NOTICE.md`
- Create: `scripts/sync-civ-assets.mjs`
- Create: `tests/static-shell.test.mjs`

**Interfaces:**
- Produces: DOM anchors `#app`, `#scoreboard`, `#latest-match`, `#recent-matches`, `#leaderboard`, `#fab`, `#fab-menu`, `#archive-dialog`, `#edit-dialog`, `#players-dialog`, `#credential-dialog`, and `#notice-region`.
- Consumes: `docs/styles.css` and `docs/app.js` as local files only.

- [ ] **Step 1: Write failing shell invariants**

Assert the final HTML contains the exact product/team names, viewport-fit cover, local module and stylesheet, dialog roots, and no `<header>`, `<footer>`, sidebar, bottom navigation, ChatGPT Sites URL, external script, or redirect meta tag.

- [ ] **Step 2: Run shell tests and verify the redirect fails them**

Run: `node --test tests/static-shell.test.mjs`

Expected: FAIL because `docs/index.html` contains the old meta redirect.

- [ ] **Step 3: Add the semantic shell and metadata**

`docs/index.html` must include:

```html
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#16100c">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data:; connect-src 'self' https://api.github.com; script-src 'self'; style-src 'self'; base-uri 'none'; form-action 'none'">
<link rel="manifest" href="./manifest.webmanifest">
<link rel="stylesheet" href="./styles.css">
<script type="module" src="./app.js"></script>
```

The body must expose all DOM anchors listed above and a `noscript` message. `docs/404.html` must use a same-origin relative redirect to `./` only.

- [ ] **Step 4: Vendor hero and civilization assets**

Copy `public/og.png` to `docs/assets/hero-53.png`. Implement `scripts/sync-civ-assets.mjs` to download only the 53 filenames in `CIVILIZATIONS` from the MIT `SiegeEngineers/aoe2techtree` repository and fail if any response is non-200 or PNG signature is invalid. Add a project-owned `random.svg` and source/license notice.

Run: `node scripts/sync-civ-assets.mjs`

Expected: 53 PNG files and one random SVG under `docs/assets/civs/`.

- [ ] **Step 5: Run tests and commit the shell/assets**

Run: `node --test tests/static-shell.test.mjs`

Expected: all static shell invariants PASS.

Commit:

```bash
git add docs/index.html docs/404.html docs/manifest.webmanifest docs/assets scripts/sync-civ-assets.mjs tests/static-shell.test.mjs
git commit -m "feat: add the static GitHub Pages shell"
```

### Task 4: Public ledger rendering

**Files:**
- Create: `docs/lib/views.js`
- Create: `docs/app.js`
- Create: `tests/static-views.test.mjs`

**Interfaces:**
- Produces: `renderScoreboard(state, stats)`, `renderLatestMatch(state)`, `renderRecentMatches(state, limit)`, `renderLeaderboard(stats, limit)`, `renderArchive(state, stats, view)`, and `startApp(document, dependencies)`.
- Consumes: validated state and statistics from `model.js`.

- [ ] **Step 1: Write failing render tests**

Use lightweight fake DOM targets or string-returning view functions and assert:

```js
assert.match(renderScoreboard(state, stats), /Cortinyanlar/);
assert.match(renderScoreboard(state, stats), /Bakracoğulları/);
assert.match(renderLatestMatch(state), /BuyukEkrem/);
assert.match(renderLatestMatch(state), /random\.svg/);
assert.doesNotMatch(renderLatestMatch(state), /Kırmızı Takım|Mavi Takım/);
assert.equal(renderRecentMatches(state, 5).match(/data-match-id/g).length, 1);
assert.match(renderLeaderboard(stats, 8), /100%/);
```

- [ ] **Step 2: Run the view test and verify it fails**

Run: `node --test tests/static-views.test.mjs`

Expected: FAIL with missing `docs/lib/views.js`.

- [ ] **Step 3: Implement safe rendering**

Every user-derived string must pass through one `escapeHtml` helper. Civilization file names must come from the known option list, not raw state text. Dates use `Intl.DateTimeFormat("tr-TR", { timeZone: "UTC" })`. Empty state copy is limited to `Henüz maç yok` and the edit action.

- [ ] **Step 4: Implement application startup and archive behavior**

`startApp` fetches `./data/state.json?ts=<epoch>`, validates it, computes statistics, and renders all public regions. The `Tüm maçlar` and `Tüm oyuncular` actions open one native archive dialog with the appropriate view. Loading and retry states must not replace the hero or product identity.

- [ ] **Step 5: Run tests and commit public views**

Run: `node --test tests/static-views.test.mjs tests/static-model.test.mjs`

Expected: all subtests PASS.

Commit:

```bash
git add docs/lib/views.js docs/app.js tests/static-views.test.mjs
git commit -m "feat: render the public match ledger"
```

### Task 5: FAB, credential setup, match editor, and player manager

**Files:**
- Create: `docs/lib/editor.js`
- Modify: `docs/app.js`
- Create: `tests/static-editor.test.mjs`

**Interfaces:**
- Produces: `createEditorController({ state, baseSha, github, render, notify })`, `renderMatchForm(draft, state)`, `renderPlayerManager(state)`, and `validateMatchDraft(draft, state)`.
- Consumes: model mutations, GitHub client methods, and shell dialogs.

- [ ] **Step 1: Write failing editor workflow tests**

Assert new match drafts contain eight slots and Random civilizations, duplicate selected players are disabled/rejected, `＋ Yeni oyuncu` adds and selects a player, referenced players deactivate, unused players delete, rename changes historical display through player ID, match delete requires confirmation, and save uses the base SHA once.

- [ ] **Step 2: Run editor tests and verify they fail**

Run: `node --test tests/static-editor.test.mjs`

Expected: FAIL with missing `docs/lib/editor.js`.

- [ ] **Step 3: Implement the FAB menu and credential gates**

FAB behavior must be exactly:

- closed label `Düzenle`, glyph `＋`;
- open label `Menüyü kapat`, glyph `×`;
- menu actions `Yeni maç`, `Oyuncular`, and `GitHub bağlantısı`/`Kilitle`;
- Escape closes menu/dialogs and focus returns to FAB;
- clicking New Match or Players when locked opens the PIN/setup dialog, then resumes the requested action after successful unlock.

- [ ] **Step 4: Implement match editing**

Render native date/select controls with visible labels. Each of the two exact team sections has four player selects and four civilization selects with adjacent local icons. Winner is required. Existing matches expose `Maçı sil` with a second confirmation. Save validates, reads the latest remote state, rejects stale SHA, commits once, updates local state, rerenders, and locks only on explicit user action.

- [ ] **Step 5: Implement player management**

Active players show rename and remove/deactivate actions. Passive players show reactivate. New and renamed names normalize whitespace, reject case-insensitive duplicates, and cap at 40 characters. Player changes commit with message `data: update players`.

- [ ] **Step 6: Run tests and commit editing**

Run: `node --test tests/static-editor.test.mjs tests/github-client.test.mjs tests/static-model.test.mjs`

Expected: all subtests PASS.

Commit:

```bash
git add docs/lib/editor.js docs/app.js tests/static-editor.test.mjs
git commit -m "feat: add GitHub-backed match editing"
```

### Task 6: Impeccable mobile visual system

**Files:**
- Create: `docs/styles.css`
- Modify: `docs/index.html`
- Create: `tests/static-css.test.mjs`

**Interfaces:**
- Consumes the semantic class names emitted by `views.js` and `editor.js`.
- Produces all layout, typography, state, dialog, safe-area, responsive, focus, and reduced-motion styling without JavaScript layout measurement.

- [ ] **Step 1: Write failing CSS contract tests**

Assert CSS contains `env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`, `100dvh`, `overflow-x: clip`, `@media (prefers-reduced-motion: reduce)`, focus-visible styling, 44px minimum control sizes, a 720px desktop enhancement, and no sidebar width token, glass blur, gradient text, or bottom nav selector.

- [ ] **Step 2: Run CSS tests and verify they fail**

Run: `node --test tests/static-css.test.mjs`

Expected: FAIL because `docs/styles.css` does not exist.

- [ ] **Step 3: Implement tokens and full mobile surface**

Create named tokens for walnut, parchment, ink, bronze, Cortinyanlar blue, Bakracoğulları orange, positive, danger, focus, content width, and safe areas. Style the hero from `./assets/hero-53.png`, score plaque, flat ledger rows, lineup grids, rankings, FAB/menu, dialogs, forms, selects, player list, notices, skeleton/loading, and error states. Avoid nesting a visual card inside another card.

- [ ] **Step 4: Add desktop enhancement and motion policy**

At 720px, cap the content at 1040px and allow latest match plus leaderboard to share a two-column section. Do not add navigation. Use only opacity/translate transitions under 220ms; reduced-motion disables them.

- [ ] **Step 5: Run CSS and full unit tests; commit styling**

Run: `node --test tests/static-css.test.mjs tests/*.test.mjs`

Expected: all static app subtests PASS.

Commit:

```bash
git add docs/styles.css docs/index.html tests/static-css.test.mjs
git commit -m "feat: craft the mobile AoE2 visual system"
```

### Task 7: Documentation, security audit, visual verification, and GitHub Pages deployment

**Files:**
- Modify: `README.md`
- Modify: `package.json`
- Modify: existing tests as required for the static production target
- Remove from production references: old ChatGPT Sites redirect/runtime URLs

**Interfaces:**
- Produces: one `npm test` command that validates the active static app and one live GitHub Pages URL tied to the pushed commit.

- [ ] **Step 1: Update project commands and README**

Set `npm test` to run every `.mjs` static test and the retained pure statistics tests that still apply. Document the live URL, JSON schema, collaborator/PAT setup, local PIN behavior, player soft-delete rule, asset license, and local static-server command. Clearly state that the old Sites runtime is no longer part of production.

- [ ] **Step 2: Run security and repository scans**

Run:

```bash
rg -n 'github_pat_|ghp_|chatgpt\.site|api/matches|EDIT_PASSWORD' docs README.md
rg -n '<script[^>]+https?://|@import\s+url\(https?://' docs
git diff --check
```

Expected: no PAT, old runtime URL, old API, external script, or external stylesheet match; only documentation explaining token patterns may be allowlisted outside `docs/`.

- [ ] **Step 3: Run the complete automated suite**

Run: `npm test`

Expected: build-free static checks, model, GitHub client, views, editor, CSS, and retained statistics tests all PASS.

- [ ] **Step 4: Perform one batched visual inspection**

Serve `docs/` locally and capture the same source state at 390×844 and 1440×1000. Inspect safe areas, zero horizontal overflow, hero crop, typography, scoreboard balance, real match density, civ icon clarity, leaderboard scanning, FAB reachability, open menu, PIN/setup, match editor, player manager, focus rings, and empty/error states. Record every issue before editing.

- [ ] **Step 5: Apply one bounded polish pass and confirm**

Fix all issues from the batch together, rerun `npm test`, and take at most one confirmation pair of screenshots. Do not enter per-tweak screenshot loops.

- [ ] **Step 6: Commit and push the exact production source**

```bash
git add README.md package.json docs tests
git commit -m "chore: finalize GitHub Pages production app"
git push github main
```

Expected: `github/main` equals local HEAD.

- [ ] **Step 7: Verify GitHub Pages production**

Poll the GitHub Pages build until `built`, then verify:

```bash
curl -fsS https://ekremus.github.io/53/ | rg 'Bu Ecof Empires'
curl -fsS https://ekremus.github.io/53/data/state.json | jq '.teams[].name'
curl -fsSI https://ekremus.github.io/53/assets/hero-53.png
curl -fsSI https://ekremus.github.io/53/assets/civs/turks.png
```

Expected: HTTP 200, exact team names, valid JSON, and image content types. Confirm the Pages build commit equals local HEAD and the page does not redirect.

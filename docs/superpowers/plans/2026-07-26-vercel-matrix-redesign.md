# Vercel Matrix Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the repeated GitHub Pages dashboard with one mobile-first horizontal weekly match matrix, an unauthenticated `/edit/` workflow, derived `/stats/`, and a single Vercel Blob-backed state API.

**Architecture:** A vanilla HTML/CSS/JavaScript frontend and one Vercel Node function share one origin. The function is the only code allowed to access a private `state.json` Blob; browser clients exchange validated state plus an ETag and publish with `If-Match` optimistic concurrency. GitHub remains source control and Vercel deployment input, but is not part of the runtime data path.

**Tech Stack:** HTML5, CSS, browser ES modules, Node.js 22.11+, Vercel Functions, `@vercel/blob`, Node test runner, Chrome DevTools Protocol.

## Global Constraints

- Runtime hosting, API, and shared state all live in one Vercel Hobby project.
- The public editor has no login, PIN, password, GitHub account, or user-supplied token.
- Keep the frontend framework-free and dependency-light; `@vercel/blob` is the only required runtime package.
- The homepage renders each match exactly once in one matrix; no “Son maç”, “Son maçlar”, archive, or duplicate lineup UI.
- Match columns are newest-first from left to right; older weeks continue rightward with horizontal snap.
- Every match has exactly four Cortinyanlar players, four Bakracoğulları players, one civilization per player, and one winning team.
- Every player cell shows a local civilization crest, strong player name, and quiet civilization name.
- Preserve the exact product name `Bu Ecof Empires🏹🪓⚔️` and exact team names `Cortinyanlar` and `Bakracoğulları`.
- Keep existing current data: schema version 1, revision 3, ten players, and two matches.
- Required QA viewports are 320×700, 390×844, and 1440×1000.
- Do not disable GitHub Pages until Vercel production is live, state migration is verified, and a reversible write test passes.

---

## File Structure

### Create

- `api/state.js` — thin Vercel Node request/response adapter.
- `api/lib/state-handler.js` — HTTP-independent method, payload, validation, and conflict logic.
- `api/lib/blob-store.js` — fixed-path private Blob read/write adapter.
- `docs/lib/state-api.js` — browser GET/PUT client carrying ETags.
- `docs/lib/matrix.js` — public and editable matrix renderers.
- `docs/edit/index.html` — open editor route shell.
- `docs/edit.js` — editor state, event, draft, publish, and conflict workflow.
- `docs/stats/index.html` — derived statistics route shell.
- `docs/stats.js` — statistics route entrypoint.
- `scripts/seed-vercel-blob.mjs` — one-time idempotent state seed command.
- `tests/api-state.test.mjs` — pure API and conflict tests.
- `tests/state-api.test.mjs` — browser client request-contract tests.
- `tests/matrix-views.test.mjs` — chronological matrix rendering tests.
- `tests/open-editor.test.mjs` — draft mutation and publish-controller tests.

### Modify

- `package.json`, `package-lock.json` — add `@vercel/blob`, Vercel dev, seed, and verification scripts.
- `vercel.json` — static output directory, clean routes, and security headers.
- `docs/index.html` — replace the repeated ledger sections with one matrix shell.
- `docs/app.js` — load shared API state and render the public matrix.
- `docs/lib/views.js` — retain escaping/date/stat helpers and remove repeated match views.
- `docs/lib/editor.js` — keep field rendering and replace GitHub-connected controller with in-memory draft mutations.
- `docs/styles.css` — replace the discarded hero/card world with the approved matrix system.
- `docs/manifest.webmanifest` — switch scope/start URL from `/53/` to `/`.
- `scripts/visual-qa.mjs` — inspect public, editor, stats, conflict, and compact matrix states on Vercel dev.
- `tests/static-*.test.mjs` — assert the new route, security, responsive, and asset contracts.
- `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json`, `.impeccable/surfaces/docs-index-html.md` — document the replacement world after code matches it.
- `README.md` — Vercel runtime, open editing, Blob migration, local development, and recovery.

### Delete after replacement tests pass

- `docs/lib/github.js` — obsolete browser credential/GitHub writer.
- `tests/github-client.test.mjs` — obsolete credential/API tests.
- `docs/404.html` — obsolete GitHub Pages redirect.

---

### Task 1: Build the validated Vercel Blob state API

**Files:**
- Create: `api/lib/state-handler.js`
- Create: `api/lib/blob-store.js`
- Create: `api/state.js`
- Create: `tests/api-state.test.mjs`
- Create: `vercel.json`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: `validateState(value)` from `docs/lib/model.js`; private `BLOB_READ_WRITE_TOKEN` injected by Vercel.
- Produces: `createStateHandler({ store, now, maxBytes })`, `createBlobStateStore(...)`, `GET /api/state`, and `PUT /api/state`.
- HTTP success shape: `{ state: ValidatedState }` with response header `ETag`.
- HTTP conflict shape: `{ error: "Veri başka biri tarafından güncellendi." }`, status `409`.

- [ ] **Step 1: Add the Blob dependency and deployment contract**

Update `package.json` with the exact scripts/dependency:

```json
{
  "scripts": {
    "dev": "vercel dev --listen 4173",
    "dev:static": "python3 -m http.server 4173 -d docs",
    "test": "node --test tests/*.test.mjs",
    "assets:civs": "node scripts/sync-civ-assets.mjs",
    "qa:visual": "node scripts/visual-qa.mjs",
    "data:seed": "node scripts/seed-vercel-blob.mjs"
  },
  "dependencies": {
    "@vercel/blob": "2.6.1"
  }
}
```

Run: `npm install --save @vercel/blob@2.6.1`

Create `vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": null,
  "outputDirectory": "docs",
  "cleanUrls": true,
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
      ]
    }
  ]
}
```

- [ ] **Step 2: Write failing pure API tests**

Create `tests/api-state.test.mjs` with a memory store and these explicit cases:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createStateHandler } from "../api/lib/state-handler.js";

const fixture = JSON.parse(await readFile(new URL("../docs/data/state.json", import.meta.url)));

function memoryStore(initial = fixture, etag = '"revision-3"') {
  let state = structuredClone(initial);
  let currentEtag = etag;
  return {
    async read() { return { state: structuredClone(state), etag: currentEtag }; },
    async write(next, { ifMatch }) {
      if (ifMatch !== currentEtag) {
        const error = new Error("precondition");
        error.code = "BLOB_PRECONDITION_FAILED";
        throw error;
      }
      state = structuredClone(next);
      currentEtag = `"revision-${next.revision}"`;
      return { state: structuredClone(state), etag: currentEtag };
    },
  };
}

test("GET returns validated state and an ETag", async () => {
  const handle = createStateHandler({ store: memoryStore() });
  const response = await handle({ method: "GET", headers: {}, body: "" });
  assert.equal(response.status, 200);
  assert.equal(response.headers.ETag, '"revision-3"');
  assert.equal(response.body.state.matches.length, 2);
});

test("PUT increments revision and stamps server time", async () => {
  const handle = createStateHandler({
    store: memoryStore(),
    now: () => new Date("2026-08-02T20:53:00.000Z"),
  });
  const response = await handle({
    method: "PUT",
    headers: { "content-type": "application/json", "if-match": '"revision-3"' },
    body: JSON.stringify(fixture),
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.state.revision, 4);
  assert.equal(response.body.state.updatedAt, "2026-08-02T20:53:00.000Z");
});

test("PUT rejects stale, invalid, and oversized payloads", async () => {
  const handle = createStateHandler({ store: memoryStore(), maxBytes: 128 * 1024 });
  const stale = await handle({
    method: "PUT",
    headers: { "content-type": "application/json", "if-match": '"old"' },
    body: JSON.stringify(fixture),
  });
  assert.equal(stale.status, 409);

  const invalid = await handle({
    method: "PUT",
    headers: { "content-type": "application/json", "if-match": '"revision-3"' },
    body: "{}",
  });
  assert.equal(invalid.status, 422);

  const tinyHandle = createStateHandler({ store: memoryStore(), maxBytes: 256 });
  const oversized = await tinyHandle({
    method: "PUT",
    headers: { "content-type": "application/json", "if-match": '"revision-3"' },
    body: "x".repeat(257),
  });
  assert.equal(oversized.status, 413);
});
```

- [ ] **Step 3: Run the API test and confirm the intended failure**

Run: `node --test tests/api-state.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `api/lib/state-handler.js`.

- [ ] **Step 4: Implement the pure handler**

Create `api/lib/state-handler.js`:

```js
import { validateState } from "../../docs/lib/model.js";

function reply(status, body, headers = {}) {
  return { status, body, headers: { "Content-Type": "application/json; charset=utf-8", ...headers } };
}

function header(headers, name) {
  const key = Object.keys(headers ?? {}).find((candidate) => candidate.toLowerCase() === name);
  return key ? headers[key] : undefined;
}

export function createStateHandler({
  store,
  now = () => new Date(),
  maxBytes = 128 * 1024,
} = {}) {
  if (!store?.read || !store?.write) throw new Error("State store gerekli.");

  return async function handle({ method, headers = {}, body = "" }) {
    try {
      if (method === "GET") {
        const current = await store.read();
        return reply(200, { state: validateState(current.state) }, {
          ETag: current.etag,
          "Cache-Control": "no-store",
        });
      }
      if (method !== "PUT") return reply(405, { error: "Yöntem desteklenmiyor." }, { Allow: "GET, PUT" });
      if (!String(header(headers, "content-type") ?? "").toLowerCase().startsWith("application/json")) {
        return reply(415, { error: "Yalnızca JSON kabul edilir." });
      }
      if (Buffer.byteLength(body, "utf8") > maxBytes) return reply(413, { error: "Veri çok büyük." });

      const current = await store.read();
      const ifMatch = header(headers, "if-match");
      if (!ifMatch || ifMatch !== current.etag) {
        return reply(409, { error: "Veri başka biri tarafından güncellendi." }, { ETag: current.etag });
      }

      const submitted = validateState(JSON.parse(body));
      if (submitted.revision !== current.state.revision) {
        return reply(409, { error: "Veri başka biri tarafından güncellendi." }, { ETag: current.etag });
      }
      submitted.revision = current.state.revision + 1;
      submitted.updatedAt = now().toISOString();
      const next = validateState(submitted);
      const written = await store.write(next, { ifMatch: current.etag });
      return reply(200, { state: next }, { ETag: written.etag, "Cache-Control": "no-store" });
    } catch (error) {
      if (error?.code === "BLOB_PRECONDITION_FAILED") {
        return reply(409, { error: "Veri başka biri tarafından güncellendi." });
      }
      if (error instanceof SyntaxError) return reply(400, { error: "JSON okunamadı." });
      if (error instanceof Error && /geçersiz|olmalı|tanımlanmalı|kullanılmış|zaten var|kayıtlı değil|yer alamaz/.test(error.message)) {
        return reply(422, { error: error.message });
      }
      return reply(503, { error: "Maç kayıtlarına şu anda ulaşılamıyor." });
    }
  };
}
```

- [ ] **Step 5: Implement the fixed private Blob adapter and Vercel entrypoint**

Create `api/lib/blob-store.js`:

```js
import { BlobPreconditionFailedError, get, put } from "@vercel/blob";
import { validateState } from "../../docs/lib/model.js";

const STATE_PATH = "state.json";

export function createBlobStateStore({ getBlob = get, putBlob = put } = {}) {
  return {
    async read() {
      const blob = await getBlob(STATE_PATH, { access: "private", useCache: false });
      if (!blob?.stream) throw new Error("state.json bulunamadı.");
      const state = validateState(JSON.parse(await new Response(blob.stream).text()));
      return { state, etag: blob.etag };
    },
    async write(state, { ifMatch }) {
      try {
        const blob = await putBlob(STATE_PATH, `${JSON.stringify(validateState(state), null, 2)}\n`, {
          access: "private",
          allowOverwrite: true,
          contentType: "application/json",
          cacheControlMaxAge: 60,
          ifMatch,
        });
        return { state: validateState(state), etag: blob.etag };
      } catch (error) {
        if (error instanceof BlobPreconditionFailedError) error.code = "BLOB_PRECONDITION_FAILED";
        throw error;
      }
    },
  };
}
```

Create `api/state.js`:

```js
import { createBlobStateStore } from "./lib/blob-store.js";
import { createStateHandler } from "./lib/state-handler.js";

const handle = createStateHandler({ store: createBlobStateStore() });

export default async function stateEndpoint(request, response) {
  let body = "";
  for await (const chunk of request) body += chunk;
  const result = await handle({ method: request.method, headers: request.headers, body });
  response.statusCode = result.status;
  for (const [name, value] of Object.entries(result.headers)) response.setHeader(name, value);
  response.end(JSON.stringify(result.body));
}
```

- [ ] **Step 6: Run API and full tests**

Run: `node --test tests/api-state.test.mjs`

Expected: 3 tests PASS.

Run: `npm test`

Expected: all pre-existing tests plus API tests PASS.

- [ ] **Step 7: Commit Task 1**

```bash
git add api package.json package-lock.json vercel.json tests/api-state.test.mjs
git commit -m "feat: add Vercel Blob state API"
```

---

### Task 2: Replace repeated match views with one chronological matrix renderer

**Files:**
- Create: `docs/lib/matrix.js`
- Create: `tests/matrix-views.test.mjs`
- Modify: `docs/lib/views.js`
- Modify: `tests/static-views.test.mjs`

**Interfaces:**
- Consumes: normalized state, `civilizationAssetName(civilization)`, `escapeHtml(value)`, `formatMatchDate(date)`.
- Produces: `orderedMatches(state)`, `renderMatchMatrix(state, { editable })`, `renderScoreStrip(state, stats)`, and `renderStatsTable(stats)`.

- [ ] **Step 1: Write failing matrix renderer tests**

Create `tests/matrix-views.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { renderMatchMatrix } from "../docs/lib/matrix.js";

const fixture = JSON.parse(await readFile(new URL("../docs/data/state.json", import.meta.url)));

test("renders every match once, newest first, with eight player cells and one winner", () => {
  const state = structuredClone(fixture);
  state.matches[0].date = "2026-07-19";
  state.matches[1].date = "2026-07-26";
  const html = renderMatchMatrix(state);
  assert.equal((html.match(/data-match-column=/g) ?? []).length, 2);
  assert.ok(html.indexOf("2026-07-26") < html.indexOf("2026-07-19"));
  assert.equal((html.match(/class="matrix-player"/g) ?? []).length, 16);
  assert.equal((html.match(/class="matrix-winner/g) ?? []).length, 2);
});

test("renders player names, civilization names, and local crests", () => {
  const html = renderMatchMatrix(fixture);
  assert.match(html, /BuyukEkrem/);
  assert.match(html, /Huns/);
  assert.match(html, /assets\/civs\/huns\.png/);
  assert.match(html, /assets\/civs\/random\.svg/);
});
```

- [ ] **Step 2: Run the renderer test and confirm failure**

Run: `node --test tests/matrix-views.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `docs/lib/matrix.js`.

- [ ] **Step 3: Implement the matrix renderer**

Create `docs/lib/matrix.js` with these concrete exports and markup contract:

```js
import { civilizationAssetName } from "./civilizations.js";
import { escapeHtml, formatMatchDate } from "./views.js";

export function orderedMatches(state) {
  return state.matches
    .map((match, index) => ({ match, index }))
    .sort((a, b) => b.match.date.localeCompare(a.match.date) || b.index - a.index)
    .map(({ match }) => match);
}

function roster(state) {
  return new Map(state.players.map((player) => [player.id, player]));
}

function publicPlayerCell(state, slot, teamId, index) {
  const player = roster(state).get(slot.playerId);
  return `<div class="matrix-player" data-team="${escapeHtml(teamId)}" data-slot="${index}">
    <img src="./assets/civs/${civilizationAssetName(slot.civilization)}" alt="" width="42" height="42">
    <span><strong>${escapeHtml(player?.name ?? "Bilinmeyen")}</strong><small>${escapeHtml(slot.civilization)}</small></span>
  </div>`;
}

function matchColumn(state, match) {
  const winner = state.teams.find((team) => team.id === match.winner);
  return `<article class="match-column" data-match-column="${escapeHtml(match.id)}">
    <header><time datetime="${escapeHtml(match.date)}" data-iso-date="${escapeHtml(match.date)}">${escapeHtml(formatMatchDate(match.date))}</time></header>
    ${state.teams.map((team) => `<section class="matrix-team matrix-team--${escapeHtml(team.tone)}">
      ${match.teams[team.id].map((slot, index) => publicPlayerCell(state, slot, team.id, index)).join("")}
    </section>`).join("")}
    <footer class="matrix-winner matrix-winner--${escapeHtml(winner?.tone ?? "blue")}"><span>Kazanan</span><strong>${escapeHtml(winner?.name ?? "")}</strong></footer>
  </article>`;
}

export function renderMatchMatrix(state) {
  const matches = orderedMatches(state);
  if (!matches.length) return `<div class="matrix-empty"><strong>Henüz maç yok</strong></div>`;
  return `<div class="match-matrix" role="region" tabindex="0" aria-label="Haftalık maçlar; eski haftalar için sağa kaydır">
    <aside class="matrix-rail" aria-hidden="true">
      <div class="rail-date">Takım<br><small>Slot</small></div>
      <div class="rail-team rail-team--blue"><strong>Cortinyanlar</strong>${[1,2,3,4].map((n) => `<span>P${n}</span>`).join("")}</div>
      <div class="rail-team rail-team--orange"><strong>Bakracoğulları</strong>${[1,2,3,4].map((n) => `<span>P${n}</span>`).join("")}</div>
      <div class="rail-winner">Kazanan</div>
    </aside>
    <div class="matrix-weeks">${matches.map((match) => matchColumn(state, match)).join("")}</div>
  </div>`;
}
```

Move the retained `escapeHtml`, `formatMatchDate`, score, and statistics rendering responsibilities into `docs/lib/views.js`; delete `renderLatestMatch`, `renderRecentMatches`, `renderArchive`, `renderMatchSheet`, and their private helpers.

- [ ] **Step 4: Run renderer and complete test suite**

Run: `node --test tests/matrix-views.test.mjs tests/static-views.test.mjs`

Expected: matrix tests PASS; update static view expectations until both files PASS without checking any removed repeated-view export.

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 5: Commit Task 2**

```bash
git add docs/lib/matrix.js docs/lib/views.js tests/matrix-views.test.mjs tests/static-views.test.mjs
git commit -m "feat: render the weekly match matrix"
```

---

### Task 3: Build the public matrix page and responsive visual system

**Files:**
- Modify: `docs/index.html`
- Modify: `docs/app.js`
- Modify: `docs/styles.css`
- Modify: `docs/manifest.webmanifest`
- Modify: `tests/static-shell.test.mjs`
- Modify: `tests/static-css.test.mjs`
- Modify: `tests/static-assets.test.mjs`
- Modify: `tests/static-security.test.mjs`
- Create: `tests/state-api.test.mjs`

**Interfaces:**
- Consumes: `GET /api/state`, `renderMatchMatrix(state)`, `renderScoreStrip(state, stats)`, `calculateStatistics(state)`.
- Produces: public IDs `#score-strip`, `#matrix-root`, and a single `.action-seal` linking to `/edit/`.
- Produces: `createStateClient({ fetchImplementation, endpoint })` with `read()` and `write(state, etag)`.

- [ ] **Step 1: Run Impeccable context before the first UI edit**

Run exactly once:

```bash
node /Users/eko/.codex/skills/impeccable/scripts/context.mjs --target docs/index.html
```

Then read the routed replacement-world reference and, immediately before editing, `reference/craft-floor.md`. Follow the approved screenshots as layout truth; reuse existing local civilization and font assets, so no new raster generation is required.

- [ ] **Step 2: Replace shell tests with the approved information architecture**

Make `tests/static-shell.test.mjs` assert:

```js
assert.match(html, /id="score-strip"/);
assert.match(html, /id="matrix-root"/);
assert.match(html, /href="\.\/edit\/"/);
assert.doesNotMatch(html, /Son maç|Son maçlar|Tümü|archive-dialog|credential-dialog/);
assert.doesNotMatch(html, /<header|<footer|sidebar|bottom-nav/);
```

Make `tests/static-css.test.mjs` assert:

```js
assert.match(css, /\.match-matrix[\s\S]*overflow-x:\s*auto/);
assert.match(css, /\.matrix-rail[\s\S]*position:\s*sticky/);
assert.match(css, /scroll-snap-type:\s*x\s+mandatory/);
assert.match(css, /env\(safe-area-inset-bottom\)/);
assert.match(css, /@media\s*\(min-width:\s*920px\)/);
```

Create `tests/state-api.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { createStateClient } from "../docs/lib/state-api.js";

test("reads state and captures the ETag", async () => {
  const client = createStateClient({ fetchImplementation: async () => new Response(
    JSON.stringify({ state: { revision: 3 } }),
    { status: 200, headers: { ETag: '"r3"', "Content-Type": "application/json" } },
  ) });
  assert.deepEqual(await client.read(), { state: { revision: 3 }, etag: '"r3"' });
});

test("publishes JSON with If-Match and maps 409", async () => {
  let request;
  const success = createStateClient({ fetchImplementation: async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({ state: { revision: 4 } }), { status: 200, headers: { ETag: '"r4"' } });
  } });
  await success.write({ revision: 3 }, '"r3"');
  assert.equal(request.options.headers["If-Match"], '"r3"');
  assert.equal(request.options.method, "PUT");

  const stale = createStateClient({ fetchImplementation: async () => new Response(
    JSON.stringify({ error: "Veri başka biri tarafından güncellendi." }), { status: 409 },
  ) });
  await assert.rejects(() => stale.write({ revision: 3 }, '"r3"'), /başka biri/);
});
```

- [ ] **Step 3: Run shell/CSS tests and confirm failure**

Run: `node --test tests/static-shell.test.mjs tests/static-css.test.mjs tests/state-api.test.mjs`

Expected: FAIL because the old hero/repeated sections still exist and `docs/lib/state-api.js` is not implemented.

- [ ] **Step 4: Replace `docs/index.html` with the public matrix shell**

Use this exact body structure:

```html
<body data-page="public">
  <main id="app" class="app-shell">
    <section class="tracker-head" aria-labelledby="product-title">
      <div class="tracker-identity">
        <span aria-hidden="true">53</span>
        <div><p>Haftalık 4v4</p><h1 id="product-title">Bu Ecof Empires🏹🪓⚔️</h1></div>
      </div>
      <div id="score-strip" class="score-strip" aria-busy="true"></div>
    </section>
    <section class="matrix-stage" aria-labelledby="matrix-title">
      <div class="matrix-title-row"><h2 id="matrix-title">Maç Defteri</h2><p>Eski haftalar →</p></div>
      <div id="matrix-root" aria-busy="true"><p class="loading-line">Meydan kaydı açılıyor…</p></div>
    </section>
  </main>
  <a class="action-seal" href="./edit/" aria-label="Maçları düzenle"><span aria-hidden="true">✎</span></a>
  <div id="notice-region" class="notice-region" aria-live="assertive"></div>
</body>
```

Keep the existing local fonts, favicon, manifest, product metadata, and a CSP limited to self.

- [ ] **Step 5: Implement the same-origin state client and public loading entrypoint**

Create `docs/lib/state-api.js`:

```js
export function createStateClient({
  fetchImplementation = globalThis.fetch,
  endpoint = "/api/state",
} = {}) {
  async function request(options = {}) {
    const response = await fetchImplementation(endpoint, { cache: "no-store", ...options });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error ?? "Maç kayıtlarına ulaşılamıyor.");
      error.status = response.status;
      throw error;
    }
    const etag = response.headers.get("ETag");
    if (!etag) throw new Error("Veri sürümü alınamadı.");
    return { state: payload.state, etag };
  }
  return {
    read: () => request(),
    write: (state, etag) => request({
      method: "PUT",
      headers: { "Content-Type": "application/json", "If-Match": etag },
      body: JSON.stringify(state),
    }),
  };
}
```

Replace `docs/app.js` with public loading only:

```js
import { calculateStatistics, validateState } from "./lib/model.js";
import { renderMatchMatrix } from "./lib/matrix.js";
import { renderScoreStrip } from "./lib/views.js";
import { createStateClient } from "./lib/state-api.js";

export async function startPublicPage(documentRoot = document, { client = createStateClient() } = {}) {
  const score = documentRoot.querySelector("#score-strip");
  const matrix = documentRoot.querySelector("#matrix-root");
  try {
    const { state } = await client.read();
    const normalized = validateState(state);
    score.innerHTML = renderScoreStrip(normalized, calculateStatistics(normalized));
    matrix.innerHTML = renderMatchMatrix(normalized);
  } catch {
    matrix.innerHTML = `<div class="load-error"><strong>Kayıtlar açılamadı</strong><button type="button" data-retry>Tekrar dene</button></div>`;
    documentRoot.querySelector("[data-retry]")?.addEventListener("click", () => globalThis.location.reload());
  } finally {
    score.removeAttribute("aria-busy");
    matrix.removeAttribute("aria-busy");
  }
}

if (typeof document !== "undefined") startPublicPage();
```

- [ ] **Step 6: Replace the CSS visual world**

Implement these binding layout tokens and rules in `docs/styles.css`:

```css
:root {
  --navy: #202936;
  --navy-deep: #151c26;
  --paper: #f3e1bf;
  --paper-light: #faedcf;
  --ink: #26180f;
  --muted: #725d48;
  --rule: #c7ad82;
  --blue: #3f73bd;
  --blue-soft: #dce8f6;
  --orange: #cf6e2d;
  --orange-soft: #f4dfcb;
  --winner: #3f8b59;
  --gold: #c79a45;
  --rail: 108px;
  --week: 260px;
  --row: 64px;
  --touch: 44px;
}

.match-matrix { display: grid; grid-template-columns: var(--rail) minmax(0, 1fr); overflow-x: auto; overscroll-behavior-x: contain; scrollbar-gutter: stable; }
.matrix-rail { position: sticky; left: 0; z-index: 4; width: var(--rail); }
.matrix-weeks { display: flex; min-width: max-content; scroll-snap-type: x mandatory; }
.match-column { flex: 0 0 var(--week); scroll-snap-align: start; }
.matrix-player { min-height: var(--row); display: grid; grid-template-columns: 46px minmax(0, 1fr); align-items: center; gap: 10px; border-bottom: 1px solid var(--rule); padding: 7px 11px; }
.matrix-player img { width: 42px; height: 42px; object-fit: contain; }
.matrix-player strong, .matrix-player small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.matrix-player strong { font-size: 1.05rem; line-height: 1.05; }
.matrix-player small { color: var(--muted); font-size: .78rem; }

@media (min-width: 920px) {
  :root { --rail: 152px; --week: 272px; --row: 62px; }
  .app-shell { width: min(100% - 48px, 1440px); margin-inline: auto; }
}
```

Complete the surrounding identity, score, team bands, winner row, focus, reduced motion, safe-area, dialogs, and notices without gradients, cards, or page-level horizontal overflow.

- [ ] **Step 7: Run static and full tests**

Run: `node --test tests/static-shell.test.mjs tests/static-css.test.mjs tests/static-assets.test.mjs tests/static-security.test.mjs tests/state-api.test.mjs`

Expected: all listed tests PASS.

Run: `npm test`

Expected: all tests PASS except any explicitly introduced failing Task 4 state-client test, which must not be committed in a failing state; use only a resolving stub.

- [ ] **Step 8: Commit Task 3**

```bash
git add docs/index.html docs/app.js docs/styles.css docs/manifest.webmanifest docs/lib/state-api.js tests/state-api.test.mjs tests/static-shell.test.mjs tests/static-css.test.mjs tests/static-assets.test.mjs tests/static-security.test.mjs
git commit -m "feat: build the public weekly matrix"
```

---

### Task 4: Add the open draft controller

**Files:**
- Modify: `docs/lib/editor.js`
- Create: `tests/open-editor.test.mjs`
- Delete: `docs/lib/github.js`
- Delete: `tests/github-client.test.mjs`

**Interfaces:**
- Produces: `createDraftController({ state, etag, client, render, notify })` with synchronous draft mutations plus one `publish()`.
- Consumes: API `{ state }` and response `ETag`; existing model mutations and `validateMatchDraft`.

- [ ] **Step 1: Write failing open draft-controller tests**

Create `tests/open-editor.test.mjs` using the production fixture and assert that local mutations do not call the client, `publish()` calls it exactly once, returned revision/ETag replace the baseline, and `409` preserves the draft.

```js
test("mutates locally and publishes the complete draft once", async () => {
  let writes = 0;
  const client = { async write(state, etag) { writes += 1; return { state: { ...state, revision: 4 }, etag: '"r4"' }; } };
  const controller = createDraftController({ state: fixture, etag: '"r3"', client });
  controller.renamePlayer("emre", "Emre 53");
  assert.equal(writes, 0);
  await controller.publish();
  assert.equal(writes, 1);
  assert.equal(controller.getSnapshot().etag, '"r4"');
});
```

- [ ] **Step 2: Replace the connected editor controller**

In `docs/lib/editor.js`, delete token, SHA, connect, lock, `requireConnection`, and per-mutation remote saves. Export `createDraftController`:

```js
export function createDraftController({ state, etag, client, render = () => {}, notify = () => {} } = {}) {
  let baseline = validateState(state);
  let draft = structuredClone(baseline);
  let currentEtag = etag;
  let publishing = false;

  function update(mutator) {
    draft = validateState(mutator(structuredClone(draft)));
    render(draft);
    return structuredClone(draft);
  }

  async function publish() {
    if (publishing) return null;
    publishing = true;
    try {
      const result = await client.write(validateState(draft), currentEtag);
      baseline = validateState(result.state);
      draft = structuredClone(baseline);
      currentEtag = result.etag;
      render(draft);
      notify("Değişiklikler yayınlandı.", "success");
      return structuredClone(draft);
    } finally {
      publishing = false;
    }
  }

  return {
    getState: () => structuredClone(draft),
    getSnapshot: () => ({ state: structuredClone(draft), etag: currentEtag, dirty: JSON.stringify(draft) !== JSON.stringify(baseline), publishing }),
    reset: () => { draft = structuredClone(baseline); render(draft); },
    createMatch: (date) => createEmptyMatch(draft, date),
    saveMatch: (match) => update((next) => {
      const valid = validateMatchDraft(match, next);
      const index = next.matches.findIndex((candidate) => candidate.id === valid.id);
      if (index === -1) next.matches.push(valid); else next.matches[index] = valid;
      return next;
    }),
    deleteMatch: (id) => update((next) => ({ ...next, matches: next.matches.filter((match) => match.id !== id) })),
    addPlayer: (name) => update((next) => upsertPlayer(next, { name })),
    renamePlayer: (id, name) => update((next) => upsertPlayer(next, { id, name })),
    removePlayer: (id) => update((next) => removeOrDeactivatePlayer(next, id)),
    reactivatePlayer: (id) => update((next) => {
      const player = next.players.find((candidate) => candidate.id === id);
      return upsertPlayer(next, { id, name: player.name, active: true });
    }),
    publish,
  };
}
```

- [ ] **Step 3: Delete the browser GitHub credential layer and update security tests**

Delete `docs/lib/github.js` and `tests/github-client.test.mjs`. Update `tests/static-security.test.mjs` to assert no `api.github.com`, PBKDF2, AES-GCM, token input, PIN field, or localStorage credential key exists in shipped browser source.

- [ ] **Step 4: Run focused and full tests**

Run: `node --test tests/open-editor.test.mjs tests/static-security.test.mjs`

Expected: all tests PASS.

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 5: Commit Task 4**

```bash
git add -A docs/lib tests
git commit -m "feat: add open draft publishing"
```

---

### Task 5: Build `/edit/` as the directly editable weekly matrix

**Files:**
- Create: `docs/edit/index.html`
- Create: `docs/edit.js`
- Modify: `docs/lib/matrix.js`
- Modify: `docs/lib/editor.js`
- Modify: `docs/styles.css`
- Modify: `tests/matrix-views.test.mjs`
- Modify: `tests/static-editor.test.mjs`
- Modify: `tests/static-shell.test.mjs`

**Interfaces:**
- Consumes: `createStateClient`, `createDraftController`, `renderEditableMatrix`, `renderPlayerManager`.
- Produces: direct selectors tagged `data-player-select`, `data-civilization-select`, `data-winner-select`; actions `data-add-match`, `data-delete-match`, `data-open-players`, and `data-publish`.

- [ ] **Step 1: Add failing editable-matrix assertions**

Extend `tests/matrix-views.test.mjs`:

```js
test("editable matrix keeps one column per match and exposes complete controls", () => {
  const html = renderEditableMatrix(fixture);
  assert.equal((html.match(/data-edit-match=/g) ?? []).length, 2);
  assert.equal((html.match(/data-player-select=/g) ?? []).length, 16);
  assert.equal((html.match(/data-civilization-select=/g) ?? []).length, 16);
  assert.equal((html.match(/data-winner-select=/g) ?? []).length, 2);
  assert.match(html, /＋ Yeni oyuncu/);
});
```

Update `tests/static-shell.test.mjs` to load `docs/edit/index.html` and assert one `#editor-matrix-root`, one `[data-publish]`, no credential UI, and a link back to `/`.

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `node --test tests/matrix-views.test.mjs tests/static-shell.test.mjs`

Expected: FAIL because `renderEditableMatrix` and `docs/edit/index.html` do not exist.

- [ ] **Step 3: Implement editable matrix cells**

Add `renderEditableMatrix(state)` to `docs/lib/matrix.js`. It must reuse `orderedMatches`, team order, rail markup, and widths from the public renderer. Each player cell renders:

```html
<div class="matrix-player matrix-player--editable" data-edit-slot="MATCH_ID:TEAM_ID:INDEX">
  <img data-civilization-preview src="../assets/civs/random.svg" alt="" width="42" height="42">
  <label><span class="sr-only">Oyuncu</span><select data-player-select="MATCH_ID:TEAM_ID:INDEX">…</select></label>
  <label><span class="sr-only">Uygarlık</span><select data-civilization-select="MATCH_ID:TEAM_ID:INDEX">…</select></label>
</div>
```

The date header uses an `<input type="date" data-match-date="MATCH_ID">`; the footer uses a team `<select data-winner-select="MATCH_ID">`; each column has a named delete action.

- [ ] **Step 4: Create the editor shell**

Create `docs/edit/index.html` with the same compact identity strip, an explicit `Düzenleme` state label, `#editor-matrix-root`, `#players-dialog`, `#confirm-dialog`, a floating `data-publish` seal, and no authentication fields.

- [ ] **Step 5: Implement editor orchestration**

Create `docs/edit.js` that:

1. calls `client.read()` once;
2. creates `createDraftController` with the returned state/ETag;
3. renders `renderEditableMatrix(controller.getState())`;
4. updates one match draft for player, civilization, date, and winner change events;
5. opens player creation when a player selector becomes `__new__`;
6. adds a new complete draft column at the left through `controller.createMatch(todayIso())`;
7. confirms deletion with the match date;
8. publishes exactly once through `controller.publish()`;
9. on `409`, keeps the draft visible and shows `Başka biri önce yayınladı. Güncel veriyi yükle.`;
10. uses `beforeunload` only while `getSnapshot().dirty` is true.

The event key parser must be one function:

```js
function parseSlotKey(value) {
  const [matchId, teamId, index] = String(value).split(":");
  return { matchId, teamId, index: Number(index) };
}
```

- [ ] **Step 6: Style edit controls without creating a second layout**

Add only state-specific CSS:

```css
.matrix-player--editable { grid-template-columns: 42px minmax(0, 1fr); grid-template-rows: 1fr 1fr; gap: 4px 9px; }
.matrix-player--editable img { grid-row: 1 / 3; }
.matrix-player--editable select { width: 100%; min-height: 28px; border: 0; border-bottom: 1px solid var(--rule); border-radius: 0; background: transparent; }
.publish-seal[aria-busy="true"] { pointer-events: none; opacity: .68; }
```

On 320–430 px, keep the 108 px rail and 260 px week column unchanged; never switch the editor to cards.

- [ ] **Step 7: Run editor, renderer, static, and full tests**

Run: `node --test tests/open-editor.test.mjs tests/matrix-views.test.mjs tests/static-editor.test.mjs tests/static-shell.test.mjs tests/static-css.test.mjs`

Expected: all focused tests PASS.

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 8: Commit Task 5**

```bash
git add docs/edit docs/edit.js docs/lib/matrix.js docs/lib/editor.js docs/styles.css tests
git commit -m "feat: add the open matrix editor"
```

---

### Task 6: Move derived ranking to `/stats/` and finish navigation states

**Files:**
- Create: `docs/stats/index.html`
- Create: `docs/stats.js`
- Modify: `docs/lib/views.js`
- Modify: `docs/index.html`
- Modify: `docs/edit/index.html`
- Modify: `docs/styles.css`
- Modify: `tests/static-shell.test.mjs`
- Modify: `tests/static-views.test.mjs`

**Interfaces:**
- Consumes: `client.read()`, `calculateStatistics(state)`, `renderStatsTable(stats)`.
- Produces: `/stats/` with team totals and columns `O / G / M / %`; no match lineup duplication.

- [ ] **Step 1: Write failing route and view tests**

Add assertions:

```js
const statsHtml = await readFile(new URL("../docs/stats/index.html", import.meta.url), "utf8");
assert.match(statsHtml, /id="stats-root"/);
assert.match(statsHtml, /\.\.\/stats\.js/);
assert.doesNotMatch(statsHtml, /matrix-player|data-match-column/);

const rendered = renderStatsTable(calculateStatistics(fixture));
assert.match(rendered, /<th[^>]*>O<\/th>/);
assert.match(rendered, /<th[^>]*>G<\/th>/);
assert.match(rendered, /<th[^>]*>M<\/th>/);
assert.match(rendered, /100%/);
```

- [ ] **Step 2: Create the stats shell and entrypoint**

Create `docs/stats/index.html` with a compact title strip, team score summary, `#stats-root`, a back link to `/`, and no match matrix.

Create `docs/stats.js`:

```js
import { createStateClient } from "./lib/state-api.js";
import { calculateStatistics, validateState } from "./lib/model.js";
import { renderScoreStrip, renderStatsTable } from "./lib/views.js";

async function startStats(documentRoot = document, client = createStateClient()) {
  const { state } = await client.read();
  const normalized = validateState(state);
  const stats = calculateStatistics(normalized);
  documentRoot.querySelector("#score-strip").innerHTML = renderScoreStrip(normalized, stats);
  documentRoot.querySelector("#stats-root").innerHTML = renderStatsTable(stats);
}

if (typeof document !== "undefined") startStats();
```

The HTML uses `../styles.css` and other route-relative asset paths. The `docs/stats.js` module itself imports `./lib/...` because imports resolve relative to the module URL at the site root.

- [ ] **Step 3: Add one compact action menu across routes**

The lower-right action seal opens a three-link menu only when needed:

- public: `Düzenle`, `Sıralama`;
- edit: `Maç ekle`, `Oyuncular`, `Görüntüle` while the publish seal remains the single primary fixed action;
- stats: `Maçlar`, `Düzenle`.

The menu is not a sidebar, header, footer, or bottom navigation and closes on Escape/outside click.

- [ ] **Step 4: Run focused and full tests**

Run: `node --test tests/static-shell.test.mjs tests/static-views.test.mjs`

Expected: all focused tests PASS.

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 5: Commit Task 6**

```bash
git add docs/stats docs/stats.js docs/index.html docs/edit/index.html docs/lib/views.js docs/styles.css tests/static-shell.test.mjs tests/static-views.test.mjs
git commit -m "feat: add separate player standings"
```

---

### Task 7: Seed Blob, link the second Vercel project, and verify local production behavior

**Files:**
- Create: `scripts/seed-vercel-blob.mjs`
- Modify: `scripts/visual-qa.mjs`
- Modify: `.gitignore`
- Modify: `README.md`
- Modify: `.env.example`

**Interfaces:**
- Consumes: Vercel CLI account `ekremus`, private Blob store token, `docs/data/state.json`.
- Produces: linked `.vercel/project.json` (ignored), private `state.json` Blob, reproducible seed command, Vercel dev runtime.

- [ ] **Step 1: Implement an idempotent seed script**

Create `scripts/seed-vercel-blob.mjs`:

```js
import { readFile } from "node:fs/promises";
import { get, put } from "@vercel/blob";
import { validateState } from "../docs/lib/model.js";

const state = validateState(JSON.parse(await readFile(new URL("../docs/data/state.json", import.meta.url))));
const existing = await get("state.json", { access: "private", useCache: false }).catch(() => null);
if (existing) {
  const remote = validateState(JSON.parse(await new Response(existing.stream).text()));
  if (remote.revision > state.revision) throw new Error(`Blob revision ${remote.revision} yerel seed'den yeni; üzerine yazılmadı.`);
}
const written = await put("state.json", `${JSON.stringify(state, null, 2)}\n`, {
  access: "private",
  allowOverwrite: Boolean(existing),
  contentType: "application/json",
  cacheControlMaxAge: 60,
  ...(existing?.etag ? { ifMatch: existing.etag } : {}),
});
console.log(JSON.stringify({ pathname: written.pathname, revision: state.revision, matches: state.matches.length, players: state.players.length }));
```

- [ ] **Step 2: Link a new Vercel project without changing the existing CV project**

Run:

```bash
vercel link --yes --project bu-ecof-empires-53
```

Expected: a new second project under `ekremustunvercel-gmailcoms-projects`; `vercel project ls` still lists `ekremeralp` unchanged plus the new project.

Create a private Blob store in the new project and pull env locally using current CLI commands:

```bash
vercel blob create-store bu-ecof-empires-state --access private --region fra1 --yes
vercel env pull .env.local
npm run data:seed
```

Expected seed output: `revision: 3`, `matches: 2`, `players: 10`.

- [ ] **Step 3: Run Vercel dev and API smoke tests**

Run: `npm run dev`

In another shell:

```bash
curl -fsS -D - http://127.0.0.1:4173/api/state -o /tmp/bu-ecof-state.json
jq '{schemaVersion,revision,players:(.state.players|length),matches:(.state.matches|length)}' /tmp/bu-ecof-state.json
```

Expected: HTTP 200 with `ETag`; schema version 1, revision 3, 10 players, 2 matches.

- [ ] **Step 4: Update visual QA for the matrix**

Make `scripts/visual-qa.mjs` capture in one batch:

- public 320×700, 390×844, 1440×1000;
- editor 320×700 and 390×844;
- player sheet 390×844;
- stats 390×844;
- a horizontally scrolled second match state.

Metrics must include document scroll width, matrix client/scroll widths, sticky rail left coordinate before/after horizontal scroll, match-column count, failed images, open dialogs, and console errors.

- [ ] **Step 5: Run the first bounded browser QA round**

Run: `npm run qa:visual`

Expected:

- document `scrollWidth === innerWidth` at all widths;
- matrix `scrollWidth > clientWidth` on phone;
- sticky rail left coordinate unchanged after matrix scroll;
- 2 match columns;
- no failed images or console errors.

- [ ] **Step 6: Commit Task 7**

Do not commit `.env.local` or `.vercel/`.

```bash
git add scripts package.json package-lock.json README.md .env.example .gitignore
git commit -m "chore: add Vercel data migration tooling"
```

---

### Task 8: Apply final Impeccable and image-to-code QA, document the new system, and deploy

**Files:**
- Create: `design-qa.md`
- Modify: UI files identified by the first screenshot batch.
- Modify: `PRODUCT.md`
- Modify: `DESIGN.md`
- Modify: `.impeccable/design.json`
- Modify: `.impeccable/surfaces/docs-index-html.md`
- Modify: `README.md`
- Delete: `docs/404.html`

**Interfaces:**
- Consumes: both supplied reference screenshots, first QA capture, Vercel preview URL.
- Produces: `design-qa.md` with `final result: passed`, a production Vercel deployment, and disabled GitHub Pages only after live verification.

- [ ] **Step 1: Compare references and implementation at the same viewport**

Open the two supplied images and the 390×844 public/editor captures. Write `design-qa.md` with sections:

```markdown
# Design QA — Vercel Matrix Redesign

## Reference contract
- One horizontal week matrix; newest first.
- Blue four-row Cortinyanlar block, orange four-row Bakracoğulları block, green winner row.
- Crest + strong player + quiet civilization hierarchy.

## P0/P1/P2 findings
[Concrete viewport, selector, symptom, and fix for every issue. Write `None` when empty.]

## P3 notes
[Non-blocking polish only.]

final result: blocked
```

- [ ] **Step 2: Fix every P0/P1/P2 in one implementation pass**

Apply all blocking corrections together. Preserve the binding matrix geometry; do not solve narrow widths by switching to cards or hiding names/civilizations.

- [ ] **Step 3: Run one final screenshot confirmation**

Run: `npm run qa:visual`

Update `design-qa.md` to `final result: passed` only when all P0/P1/P2 findings are closed and the exact metrics from Task 7 pass. Do not loop on P3 notes.

- [ ] **Step 4: Run the Impeccable detector exactly once at finish**

Run:

```bash
node /Users/eko/.codex/skills/impeccable/scripts/detect.mjs --json docs/index.html
```

Expected: `[]`. Apply any reported blocking rule fixes, but do not rerun the detector.

- [ ] **Step 5: Document the implementation as ground truth**

Update `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json`, and the surface brief to describe the actual matrix tokens, 108/260 px phone geometry, team colors, routes, open-edit risk boundary, Vercel Blob API, and no duplicate match surfaces. Update `README.md` with local Vercel dev, state seeding, recovery from `docs/data/state.json`, free-plan limits, and deployment.

Delete `docs/404.html` because GitHub Pages routing is retired.

- [ ] **Step 6: Run final automated verification**

Run:

```bash
npm test
node --check api/state.js
node --check api/lib/state-handler.js
node --check api/lib/blob-store.js
node --check docs/app.js
node --check docs/edit.js
node --check docs/stats.js
git diff --check
rg -n "api\.github\.com|Fine-grained GitHub token|credential-dialog|PIN|chatgpt\.site|pages\.dev" docs api README.md
```

Expected: all tests PASS; all syntax/diff checks succeed; the final `rg` returns no obsolete runtime/auth copy.

- [ ] **Step 7: Deploy preview and verify a reversible write**

Run: `vercel deploy`

Against the returned preview URL:

1. GET `/api/state`; record state and ETag.
2. PUT the unchanged state with the recorded ETag; expect revision 4 and new ETag.
3. Use `/edit/` to make a temporary reversible player rename and publish.
4. Reload in a second browser target; confirm the rename is visible.
5. Rename back and publish; confirm the original ten-player/two-match state content is restored apart from revision/updatedAt.

- [ ] **Step 8: Deploy production and verify every live surface**

Run and capture the returned URL:

```bash
task_production_url="$(vercel deploy --prod)"
```

Verify:

```bash
curl -fsSI "$task_production_url/"
curl -fsSI "$task_production_url/edit/"
curl -fsSI "$task_production_url/stats/"
curl -fsS "$task_production_url/api/state" | jq '{revision:.state.revision,players:(.state.players|length),matches:(.state.matches|length)}'
```

Expected: all routes HTTP 200; 10 players and 2 matches; latest revision returned. Open production in Chrome at 390×844 and confirm matrix scroll, editor publish, stats, and zero console/image failures.

- [ ] **Step 9: Disable GitHub Pages only after production passes**

Use the authenticated GitHub API to disable the old Pages deployment after recording the new Vercel production URL in README:

```bash
gh api --method DELETE repos/ekremus/53/pages
```

Expected: HTTP 204. Confirm source repository and `main` remain intact; only the old Pages publication is removed.

- [ ] **Step 10: Commit, push, and confirm Vercel’s Git source**

```bash
git add -A
git commit -m "chore: ship the Vercel matrix tracker"
git push github main
git status --short
```

Expected: clean working tree, `github/main` equals local `HEAD`, Vercel production remains healthy, existing `ekremeralp` project remains unchanged.

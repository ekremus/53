# Wordmark, Winner Medal, and Continuous Parchment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a compact generated wordmark header, a continuous team divider, a winner medal, and a seam-free parchment background while preserving the 390 × 844 match geometry and all shared-data behavior.

**Architecture:** Keep the static SPA and pure renderer boundaries. New assets live in `docs/assets/`; `docs/index.html` owns the brand row, `docs/lib/matrix.js` owns the medal markup, and `docs/styles.css` owns geometry, the inset divider, and the continuous viewport background. API, model, controller, and state files remain unchanged.

**Tech Stack:** HTML5, CSS, browser ES modules, Node.js 22 test runner, built-in ImageGen, Pillow chroma-key removal, Tabler Icons, Vercel.

## Global Constraints

- Visible raster text is exactly `Bu Ecof Empires`; accessible product text remains `Bu Ecof Empires🏹🪓⚔️`.
- Cortinyanlar stays blue and Bakracoğulları stays red.
- The separator is a 3px dark-walnut inset; player rows remain 54px and the public match remains 504px.
- The medal is a real local 20px Tabler asset, never emoji, CSS art, inline SVG, or a text glyph.
- The complete newest match remains visible at 390 × 844.
- The background has no 145px band, solid-color cutoff, or hard repeat seam.
- No data migration, backend change, dependency, footer, bottom navigation, dashboard card, or explanatory copy.

## File Structure

- Create `docs/assets/wordmark-ecof.png`, `docs/assets/paper-continuous.jpg`, and `docs/assets/icons/medal.svg`.
- Modify `docs/index.html` for the brand header.
- Modify `docs/lib/matrix.js` for the result-rail medal.
- Modify `docs/styles.css` for all layout and material behavior.
- Extend `tests/static-assets.test.mjs`, `tests/static-shell.test.mjs`, `tests/matrix-views.test.mjs`, and `tests/static-css.test.mjs`.
- Refresh `DESIGN.md`, `.impeccable/design.json`, `.impeccable/surfaces/docs-index-html.md`, and `design-qa.md` after implementation.

---

### Task 1: Produce and Validate Local Assets

**Files:**
- Create: `docs/assets/wordmark-ecof.png`
- Create: `docs/assets/paper-continuous.jpg`
- Create: `docs/assets/icons/medal.svg`
- Modify: `docs/assets/icons/NOTICE.md`
- Test: `tests/static-assets.test.mjs`

**Interfaces:**
- Consumes: incumbent parchment, bronze, and furniture colors in `DESIGN.md`.
- Produces: `./assets/wordmark-ecof.png`, `./assets/paper-continuous.jpg`, and `./assets/icons/medal.svg`.

- [ ] **Step 1: Write the failing asset contract**

Add these paths to the critical resource list:

```js
"../docs/assets/paper-continuous.jpg",
"../docs/assets/wordmark-ecof.png",
"../docs/assets/icons/medal.svg",
```

Add this test:

```js
test("ships valid wordmark and continuous parchment images", async () => {
  const wordmark = await readFile(new URL("../docs/assets/wordmark-ecof.png", import.meta.url));
  const parchment = await readFile(new URL("../docs/assets/paper-continuous.jpg", import.meta.url));
  assert.deepEqual(wordmark.subarray(0, 8), pngSignature);
  assert.deepEqual(parchment.subarray(0, 3), Buffer.from([0xff, 0xd8, 0xff]));
});
```

- [ ] **Step 2: Verify the focused test fails**

Run `node --test tests/static-assets.test.mjs`.

Expected: FAIL with `ENOENT` for at least one new asset.

- [ ] **Step 3: Generate and clean the wordmark**

Use built-in ImageGen with this prompt:

```text
Use case: logo-brand
Asset type: compact wordmark for a 390px-wide mobile AoE2 match tracker header
Primary request: create a refined horizontal wordmark whose visible text reads exactly "Bu Ecof Empires"; integrate three very small medieval weapon marks representing a bow, axe, and sword
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background; no shadow, gradient, texture, floor, or lighting variation
Style/medium: crisp vector-friendly heraldic wordmark rendered as polished raster art, restrained rather than ornate
Composition/framing: single centered 4:1 horizontal lockup, legible at 230px wide and 28px high
Color palette: warm parchment #f6e6bd, antique gold #c9a45b, tiny deep-brown #3c3022 details
Text (verbatim): "Bu Ecof Empires"
Constraints: spell every letter exactly; weapons remain secondary; no emoji glyphs, enclosing badge, shadow, #00ff00 subject color, or watermark
Avoid: blackletter, giant crest, photorealism, extra words, subtitle, date, initials, glossy 3D effects
```

Copy the returned file to `.qa/wordmark-source.png`, then run:

```bash
python3 /Users/eko/.codex/skills/.system/imagegen/scripts/remove_chroma_key.py \
  --input .qa/wordmark-source.png \
  --out docs/assets/wordmark-ecof.png \
  --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill
```

Trim transparent padding:

```bash
python3 - <<'PY'
from PIL import Image
asset = "docs/assets/wordmark-ecof.png"
image = Image.open(asset).convert("RGBA")
bounds = image.getchannel("A").getbbox()
if bounds is None:
    raise SystemExit("empty alpha")
left, top, right, bottom = bounds
margin = 12
image.crop((max(0, left-margin), max(0, top-margin), min(image.width, right+margin), min(image.height, bottom+margin))).save(asset)
PY
```

Inspect spelling. If wrong, make one targeted regeneration adding `Correction: render the exact letter sequence B-u  E-c-o-f  E-m-p-i-r-e-s.` If still wrong, crop to the generated weapon emblem and pair it with live Merriweather text in Task 2; never ship misspelled raster text.

- [ ] **Step 4: Generate the continuous parchment**

Use a separate built-in ImageGen call:

```text
Use case: stylized-concept
Asset type: full-viewport web application background texture
Primary request: evenly lit warm weathered parchment matching an Age of Empires II field ledger
Scene/backdrop: full-bleed parchment only
Style/medium: realistic scanned matte handmade paper, subtle fibers and restrained mottling
Composition/framing: edge-safe uniform visual density with no central subject
Color palette: #c7a86f with gentle #d8bd88 and #b18f58 variation; sparse fibers no darker than #8a6935
Constraints: no border, band, vignette, directional light, fold, torn edge, object, symbol, text, or watermark; no visually detectable boundary
Avoid: wood, leather, stone, map lines, sharp stains, corners, frame, gradient
```

Copy the output to `.qa/paper-continuous-source.png`, then run:

```bash
/usr/bin/sips -s format jpeg -s formatOptions 90 .qa/paper-continuous-source.png --out docs/assets/paper-continuous.jpg
```

Reject any image with a hard edge, horizontal band, vignette, or focal object.

- [ ] **Step 5: Add the verified official Tabler medal**

```bash
curl -L --fail https://raw.githubusercontent.com/tabler/tabler-icons/main/icons/outline/medal.svg -o docs/assets/icons/medal.svg
```

Add to `docs/assets/icons/NOTICE.md`:

```markdown
- `medal.svg`: `icons/outline/medal.svg`
```

- [ ] **Step 6: Validate asset quality and pass the tests**

```bash
python3 - <<'PY'
from PIL import Image
wordmark = Image.open("docs/assets/wordmark-ecof.png")
paper = Image.open("docs/assets/paper-continuous.jpg")
assert wordmark.mode == "RGBA"
assert wordmark.width > wordmark.height * 2.5
assert wordmark.getpixel((0, 0))[3] == 0
assert paper.width >= 1024 and paper.height >= 1024
print({"wordmark": wordmark.size, "paper": paper.size})
PY
node --test tests/static-assets.test.mjs
```

Expected: assertions succeed and all asset tests pass.

- [ ] **Step 7: Commit**

```bash
git add docs/assets/wordmark-ecof.png docs/assets/paper-continuous.jpg docs/assets/icons/medal.svg docs/assets/icons/NOTICE.md tests/static-assets.test.mjs
git commit -m "feat: add wordmark medal and continuous parchment assets"
```

---

### Task 2: Add Brand and Medal Markup

**Files:**
- Modify: `docs/index.html:17-32`
- Modify: `docs/lib/matrix.js:15-23`
- Test: `tests/static-shell.test.mjs`
- Test: `tests/matrix-views.test.mjs`

**Interfaces:**
- Consumes: Task 1 asset URLs.
- Produces: `.brand-header`, `.brand-wordmark`, and `.rail-result__medal`.

- [ ] **Step 1: Write failing markup tests**

Add to the shell test:

```js
assert.match(html, /class="brand-header"/);
assert.match(html, /class="brand-wordmark"/);
assert.match(html, /src="\.\/assets\/wordmark-ecof\.png"/);
assert.match(html, /alt="Bu Ecof Empires🏹🪓⚔️"/);
```

Add to the matrix tests:

```js
test("shows one local winner medal in the left result rail", () => {
  const html = renderMatchMatrix(fixture);
  assert.equal((html.match(/rail-result__medal/g) ?? []).length, 1);
  assert.match(html, /assets\/icons\/medal\.svg/);
});
```

- [ ] **Step 2: Verify the tests fail**

Run `node --test tests/static-shell.test.mjs tests/matrix-views.test.mjs`.

Expected: FAIL because brand and medal markup are absent.

- [ ] **Step 3: Add the semantic brand row**

Use this app-shell opening in `docs/index.html`:

```html
<main id="app" class="app-shell">
  <header class="brand-header" aria-label="Bu Ecof Empires🏹🪓⚔️">
    <img class="brand-wordmark" src="./assets/wordmark-ecof.png" alt="Bu Ecof Empires🏹🪓⚔️">
  </header>
  <nav id="top-control" class="top-control" aria-label="Görünüm ve düzenleme"></nav>
  <section id="score-strip" class="score-strip" aria-label="Skor" aria-busy="true"></section>
  <section id="surface-root" class="surface-root" aria-live="polite" aria-busy="true"><p class="loading-line">Yükleniyor…</p></section>
</main>
```

If Task 1 uses emblem-only fallback, use:

```html
<header class="brand-header brand-header--composite" aria-label="Bu Ecof Empires🏹🪓⚔️">
  <img class="brand-emblem" src="./assets/wordmark-ecof.png" alt="">
  <strong>Bu Ecof Empires</strong>
</header>
```

Update the HTML direction comment to allow this one compact brand row.

- [ ] **Step 4: Add the medal to `railMarkup`**

Replace the empty result cell with:

```js
<div class="rail-result"><img class="rail-result__medal" src="./assets/icons/medal.svg" alt="" width="20" height="20"></div>
```

- [ ] **Step 5: Pass tests and commit**

```bash
node --test tests/static-shell.test.mjs tests/matrix-views.test.mjs
git add docs/index.html docs/lib/matrix.js tests/static-shell.test.mjs tests/matrix-views.test.mjs
git commit -m "feat: add compact brand and winner medal markup"
```

Expected: focused tests pass before the commit.

---

### Task 3: Implement Geometry, Divider, and Continuous Background

**Files:**
- Modify: `docs/styles.css:63-160,289-420,700-775`
- Test: `tests/static-css.test.mjs`

**Interfaces:**
- Consumes: Task 2 classes and Task 1 assets.
- Produces: a 40px brand row, unchanged 44px controls, 3px inset divider, centered medal, and fixed cover parchment.

- [ ] **Step 1: Write failing CSS contracts**

```js
test("adds a compact brand row without breaking the first viewport", () => {
  assert.match(css, /--brand-row:\s*40px/);
  assert.match(css, /\.brand-header[\s\S]*height:\s*calc\(var\(--brand-row\) \+ env\(safe-area-inset-top\)\)/);
  assert.match(css, /\.brand-wordmark[\s\S]*max-height:\s*30px/);
});

test("draws one inset walnut boundary between the teams", () => {
  assert.match(css, /--team-divider:\s*#5c4326/);
  assert.match(css, /\.rail-team--blue[\s\S]*inset 0 -3px 0 var\(--team-divider\)/);
  assert.match(css, /\.matrix-team--blue[\s\S]*inset 0 -3px 0 var\(--team-divider\)/);
});

test("keeps parchment continuous behind long surfaces", () => {
  assert.match(css, /paper-continuous\.jpg/);
  assert.match(css, /body::before[\s\S]*position:\s*fixed/);
  assert.match(css, /body::before[\s\S]*background-size:\s*cover/);
  assert.doesNotMatch(css, /background-image:\s*url\("\.\/assets\/paper\.jpg"\)/);
});
```

- [ ] **Step 2: Verify CSS tests fail**

Run `node --test tests/static-css.test.mjs`.

Expected: FAIL for all three new contracts.

- [ ] **Step 3: Add tokens and fixed background**

Add to `:root`:

```css
--team-divider: #5c4326;
--brand-row: 40px;
```

Remove the image from `html`, set `body { position: relative; isolation: isolate; }`, and add:

```css
body::before {
  position: fixed;
  inset: 0;
  z-index: -1;
  background-color: var(--paper);
  background-image: url("./assets/paper-continuous.jpg");
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
  content: "";
  pointer-events: none;
}
```

Change the dialog URL to `paper-continuous.jpg`.

- [ ] **Step 4: Add compact header geometry**

```css
.brand-header {
  display: grid;
  width: 100%;
  height: calc(var(--brand-row) + env(safe-area-inset-top));
  padding-top: env(safe-area-inset-top);
  place-items: center;
  overflow: hidden;
  background: var(--furniture-deep);
}

.brand-wordmark {
  display: block;
  width: auto;
  max-width: min(250px, calc(100vw - 32px));
  height: auto;
  max-height: 30px;
  object-fit: contain;
}
```

Remove safe-area padding from `.top-control`, keep `min-height: var(--touch)`, and move notices to:

```css
top: calc(env(safe-area-inset-top) + var(--brand-row) + var(--touch) + 6px);
```

- [ ] **Step 5: Add aligned divider and medal styling**

Add `box-shadow: inset 0 -3px 0 var(--team-divider);` to both `.rail-team--blue` and `.matrix-team--blue`. Add:

```css
.rail-result {
  display: grid;
  place-items: center;
  border-top: 1px solid var(--rule);
}

.rail-result__medal {
  display: block;
  width: 20px;
  height: 20px;
  filter: invert(70%) sepia(54%) saturate(623%) hue-rotate(2deg) brightness(91%);
}
```

Do not add borders that alter `.matrix-team` or `.matrix-player` sizes.

- [ ] **Step 6: Pass full tests and commit**

```bash
node --test tests/static-css.test.mjs
npm test
git add docs/styles.css tests/static-css.test.mjs
git commit -m "feat: add compact header and continuous ledger details"
```

Expected: all 53 tests pass with zero failures (48 existing tests plus five new test cases).

---

### Task 4: Synchronize Design Documentation and Run Bounded QA

**Files:**
- Modify: `DESIGN.md`
- Modify: `.impeccable/design.json`
- Modify: `.impeccable/surfaces/docs-index-html.md`
- Modify: `design-qa.md`
- Create ignored captures under: `.qa/`

**Interfaces:**
- Consumes: Tasks 1–3 and the approved spec.
- Produces: durable design truth and mobile/desktop acceptance evidence.

- [ ] **Step 1: Load refinement quality guidance**

Read Impeccable `reference/delight.md`, then `reference/craft-floor.md` immediately before any UI correction. Do not rerun its session context.

- [ ] **Step 2: Update design truth**

Make these exact changes:

- `DESIGN.md`: document the 40px wordmark exception, `paper-continuous.jpg`, 3px walnut divider, and 20px gold medal.
- `.impeccable/design.json`: update Brand Header, Weekly Matrix Slice, parchment narrative, divider color, and 40px geometry.
- surface brief: first viewport becomes 40px brand + 44px controls + 52px score + 504px matrix.
- `design-qa.md`: add measured header, divider, medal, and background checks.

Run `jq empty .impeccable/design.json` and `git diff --check`; both must exit 0.

- [ ] **Step 3: Start local Vercel and capture one batched round**

Run `npm run dev:vercel`, then use the chosen in-app browser to inspect together:

- public and editable matches at 390 × 844;
- standings and player editing at 390 × 844 after scrolling beyond one viewport;
- public matches at 1440 × 900.

Measure:

```js
({
  width: document.documentElement.scrollWidth,
  viewport: innerWidth,
  brandBottom: Math.round(document.querySelector('.brand-header').getBoundingClientRect().bottom),
  matrixBottom: Math.round(document.querySelector('.match-matrix')?.getBoundingClientRect().bottom ?? 0),
  players: document.querySelectorAll('.match-column:first-child .matrix-player').length,
  wordmarkLoaded: document.querySelector('.brand-wordmark')?.naturalWidth > 0,
  medalLoaded: document.querySelector('.rail-result__medal')?.naturalWidth > 0,
  failedImages: [...document.images].filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.src),
})
```

At 390px: width and viewport equal 390, players equals 8, assets load, failedImages is empty, and matrixBottom is below 844.

- [ ] **Step 4: Compare and allow at most one correction round**

Compare against `.qa/mobile-public-390x844.png` and `.qa/desktop-public-final-1440x900.png`. Inspect spelling/crop, 3px divider continuity, medal centering, background continuity, and first-viewport fit. Apply all corrections together, rerun affected tests, then capture one confirmation round at most.

- [ ] **Step 5: Run gates and commit documentation**

```bash
npm test
npm audit --omit=dev
jq empty .impeccable/design.json
git diff --check
git add DESIGN.md .impeccable/design.json .impeccable/surfaces/docs-index-html.md design-qa.md
git commit -m "docs: record the branded continuous ledger system"
```

Expected: tests pass, audit reports zero vulnerabilities, JSON parses, and the commit contains only intended documentation.

---

### Task 5: Deploy, Verify, and Push

**Files:**
- Create ignored backup: `.qa/production-state-before-wordmark-deploy.json`
- No source change expected.

**Interfaces:**
- Consumes: clean tested `main`, Vercel project `53aoe`, and production Blob state.
- Produces: verified `https://53aoe.vercel.app` and identical `github/main`.

- [ ] **Step 1: Back up live state without mutation**

```bash
curl --fail --silent --show-error https://53aoe.vercel.app/api/state --output .qa/production-state-before-wordmark-deploy.json
jq '{revision:.state.revision,players:(.state.players|length),matches:(.state.matches|length)}' .qa/production-state-before-wordmark-deploy.json
```

Record and preserve the actual live counts.

- [ ] **Step 2: Deploy preview and smoke-test routes**

Run `vercel deploy --yes`. For the returned URL, verify `/`, `/?view=standings`, `/?view=matches&edit=1`, `/stats/`, `/edit/`, and `/api/state` return HTTP 200. Do not save data.

- [ ] **Step 3: Deploy production and assign the short alias**

Run `vercel deploy --prod --yes`, then use the exact returned deployment URL in:

```bash
vercel alias set RETURNED_PRODUCTION_DEPLOYMENT_URL 53aoe.vercel.app
```

`RETURNED_PRODUCTION_DEPLOYMENT_URL` is defined by the immediately preceding Vercel output; never guess it.

- [ ] **Step 4: Verify production state and UI**

Fetch `/api/state` to `.qa/production-state-after-wordmark-deploy.json` and compare player/match content with the backup. At 390 × 844 confirm the wordmark, medal, divider, continuous parchment, score, eight players, and `matrixBottom < 844`.

- [ ] **Step 5: Push exact source and leave production open**

```bash
git status --short
git push github main
git ls-remote github refs/heads/main
git rev-parse HEAD
```

Expected: worktree clean and remote hash equals local HEAD. Leave `https://53aoe.vercel.app/` open in the in-app browser and report asset paths, ImageGen prompts, tests, deployment, state preservation, and GitHub commit.

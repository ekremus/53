# Bu Ecof Empires — Vercel Matrix Redesign

**Date:** 2026-07-26  
**Status:** Approved direction, pending implementation plan  
**Product:** Weekly Age of Empires II: Definitive Edition 4v4 match tracker  
**Runtime:** Vercel Hobby  

## 1. Decision

Replace the current repeated “latest match / recent matches / archive” homepage with one horizontally scrolling weekly match matrix inspired by the approved spreadsheet reference. Move the complete runtime from GitHub Pages to one Vercel project. Keep GitHub as source control and automatic deployment only. Store the shared match state as one private Vercel Blob JSON document.

The public application has no authentication. Anyone who can open `/edit/` can add, change, or delete valid records. There is no PIN, login, GitHub account, or user-supplied token.

## 2. Goals

- Make the entire match history understandable through one consistent table.
- Put the newest match in the first visible match column; older matches continue to the right.
- Keep team grouping unmistakable: four Cortinyanlar rows, then four Bakracoğulları rows, then the winner row.
- Preserve the current player-name plus civilization-crest system.
- Make the 320–430 px phone experience canonical, with deliberate horizontal scrolling for weeks rather than squeezed cells.
- Let anyone edit through `/edit/` and publish without credentials.
- Keep the implementation small: vanilla HTML, CSS, JavaScript, one API module, one Blob object.
- Remain inside Vercel Hobby’s free limits by a very large margin.

## 3. Non-goals

- No “Son maç”, “Son maçlar”, “Tümü”, or duplicate match archive on the homepage.
- No dashboard card grid, large hero, persistent header, sidebar, footer, or bottom navigation.
- No kills, military score, economy score, map, duration, or other unrequested match fields.
- No user accounts, roles, passwords, PINs, approval queues, or edit ownership.
- No realtime multi-cursor collaboration.
- No database, ORM, frontend framework, GitHub write client, or separate Pages deployment.

## 4. Information architecture

### `/` — public meydan defteri

The page is one continuous surface:

1. A compact dark AoE2 identity strip containing `Bu Ecof Empires🏹🪓⚔️` and the cumulative team score.
2. The weekly match matrix containing every match.
3. One lower-right circular action button. It provides links to `/edit/` and `/stats/` without adding persistent navigation chrome.

The homepage contains each match exactly once.

### `/edit/` — open editor

The editor uses the same matrix geometry and chronological order as the public view. Player and civilization fields become direct controls. A single floating publish action saves the complete draft. Match creation inserts a new column at the left. Existing columns support date changes, winner changes, and deletion. Player management opens as a focused sheet and supports add, rename, deactivate/reactivate, and deletion when unused.

The editor labels itself clearly so a visitor never mistakes draft changes for published state.

### `/stats/` — derived statistics

Player rankings and the two-team summary live on a separate, compact ledger page. Statistics are derived from the same shared state and never stored independently. The page shows matches played, wins, losses, and win rate. It does not repeat full match lineups.

## 5. Match matrix anatomy

The matrix is a two-dimensional ledger with a sticky left rail and horizontally scrollable match columns.

### Sticky rail

- Width: approximately 108 px on phones, increasing modestly on wide screens.
- Header cells: `Takım` and `Slot` are combined into a compact anchor.
- Cortinyanlar occupies one blue label block aligned with four P1–P4 rows.
- Bakracoğulları occupies one orange label block aligned with four P1–P4 rows.
- The final green block is `Kazanan`.
- The rail remains visible while match columns scroll.

### Match columns

- Phone width: approximately 260 px, so one complete match column fits beside the sticky rail at 390 px.
- Wide-screen width: approximately 250–280 px; several weeks may be visible simultaneously.
- Order: newest first, then descending chronologically to the right. Matches with the same date preserve newest-record-first insertion order.
- Horizontal scrolling uses scroll snapping. It is an intentional week browser, not accidental overflow.

Each column contains:

1. Date header.
2. Four Cortinyanlar player cells.
3. Four Bakracoğulları player cells.
4. Winner cell.

### Player cells

Every public player cell has:

- a real local civilization crest;
- the player name in the strongest text style;
- the civilization name below it in a quieter tone.

Rows use one-pixel rules instead of independent cards. Random uses the existing local question-mark shield and never appears as a broken or empty asset.

In `/edit/`, the same cell contains a player dropdown and a civilization dropdown while retaining the crest preview. A player already selected elsewhere in that match is disabled in the remaining selectors. `+ Yeni oyuncu` opens player creation without discarding the match draft.

### Winner row

The winner cell belongs to the same match column and is never separated into another result list. It displays the winning team name and a restrained trophy/result marker. Color is accompanied by text.

## 6. Visual direction

The reference spreadsheet supplies the information model, not literal office-software styling. The second reference supplies the player-row quality bar.

- Dark navy-charcoal title and date fields.
- Cortinyanlar blue and Bakracoğulları orange as structural team fields.
- Warm parchment rows with precise bronze separators.
- Green reserved for the winner row and successful publish feedback.
- Local Alegreya for compact identity and headings; local Alegreya Sans for all data and controls.
- Square or subtly chamfered geometry; no rounded-card dashboard language.
- No gradients, glass, giant decorative crest, nested containers, or ornamental frame.
- Civilization art remains local and license notices stay in the repository.

The first phone viewport should show the compact identity/score strip, the newest date, and enough of the lineup to make the horizontal-week model immediately obvious.

## 7. Vercel architecture

### Hosting

One Vercel Hobby project serves the static application and serverless API on the same origin. GitHub remains the source repository and Vercel deploys from `main`. GitHub Pages is disabled only after the Vercel production URL passes live verification.

### Storage

Create one private Vercel Blob store containing `state.json`. Seed it with the current schema version, revision 3, ten players, and two matches. The Blob read-write credential is injected into the Vercel function as an environment variable and never reaches browser code.

The bundled `docs/data/state.json` remains a recovery seed and test fixture, not the live source after migration.

### API

`GET /api/state`

- Reads the private Blob with caching bypassed so the latest successful write is returned.
- Validates the stored state before responding.
- Returns JSON, the current revision, and the Blob ETag.
- Uses `Cache-Control: no-store`.

`PUT /api/state`

- Is intentionally unauthenticated.
- Accepts JSON only and rejects oversized payloads.
- Validates the complete state, player identities, team membership, unique 4v4 participants, civilizations, winner, dates, and revision.
- Requires the last-read ETag through `If-Match`.
- Writes only the fixed `state.json` pathname using Blob conditional writes.
- Returns `409 Conflict` when another visitor published first.
- Returns the new state, revision, and ETag after success.

The browser cannot choose a Blob pathname, supply a storage token, or invoke arbitrary storage operations.

## 8. Data and concurrency

Keep the existing normalized state schema. Every successful publish increments `revision` by one and replaces `updatedAt` with the server timestamp. Statistics remain derived.

The editor keeps an in-memory draft. It does not write once per dropdown change. `Yayınla` performs one complete conditional update, which keeps the UX predictable and storage operations negligible.

If a conditional write fails:

- keep the user’s draft in memory;
- explain that another edit was published first;
- offer `Güncel veriyi yükle` rather than silently overwriting either version.

## 9. Open-editing risk boundary

The absence of authentication is deliberate and user-approved. Anyone can submit a valid alternate match history. Server-side validation prevents malformed payloads, unknown fields, invalid civilizations, duplicate participants, and arbitrary storage access; it cannot distinguish a friend from a vandal.

The deployment must not imply that the site is protected. Recovery uses the bundled seed or an operator export when needed. Adding identity or moderation later is a separate product decision.

## 10. Error and empty states

- Initial load failure: keep the matrix frame visible and show a retry action.
- No matches: show the row structure with one direct `İlk maçı ekle` action on `/edit/`.
- Save in progress: disable publish and destructive actions; do not block horizontal inspection.
- Validation failure: identify the exact match, team, and slot.
- Conflict: preserve draft and present reload guidance.
- Storage outage: preserve draft and allow retry.
- Delete: require a native confirmation dialog naming the match date.

## 11. Accessibility and responsive behavior

- All interactive targets are at least 44 px.
- Sticky rail labels and winner text communicate meaning without color alone.
- Tables/rows use semantic headings where practical, with an accessible linear alternative for assistive technology.
- Horizontal scroll area is keyboard focusable and has a concise instruction.
- Focus remains visible against every team field.
- Dialogs trap focus through native `dialog` behavior and restore it on close.
- Reduced-motion preference disables snap-adjacent animation and surface reveals.
- Safe-area insets protect the single floating action on iPhone Safari.
- Required QA widths: 320×700, 390×844, and 1440×1000.

## 12. Testing and release gates

### Automated

- Existing model/statistics validation remains green.
- Matrix renderer tests prove newest-first ordering, one rendering per match, eight player cells, civilization assets, and winner placement.
- Editor tests cover duplicate prevention, player creation, match deletion, and complete draft serialization.
- API tests mock Blob reads/writes, payload limits, validation, ETag success, and `409` conflict.
- Static security tests prove no GitHub token flow, no PIN UI, and no storage credential in browser assets.

### Browser QA

- Compare the 390 px matrix against both supplied references.
- Verify the sticky rail and horizontal snap through multiple weeks.
- Verify public, edit, player-creation, conflict, validation-error, and empty states.
- Confirm no failed assets, console errors, clipped names, accidental page-level horizontal overflow, or bottom navigation.

### Deployment

1. Create/link the second Vercel project under the existing `ekremus` Hobby account.
2. Create the private Blob store and seed the current production state.
3. Deploy a preview and pass automated/browser/design QA.
4. Deploy production and verify public read plus a reversible test write.
5. Restore/confirm the two real matches after the test.
6. Disable GitHub Pages only after the Vercel production URL is confirmed healthy.

## 13. Acceptance criteria

- One public matrix contains every match exactly once.
- The newest match is the first match column and older weeks continue rightward.
- The sticky team/slot rail remains legible at 320 px.
- Every player cell shows the correct local crest, player name, and civilization name.
- `/edit/` works without login, PIN, GitHub account, or token entry.
- A complete edit persists through Vercel Blob and is visible to another browser reload.
- Concurrent stale edits receive a conflict instead of overwriting newer state.
- `/stats/` contains derived rankings without duplicating match lineups.
- The application is served entirely from Vercel at runtime and remains within the free Hobby plan.

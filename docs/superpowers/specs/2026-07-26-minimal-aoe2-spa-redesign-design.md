# Bu Ecof Empires — Minimal AOE2 SPA Redesign

**Date:** 2026-07-26  
**Status:** Approved direction, pending implementation plan  
**Supersedes:** `2026-07-26-vercel-matrix-redesign-design.md` for UI architecture and write-conflict behavior

## 1. Decision

Rebuild the three visible routes as one mobile-first single-page application with two public surfaces: `Maçlar` and `Sıralama`. A compact segmented control switches between them. One pencil icon enters the edit state for the active surface: matches become editable on `Maçlar`; player management replaces the standings table on `Sıralama`.

The interface removes all explanatory and repeated copy. The cumulative result is shown only as a blue/red score such as `2–0`. The weekly matrix begins immediately below it. The application uses the measured visual language of aoe2techtree.net—Merriweather, a real local parchment texture, black ink, square controls, and fine dark/bronze rules—while retaining the tracker’s own content, team colors, and interaction model.

Shared writes use last-write-wins. The API no longer rejects a valid save because the browser holds an older ETag. This is deliberately simpler than merging or locking and is appropriate for the small trusted friend group.

## 2. Goals

- Fit the score, newest match date, eight player rows, and result inside a 390×844 phone viewport without vertical scrolling.
- Make every visible word carry data or an action.
- Keep every match in one newest-first horizontal matrix; older matches continue to the right.
- Use one consistent blue/red rivalry vocabulary everywhere.
- Make editing a state of the current surface rather than a separate navigation system.
- Make a civilization change reliably produce a saveable dirty draft.
- Preserve existing production matches, players, civilization assets, statistics, Vercel hosting, and open editing.

## 3. Non-goals

- No product hero, page title, subtitle, instructions, latest-match summary, dashboard cards, footer, sidebar, floating menu, or bottom navigation.
- No `Haftalık 4v4`, `Maç Defteri`, `Eski haftalar sağda`, `Alanlara dokunarak değiştir`, `Takım`, `Slot`, P1–P4, `önde`, total-match label, or duplicate `Oyuncu istatistikleri` copy.
- No authentication, edit password, GitHub token, realtime collaboration, merge engine, or edit lock.
- No new match fields, kill statistics, map, duration, military score, or economy score.
- No orange team styling and no green winner strip that competes with team identity.

## 4. One-page information architecture

### Persistent top control

The only persistent chrome is a single 44 px row:

- centered two-option segmented control: `Maçlar | Sıralama`;
- one 44×44 pencil icon button at the right;
- in edit state, the pencil becomes a clear save/close control group without opening another menu;
- no brand title or explanatory label occupies this row.

The browser URL may use history state or a small query/hash value so refresh and back navigation preserve the active surface. Legacy `/edit/` and `/stats/` URLs remain valid through lightweight redirects into the corresponding SPA state.

### Maçlar — public state

1. Rivalry score: only `Cortinyanlar wins – Bakracoğulları wins`, visually rendered as a blue number, en dash, and red number.
2. Weekly matrix: newest match first, older matches horizontally to the right.

There is no section heading between score and matrix.

### Sıralama — public state

The screen contains only the standings table and the persistent top control. Columns remain rank, player, played, wins, losses, and win rate. There is no repeated page or section title.

### Maçlar — edit state

The public matrix is replaced in place by its editable form. Only match-editing actions are visible:

- date;
- four player/civilization pairs for each team;
- winner;
- add match;
- delete match;
- save and exit.

Player CRUD is not shown here. `Yeni oyuncu ekle` remains available inside a player dropdown only when a match needs a new identity.

### Sıralama — edit state

The standings table is replaced by player management. It supports add, rename, deactivate/reactivate, and delete when unused. Match controls are absent.

## 5. Match matrix geometry

Phone layout is canonical.

- Top control: 44 px plus safe-area top inset.
- Score: 52 px.
- Date row: 34 px.
- Player row: 54 px maximum.
- Eight player rows: 432 px total.
- Winner row: 38 px.
- Matrix total: 504 px.
- Team rail: 42–46 px wide.
- Match column: 228–234 px wide, roughly 10% narrower than the current 260 px column.

The complete first match therefore fits comfortably in a 390×844 viewport, including Safari safe areas and a small bottom breathing space. The document itself does not scroll vertically on `Maçlar` when standard content is present; only the weeks strip scrolls horizontally.

The sticky rail contains only the two team names, written vertically with `writing-mode: vertical-rl` and rotated for natural bottom-to-top reading. There is no rail header, slot label, player number, or winner label. The blue team rail aligns with its four rows and the red team rail aligns with its four rows.

The newest column is fully visible beside the rail. Horizontal snapping is retained for older columns.

## 6. Player cells

Public cells use a compact two-column structure:

- 36–38 px local civilization crest;
- player name as the primary line;
- civilization name as the secondary line;
- one thin rule between rows;
- no card boundary, radius, shadow, badge, or slot number.

Names truncate on one line only when necessary. Civilization names may use a slightly smaller size but remain readable. Team identity comes from a restrained blue or red row tint and the matching vertical rail; the parchment texture remains visible through the tint.

Editable cells preserve the same height and crest position. Player and civilization selects are square, compact, and visually part of the row rather than nested form cards.

## 7. Design system

### Source language

The visual reference is aoe2techtree.net as inspected at 1440×900 and 390×844. Its relevant system is:

- Merriweather with Georgia/Times fallbacks;
- repeated parchment image background;
- black-brown text;
- square, dark olive/brown select controls;
- thin black and bronze structural rules;
- dense information without card containers;
- no gradients, glass, glow, rounded dashboard panels, or generic SaaS typography.

The local implementation must not hotlink reference assets. The parchment texture is stored locally with its source/license recorded. Existing local civilization assets remain in use.

### Color roles

- `--paper`: parchment texture base.
- `--paper-light`: lighter alternating data field.
- `--ink`: near-black brown.
- `--ink-muted`: secondary brown.
- `--rule`: dark brown structural line.
- `--bronze`: restrained highlight and focus edge.
- `--blue`: fixed Cortinyanlar primary.
- `--blue-deep`: fixed Cortinyanlar strong state.
- `--red`: fixed Bakracoğulları primary.
- `--red-deep`: fixed Bakracoğulları strong state.

Blue and red are the only team colors. Winner state uses the winning team’s color, plus text or selection state; it does not introduce green or orange. Neutral actions use ink/olive/bronze.

### Typography

One local Merriweather family is used across display, data, and controls. Weight and size—not a second font family—create hierarchy.

- Score: 30–34 px, bold.
- Segmented control: 14–15 px, bold.
- Player name: 14–15 px, bold.
- Civilization: 11–12 px, regular.
- Date and result: 12–13 px, bold.

### Shape and depth

- Square data and input geometry.
- Zero radius on matrix cells and selects.
- A small radius is allowed only on the top segmented control as one compound native-looking switch.
- No component-level shadows. Temporary dialogs may use one restrained shadow.

## 8. Editing and save behavior

The editor maintains an in-memory draft and marks it dirty after every valid date, player, civilization, winner, match, or player mutation.

The civilization event flow must be tested directly:

1. Read the selected civilization.
2. Update the matching slot in the draft.
3. Re-render the crest and row from the updated draft.
4. Change the save control from clean to dirty.
5. Persist the exact civilization when save is pressed.
6. Reload and confirm the saved value.

The current parallel Blob `get` plus `head` read is removed. One Blob `get` response supplies both the validated document and its metadata when metadata is needed.

For writes:

- the client sends the complete validated draft;
- the server validates and increments the revision;
- the Blob write overwrites the fixed private `state.json` path;
- no stale ETag rejection is shown to the user;
- a successful response becomes the new clean baseline;
- network or validation failures keep the local draft and show one concise retry notice.

This is last-write-wins. If two people save concurrently, the last complete valid save replaces the earlier state.

## 9. Error and empty states

- Load failure: one short inline error and `Tekrar dene`.
- Save failure: `Kaydedilemedi · tekrar dene`; draft remains intact.
- Save in progress: save control is disabled and shows a compact busy state.
- Save success: a brief non-blocking confirmation; no persistent `Yayınlandı` label.
- Empty matches: a single `Maç ekle` action in edit state.
- Destructive actions: native confirmation naming the date or player.

No error message claims that another person saved first because the system no longer rejects stale drafts.

## 10. Accessibility and mobile behavior

- All controls retain at least a 44×44 touch target even when the visible icon is smaller.
- The pencil, save, close, add, and delete controls use real icon assets from one consistent icon library; no emoji or text-symbol substitutes.
- Every icon button has a Turkish accessible name.
- Color is not the only team or winner signal: vertical team names and winner selection remain textual.
- Focus uses a visible bronze/dark outline with sufficient contrast.
- Reduced motion disables any view-transition movement.
- Safe-area insets protect the top control and the page has no fixed bottom element.
- Required viewports: 320×700, 390×844, and 1440×1000.

## 11. Testing and release gates

### Automated

- Model and statistics tests remain green.
- Add a civilization mutation test proving dirty state, serialized write, clean state after success, and persisted reload value.
- Add a last-write-wins API test proving a valid stale client can still save.
- Remove tests that require `If-Match` or expect `409` for ordinary concurrent writes.
- Matrix tests assert no rail header, slot labels, P1–P4 labels, duplicated heading copy, leader suffix, or total-match label.
- SPA tests assert `Maçlar | Sıralama`, pencil-to-edit transitions, match-only edit controls, and standings-only player controls.
- Static CSS tests assert one blue and one red team token and prohibit the old orange team token.

### Visual and browser QA

- Capture reference and prototype at the same 390×844 and 1440×900 sizes.
- Compare typography, parchment density, control squareness, rule weight, and information density side by side.
- Confirm the full first match is visible without vertical scrolling at 390×844.
- Confirm older matches scroll right while the vertical team rail stays fixed.
- Confirm no page-level horizontal overflow, missing crest, console error, duplicate copy, orange team field, floating bottom control, or persistent save-success label.
- Exercise a real civilization edit, save, reload, and public-view verification against a reversible test value before restoring production data.

### Release

1. Preserve a production-state backup.
2. Deploy a Vercel preview and run automated, browser, and design QA.
3. Perform the reversible civilization write test.
4. Restore the original civilization and verify the state revision.
5. Deploy production.
6. Verify `/`, legacy `/stats/`, legacy `/edit/`, and `/api/state`.
7. Push the verified commit to GitHub.

## 12. Acceptance criteria

- `Maçlar` and `Sıralama` are two states of one SPA and switch from one top segmented control.
- One pencil icon edits the active surface directly.
- Public `Maçlar` contains only the score and complete horizontal match matrix below the top control.
- The score contains only the blue number, separator, and red number.
- Team names are vertical; `Takım`, `Slot`, P1–P4, and all identified explanatory copy are absent.
- The complete newest match is visible without vertical scrolling at 390×844.
- Cortinyanlar is blue and Bakracoğulları is red everywhere; orange is absent from team styling.
- Player rows and week columns are at least 10% denser than the current implementation without losing 44 px touch targets in edit mode.
- Civilization edits persist after save and reload without a stale-publish message.
- Match editing exposes only match controls; standings editing exposes only player controls.
- Existing matches, player identities, civilization assets, and calculated standings are preserved.

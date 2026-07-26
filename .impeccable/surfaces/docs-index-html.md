---
version: 1
slug: "docs-index-html"
primary_target: "docs/index.html"
---

# Surface

- Target: `docs/index.html`
- Mode: Operate
- Scope: One mobile-first SPA with contextual match and player editing.

## Audience and job

Friends open the tracker almost entirely on phones during or after a weekly AoE2 DE 4v4. They need to read the Cortinyanlar–Bakracoğulları score, inspect complete player/civilization lineups, switch once to standings, and edit the surface they are already viewing.

## Primary task and content

The only brand treatment is a compact generated `Bu Ecof Empires` signature. The next row is a centered `Maçlar | Sıralama` segmented control plus the contextual pencil action. Match view contains only the fixed blue/red score and one newest-first horizontal matrix. Sıralama replaces that surface with the derived player table. The pencil converts the current surface in place; it becomes save and cancel until the draft is published or discarded.

At 390 × 844, the first view contains the 40px brand row, 44px control row, 52px `2–0` score, and the complete first 504px match. The matrix uses one 44px sticky rail, 232px match columns, a 34px date, eight 54px player rows, and a 38px result. `Cortinyanlar` and `Bakracoğulları` run vertically in their four-row blue/red rail blocks; a 3px walnut line separates those blocks and a 20px medal marks the result rail. There are no P1–P4 labels.

## Constraints

- Exact metadata name: `Bu Ecof Empires🏹🪓⚔️`.
- Exact team names: `Cortinyanlar` and `Bakracoğulları`.
- No branding beyond the 40px wordmark row; no header copy, footer, sidebar, floating menu, bottom navigation, recent/archive cards, or duplicated match data.
- Cortinyanlar is fixed to `#2b6f9d` / `#174766`; Bakracoğulları is fixed to `#a33a2c` / `#6f2018`.
- Merriweather, seamless local parchment, brown furniture, square bronze rules, the walnut team divider, the local medal, and real local AoE2 civilization crests are binding.
- Minimum width 320px; primary acceptance 390 × 844; desktop check 1440 × 900; all controls at least 44px.
- Match matrix is the only horizontal scroll owner. Public match view has no document-level vertical scroll.
- Editing is open and contextual. Drafts publish as one last-write-wins shared state; there is no login, PIN, user token, or stale-conflict state.
- Runtime state uses the current same-origin API and private Vercel Blob; GitHub remains source and recovery history.

## Chosen direction

**The Single-Sheet Meydan Ledger.** The Excel reference supplies the newest-first horizontal weekly logic; the AoE2 material reference supplies Merriweather, real parchment, brown furniture, bronze rules, named blue/red fields, and civilization crests. The compact wordmark provides one owned signature without turning the page into a landing screen.

The memorable interaction is the narrow named rail staying fixed while whole 4v4 match columns move rightward. Public and editable matches are the same matrix in two states; standings and player management are the same second surface in two states.

## Unresolved decisions

None. The branded ledger refinement retains the explicitly approved geometry and passes the full automated suite.

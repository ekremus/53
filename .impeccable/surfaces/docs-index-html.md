---
version: 1
slug: "docs-index-html"
primary_target: "docs/index.html"
related_targets: []
---

# Surface

- Target: `docs/index.html`
- Mode: Operate
- Scope: Public mobile match ledger plus protected match/player editing dialogs.

## Audience and job

Friends open the page on a phone after or between weekly AoE2 DE 4v4 games. Within seconds they need the current Cortinyanlar–Bakracoğulları rivalry, the latest lineup and civilizations, recent results, and player standing. Trusted collaborators need to add a complete match without raw JSON.

## Primary task and content

The public task is scan-first: identify the season score, inspect the most recent match, then continue into compact match and player tables. The editing task begins only from the lower-right FAB and uses native form controls with central player identities.

## Constraints

- No header, footer, sidebar, bottom navigation, marketing copy, runtime backend, third-party script, or embedded secret.
- Mobile Safari and 320px width are the source of truth.
- Exact product/team names and the real two-match production data must be preserved.
- Every match stays exactly 4v4 with one valid civilization per player.

## Chosen direction

**Meydan Defteri / Interlocking Tournament Banner.** The approved north star is `.impeccable/mocks/meydan-c-banner.png`, informed by the original `public/og.png`. A compact walnut-and-bronze 53 crest opens directly into one blue/orange rivalry banner. A continuous parchment ledger carries the latest lineup, result chronology, and player ranking. The memorable moment is the timber crest becoming the score banner and then resolving into real data without a navigation break.

Do not literalize the comp’s giant crest, illustrated placeholder glyphs, full ornamental frame, or raster text. The 53 hero is capped near one-quarter of the first viewport; names, statistics, controls, borders, and tables remain semantic HTML/CSS. Real AoE2 civ PNGs replace invented crests.

## Ingredient inventory

| Ingredient | Implementation medium | Decision |
| --- | --- | --- |
| 53 walnut/parchment identity | Existing raster `public/og.png`, cropped responsively | Produce as local `docs/assets/hero-53.png` |
| Rivalry banner | Semantic HTML/CSS, named team fields | Blue and burnt orange woven-color fields with bronze center seal |
| Parchment ledger | CSS solid surfaces, borders, restrained shadow | No generated CSS texture or nested cards |
| Civilization crests | Sourced local PNG assets | Vendor 53 AoE2 Tech Tree icons plus project Random SVG |
| Match rows and standings | Semantic HTML lists/tables | Real names and statistics only |
| Floating edit control | Semantic button + CSS | One circular lower-right control; no bottom bar |
| Edit/player workflows | Native dialog, form, select, input | Keep labels and data as DOM text |
| Motion | CSS state transition | One menu unfold and dialog sheet transition; reduced-motion fallback |

## Unresolved decisions

None. The user delegated best-practice decisions and requested uninterrupted completion.

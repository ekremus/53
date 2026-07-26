# Design QA — Vercel Matrix Redesign

## Reference contract

- One horizontal week matrix; newest match first.
- Blue four-row Cortinyanlar block, orange four-row Bakracoğulları block, green winner row.
- Civilization crest, strong player name, and quiet civilization name in every public player cell.
- The edit route keeps the same matrix geometry and replaces display copy with direct controls.

## Comparison input

The two supplied references, the 390 × 844 public page, and the 390 × 844 editor were reviewed together in `.impeccable/qa/reference-comparison.png`.

## P0 findings

None.

## P1 findings

- Closed: the editable matrix initially expanded the mobile layout viewport to 430 px because absolutely positioned screen-reader labels retained a grid static position. Anchoring `.sr-only` to the root restored 320/390 px layout widths and removed document-level horizontal overflow.
- Closed: the first compact standings table let long player names collide with the O/G/M values. A fixed six-column `colgroup` now reserves 145 px for the player at 390 px and keeps every numeric value in its own column.

## P2 findings

- Closed: both long team names could clip inside the 108 px sticky rail. Deliberate two-line name spans now preserve the exact names while leaving the P1–P4 slot rail intact.

## P3 notes

- At 320 px the exact emoji suffix in the product name may truncate after the text; the full accessible title and complete name remain available at the primary 390 px phone width.

## Verification

- 320 × 700, 390 × 844, and 1440 × 1000 have no document-level horizontal overflow.
- Phone matrices have larger scroll width than client width and retain a fixed sticky-rail left coordinate while horizontally scrolled.
- Public and edit routes each render exactly two match columns from the preserved state; standings render no match lineup duplication.
- No failed civilization images or runtime errors were recorded.

final result: passed

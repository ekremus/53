# Design QA — Minimal AoE2 SPA

## Reference contract

- One mobile-first page with only `Maçlar | Sıralama` and one contextual pencil action at the top.
- The match view shows only the fixed blue/red score and one newest-first horizontal match matrix.
- Cortinyanlar and Bakracoğulları occupy narrow, vertical team rails; there are no slot labels or repeated headings.
- The first complete 4v4 match must fit inside the initial 390 × 844 viewport without vertical scrolling.
- Editing is contextual: match controls exist only under Maçlar, player controls only under Sıralama.
- AoE2 Tech Tree provides the material reference: Merriweather, parchment, brown furniture, restrained gold, and real civilization crests.

## Combined visual review

The supplied spreadsheet reference, AoE2 Tech Tree captures, and the final public/edit screenshots were compared at matching 390 × 844 and 1440 × 900 viewports. The matrix keeps the spreadsheet's weekly horizontal logic while using the source site's typography and material tone instead of its layout.

## Closed findings

- Removed duplicate product headings, helper copy, totals, team/slot labels, recent/archive sections, sidebar, footer, and floating menu.
- Replaced orange and green team roles with one fixed Cortinyanlar blue and Bakracoğulları red system.
- Compressed the mobile matrix to a 44 px vertical rail, 232 px match column, 34 px date row, 54 px player rows, and 38 px winner row.
- Centered the 196 px segmented control exactly at x=97 within the 390 px phone viewport.
- Added named confirmation before player removal or deactivation.
- Closing or canceling the new-player dialog clears its pending slot and restores the original player selection.
- Civilization selection marks the draft dirty and persists in the complete state write.
- Removed stale-publish errors in favor of deliberate last-write-wins shared editing.

## Verification

- 390 × 844: document width 390 px, document height 844 px, matrix bottom 601 px, no document-level overflow.
- 390 × 844: the first date, eight player/civilization rows, and winner are visible without vertical scrolling.
- 1440 × 900: the same continuous matrix expands without introducing a dashboard or alternate component grammar.
- Public matches, editable matches, public standings, and player editing were exercised in the in-app browser.
- New-player dialog close returns the changed select from `__new__` to its original value with the draft still clean.
- Full automated suite: 48 tests passed.

final result: passed

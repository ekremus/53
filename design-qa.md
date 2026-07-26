# Design QA — Minimal AoE2 SPA

## Reference contract

- One mobile-first page with a 40px wordmark, then only `Maçlar | Sıralama` and one contextual pencil action.
- The match view shows only the fixed blue/red score and one newest-first horizontal match matrix.
- Cortinyanlar and Bakracoğulları occupy narrow, vertical team rails; there are no slot labels or repeated headings.
- A 3px walnut rule separates the two team blocks and a 20px local medal marks the result rail.
- The first complete 4v4 match must fit inside the initial 390 × 844 viewport without vertical scrolling.
- Editing is contextual: match controls exist only under Maçlar, player controls only under Sıralama.
- AoE2 Tech Tree provides the material reference: Merriweather, seamless parchment, brown furniture, restrained gold, and real civilization crests.

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
- Added a compact generated wordmark without adding copy, navigation, or dashboard chrome.
- Replaced the 145px repeating background strip with one fixed, cover-sized 1536 × 1024 parchment texture.
- Added the aligned 3px walnut team divider and centered 20px Tabler medal.

## Verification

- 390 × 844: document width 390px, brand bottom 40px, matrix top 137px, matrix bottom 641px, and no horizontal document overflow.
- 390 × 844: wordmark and medal load, the team boundary resolves to 3px, and all eight newest-match player rows render.
- 390 × 844: the first date, eight player/civilization rows, and winner are visible without vertical scrolling.
- 1440 × 900: the same continuous matrix expands without introducing a dashboard or alternate component grammar.
- Public matches, editable matches, public standings, and player editing were exercised in the in-app browser.
- New-player dialog close returns the changed select from `__new__` to its original value with the draft still clean.
- Long standings/player surfaces retain continuous parchment with no band or solid-color cutoff.
- 1440 × 900: application and matrix widths resolve to the 1440px cap with the same 641px matrix bottom and eight-player geometry.
- Full automated suite: 54 tests passed.

final result: passed

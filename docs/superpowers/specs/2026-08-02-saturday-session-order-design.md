# Saturday Session Dates and Match Sequence Design

## Goal

Make every weekly match read as part of its Saturday session, even when the replay timestamp falls after midnight or later in the weekend. Within each Saturday, show the real chronological game number while keeping the newest game at the left edge of the horizontal ledger.

The public date label becomes `01 Ağu 2026 (3)`: the date identifies the Saturday session and the parenthetical number identifies the game's chronological position inside that session.

## Source Audit

The replay workbook contains 44 matches. Its first two matches were already present in production and were intentionally not imported again; the remaining 42 were imported. No workbook row has a missing date/time, player, civilization, winning team, or losing team value.

There are no exact duplicate replay records. Source matches 37 and 38 have the same lineups, civilizations, and result, but their replay timestamps are 69 minutes apart. They are separate games and both remain included.

The workbook has no match-duration field. No replay was excluded as a sub-ten-minute match; the smallest gap between adjacent replay timestamps is 53 minutes.

## Chosen Direction

Keep the existing schema and derive sequence labels from canonical state order. Do not add a `playedAt` field or a time editor.

This is preferred because the app only needs a stable weekly order, not a user-visible clock time. Adding a timestamp field would expand validation, editing, and persistence for no ongoing product benefit. A label-only change is insufficient because five current records are not assigned to a Saturday and the first two imported matches are reversed within their session.

## Saturday Session Rule

For replay-backed records, the session date is the most recent Saturday on or before the replay's calendar date:

- Saturday stays on that Saturday;
- Sunday maps to the previous day;
- Monday maps to two days earlier;
- a replay recorded early on Saturday remains on that Saturday rather than moving to Friday.

This rule converts every historical replay to a Saturday without depending on a fragile midnight cutoff. The three 1 August matches without replay timestamps already use a Saturday date and keep their existing relative order.

The corrective migration changes only match dates and array order. It does not add, remove, or edit players, teams, civilizations, winners, match IDs, or match counts. Production remains at 13 players and 47 matches.

## Chronological Order and Sequence

Within one Saturday, state array order is canonical chronological order: the first played game has the lower array index and receives sequence `1`; later games receive `2`, `3`, and so on.

Public and editable matrix ordering remains newest-first. The renderer sorts by Saturday date descending and then by array index descending. Therefore a three-game Saturday appears left-to-right as `(3)`, `(2)`, `(1)`, which preserves the current newest-on-the-left interaction.

New matches already append to the state array. A newly created match on an existing Saturday automatically receives the next sequence number without storing another field. Changing a match date recomputes its sequence from the relative state order among matches on the destination Saturday.

The same canonical ordering is used by latest-civilization and favorite-civilization tie breaking, so player statistics and edit defaults agree with the visible ledger.

## Public Date Label

Each public match date renders as one compact line:

`01 Ağu 2026 (3)`

The existing date typography, 34px row height, alignment, and column widths remain unchanged. The parenthetical sequence uses the same typeface at the same baseline with reduced emphasis, so it reads as metadata rather than a second heading. It must not wrap at the 164px mobile column width.

The `<time>` element keeps the canonical Saturday in its `datetime` attribute. Its accessible name includes both the formatted Saturday and the game number, for example `01 Ağustos 2026, 3. maç`.

Edit mode keeps the existing date input without a redundant sequence control. Sequence is derived, not editable.

## Rendering Boundaries

- `docs/lib/matrix.js` owns stable date/index ordering, per-session sequence calculation, and public date-label markup.
- `docs/lib/model.js` uses the same ordering contract for civilization history.
- `docs/styles.css` owns the subtle parenthetical treatment without changing row geometry.
- `scripts/build-replay-migration.py` owns replay timestamp to Saturday conversion and chronological migration order.
- a new audited migration directory stores exact production before/after snapshots and a report.

No API, authentication, password, team, player, or civilization schema changes.

## Data Safety and Rollback

Before any production write, fetch and commit the exact revision-32 state. Build a 47-match after-snapshot and verify that the semantic difference contains only:

- Saturday-normalized `date` values;
- match array reordering.

Use the existing guarded snapshot writer. It must refuse to write if live semantic state differs from the committed before-snapshot. The rollback direction must also pass a dry run before deployment is considered complete.

## Error and Edge Handling

- One match on a Saturday renders `(1)`.
- Sequence numbers are unique and contiguous within each Saturday.
- Editing a date immediately recalculates the visible ordering and sequence from the draft state.
- Unknown historical clock times retain their established relative state order.
- Invalid non-ISO dates continue to fail existing state validation.
- No sequence value is persisted, so it cannot become stale or disagree with ordering.

## Verification

Automated tests must confirm:

- every migrated match date is a Saturday;
- migration keeps exactly 13 players and 47 unique match IDs;
- only dates and match order differ from the before-snapshot;
- source rows 1 and 2 remain single instances rather than duplicated imports;
- source rows 37 and 38 both remain present;
- sequence numbers begin at 1, are contiguous, and never repeat within a Saturday;
- three same-day matches render newest-first as `(3)`, `(2)`, `(1)`;
- a one-match Saturday renders `(1)`;
- date labels do not alter editable controls or statistics totals;
- all existing security, editing, asset, and persistence tests still pass.

Mobile visual QA at 390×844 must confirm that the parenthetical number fits on one line, the first complete match remains visible, all 47 columns render, no images fail, and there is no document-level horizontal overflow or runtime error. Standings must still show 13 uniquely ranked players.

After deployment, require the live semantic state to equal the committed after-snapshot, confirm revision incremented exactly once, and verify that a reverse dry run accepts the committed rollback snapshot.

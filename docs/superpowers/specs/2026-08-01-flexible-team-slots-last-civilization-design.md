# Flexible Team Slots and Last Civilization Design

**Date:** 2026-08-01

## Goal

Add safe 3v3 support to the existing weekly match tracker without deleting, rewriting, reseeding, or migrating the current production data. Keep the four-row team geometry, sort each team alphabetically in both public and edit views, start every new match with empty slots, restore a selected player's most recently recorded civilization automatically, show each ranked player's most-picked civilization crest, and make mobile match columns approximately 30% narrower.

## Current Production Safety Baseline

- Production state lives in the existing private Vercel Blob store and is read through `GET /api/state`.
- At design time, production contains 12 players and 5 matches.
- The existing server-side revision increment and deliberate last-writer-wins behavior remain unchanged; this feature must not reintroduce the removed stale-write warning.
- Schema version stays at `1`; this feature is backward compatible with every existing non-empty slot.
- Deployment must never run `npm run data:seed`, the Blob seed script, or a production `PUT /api/state`.

## Chosen Data Model

Each team continues to contain exactly four slot objects so the mobile matrix geometry and all existing matches remain structurally unchanged.

```json
{
  "playerId": "",
  "civilization": "Random"
}
```

An empty `playerId` is the only representation of a vacant position. No fake player named `-` is added to `state.players`. A vacant slot must always normalize to `civilization: "Random"`.

The state validator accepts either:

- a registered player ID with a valid civilization; or
- an empty player ID with `Random` civilization.

Duplicate-player validation ignores empty slots but continues to reject the same real player appearing twice in one match.

## Match Creation

`createEmptyMatch` remains the canonical constructor and returns two teams with four vacant slots each. The current new-match prefill behavior is removed: a newly added match must not copy players or civilizations from the latest match.

The winner default, date behavior, match ID generation, and four-row-per-team geometry remain unchanged.

## Player and Civilization Selection

Every player dropdown begins with a visible `-` option whose value is the empty string.

When `-` is selected:

- the slot's `playerId` becomes empty;
- its civilization becomes `Random`;
- the civilization selector becomes disabled; and
- the empty slot remains available without appearing in player statistics.

When a real player is selected, the application searches the current draft state for that player's most recent non-empty appearance, excluding the slot currently being changed. The lookup happens before the new player ID is written into that slot. Matches are compared by date descending, using the existing newest-first tie behavior. The selected slot immediately receives the civilization recorded in that appearance, including `Random`. If the player has no recorded appearance, the fallback is `Random`.

This lookup is derived from match history and does not add a new field to player records. Changing a civilization later naturally changes what will be restored the next time that player is selected after the change is saved.

## Alphabetical Team Ordering

Both public and editable match columns present each team's real players in Turkish alphabetical order by current player name. Vacant slots appear after all real players.

Ordering is presentation-only. Existing match arrays are not rewritten or published merely to alphabetize them. Editable controls retain their original slot index in their data keys, so changing a displayed row updates the correct stored slot. A normal edit re-render may move the selected player to their alphabetical position.

Vacant slots must remain last even when multiple vacant slots are present. Their relative order is irrelevant, but they must never sort before or between real players.

## Mobile Match Column Width

At mobile widths, each match/week column changes from 232px to 164px, a reduction of approximately 29%. The team rail width, date-row height, player-row height, result-row height, civilization crest size, and desktop column width remain unchanged.

The player text area must still display `Alman General`, the longest current production nickname, without clipping or truncation. Civilization names may continue using the existing constrained secondary line behavior. The 390px viewport must show the complete newest 164px column plus a meaningful portion of the next column without introducing document-level horizontal overflow; only the existing matrix remains horizontally scrollable.

## Public Rendering and Statistics

Public match columns preserve all four rows per team. A vacant row displays only `-` with no civilization name contributing meaning.

Statistics skip vacant slots entirely:

- no match played;
- no win or loss;
- no leaderboard entry; and
- no effect on team win totals or total match count beyond the match itself.

A 3v3 match therefore counts as one team match while only the six selected players receive player statistics.

## Favorite Civilization in Standings

Each standings row shows a 28px local civilization crest immediately before the nickname. The crest is derived from match history and is not persisted on the player record.

For each real player:

1. Count every valid recorded civilization selection across that player's non-empty match slots, including `Random`.
2. Choose the civilization with the highest count.
3. If multiple civilizations share the highest count, choose the one appearing in that player's most recent match.
4. If the player has no match history, use `Random`.

The crest uses the existing local `civilizationAssetName` mapping and has empty alternative text because the adjacent nickname remains the row label and the crest is supplementary. The standings table keeps its current rank, played, wins, losses, and win-rate calculations and column order.

## Error Handling

- A vacant slot with a non-`Random` civilization is normalized back to `Random` before validation completes.
- Unknown non-empty player IDs still fail validation.
- Unknown civilizations still fail validation.
- Selecting a player already used elsewhere in the same match remains unavailable through the existing disabled-option behavior and is rejected by validation if submitted manually.
- Existing server-side revision updates and last-writer-wins publishing remain unchanged; this feature adds no merge, reseed, or recovery write path.

## Testing

Automated coverage must prove:

- all existing fixture data still validates unchanged;
- empty slots validate only as vacant `Random` slots;
- duplicate real players still fail while multiple empty slots pass;
- statistics exclude empty slots;
- a new match starts with eight vacant slots;
- public and editable team rows are Turkish-alphabetical with empty rows last;
- player dropdowns expose `-`;
- choosing `-` resets and disables civilization selection;
- choosing a player restores their latest recorded civilization;
- a player with no history falls back to `Random`; and
- favorite-civilization counts include `Random`, resolve ties by most recent appearance, and fall back to `Random`;
- standings render the correct local favorite-civilization crest before each nickname;
- mobile match columns are 164px while desktop columns remain 232px;
- `Alman General` remains fully visible at 390px with no document-level horizontal overflow; and
- the full existing test suite remains green.

## Deployment and Data Preservation

Before deployment:

1. Fetch `GET https://53aoe.vercel.app/api/state` with response headers.
2. Save the exact JSON body and HTTP response headers in a timestamped `.qa` backup.
3. Record a SHA-256 hash plus player, match, revision, and updated-at values.

Deploy only application and API validation code. Do not seed or write state during preview or production verification.

After deployment:

1. Fetch production state again using `GET` only.
2. Compare the complete `players` and `matches` arrays, revision, and updated-at value with the backup.
3. Require exact semantic equality and the same 12-player/5-match baseline unless a real user edited production during the deployment window.
4. If revision or `updatedAt` changed concurrently, stop and inspect the new state; never restore the older backup over a legitimate user edit.
5. Verify the UI and API read paths without saving production data.

The backup is a recovery artifact, not permission to overwrite newer production data.

## Out of Scope

- Variable-length team arrays.
- A fake `-` player record.
- New statistics or scoring fields.
- Automatic team balancing.
- Reordering or migrating existing production slot arrays.
- Any visual redesign beyond the vacant-slot state, standings crest, and narrower mobile match columns required by this feature.

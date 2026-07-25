# AoE2 Weekly — Product Design

## Product

AoE2 Weekly is a public, single-page record of a friends group's weekly Age of Empires II 4v4 matches. The page prioritizes the season score, player standings, and readable match history. A compact `Düzenle` action unlocks in-page editing after the shared password `53` is verified by the server.

## Experience

- Public mode opens on the overall Red vs Blue score, followed by the player leaderboard and newest-first match history.
- Each match contains only its date, four Red players, four Blue players, and winning team.
- Edit mode keeps the same page structure and replaces match rows with spreadsheet-like inputs. Editors can add, edit, swap, and remove participants before saving once.
- Statistics are derived from matches on every load; no duplicated statistics are stored.
- Empty, loading, conflict, validation, and network states have clear Turkish copy and recovery actions.

## Visual direction

Warm parchment, ink, restrained gold, oxblood red, and slate blue create a subtle AoE II atmosphere without copying the game UI. Typography, hairline dividers, open spacing, and flat surfaces do most of the work. Decoration is limited to a small `II` seal, team colour bars, and restrained serif headings.

## Architecture and data

The responsive client is a single React page rendered by the Sites starter and uses plain CSS. A small same-origin JSON API persists one canonical match array in D1 with an optimistic revision number. Edit authentication is server-side; the shared password is supplied as the `EDIT_PASSWORD` runtime secret. The public page never receives that value.

The JSON match shape is:

```json
{
  "id": "stable-id",
  "date": "2026-07-25",
  "redTeam": ["Player 1", "Player 2", "Player 3", "Player 4"],
  "blueTeam": ["Player 5", "Player 6", "Player 7", "Player 8"],
  "winner": "red"
}
```

The API rejects malformed dates, non-4-player teams, blank names, duplicate players within one match, invalid winners, stale revisions, and unauthenticated writes.

## Validation

Production validation covers a successful build, server-rendered product metadata, statistic calculations, API input validation, responsive CSS breakpoints, and a live deployment using a D1 binding.

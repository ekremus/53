# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are a small friend group that plays weekly Age of Empires II: Definitive Edition 4v4 matches. Nearly all viewing and match entry happens on phones, especially iPhone Safari. Public visitors want to see the current rivalry, recent match lineups, civilizations, and player standings quickly. Editors are trusted friends who may add a match immediately after playing.

## Product Purpose

The product is the group’s shared match ledger. It records the match date, four players and civilizations for Cortinyanlar, four players and civilizations for Bakracoğulları, and the winner. It automatically derives team wins and player played/won/lost/win-rate statistics. Success means a friend can understand the current season in seconds and record a complete match on a phone without editing raw JSON.

## Positioning

Unlike a generic tournament bracket or spreadsheet, this ledger preserves the group’s recurring 4v4 history and identity while keeping data entry as direct as selecting eight known players and civilizations.

## Operating Context

Matches happen weekly and the same roster is reused in changing team combinations. Player names should be selectable after first entry. A participant can be renamed centrally, removed when unused, or made inactive while historical matches remain intact. The repository’s commit history is the audit trail for shared edits.

## Capabilities and Constraints

- Public match history, current team totals, recent matches, and player leaderboard.
- Add, edit, and delete complete 4v4 matches.
- Add, rename, deactivate/reactivate, and conditionally delete players.
- Select one of the current 53 standard AoE2 DE civilizations or Random for each participant.
- Fully hosted by GitHub Pages with production data in the same public repository.
- GitHub repository write permission is the real editor authorization boundary.
- The shared `53` PIN unlocks an editor’s encrypted device-local GitHub credential; no plaintext credential enters the repository.
- Existing production match data must be preserved.
- No kills, military score, economic score, or other match statistics.

## Brand Commitments

- Exact product name: `Bu Ecof Empires🏹🪓⚔️`.
- Exact team names: `Cortinyanlar` and `Bakracoğulları`.
- The previously generated `53` walnut, parchment, bronze, blue, and red hero artwork is a binding identity asset.
- Age of Empires II atmosphere should be unmistakable without copying the game’s interface.
- The supplied Excel tracker remains a workflow and information-density reference, not a visual template.

## Evidence on Hand

- Two existing matches at `2026-07-26` with ten real player identities in the current production data.
- Calculated statistics logic and validation tests under `docs/lib/` and `tests/`.
- Generated hero artwork at `docs/assets/hero-53.png`.
- User-supplied Excel-style tracker screenshot in the task context.
- Current AoE2 civilization names in `docs/lib/civilizations.js` and MIT-licensed asset source at `SiegeEngineers/aoe2techtree`.
- No testimonials, commercial claims, sponsors, or public tournament claims should be fabricated.

## Product Principles

1. The current rivalry and latest match come before navigation or explanation.
2. Enter data once, then reuse it through player and civilization selectors.
3. Preserve history: rename by identity and deactivate referenced players instead of erasing past matches.
4. Phone interaction is the source of truth; desktop is only a wider arrangement of the same flow.
5. GitHub remains both the production host and the transparent data audit trail.

## Accessibility & Inclusion

All core viewing and editing must work with semantic controls, keyboard navigation, visible focus, 4.5:1 text contrast, reduced motion, and at least 44×44 pixel touch targets. Color must never be the only way to identify a team or winner.

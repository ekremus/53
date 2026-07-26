# 53 Mobile App Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the long-form single page with a mobile-first AoE II app shell and add reusable players plus per-player civilization tracking.

**Architecture:** `app/page.tsx` owns loading, authentication, drafts, optimistic saving, and hash navigation. Focused view components render Dashboard, Matches, and Ranking; the existing D1 JSON record remains the source of truth and gains backward-compatible civilization arrays.

**Tech Stack:** TypeScript, React, plain CSS, Vinext, Cloudflare D1, Node test runner, GitHub Pages redirect.

## Global Constraints

- Keep exactly four players and four civilization selections per team.
- Preserve server-verified edit password `53` and optimistic revision checks.
- Render only one workspace at a time with no top header or footer.
- Design mobile-first around a persistent 62px left navigation rail.
- Use the current 53 standard AoE II: DE civilizations plus `Random`.
- Preserve all existing match records and normalize missing civilization values to `Random`.

---

### Task 1: Civilization-aware match model

**Files:**
- Create: `lib/civilizations.ts`
- Modify: `lib/matches.ts`
- Create: `tests/matches.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `CIVILIZATIONS`, `Civilization`, `CivilizationTuple`, `validateMatches(value, options)`, and `playerRoster(matches)`.

- [x] Add the 53 data-source civilization names and `Random`.
- [x] Normalize legacy matches to four `Random` civilization values per team.
- [x] Reject incomplete or unknown civilization values on new writes.
- [x] Derive a case-insensitive, alphabetized roster from match history.
- [x] Test legacy normalization, invalid civilizations, and roster merging.

### Task 2: Mobile app shell

**Files:**
- Create: `app/components/AppSidebar.tsx`
- Create: `app/components/DashboardView.tsx`
- Create: `app/components/LeaderboardView.tsx`
- Create: `app/components/MatchesView.tsx`
- Create: `app/components/UnlockModal.tsx`
- Replace: `app/page.tsx`
- Replace: `app/globals.css`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: `MatchState`, derived `Statistics`, hash route, edit callbacks.
- Produces: three exclusive workspaces, persistent sidebar, match archive, player/civilization selectors, and bottom edit actions.

- [x] Build Dashboard, Matches, and Ranking as exclusive hash-routed views.
- [x] Add the 62px mobile rail and label-expanded desktop rail without a header.
- [x] Build player selectors with an inline `+ Yeni oyuncu` path.
- [x] Build civilization selectors and paired-slot Red/Blue swap controls.
- [x] Remove marketing copy and apply the timber/parchment/bronze visual system.

### Task 3: Validation, production, and short address

**Files:**
- Modify: `tests/rendered-html.test.mjs`
- Create: `docs/index.html`
- Create: `docs/404.html`

**Interfaces:**
- Produces: verified build, Sites version, public `53` GitHub repository, and `https://ekremus.github.io/53/` shortcut.

- [x] Assert the product shell contains no header/footer or removed marketing copy.
- [x] Run `npm test`; expect all product, statistics, and match-model tests to pass.
- [x] Deploy the exact pushed Sites source and verify the live HTML/API.
- [x] Push the same source to public GitHub repository `ekremus/53`.
- [x] Enable GitHub Pages from `/docs` and verify the short entry URL.

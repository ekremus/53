---
name: "Bu Ecof Empires🏹🪓⚔️"
description: "A single-sheet mobile AoE2 ledger for the weekly Cortinyanlar–Bakracoğulları rivalry."
colors:
  parchment: "#c7a86f"
  parchment-light: "#d8bd88"
  parchment-deep: "#b18f58"
  ink: "#171009"
  ink-muted: "#4d3617"
  rule: "#3b2814"
  bronze: "#8a6935"
  furniture: "#72604a"
  furniture-deep: "#3c3022"
  cortinyan-blue: "#2b6f9d"
  cortinyan-blue-deep: "#174766"
  cortinyan-blue-soft: "rgb(43 111 157 / 16%)"
  bakracogullari-red: "#a33a2c"
  bakracogullari-red-deep: "#6f2018"
  bakracogullari-red-soft: "rgb(163 58 44 / 14%)"
  danger: "#742218"
  focus: "#f0d699"
typography:
  display:
    fontFamily: "Merriweather, Georgia, 'Times New Roman', serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1
  title:
    fontFamily: "Merriweather, Georgia, 'Times New Roman', serif"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: 1.15
  body:
    fontFamily: "Merriweather, Georgia, 'Times New Roman', serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.3
  label:
    fontFamily: "Merriweather, Georgia, 'Times New Roman', serif"
    fontSize: "10.5px"
    fontWeight: 400
    lineHeight: 1.15
rounded:
  square: "0px"
  segmented: "4px"
spacing:
  xxs: "3px"
  xs: "4px"
  sm: "6px"
  md: "7px"
  lg: "10px"
  xl: "12px"
  xxl: "13px"
components:
  view-switch:
    backgroundColor: "#493c2b"
    textColor: "#f6e6bd"
    typography: "{typography.title}"
    rounded: "{rounded.segmented}"
    height: "34px"
    width: "196px"
  view-switch-active:
    backgroundColor: "{colors.parchment-light}"
    textColor: "{colors.ink}"
    typography: "{typography.title}"
    rounded: "{rounded.square}"
    height: "32px"
  contextual-action:
    backgroundColor: "transparent"
    textColor: "#f6e6bd"
    rounded: "{rounded.square}"
    size: "44px"
    height: "44px"
    width: "44px"
  score-blue:
    backgroundColor: "{colors.cortinyan-blue-deep}"
    textColor: "#fff8e7"
    typography: "{typography.display}"
    rounded: "{rounded.square}"
    height: "52px"
  score-red:
    backgroundColor: "{colors.bakracogullari-red-deep}"
    textColor: "#fff8e7"
    typography: "{typography.display}"
    rounded: "{rounded.square}"
    height: "52px"
  matrix-player:
    backgroundColor: "rgb(229 205 157 / 55%)"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "4px 7px"
    height: "54px"
  inline-select:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
  dialog:
    backgroundColor: "{colors.parchment}"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "12px"
---

# Design System: Bu Ecof Empires🏹🪓⚔️

## Overview

**Creative North Star: "The Single-Sheet Meydan Ledger"**

The product is one compact, hand-kept AoE2 competition sheet translated directly to a phone. Brown furniture frames a real parchment surface; a fixed blue–red score and one horizontally moving 4v4 matrix carry the entire match story. The result should feel like an old tournament ledger that happens to be fast, touchable, and precise.

The interface removes product theater and dashboard hierarchy. There is no visible product title, introductory copy, hero, sidebar, footer, floating menu, bottom navigation, archive surface, or repeated version of the match data. The only top-row content is the centered `Maçlar | Sıralama` switch and its contextual pencil or save/cancel actions.

The exact product name `Bu Ecof Empires🏹🪓⚔️` remains in document metadata and durable documentation. The exact team names `Cortinyanlar` and `Bakracoğulları` remain visible in the matrix rails and editing controls.

**Key Characteristics:**

- one newest-first horizontal match matrix, with every match represented once;
- a complete 4v4 match visible inside the first 390 × 844 viewport;
- fixed Cortinyanlar blue and Bakracoğulları red, paired with vertical named rails;
- Merriweather over a real local parchment texture with brown furniture and thin bronze rules;
- contextual editing that changes only the currently selected surface.

## Colors

The palette is a materially restrained tournament set: parchment owns the page, dark brown furniture contains controls, bronze draws rules, and the two rivalry colors carry team identity.

### Primary

- **Cortinyan Field Blue**: The standard blue identifies Cortinyanlar; its deep companion fills the score, vertical team rail, and winning result row, while its soft companion provides a quiet matrix-team tint.
- **Bakracoğulları Field Red**: The standard red identifies Bakracoğulları; its deep companion fills the score, vertical team rail, and winning result row, while its soft companion provides the opposing matrix-team tint.

### Secondary

- **Meydan Bronze**: Restrained structural accent for rules, scrollbars, and the selected segmented control.
- **Brown Furniture**: Mid brown supports date headers and editing tools; deep brown holds the top control, score dash, table heading, and action buttons.

### Tertiary

- **Destructive Oxblood**: Deletion and irreversible player actions only.
- **Focus Parchment**: The universal focus ring on dark and paper surfaces.

### Neutral

- **Weathered Parchment**: The local texture-backed application canvas.
- **Raised Parchment**: Active switch state, fields, tables, and alternating data surfaces.
- **Deep Parchment**: Low-contrast row alternation and material variation.
- **Charred Ink**: Primary content on parchment.
- **Brown Ink**: Civilization labels, placeholders, and secondary state copy.
- **Walnut Rule**: Square cell divisions and strong surface boundaries.

**The Fixed Rivalry Rule.** Cortinyanlar stays blue and Bakracoğulları stays red. Do not swap, theme, randomize, or introduce a third team color.

**The Named Rail Rule.** Team color never carries identity by itself: the exact team names remain legible in the vertical rails, winner value, or accessible score labels.

**The Bronze Is Structure Rule.** Bronze draws boundaries and selection detail; it never becomes a gradient, glow, or decorative wash.

## Typography

**Display and Body Font:** Merriweather with Georgia and Times New Roman fallbacks

**Character:** One locally hosted serif voice gives the small interface the gravity of an AoE2 record without introducing ornamental medieval lettering. Weight, scale, and density provide hierarchy; multiple font personalities do not.

### Hierarchy

- **Score display** (700, 32px, 1): The two fixed team win totals only.
- **Control title** (700, 13px, 1.15): Segmented labels, vertical team names, player names, and compact actions.
- **Body** (400, 14px, 1.3): Default interface and form copy.
- **Micro label** (400, 10.5px, 1.15): Civilization labels and inline editor selects.

Dates and table headers use compact 12–13px bold text. Statistics use tabular alignment through fixed columns rather than a second numeral font.

**The One-Voice Rule.** Do not reintroduce Alegreya, a sans-serif UI family, blackletter, novelty runes, an icon font, or monospace display copy.

**The Data Before Display Rule.** No visible product heading or decorative headline precedes the score. Typography exists to make controls and match data clearer.

## Layout

Phone geometry is canonical. The top control is a three-column row—88px, 196px, 88px—so the segmented switch stays mathematically centered at 390px while contextual actions occupy the right track. The row is at least 44px high plus the top safe-area inset. The score beneath it is 52px high.

The match surface is one horizontal scroll owner. A sticky 44px rail remains at the left while newest-first 232px match columns move under the finger and snap to the rail edge. Each column uses a 34px date row, four 54px Cortinyanlar players, four 54px Bakracoğulları players, and a 38px result row: 504px total. There are no P1–P4 labels, repeated team headers, result cards, or duplicate recent/archive sections. At 390 × 844, the complete first match ends around 601px, leaving it visible without vertical scrolling.

Public match view locks document-level vertical overflow because the complete matrix already fits. The matrix alone may scroll horizontally. Editing adds a 44px toolbar and raises the result row to 44px while preserving the same column and player geometry. Standings replace the matrix in the same surface area; they are not a second page shell.

At the only CSS breakpoint, 920px, the sticky rail grows to 48px while match columns remain 232px. The application caps at 1440px and gains only a thin outer rule; content order and component grammar do not change. The minimum supported width is 320px, and 390px is the primary visual acceptance viewport.

Top safe-area padding protects the view switch. Notices begin below that inset and the control row. There is no fixed bottom control, so the browser home-indicator area remains visually open.

**The One Scroll Owner Rule.** The document stays viewport-bound in public match view; only the match matrix owns horizontal movement.

**The Show It Once Rule.** Every match appears once, newest first. Do not split history into latest, recent, and archive variants.

**The Phone Is Canonical Rule.** Any new state must preserve the complete first match at 390 × 844 before wider behavior is considered.

## Elevation & Depth

The ledger is flat. Real parchment texture, opaque furniture fields, alternating brown paper rows, and 1px walnut rules create hierarchy. Match columns, team blocks, standings rows, top controls, and editing fields do not cast shadows.

### Shadow Vocabulary

- **Dialog lift** (`10px 14px 34px rgb(0 0 0 / 42%)`): The new-player dialog only.
- **Notice lift** (`5px 7px 16px rgb(0 0 0 / 32%)`): Temporary save, success, and error notices only.
- **Selected inset** (`inset 0 2px 0 #efe0b3, inset 0 -2px 0 var(--bronze)`): The active half of the two-option switch.

Small text shadows on dark score, rail, date, and result fields preserve contrast; they are not decorative glow.

**The Flat Record Rule.** If a surface remains in document flow, separate it with tone or a 1px rule. Elevation belongs only to temporary overlays.

## Shapes

The data language is square. Matrix cells, rails, score fields, date headers, player rows, standings, inputs, action buttons, toolbars, notices, and dialogs use zero radius. The only softened geometry is the 4px outer radius of the compact segmented switch, which visually binds its two mutually exclusive options.

There are no circular action seals, pills, floating buttons, rounded cards, or ornamental frames in the delivered interface.

**The Segmented Exception Rule.** A small radius may bind a single mutually exclusive control; it does not license rounded containers elsewhere.

## Components

### Top View Control

The control row contains only a 196 × 34px `Maçlar | Sıralama` segmented switch centered independently of the actions. Each option is at least 32px high inside a 44px touch row. The active option uses raised parchment, ink, and a restrained bronze inset. The inactive option stays dark brown with light parchment text.

A 44 × 44px pencil occupies the right track in view mode. In edit mode the view switch is disabled and the pencil becomes 44px save and cancel controls. The save action remains disabled until the local draft is dirty. Icons are local Tabler SVGs with text alternatives; no emoji or text glyph substitutes are used.

### Score Strip

The score is a fixed 52px three-part strip: flexible deep-blue total, 24px deep-brown dash, and flexible deep-red total. It displays only the numeric rivalry state such as `2–0`; team names live in accessible labels and the matrix rails, so the strip stays maximally compact.

### Weekly Match Matrix

The sticky rail is 44px on phones. Its two named team sections each span exactly four player rows and set the names vertically with bottom-to-top reading. Blank rail cells align with the 34px date and 38px result rows. Slot labels are prohibited.

Each 232px match column contains a centered date, eight player cells, and one named winner result. A public player cell uses a 38px local civilization crest, a 13px bold player name, and a 10.5px muted civilization name. Alternating translucent parchment rows keep dense lineups scannable; thin rules carry all separation. The result row uses the winning team's deep color plus the exact winning team name.

### Contextual Match Editor

Editing preserves the same matrix. A single 44px `Maç ekle` toolbar appears above it. Each 54px player row changes into a 34px civilization crest and two flat native selectors stacked in 23px tracks. Player selection includes `Yeni oyuncu ekle`; civilization selection uses the complete local AoE2 DE list. Date and winner edit inline. Deletion uses the local trash icon and a named confirmation.

Changes remain in a local draft until the top save action publishes the complete shared state. Cancel discards the draft after confirmation when dirty. Shared persistence deliberately uses last-write-wins; do not add stale-conflict chrome or an account/token/PIN state to the visual system.

### Standings and Player Editing

View mode is one full-width table with stable columns `#`, `Oyuncu`, `O`, `G`, `M`, `%`. Rows are at least 44px, the player column flexes, and the numeric columns remain fixed so every statistic survives at 320px.

Edit mode replaces standings with the player manager in the same surface. A 52px add row precedes alternating 56px player rows. Names edit inline; apply, delete/deactivate, and reactivate actions stay at least 44px high. A used player becomes passive instead of disappearing from historical matches.

### Dialog and Notices

The only custom modal surface is the square, texture-backed new-player dialog, capped at 440px and inset 12px from the phone viewport. It uses one walnut perimeter rule, a deep-brown heading, a 44px close action, and a flat inline name form. Closing or canceling clears the pending matrix selection.

Destructive confirmations use the platform confirmation flow. Temporary notices sit below the safe-area-aware top control, announce status through the live region, and disappear after a short interval.

### Motion and Interaction

There is no authored entrance, ambient, looping, or scroll-triggered motion. Matrix scrolling is direct native touch behavior with horizontal snapping. `prefers-reduced-motion: reduce` forces smooth scrolling off and collapses any incidental transition or animation duration to 0.01ms.

All interactive targets are at least 44px in their containing row. Keyboard focus uses a 3px light-parchment outline drawn 3px inward so it remains visible on the viewport edge. Color is never the only winner or team cue: rails and result values carry exact names, and score totals have accessible labels.

### Asset Policy

Merriweather, `paper.jpg`, Tabler interface SVGs, the random shield, and all current AoE2 civilization crests are repository-local. Keep `docs/assets/icons/NOTICE.md` and `docs/assets/civs/NOTICE.md` with those assets. Never hotlink the tech tree, replace civilization crests with emoji, or render interface labels into raster art.

## Do's and Don'ts

### Do:

- **Do** keep the top row limited to the centered `Maçlar | Sıralama` switch and contextual edit actions.
- **Do** preserve the 44/232/34/54/38px phone matrix geometry and verify the first complete match at 390 × 844.
- **Do** keep Cortinyanlar blue and Bakracoğulları red, with exact names visible or available to assistive technology.
- **Do** show every match once, newest first, in the one horizontal matrix.
- **Do** keep `# / Oyuncu / O / G / M / %` intact at every supported width.
- **Do** preserve 44px touch targets, visible focus, reduced motion, native scrolling, and top safe-area padding.
- **Do** use and license local parchment, Merriweather, interface icons, and civilization crests.

### Don't:

- **Don't** add a visible product title, header copy, hero, footer, sidebar, floating menu, bottom navigation, or dashboard cards.
- **Don't** duplicate match data as latest, recent, archive, highlights, or summaries.
- **Don't** add P1–P4 labels, repeated team headings, or a second horizontal scroll owner.
- **Don't** switch the matrix to cards or hide player civilizations on narrow screens.
- **Don't** bring back orange, green, or configurable team colors; the rivalry is fixed blue and red.
- **Don't** add gradients, glass, decorative glows, giant crests, full ornamental frames, or texture overlays beyond the real parchment asset.
- **Don't** add a floating save control, persistent bottom action, PIN, login, user token, or stale-conflict warning.
- **Don't** introduce another font, hotlinked asset, emoji action icon, or rasterized interface text.

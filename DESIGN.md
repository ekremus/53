---
name: "Bu Ecof Empires — 53"
description: "A touch-first AoE2 weekly war ledger built as one horizontal match matrix."
colors:
  command-navy: "#202936"
  command-navy-deep: "#151c26"
  command-navy-raised: "#2c3746"
  parchment: "#f3e1bf"
  parchment-light: "#faedcf"
  parchment-deep: "#e5cda3"
  ink: "#26180f"
  muted-ink: "#725d48"
  bronze-rule: "#c7ad82"
  bronze-rule-dark: "#86673b"
  cortinyan-blue: "#3f73bd"
  cortinyan-blue-deep: "#244d86"
  cortinyan-blue-soft: "#dce8f6"
  bakraco-orange: "#cf6e2d"
  bakraco-orange-deep: "#8f3e17"
  bakraco-orange-soft: "#f4dfcb"
  winner-green: "#3f8b59"
  winner-green-deep: "#214d31"
  winner-green-soft: "#d9eadc"
  danger: "#8f2f27"
  gold: "#c79a45"
  gold-light: "#ebca7c"
  focus: "#2a82c7"
  white: "#ffffff"
typography:
  display:
    fontFamily: "Alegreya, Georgia, serif"
    fontSize: "clamp(1.24rem, 6vw, 1.76rem)"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.015em"
  headline:
    fontFamily: "Alegreya, Georgia, serif"
    fontSize: "1.62rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Alegreya, Georgia, serif"
    fontSize: "1.45rem"
    fontWeight: 700
    lineHeight: 1.05
  body:
    fontFamily: "Alegreya Sans, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.35
  label:
    fontFamily: "Alegreya Sans, system-ui, sans-serif"
    fontSize: "0.76rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "0.075em"
rounded:
  square: "0px"
  seal: "999px"
  publish: "29px"
spacing:
  xxs: "4px"
  xs: "8px"
  sm: "12px"
  md: "14px"
  lg: "16px"
  xl: "22px"
  xxl: "24px"
components:
  action-seal:
    backgroundColor: "{colors.command-navy-deep}"
    textColor: "{colors.gold-light}"
    rounded: "{rounded.seal}"
    height: "58px"
    width: "58px"
  publish-action:
    backgroundColor: "{colors.winner-green}"
    textColor: "{colors.white}"
    rounded: "{rounded.publish}"
    height: "58px"
    padding: "0 17px"
  matrix-player:
    textColor: "{colors.ink}"
    height: "64px"
    padding: "7px 11px"
  input-inline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
---

# Design System: Bu Ecof Empires — 53

## Overview

**Creative North Star: “The Weekly War Ledger”**

The product is one continuous, hand-kept competitive record translated into a fast phone interface. A compact ink-navy command band introduces the `53` seal and exact product name, the blue/orange rivalry score immediately establishes state, and the parchment matrix carries every real match without a dashboard detour.

The system borrows AoE2’s material memory—parchment, bronze, named team colors, civilization crests—without copying game chrome or turning the site into an ornamental frame. Its density comes from an Excel-like weekly sheet; its readability comes from modern spacing, native controls, and one scroll owner.

**Key Characteristics:**

- newest match at the left edge of one horizontally scrolling matrix;
- square, flat table geometry with bronze rules instead of cards;
- fixed 108 px phone rail and 260 px week columns;
- real local civilization crests leading every public player row;
- one circular `53` action seal; publish is the only additional fixed action on `/edit/`.

## Colors

The palette is a full, role-driven tournament palette: command navy frames the record; pale parchment owns the page; team colors occupy entire four-row blocks; gold is structural and rare.

### Primary

- **Command Navy** (`#202936`): identity, date headers, table headers, and menus.
- **Deep Command Navy** (`#151c26`): page surround, score center, and action seal.

### Secondary

- **Cortinyan Blue** (`#3f73bd`): sticky team rail; its soft and deep tones carry player cells and score totals.
- **Bakraco Orange** (`#cf6e2d`): opposing sticky team rail; its soft and deep tones mirror the blue roles.
- **Winner Green** (`#3f8b59`): winner rail and publish action only.

### Neutral

- **Parchment** (`#f3e1bf`), **Light Parchment** (`#faedcf`), **Deep Parchment** (`#e5cda3`): the continuous data surface.
- **Ink** (`#26180f`) and **Muted Ink** (`#725d48`): primary and secondary copy.
- **Bronze Rule** (`#c7ad82`) and **Dark Bronze Rule** (`#86673b`): grid boundaries and input strokes.
- **Gold** (`#c79a45`) and **Light Gold** (`#ebca7c`): seals, rare dividers, and high-value accents.

**The Named Rivalry Rule.** Blue or orange never communicates team identity alone; the exact team name remains visible in the rail, score, and winner row.

**The Bronze Is Structure Rule.** Gold and bronze define boundaries and seals. They never become a decorative wash or gradient.

## Typography

**Display Font:** Alegreya with Georgia fallback
**Body Font:** Alegreya Sans with system UI fallback

**Character:** Alegreya gives team names, dates, scores, and page hierarchy the weight of a game ledger. Alegreya Sans makes dense names, civilizations, controls, and statistics read quickly on phones.

### Hierarchy

- **Display** (800, `clamp(1.24rem, 6vw, 1.76rem)`, 1.05): exact product name.
- **Headline** (700, `1.62rem`, 1): route titles such as Maç Defteri and Sıralama.
- **Title** (700, `1.45rem`, 1.05): dialog headings and focused operations.
- **Body** (400, `17px`, 1.35): player names, controls, and readable data.
- **Label** (700, `0.76rem`, 0.075em): compact state copy such as Haftalık 4v4 and Düzenleme.

**The Two-Voice Rule.** Do not add a third display, blackletter, novelty medieval, icon font, or monospace family.

## Layout

Phone geometry is canonical. The public and editable match matrix use a 108 px sticky rail, 260 px snap-aligned week columns, 64 px player rows, a 54 px date row, and a 64 px winner row. The matrix is the only horizontal scroll owner; `html` and `body` remain clipped to the viewport. Older weeks continue rightward and never become cards.

At `920px`, the rail grows to 152 px, week columns to 272 px, rows compress to 62 px, and the app caps at 1440 px with navy page surround. Content order and component grammar do not change. Safe-area insets protect the iPhone status and home-indicator zones.

The score is a three-column blue / VS / orange band. Standings live on `/stats/` with a fixed six-column table. Editing lives on `/edit/` and replaces the public cell contents with two flat native selects without changing matrix geometry.

**The Continuous Matrix Rule.** Never reintroduce “latest”, “recent”, and “archive” versions of the same match data.

## Elevation & Depth

The ledger is flat at rest. Bronze rules and full-field tonal changes do nearly all structural work. Only concentrated layers lift: the `53` seal, the action menu, notices, dialogs, and the desktop document edge.

### Shadow Vocabulary

- **Seal lift** (`0 8px 22px rgb(0 0 0 / 34%)`): fixed circular or publish actions.
- **Menu lift** (`0 8px 24px rgb(0 0 0 / 32%)`): temporary action menus.
- **Dialog lift** (`0 14px 42px rgb(0 0 0 / 42%)`): modal player and confirmation surfaces.
- **Rail separation** (`5px 0 12px rgb(38 24 15 / 16%)`): tells the eye that the team rail stays pinned while weeks move.

**The Flat-Until-Elevated Rule.** Match columns, rows, score fields, and standings never cast independent shadows.

## Shapes

Data geometry is square: matrix cells, menus, inputs, tables, and dialogs use zero radius. Circular geometry is reserved for the `53` action seal and the product identity mark. The publish button uses a 29 px capsule because it carries a named high-value action, not a generic tag.

**The Seal Exception Rule.** Do not convert rows, filters, metrics, or containers into pills.

## Components

### Weekly Match Matrix

- **Shape:** one square table with a sticky rail and snap-aligned week columns.
- **Public cell:** 42 px crest, strong player name, muted civilization label.
- **Team state:** full soft-blue or soft-orange four-row block plus matching rail.
- **Winner:** explicit “Kazanan” label and exact team name on a soft green field.
- **Empty/error:** inline, centered ledger copy with a named recovery action.

### Editable Matrix

- **Continuity:** identical rail, dates, teams, rows, and winner geometry.
- **Fields:** transparent native selects with one bottom bronze rule, no rounded input box.
- **Draft state:** all mutations stay local until one `Yayınla` action writes the complete state.
- **Conflict:** the draft remains visible and the notice explains that another publish won.

### Action Seal and Menu

- **Seal:** 58 px, deep navy, 2 px gold border, `53` text; fixed above the safe area.
- **Menu:** square navy list with 48 px rows and explicit text actions.
- **Focus:** 3 px focus blue with 2 px offset.
- **No fake icons:** actions use real labels and the product’s `53` mark.

### Standings

- **Columns:** rank, player, O, G, M, and % stay in that order at every width.
- **Phone widths:** 42 px rank, flexible player, 39 px O/G/M, 58 px rate.
- **Header:** command navy; rows use light parchment and bronze horizontal rules.

### Dialogs

- **Shape:** square parchment sheet with navy heading and one bronze perimeter rule.
- **Use:** only player management and destructive confirmation require focus isolation.
- **Controls:** at least 44 px touch targets and native text inputs/buttons.

## Do's and Don'ts

### Do:

- **Do** keep the newest complete match immediately visible at the left edge.
- **Do** preserve exact team names, player names, civilization names, and winner words.
- **Do** keep the 108/260 px phone matrix geometry even on the editor.
- **Do** use local civilization assets and maintain their license notice.
- **Do** check 320 px, 390 px, and 1440 px with no document-level horizontal overflow.
- **Do** preserve 44 px touch targets, visible focus, reduced motion, and safe-area insets.

### Don't:

- **Don't** add a persistent sidebar, header bar, footer, bottom navigation, or dashboard card grid.
- **Don't** repeat matches as “last match”, “recent matches”, and “all matches”.
- **Don't** replace the matrix with cards at narrow widths or hide civilizations to make it fit.
- **Don't** add gradients, glass, decorative glows, parchment textures, or full medieval frames.
- **Don't** use emoji or text glyphs as action icons; the exact product-name emoji suffix is the only product-name exception.
- **Don't** put authentication, PIN, GitHub tokens, or external runtime dependencies into the editor.

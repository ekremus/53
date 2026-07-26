---
name: "Bu Ecof Empires🏹🪓⚔️"
description: "A continuous AoE2 meydan ledger for one weekly 4v4 rivalry."
colors:
  ink: "#281a11"
  ink-soft: "#6c5139"
  wood: "#16100c"
  wood-raised: "#24170f"
  parchment: "#ead7b3"
  parchment-light: "#f4e5c8"
  parchment-deep: "#d4b98a"
  rule: "#b59662"
  rule-dark: "#71502c"
  gold: "#c49a4b"
  gold-light: "#ead08b"
  cortinyan-blue: "#1d527c"
  cortinyan-blue-dark: "#123b5d"
  bakracogullari-orange: "#a94a17"
  bakracogullari-orange-dark: "#77300f"
  danger: "#86261d"
  success: "#2f623f"
  focus: "#0e6eb2"
typography:
  display:
    fontFamily: "Alegreya, serif"
    fontSize: "clamp(1.35rem, 5.7vw, 2rem)"
    fontWeight: 800
    lineHeight: 1.06
    letterSpacing: "-0.015em"
  headline:
    fontFamily: "Alegreya, serif"
    fontSize: "clamp(1.55rem, 7vw, 2.15rem)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Alegreya, serif"
    fontSize: "1.16rem"
    fontWeight: 700
    lineHeight: 1.1
  body:
    fontFamily: "Alegreya Sans, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.35
  label:
    fontFamily: "Alegreya Sans, sans-serif"
    fontSize: "0.72rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "0.13em"
rounded:
  field: "2px"
  confirm: "6px"
  surface: "8px"
  sheet-mobile: "12px 12px 0 0"
  full: "50%"
spacing:
  xs: "6px"
  sm: "8px"
  md: "10px"
  lg: "14px"
  xl: "16px"
  2xl: "18px"
  3xl: "24px"
  section: "30px"
components:
  button-primary:
    backgroundColor: "#694516"
    textColor: "#fff8e8"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: "9px 16px"
    height: "46px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "#ffffff"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: "9px 16px"
    height: "46px"
  fab:
    backgroundColor: "{colors.wood-raised}"
    textColor: "{colors.gold-light}"
    rounded: "{rounded.full}"
    size: "60px"
    height: "60px"
    width: "60px"
  field:
    backgroundColor: "#fff8e9"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: "9px 11px"
    height: "44px"
  match-sheet:
    backgroundColor: "{colors.parchment-light}"
    textColor: "{colors.ink}"
    rounded: "0"
  sheet-surface:
    backgroundColor: "{colors.parchment-light}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    padding: "24px"
---

# Design System: Bu Ecof Empires🏹🪓⚔️

## Overview

**Creative North Star: "Meydan Defteri / Interlocking Tournament Banner"**

The product is one continuous Age of Empires II meydan ledger. Walnut identity art resolves directly into a blue-and-orange rivalry banner, then into a warm parchment record of real matches and standings. The world should feel hand-kept, competitive, and old enough to have history, while every interaction remains as direct as a modern phone form.

The system refuses generic dashboard chrome. There is no persistent header, sidebar, footer, bottom navigation, or grid of floating metric cards. Identity, score, lineups, chronology, and ranking form one readable document; the lower-right action seal is the only persistent control.

The approved visual source is `.impeccable/mocks/meydan-c-banner.png`, interpreted semantically rather than copied literally. The binding `53` walnut artwork, local type, real data, and local civilization crests build the world; giant decorative crests, full ornamental frames, and rasterized interface text do not.

**Key Characteristics:**

- A compact walnut-and-bronze identity opening, followed immediately by the complete rivalry score.
- Warm parchment as the continuous reading surface, separated by bronze rules instead of nested cards.
- Cortinyanlar blue and Bakracoğulları orange always paired with explicit team names and result words.
- Ledger density: full 4v4 lineups and civilization crests remain readable on a narrow phone.
- One fixed circular action seal; editing happens in focused native dialogs.

## Colors

The palette is a restrained material set: near-black walnut surrounds warm parchment, bronze carries structure, and the two team colors carry competition.

### Primary

- **Cortinyan Field Blue**: The Cortinyanlar banner, lineup header, winner selection, and blue score field. Its dark companion belongs to the top rivalry score so white numerals stay dominant.
- **Bakracoğulları Ember Orange**: The Bakracoğulları banner, lineup header, winner selection, and orange score field. Its dark companion belongs to the top rivalry score.

### Secondary

- **Meydan Bronze**: The main structural accent for score borders, dialog rims, and the action seal.
- **Pale Trophy Gold**: High-contrast gold for the score seal, leading crown, identity label, and dark-surface iconography.

### Tertiary

- **Ledger Success**: Success notices only; it must not compete with team colors.
- **Ledger Danger**: Destructive actions and error notices only.

### Neutral

- **Walnut Night**: The browser canvas and full-bleed backdrop beyond the ledger.
- **Raised Walnut**: The score bridge, action seal, and action menu.
- **Ledger Parchment**: The uninterrupted page surface.
- **Light Parchment**: Match sheets, forms, and dialog working surfaces.
- **Deep Parchment**: Tonal separation when a darker paper field is needed.
- **Ledger Ink**: Primary text on paper.
- **Soft Ink**: Dates, civilization labels, rankings, and explanatory copy.
- **Bronze Rule / Dark Bronze Rule**: Thin dividers and stronger structural outlines respectively.
- **Focus Blue**: The universal keyboard focus ring; it is interaction state, not a third team color.

**The Named Rivalry Rule.** Team color never stands alone: every score, lineup, winner, and result also includes the team name or an explicit result word.

**The Bronze Is Structure Rule.** Gold and bronze mark boundaries, seals, and rare status; they do not wash whole sections or become decorative gradients.

## Typography

**Display Font:** Alegreya (with the generic serif fallback)

**Body Font:** Alegreya Sans (with the generic sans-serif fallback)

**Character:** Alegreya brings the compact, carved authority of a match chronicle; Alegreya Sans keeps dense names, statistics, and phone forms quick to parse. Both font families are served locally with OFL licenses.

### Hierarchy

- **Display** (800, fluid 1.35–2rem, 1.06): The exact product name over the identity art; use once per document.
- **Headline** (700, fluid 1.55–2.15rem, 1): Ledger section and dialog titles.
- **Title** (700, 1.16rem, 1.1): Team names, component titles, and fieldset legends.
- **Body** (400, 17px, 1.35): Match data, player names, forms, notices, and explanatory text.
- **Label** (700, 0.72rem, 0.13em tracking): Uppercase eyebrows and compact status language. Keep these short.

Tabular statistics use lining tabular numerals so columns do not jump. Player names and civilization names preserve their natural case; only eyebrows, table headers, and result marks use uppercase treatment.

**The Two-Voice Rule.** Alegreya speaks for identity and hierarchy; Alegreya Sans carries operations and data. Do not introduce a third display or monospace family.

**The No-Faux-Medieval Rule.** Atmosphere comes from the real type pairing and material palette, never blackletter, novelty runes, outlined lettering, or rasterized labels.

## Layout

The app is mobile-first and behaves as one long document. The main ledger is full-width from 320px upward, capped at 1040px and centered on the walnut canvas. The identity scene is 192–312px tall, the rivalry score directly touches it, and the paper ledger continues without page chrome. Section rhythm is approximately 28–30px vertically, with 14px phone gutters that expand to 28px at 640px and 42px at 920px.

The first phone viewport establishes the world in this order: compact `53` crest, exact product name, complete Cortinyanlar-versus-Bakracoğulları score, then the beginning of the latest-match ledger. Do not insert navigation, onboarding, promotional copy, or summary cards before the score.

Safe-area insets are structural. The ledger bottom includes enough space for the 60px floating action seal plus `env(safe-area-inset-bottom)`; notices respect the top inset; bottom sheets include left, right, and bottom insets. Use dynamic viewport units for document and dialog heights so iPhone Safari does not expose a false footer or clipped sheet.

Responsive behavior is additive:

- **Below 520px:** Each editor slot is vertical: slot number at left, player selector above the civilization selector. Never squeeze both selectors into narrow side-by-side columns.
- **520px and wider:** Editor slots become number + player + civilization in one row.
- **640px and wider:** Latest-match lineups and the two team editors sit side by side; bottom sheets become centered, fully bordered dialog surfaces. Player management rows become horizontal.
- **720px and wider:** The center score seal grows from 72px to 82px.
- **920px and wider:** The ledger becomes a two-column reading spread: latest match and chronology on the left, player ranking on the right with one bronze dividing rule.

**The Continuous Ledger Rule.** Use rules, alternating team fields, and typography to create hierarchy. Do not put every statistic or section into an independent rounded card.

**The Phone Is Canonical Rule.** Any new editing pattern must be complete and comfortable at 320px before a wider arrangement is added.

## Elevation & Depth

The system is flat by default. Paper hierarchy comes from tone and 1px bronze rules; shadows are reserved for a small number of genuinely elevated layers.

### Shadow Vocabulary

- **Ledger lift** (`0 0 48px rgb(0 0 0 / 38%)`): Separates the capped parchment document from the walnut desktop canvas.
- **Score seal lift** (`0 4px 12px rgb(0 0 0 / 35%)`): Gives the circular VS seal physical precedence over the two team fields.
- **Action seal lift** (`0 7px 22px rgb(0 0 0 / 42%)`): Keeps the fixed FAB legible above match rows.
- **Action menu lift** (`0 12px 32px rgb(0 0 0 / 46%)`): Used only while the floating menu is open.
- **Bottom-sheet lift** (`0 -12px 36px rgb(0 0 0 / 42%)`): Separates a mobile editor from the obscured ledger beneath.
- **Confirmation lift** (`0 14px 42px rgb(0 0 0 / 46%)`): Reserved for the destructive confirmation surface.

**The Flat-Until-Elevated Rule.** Match sheets, chronology rows, and ranking tables do not cast shadows. Only the document edge, seals, menus, and modal layers lift.

## Shapes

The form language is mostly square and ledger-like. Match sheets, score fields, chronology comparisons, tables, team fieldsets, and menus use straight corners and 1px rules. Inputs and action buttons receive only a 2px easing so native phone controls feel precise rather than harsh. Centered dialogs use an 8px radius; mobile bottom sheets use a 12px top radius and meet the viewport at the bottom. Confirmation surfaces use a restrained 6px radius.

Perfect circles are rare and meaningful: the center score seal, 60px lower-right action seal, and 44px close button. Do not round generic containers into pills.

**The Seal Exception Rule.** Circular geometry denotes a concentrated command or score. It is not a general-purpose chip style.

## Components

### Identity Scene

The `hero-53.png` artwork fills the compact opening with `object-fit: cover`; a near-opaque walnut caption band anchors the local eyebrow and exact product name. The asset is identity, not a background texture to repeat elsewhere. Preserve its crop by changing only `object-position` at a breakpoint if real-device QA requires it.

### Rivalry Score

The score is a single three-part banner: dark Cortinyanlar field, circular bronze VS/total-match seal, dark Bakracoğulları field. Each team name and win total is complete at phone width. A leading crown is secondary to the numeric result and cannot replace the team name.

### Match Sheets and Lineups

Latest-match sheets use one dark bronze outline, a compact dated metadata row, then two lineups. Each lineup has a solid named team header and four 54px rows containing slot, 38px local civilization crest, player, and civilization name. Winner state uses both `Kazanan`/`Mağlup` text and team color. On phones the lineups stack; from 640px they share the same sheet side by side.

Chronology rows remain flat and separated by bronze rules. Their two-column versus field may use pale team tints, while the winner gets a 3px inset gold baseline and explicit `Kazandı` text.

### Ranking Table

The ranking is a compact real table, not a card collection. The stable header order is rank, player, **O**, **G**, **M**, **%**; the abbreviations mean played, wins, losses, and win rate. Rows are at least 44px high, numeric cells align right with tabular numerals, player names align left, and narrow screens may horizontally scroll rather than hide a statistic.

### FAB and Action Menu

The only persistent action is a 60px circular walnut-and-gold FAB in the lower right, offset by the device bottom safe area. Its opened menu sits directly above, uses three 52px rows, and exposes new match, player management, and GitHub connection. There is no bottom bar. Keyboard focus uses the universal 3px Focus Blue ring with a 2px offset.

### Dialogs

Editing uses native `<dialog>` semantics and a 76%-opaque walnut backdrop. On phones, general and editor dialogs are bottom sheets; at 640px they become centered parchment surfaces. The credential dialog remains compact and centered. Dialogs are internally scrollable, respect dynamic viewport height and safe areas, and expose a 44px circular close control. Destructive operations require the dedicated confirmation dialog.

The shared menu/dialog surface reveal is the system's only authored motion: 170ms `ease-out`, moving 10px upward while fading and scaling from 0.985 to 1. `prefers-reduced-motion: reduce` collapses animation and transition duration to 0.01ms and disables smooth scrolling.

### Forms

Fields use light cream paper, 1px dark bronze strokes, 2px corners, and a minimum 44px height. Labels sit immediately above their control; controls never rely on placeholders as labels. Team editor legends use the matching solid team color. Civilization selectors pair a 36px live local crest with the select. Winner choices are two minimum-52px labeled targets and become solid team color only when selected.

Primary save actions use dark brown with light parchment text; destructive actions use Ledger Danger. All touch controls meet or exceed 44×44px, disabled controls remain recognizable, and errors or success are announced in the assertive notice region.

### Assets

The walnut `53` artwork, app icons, Alegreya font files, and civilization crests are repository-local and GitHub Pages-safe. Civilization PNGs come from Siege Engineers' AoE2 Tech Tree under its MIT License; `docs/assets/civs/NOTICE.md` must travel with them. `random.svg` is original to this project. Never hotlink crests or substitute emoji where a local civilization crest exists.

## Do's and Don'ts

### Do:

- **Do** make the complete rivalry score and latest real match the first useful information after identity.
- **Do** use 1px bronze rules and tonal paper changes to structure dense data before adding elevation.
- **Do** keep team names, result words, and colors together so meaning survives grayscale and color-vision differences.
- **Do** keep phone editor selections vertical below 520px and use at least 44px touch targets everywhere.
- **Do** keep ranking columns in the stable **O / G / M / %** order and preserve every metric on narrow screens.
- **Do** respect iPhone safe areas for the ledger, FAB, notices, and bottom sheets.
- **Do** use local identity, font, and civilization assets with their license notices intact.

### Don't:

- **Don't** add a persistent header, sidebar, footer, bottom navigation, or a second fixed action.
- **Don't** translate the page into a generic dashboard of rounded cards, glass panels, gradients, or ornamental containers nested inside containers.
- **Don't** use color alone to communicate the winner or team identity.
- **Don't** squeeze player and civilization selectors side by side below 520px.
- **Don't** replace data tables with decorative stat tiles or remove losses from the leaderboard.
- **Don't** repeat the hero art as a texture, literalize a giant crest, add a full medieval frame, or place rasterized interface text over the ledger.
- **Don't** hotlink AoE2 Tech Tree assets or introduce an unlicensed font/icon dependency.
- **Don't** add looping, ambient, or scroll-triggered motion; the single 170ms dialog/menu reveal is sufficient.

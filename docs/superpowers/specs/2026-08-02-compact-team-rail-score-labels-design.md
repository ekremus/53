# Compact Team Rail and Labeled Score Design

## Goal

Make the mobile match ledger denser without weakening team identity:

- remove the vertical team-name text from the sticky left rail;
- reduce that rail by 75%;
- move the winner medal beside the winning team name in each public result cell;
- place both team names above their aggregate scores at 50% opacity;
- increase the score strip height from 52px to 68px.

This is a presentation-only change. Shared data, API behavior, editing, standings, match ordering, player rows, civilization selection, and persistence remain unchanged.

## Chosen Direction

Keep a very narrow colored rail instead of removing it. The rail becomes 8px on phones and 12px at the existing 920px desktop breakpoint, preserving approximately one quarter of the current 31px/48px widths. Its upper four-player block remains Cortinyanlar blue and its lower four-player block remains Bakracoğulları red. The blank date and result rail cells remain deep brown.

This approach is preferred over removing the rail because it preserves the sticky team boundary while returning 23px of mobile width to the match surface. It is preferred over a 12px mobile rail because the user explicitly requested a 75% reduction.

## Score Strip

The score strip becomes 68px tall and keeps the existing three-column structure:

- flexible Cortinyanlar field;
- fixed 24px deep-brown dash;
- flexible Bakracoğulları field.

Each colored score field renders the team name above its number. The name is derived from the current state, uses the same local Merriweather family, remains on one line, and is rendered at 10px with 50% opacity. The numeric total remains the dominant 32px bold value. Existing accessible labels continue to announce the team name and total together.

The score increase is reflected in the public viewport filler calculation. At 390×844, the canonical stack becomes 40px branding + 44px controls + 68px score + 504px matrix = 656px before the safe-area inset, so the newest complete match still fits without document scrolling.

## Weekly Match Matrix

The sticky rail keeps the same four grid tracks—date, four blue player rows, four red player rows, and result—but contains no visible text and no medal. It remains `aria-hidden` because team identity is visible in the score and every winning result.

Every public match result cell contains:

1. the existing local Tabler medal asset;
2. the exact winning team name.

The medal is decorative with an empty alt attribute, measures 18px, and uses the established antique-gold filter. The result cell uses a centered inline-flex layout with a 5px gap. Its blue or red background continues to identify the winning team. Editable result cells remain unchanged: winner select and delete action only.

Match columns remain 164px on phones and 232px on desktop. Date rows remain 34px, player rows remain 54px, public result rows remain 38px, and the walnut divider remains 3px. Scroll snapping continues to use the new rail width.

## Rendering Boundaries

- `docs/lib/views.js` owns the visible score labels and numeric totals.
- `docs/lib/matrix.js` removes visible rail content and places the medal in each public result cell.
- `docs/styles.css` owns the 68px score geometry, 8px/12px rail tokens, score label styling, and result medal alignment.
- `DESIGN.md` is updated so the new geometry and naming rules become durable.

No model, controller, API, authentication, persistence, or data-schema code changes.

## Accessibility

Color is not the only team cue:

- both exact team names remain visible in the score strip;
- each match result contains the exact winning team name;
- score fields keep combined accessible labels;
- the decorative medal stays silent to assistive technology.

The change does not reduce any interactive target; the rail and public result cells are not controls. Focus behavior, reduced motion, native horizontal scrolling, and the 16px dialog input rule remain intact.

## Error and Edge Handling

- Long team names remain single-line and use overflow clipping inside their flexible score fields.
- A missing winner continues to render an empty result name through the existing fallback and emits no medal; this defensive presentation fallback does not alter data validation.
- Zero scores render normally beneath the team labels.
- Editing and standings keep their current layouts.

## Verification

Automated tests must confirm:

- each score field contains one team label and one numeric value;
- the score strip is 68px high;
- phone and desktop rail widths are 8px and 12px;
- public rail markup contains neither vertical team-name text nor a medal;
- every public match result contains one local medal beside its winner name;
- editable result cells contain no decorative medal;
- all existing data, security, standings, editing, and persistence tests still pass.

Visual QA at 320×700, 390×844, and 1440×1000 must confirm:

- no document-level horizontal overflow;
- the sticky 8px rail remains aligned while the matrix scrolls;
- the first complete match remains visible at 390×844;
- score names are subtle but readable;
- medal and winner name fit inside the 164px result cell;
- no failed images or runtime errors.

Before deployment, fetch the live state with GET only. After deployment and aliasing `53aoe.vercel.app`, fetch it again and require byte-for-byte equality. Commit and push the implementation separately from this design commit.

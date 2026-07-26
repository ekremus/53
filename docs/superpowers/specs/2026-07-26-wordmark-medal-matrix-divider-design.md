# Wordmark, Winner Medal, and Team Divider Design

## Scope

Refine the existing single-sheet AoE2 SPA with five tightly bounded additions:

1. a stronger horizontal separator between Cortinyanlar and Bakracoğulları;
2. a winner medal in the left rail of every match result row;
3. a compact branded header using a generated `Bu Ecof Empires` wordmark;
4. a continuous parchment background without the current visible repeat cutoff;
5. explicit crawler and search-index opt-out on every route.

The match data model, editing workflow, score strip, standings, navigation, storage API, and open-edit behavior do not change.

## Search Visibility

- Keep the application publicly reachable by direct URL but explicitly opt every route out of search indexing.
- Add `noindex`, `nofollow`, `noarchive`, `nosnippet`, and `noimageindex` directives in page metadata and the production `X-Robots-Tag` response header.
- Add a root `robots.txt` containing `User-agent: *` and `Disallow: /`.
- Apply the same directives to the legacy `/edit/` and `/stats/` entry documents.
- This is crawler/indexing control, not access control: it does not add authentication and cannot prevent someone who knows the URL from opening or sharing it.

## Header and Wordmark

- Add a dedicated brand row above the existing `Maçlar | Sıralama` control row.
- Keep the brand row visually flat and compact: 40px content height plus the existing top safe-area inset.
- Generate one project-local PNG wordmark with ImageGen. The visible text must read exactly `Bu Ecof Empires`; the bow, axe, and sword idea is expressed as small illustrated weapon marks rather than unreliable emoji glyph rendering.
- Use warm parchment and restrained antique-gold lettering on a transparent background so the asset sits cleanly on the existing deep-brown furniture color.
- The wordmark must be centered, horizontally composed, and legible at roughly 220–250px wide and no more than 30px high on a 390px phone.
- The image gets an accessible text alternative containing the complete product name `Bu Ecof Empires🏹🪓⚔️`.
- If the generated spelling is not exact after one targeted regeneration, use the generated weapon emblem beside a live Merriweather text wordmark. Incorrect raster text must never ship.
- The existing centered view switch and contextual edit/save/cancel actions remain unchanged in the second row.

## Team Divider

- Draw one continuous 3px dark-walnut separator between the fourth Cortinyanlar row and the first Bakracoğulları row.
- Apply the separator to both the sticky vertical team rail and every match column so it reads as one horizontal rule while the matrix scrolls.
- Use an inset treatment so the divider does not change the established 54px player rows or the 504px match geometry.
- Apply it in both public and editable match states.

## Winner Medal

- Place one real local medal icon in the bottom-left rail cell aligned with every match result row.
- Use a 20px medal from the established Tabler icon family, tinted antique gold on the deep-brown rail.
- Keep the winning team name and its fixed blue/red result color inside each match column unchanged.
- Treat the medal as decorative because the adjacent result already communicates the winner in text; use an empty alt attribute.
- In edit mode the same rail icon remains visible while the winner dropdown and delete action continue to occupy each match column.

## Mobile Geometry

- The new brand row adds at most 40px to the first viewport.
- At 390 × 844, the public stack remains approximately: 40px brand + 44px controls + 52px score + 504px matrix = 640px, excluding the safe-area inset. The entire newest match must remain visible without vertical scrolling.
- No footer, bottom navigation, floating action, hero, card, or secondary header content is introduced.
- Desktop keeps the same centered, capped single-sheet layout; the wordmark does not grow beyond its mobile-readable intrinsic size.

## Continuous Parchment Background

- Replace the current shallow 1060 × 145px parchment strip with a larger project-local parchment texture derived from the same warm, worn material language.
- Generate a clean, edge-safe texture without borders, hard bands, vignette, text, crests, objects, or directional lighting that exposes the image boundary.
- Present it as a viewport-covering background layer that remains continuous while longer surfaces such as Sıralama scroll. Do not stretch the texture into visible distortion and do not allow a 145px repeat seam.
- Keep the application shell transparent enough that the same parchment remains perceptually continuous above, behind, and below the data surfaces.
- Apply the same updated texture to the new-player dialog so it remains part of the same material system.
- Preserve the existing parchment colors and text contrast; this is a continuity repair, not a palette change.

## Assets

- ImageGen runs in built-in mode with the `logo-brand` use case.
- Generate the source on a flat chroma-key background, remove the key locally, validate the alpha channel and edges, then save the final project asset as `docs/assets/wordmark-ecof.png`.
- Generate the replacement texture in a separate built-in ImageGen call, save it as `docs/assets/paper-continuous.jpg`, and keep the original `paper.jpg` until the new asset is visually verified.
- Add a real Tabler medal asset as `docs/assets/icons/medal.svg` and retain the existing Tabler license notice.
- Do not hotlink either asset and do not use emoji, CSS art, inline SVG, or a text glyph as the medal.

## Verification

- Add static rendering assertions for the brand image, medal asset, and continuous team divider hooks.
- Run the complete automated suite.
- Review public matches, editable matches, standings, and player editing at 390 × 844 and 1440 × 900.
- Confirm the first complete match remains visible at 390 × 844, the divider aligns across rail and week columns, the medal aligns with the result row, and the wordmark remains sharp and legible.
- Scroll the standings and player editor beyond one viewport on iPhone-sized and desktop viewports; confirm the parchment has no cutoff, hard repeat band, or exposed solid-color block.
- Confirm all project assets load locally with no failed network requests or console errors.
- Confirm `/robots.txt` disallows `/`, every HTML entry contains the no-index metadata, and production responses include the `X-Robots-Tag` header.
- Deploy to Vercel, verify `https://53aoe.vercel.app`, and push the same commit to GitHub.

## Out of Scope

- No data migration or live match mutation.
- No score, player, civilization, statistics, or editing changes.
- No replacement of the fixed blue/red team system.
- No additional navigation, explanatory copy, ornamental frame, or dashboard content.
- No login, password, private-network gate, or other access-control layer.

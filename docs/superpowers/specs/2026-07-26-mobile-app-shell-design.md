# 53 Mobile App Shell — Product Design

## Outcome

`53` becomes a mobile-first, app-like AoE II: DE match tracker. A permanent left rail is the only global navigation. There is no top header, marketing hero, footer, or filler copy. Only one workspace is visible at a time: Dashboard, Matches, or Ranking.

## Screens

- **Dashboard:** Red–Blue season score, match total, current leader, and the latest match.
- **Matches:** Newest-first match archive. Password-gated edit mode lives here and uses a bottom save dock.
- **Ranking:** Player leaderboard with played, wins, losses, and win rate.

On phones the rail is 62px wide and icon-first. From tablet width it expands to show labels. Content always occupies the remaining viewport and never creates a second global bar.

## Match entry

Every match contains its date, four Red participants, four Blue participants, the winner, and one civilization for each participant. Player selectors use the unique names already present in saved match history. Their final option is `+ Yeni oyuncu`; choosing it reveals a small inline name field. Civilization selectors use the 53 current standard AoE II: DE civilizations plus `Random`.

Legacy matches without civilization values remain readable and normalize to `Random`; new saves require a valid civilization for all eight players. Duplicate players in one match remain invalid. Editors can swap players in matching Red/Blue slots.

## Visual system

The shell uses dark timber, charcoal, aged parchment, bronze-gold dividers, deep oxblood Red, and desaturated navy Blue. Subtle CSS texture and serif typography evoke the supplied post-game screen and AoE2 Tech Tree palette without copying their frames, artwork, icons, or exact layout. Controls remain large enough for thumb use.

## Short address

The production app continues on Sites because its shared D1 database and server-side password cannot run on GitHub Pages alone. A public GitHub repository named `53` provides the memorable entry URL `https://ekremus.github.io/53/`, which redirects to the live app. The full source is also mirrored in that repository.

## Validation

Validation covers legacy-data normalization, all 53 civilization choices, player roster reuse, statistic derivation, mobile CSS, production build/tests, public live responses, and the GitHub Pages shortcut.

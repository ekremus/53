---
version: 1
slug: "docs-index-html"
primary_target: "docs/index.html"
related_targets:
  - "docs/edit/index.html"
  - "docs/stats/index.html"
---

# Surface

- Target: `docs/index.html`
- Mode: Operate
- Scope: Public weekly matrix with matching open editor and separate player standings.

## Audience and job

Friends open the site almost entirely on phones during or after a weekly AoE2 DE 4v4. They need to see the current Cortinyanlar–Bakracoğulları score and inspect every player/civilization lineup without learning navigation. Anyone with the link may edit and publish the shared record.

## Primary task and content

The public route begins with the named rivalry score and then one horizontal newest-first matrix. A sticky 108 px rail preserves team/slot meaning while 260 px match columns move under the finger. `/edit/` keeps this exact geometry and exposes native selects; `/stats/` contains only derived player standings.

## Constraints

- Exact product and team names, two seeded matches, ten players, and 53 current civilization assets are preserved.
- No duplicated latest/recent/archive match views.
- No password, PIN, GitHub token, login, sidebar, header bar, footer, bottom navigation, or external runtime dependency.
- Mobile Safari, 320 px width, safe areas, 44 px touch targets, and visible focus are binding.
- Runtime hosting, API, and private JSON state stay inside one Vercel project; GitHub remains source only.

## Chosen direction

**The Weekly War Ledger.** The supplied Excel matrix controls information architecture; the supplied mobile AoE2 row controls cell hierarchy. Command navy, parchment, bronze rules, full blue/orange team fields, a green winner row, and real civilization crests make the AoE2 atmosphere unmistakable without copying the game interface.

The memorable interaction is not a hero: it is the rail staying fixed while complete old weeks continue rightward. The public and editor matrices are the same object in two states.

## Unresolved decisions

None. Open editing and Vercel-only runtime were explicitly approved.

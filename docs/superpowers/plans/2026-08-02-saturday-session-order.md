# Saturday Session Dates and Match Sequence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Normalize all 47 matches to Saturday session dates and render same-session game numbers in the exact `01 Ağu 2026 (3)` format while keeping the newest game on the left.

**Architecture:** Keep the state schema unchanged. Treat state array position as chronological order inside a Saturday, derive the sequence number during rendering, and use a guarded one-time migration built from replay timestamps to correct dates and array order. Deploy code before applying the data snapshot so every production state remains valid and renderable.

**Tech Stack:** HTML, CSS, JavaScript ES modules, Node 22 test runner, Python 3 with read-only `openpyxl`, Vercel Functions, Vercel Blob, GitHub.

## Global Constraints

- Public title format is exactly `01 Ağu 2026 (3)`.
- The first played match is `(1)`; the newest match remains leftmost, so three same-session columns display `(3)`, `(2)`, `(1)`.
- Every match date must be the most recent Saturday on or before its replay timestamp.
- Preserve exactly 13 players, 47 unique match IDs, all teams, all slots, all civilizations, and all winners.
- Do not add a time field, sequence field, framework, external browser asset, or new production service.
- Production writes require the committed before-snapshot to match live semantic state.
- Commit and push source before production data changes.

---

### Task 1: Derived Match Sequence and Public Date Label

**Files:**
- Modify: `tests/matrix-views.test.mjs`
- Modify: `tests/static-views.test.mjs`
- Modify: `tests/static-css.test.mjs`
- Modify: `docs/lib/views.js`
- Modify: `docs/lib/matrix.js`
- Modify: `docs/styles.css`

**Interfaces:**
- Consumes: validated state where `state.matches` is chronological within one date.
- Produces: `orderedMatchRecords(state) -> Array<{match, index, sequence}>`, `formatMatchDateLong(value) -> string`, and public date labels with `.match-sequence`.

- [ ] **Step 1: Write failing formatter and sequence tests**

Add to `tests/static-views.test.mjs` imports and assertions:

```js
import {
  escapeHtml,
  formatMatchDate,
  formatMatchDateLong,
  renderScoreStrip,
  renderStatsTable,
  renderTopControl,
} from "../docs/lib/views.js";

test("formats compact and accessible Turkish match dates", () => {
  assert.equal(formatMatchDate("2026-08-01"), "01 Ağu 2026");
  assert.equal(formatMatchDateLong("2026-08-01"), "01 Ağustos 2026");
});
```

Update the matrix import in `tests/matrix-views.test.mjs` and add a three-match test:

```js
import {
  orderedMatchRecords,
  orderedTeamSlots,
  renderEditableMatrix,
  renderMatchMatrix,
} from "../docs/lib/matrix.js";

test("numbers same-Saturday matches chronologically while rendering newest first", () => {
  const state = structuredClone(fixture);
  const first = structuredClone(state.matches[0]);
  const second = structuredClone(state.matches[1]);
  const third = structuredClone(state.matches[0]);
  first.id = "same-day-1";
  second.id = "same-day-2";
  third.id = "same-day-3";
  first.date = second.date = third.date = "2026-08-01";
  state.matches = [first, second, third];

  const records = orderedMatchRecords(state);
  assert.deepEqual(records.map(({ match, sequence }) => [match.id, sequence]), [
    ["same-day-3", 3],
    ["same-day-2", 2],
    ["same-day-1", 1],
  ]);

  const html = renderMatchMatrix(state);
  assert.ok(html.indexOf("same-day-3") < html.indexOf("same-day-2"));
  assert.ok(html.indexOf("same-day-2") < html.indexOf("same-day-1"));
  assert.deepEqual(
    [...html.matchAll(/class="match-sequence"> \((\d+)\)<\/span>/g)].map((match) => Number(match[1])),
    [3, 2, 1],
  );
  assert.match(html, /aria-label="01 Ağustos 2026, 3\. maç"/);
});

test("labels a one-match Saturday as the first game", () => {
  const state = structuredClone(fixture);
  state.matches = [state.matches[0]];
  state.matches[0].date = "2026-08-01";
  assert.match(renderMatchMatrix(state), /01 Ağu 2026<span class="match-sequence"> \(1\)<\/span>/);
});
```

Add to `tests/static-css.test.mjs`:

```js
test("keeps match sequence metadata compact inside the date row", () => {
  assert.match(css, /\.match-sequence\s*{[\s\S]*font-weight:\s*400[\s\S]*opacity:\s*0\.72/);
  assert.match(css, /\.match-column__date time[\s\S]*white-space:\s*nowrap/);
});
```

- [ ] **Step 2: Run targeted tests and verify failure**

Run:

```bash
node --test tests/matrix-views.test.mjs tests/static-views.test.mjs tests/static-css.test.mjs
```

Expected: FAIL because `orderedMatchRecords`, `formatMatchDateLong`, and `.match-sequence` do not exist.

- [ ] **Step 3: Implement shared compact and long date formatting**

Replace the formatter block in `docs/lib/views.js` with:

```js
const compactDateFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const longDateFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function utcDate(value) {
  const [year, month, day] = String(value).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatMatchDate(value) {
  return compactDateFormatter.format(utcDate(value));
}

export function formatMatchDateLong(value) {
  return longDateFormatter.format(utcDate(value));
}
```

- [ ] **Step 4: Implement stable records and the exact public label**

Update `docs/lib/matrix.js` imports and ordering functions:

```js
import { escapeHtml, formatMatchDate, formatMatchDateLong } from "./views.js";

export function orderedMatchRecords(state) {
  const counts = new Map();
  return state.matches
    .map((match, index) => {
      const sequence = (counts.get(match.date) ?? 0) + 1;
      counts.set(match.date, sequence);
      return { match, index, sequence };
    })
    .sort((a, b) => b.match.date.localeCompare(a.match.date) || b.index - a.index);
}

export function orderedMatches(state) {
  return orderedMatchRecords(state).map(({ match }) => match);
}
```

Change the public column signature and date markup:

```js
function publicMatchColumn(state, { match, sequence }, players) {
  const winner = state.teams.find((team) => team.id === match.winner);
  const winnerIndex = state.teams.findIndex((team) => team.id === match.winner);
  const result = winner
    ? `<img class="matrix-result__medal" src="./assets/icons/medal.svg" alt="" width="18" height="18"><strong>${escapeHtml(winner.name)}</strong>`
    : "";
  const accessibleDate = `${formatMatchDateLong(match.date)}, ${sequence}. maç`;
  return `<article class="match-column" data-match-column="${escapeHtml(match.id)}">
    <div class="match-column__date"><time datetime="${escapeHtml(match.date)}" data-iso-date="${escapeHtml(match.date)}" aria-label="${escapeHtml(accessibleDate)}">${escapeHtml(formatMatchDate(match.date))}<span class="match-sequence"> (${sequence})</span></time></div>
    ${state.teams.map((team, index) => `<section class="matrix-team matrix-team--${index === 0 ? "blue" : "red"}" aria-label="${escapeHtml(team.name)}">${orderedTeamSlots(state, match.teams[team.id]).map(({ slot, index: slotIndex }) => publicPlayerCell(players, slot, team.id, slotIndex)).join("")}</section>`).join("")}
    <div class="matrix-result matrix-result--${winnerIndex === 0 ? "blue" : "red"}">${result}</div>
  </article>`;
}
```

Render records rather than bare matches in the public matrix, while edit mode keeps bare match arguments:

```js
export function renderMatchMatrix(state) {
  const records = orderedMatchRecords(state);
  if (!records.length) return `<div class="matrix-empty"><strong>Henüz maç yok</strong></div>`;
  const players = roster(state);
  return `<div class="match-matrix" role="region" tabindex="0" aria-label="Haftalık maçlar; eski haftalar için sağa kaydır">
    ${railMarkup(state)}
    <div class="matrix-weeks">${records.map((record) => publicMatchColumn(state, record, players)).join("")}</div>
  </div>`;
}

export function renderEditableMatrix(state) {
  const records = orderedMatchRecords(state);
  const addAction = `<button class="add-action" type="button" data-add-match><img src="./assets/icons/plus.svg" alt="" width="18" height="18"><span>Maç ekle</span></button>`;
  if (!records.length) return `<div class="matrix-empty">${addAction}</div>`;
  return `<div class="edit-toolbar">${addAction}</div><div class="match-matrix match-matrix--editable" role="region" tabindex="0" aria-label="Düzenlenebilir maçlar">${railMarkup(state)}<div class="matrix-weeks">${records.map(({ match }) => editableMatchColumn(state, match)).join("")}</div></div>`;
}
```

- [ ] **Step 5: Add restrained sequence styling**

Add directly after `.match-column__date time` in `docs/styles.css`:

```css
.match-sequence {
  font-weight: 400;
  opacity: 0.72;
}
```

- [ ] **Step 6: Run targeted tests and commit**

Run:

```bash
node --test tests/matrix-views.test.mjs tests/static-views.test.mjs tests/static-css.test.mjs
git diff --check
```

Expected: all targeted tests pass and `git diff --check` prints nothing.

Commit:

```bash
git add docs/lib/views.js docs/lib/matrix.js docs/styles.css tests/matrix-views.test.mjs tests/static-views.test.mjs tests/static-css.test.mjs
git commit -m "feat: number Saturday match sessions"
```

---

### Task 2: Audited Saturday-Date Migration

**Files:**
- Create: `scripts/build-saturday-session-migration.py`
- Create: `data/migrations/2026-08-02-saturday-sessions/before.json`
- Create: `data/migrations/2026-08-02-saturday-sessions/after.json`
- Create: `data/migrations/2026-08-02-saturday-sessions/report.json`
- Create: `tests/saturday-session-migration.test.mjs`

**Interfaces:**
- Consumes: `GET https://53aoe.vercel.app/api/state`, `replays/aoe2_replays.xlsx`, and helpers loaded from `scripts/build-replay-migration.py`.
- Produces: guarded revision-32 before/after snapshots with identical semantic match content and corrected Saturday dates/order.

- [ ] **Step 1: Write the migration artifact tests**

Create `tests/saturday-session-migration.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { orderedMatchRecords } from "../docs/lib/matrix.js";
import { validateState } from "../docs/lib/model.js";

const root = new URL("../data/migrations/2026-08-02-saturday-sessions/", import.meta.url);
const before = validateState(JSON.parse(await readFile(new URL("before.json", root), "utf8")));
const after = validateState(JSON.parse(await readFile(new URL("after.json", root), "utf8")));
const report = JSON.parse(await readFile(new URL("report.json", root), "utf8"));

function contentById(state) {
  return new Map(state.matches.map(({ id, date, ...content }) => [id, content]));
}

test("normalizes only dates and ordering while preserving all match content", () => {
  assert.equal(before.players.length, 13);
  assert.equal(before.matches.length, 47);
  assert.equal(after.players.length, 13);
  assert.equal(after.matches.length, 47);
  assert.deepEqual(after.players, before.players);
  assert.deepEqual(after.teams, before.teams);
  assert.deepEqual(contentById(after), contentById(before));
  assert.equal(new Set(after.matches.map(({ id }) => id)).size, 47);
  assert.ok(after.matches.every(({ date }) => new Date(`${date}T00:00:00Z`).getUTCDay() === 6));
  assert.deepEqual(report.changedFields, ["matches[].date", "matches array order"]);
});

test("keeps real repeated games and derives contiguous session sequences", () => {
  const ids = new Set(after.matches.map(({ id }) => id));
  assert.ok(ids.has("replay-20260222-0043-037"));
  assert.ok(ids.has("replay-20260221-2334-038"));
  const groups = new Map();
  for (const { match, sequence } of orderedMatchRecords(after)) {
    const values = groups.get(match.date) ?? [];
    values.push(sequence);
    groups.set(match.date, values);
  }
  for (const values of groups.values()) {
    const ascending = [...values].sort((a, b) => a - b);
    assert.deepEqual(ascending, Array.from({ length: values.length }, (_, index) => index + 1));
  }
});
```

- [ ] **Step 2: Run the test and verify the missing-artifact failure**

Run:

```bash
node --test tests/saturday-session-migration.test.mjs
```

Expected: FAIL with `ENOENT` for `before.json`.

- [ ] **Step 3: Create the read-only migration builder**

Create `scripts/build-saturday-session-migration.py` with these complete responsibilities:

```python
#!/usr/bin/env python3
from __future__ import annotations

import argparse
import copy
import json
import runpy
import urllib.request
from datetime import datetime, time, timedelta
from pathlib import Path


SOURCE_HELPERS = runpy.run_path("scripts/build-replay-migration.py")
normalized_name = SOURCE_HELPERS["normalized_name"]
parse_workbook = SOURCE_HELPERS["parse_workbook"]
semantic_match = SOURCE_HELPERS["semantic_match"]
state_digest = SOURCE_HELPERS["state_digest"]
write_json = SOURCE_HELPERS["write_json"]


def saturday_date(timestamp: datetime) -> str:
    days_since_saturday = (timestamp.weekday() - 5) % 7
    return (timestamp.date() - timedelta(days=days_since_saturday)).isoformat()


def content_signature(match: dict) -> str:
    value = semantic_match(match)
    value.pop("date")
    return json.dumps(value, ensure_ascii=False, sort_keys=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--workbook", type=Path, default=Path("replays/aoe2_replays.xlsx"))
    parser.add_argument("--state-url", default="https://53aoe.vercel.app/api/state")
    parser.add_argument("--output", type=Path, default=Path("data/migrations/2026-08-02-saturday-sessions"))
    args = parser.parse_args()

    request = urllib.request.Request(args.state_url, headers={"Cache-Control": "no-store"})
    with urllib.request.urlopen(request) as response:
        before = json.load(response)["state"]

    if len(before["players"]) != 13 or len(before["matches"]) != 47:
        raise ValueError("Canlı başlangıç durumu 13 oyuncu ve 47 maç içermeli.")

    players_by_name = {normalized_name(player["name"]): player["id"] for player in before["players"]}
    records = parse_workbook(args.workbook, players_by_name)
    matches_by_id = {match["id"]: match for match in before["matches"]}
    timestamps_by_id = {}
    claimed_ids = set()

    for record in records:
        generated_id = record["match"]["id"]
        if generated_id in matches_by_id:
            match_id = generated_id
        else:
            signature = content_signature(record["match"])
            candidates = [
                match["id"]
                for match in before["matches"]
                if match["id"] not in claimed_ids and content_signature(match) == signature
            ]
            if len(candidates) != 1:
                raise ValueError(f"{record['sourceNumber']}. replay mevcut maçla tekil eşleşmedi.")
            match_id = candidates[0]
        claimed_ids.add(match_id)
        timestamps_by_id[match_id] = record["timestamp"]

    after = copy.deepcopy(before)
    original_index = {match["id"]: index for index, match in enumerate(before["matches"])}
    changed_dates = []
    for match in after["matches"]:
        timestamp = timestamps_by_id.get(match["id"])
        if timestamp is None:
            if datetime.fromisoformat(match["date"]).weekday() != 5:
                raise ValueError(f"Saati bilinmeyen {match['id']} cumartesi değil.")
            continue
        normalized_date = saturday_date(timestamp)
        if match["date"] != normalized_date:
            changed_dates.append({"id": match["id"], "from": match["date"], "to": normalized_date})
            match["date"] = normalized_date

    def chronology(match: dict) -> tuple:
        timestamp = timestamps_by_id.get(match["id"])
        if timestamp is None:
            base = datetime.combine(datetime.fromisoformat(match["date"]).date(), time.min)
            timestamp = base + timedelta(seconds=original_index[match["id"]])
        return match["date"], timestamp, original_index[match["id"]]

    after["matches"].sort(key=chronology)
    if {match["id"] for match in after["matches"]} != set(matches_by_id):
        raise ValueError("Migration maç kimliklerini korumadı.")

    report = {
        "beforeRevision": before["revision"],
        "beforeDigest": state_digest(before),
        "afterDigestBeforeServerWrite": state_digest(after),
        "players": len(after["players"]),
        "matches": len(after["matches"]),
        "replayBackedMatches": len(timestamps_by_id),
        "changedDates": changed_dates,
        "changedFields": ["matches[].date", "matches array order"],
    }
    write_json(args.output / "before.json", before)
    write_json(args.output / "after.json", after)
    write_json(args.output / "report.json", report)
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Build snapshots and verify the report**

Run:

```bash
python3 scripts/build-saturday-session-migration.py
jq '{beforeRevision,players,matches,replayBackedMatches,changedDates,changedFields}' data/migrations/2026-08-02-saturday-sessions/report.json
```

Expected: revision `32`, players `13`, matches `47`, replay-backed matches `44`, five changed date records, and only the two listed changed-field categories.

- [ ] **Step 5: Run migration tests and guarded forward dry run**

Run:

```bash
node --test tests/saturday-session-migration.test.mjs
node --env-file=.env.local scripts/apply-state-snapshot.mjs \
  data/migrations/2026-08-02-saturday-sessions/after.json \
  data/migrations/2026-08-02-saturday-sessions/before.json
```

Expected: tests pass; dry run reports current revision `32`, current matches `47`, target matches `47`, and performs no write.

- [ ] **Step 6: Commit the migration artifacts**

Run:

```bash
git add scripts/build-saturday-session-migration.py tests/saturday-session-migration.test.mjs data/migrations/2026-08-02-saturday-sessions
git commit -m "data: normalize matches to Saturday sessions"
```

---

### Task 3: Durable Design Contract and Full Verification

**Files:**
- Modify: `DESIGN.md`
- Modify: `scripts/visual-qa.mjs`

**Interfaces:**
- Consumes: public match columns with `.match-sequence` and migrated 47-match state.
- Produces: durable design rules and QA metrics `dateLabels` and `matchSequences`.

- [ ] **Step 1: Document the new date contract**

Add to the matrix section of `DESIGN.md`:

```markdown
- Every match belongs to a Saturday session. Replays recorded on Sunday or Monday use the immediately preceding Saturday; a Saturday replay remains on that Saturday.
- Date headers use `01 Ağu 2026 (3)`. The parenthetical value is chronological within that Saturday, while columns remain newest-first so sequences descend from left to right.
- Session sequence is derived from state order and is never stored or edited.
```

- [ ] **Step 2: Extend visual QA metrics**

In the metrics object evaluated by `scripts/visual-qa.mjs`, add:

```js
dateLabels: [...document.querySelectorAll('.match-column__date time')].map((element) => element.textContent.trim()),
matchSequences: [...document.querySelectorAll('.match-sequence')].map((element) => element.textContent.trim()),
```

- [ ] **Step 3: Run the complete automated suite**

Run:

```bash
npm test
python3 -m py_compile scripts/build-replay-migration.py scripts/build-saturday-session-migration.py
node --check docs/lib/views.js
node --check docs/lib/matrix.js
node --check scripts/apply-state-snapshot.mjs
git diff --check
```

Expected: all tests pass, syntax checks exit zero, and `git diff --check` prints nothing.

- [ ] **Step 4: Commit documentation and QA instrumentation**

Run:

```bash
git add DESIGN.md scripts/visual-qa.mjs
git commit -m "test: verify Saturday session labels"
```

---

### Task 4: Push, Deploy, Apply, and Verify Production

**Files:**
- Read: `data/migrations/2026-08-02-saturday-sessions/before.json`
- Read: `data/migrations/2026-08-02-saturday-sessions/after.json`
- Read: `.env.local`

**Interfaces:**
- Consumes: clean tested Git commits and guarded snapshots.
- Produces: GitHub `main`, Vercel production, and revision-33 live state with 47 Saturday-dated matches.

- [ ] **Step 1: Reconfirm Git and live preconditions**

Run:

```bash
git status --short
node --env-file=.env.local scripts/apply-state-snapshot.mjs \
  data/migrations/2026-08-02-saturday-sessions/after.json \
  data/migrations/2026-08-02-saturday-sessions/before.json
```

Expected: clean worktree and dry run at revision `32` with `47 -> 47` matches.

- [ ] **Step 2: Push exact source state**

Run:

```bash
git push github main
git rev-parse HEAD
git ls-remote github refs/heads/main
```

Expected: local and remote SHA values match.

- [ ] **Step 3: Deploy code before data**

Run:

```bash
vercel deploy --prod --yes
vercel alias set bu-ecof-empires-53.vercel.app 53aoe.vercel.app
```

Expected: both commands succeed; the stable project production alias and `53aoe.vercel.app` point to the ready deployment.

- [ ] **Step 4: Verify deployed code while old data is still intact**

Run:

```bash
curl -fsS https://53aoe.vercel.app/lib/matrix.js | rg 'match-sequence|orderedMatchRecords'
node --env-file=.env.local scripts/apply-state-snapshot.mjs \
  data/migrations/2026-08-02-saturday-sessions/after.json \
  data/migrations/2026-08-02-saturday-sessions/before.json
```

Expected: deployed source contains both identifiers and the forward dry run still accepts revision `32`.

- [ ] **Step 5: Apply the data snapshot exactly once**

Run:

```bash
node --env-file=.env.local scripts/apply-state-snapshot.mjs \
  data/migrations/2026-08-02-saturday-sessions/after.json \
  data/migrations/2026-08-02-saturday-sessions/before.json \
  --apply
```

Expected: written revision `33`, players `13`, matches `47`.

- [ ] **Step 6: Verify live semantic state and rollback readiness**

Run:

```bash
node --env-file=.env.local scripts/apply-state-snapshot.mjs \
  data/migrations/2026-08-02-saturday-sessions/before.json \
  data/migrations/2026-08-02-saturday-sessions/after.json
curl -fsS https://53aoe.vercel.app/api/state | jq '{revision:.state.revision,players:(.state.players|length),matches:(.state.matches|length),nonSaturday:([.state.matches[].date|select((strptime("%Y-%m-%d")|mktime|strftime("%w"))!="6")]|length)}'
```

Expected: reverse dry run succeeds, revision `33`, players `13`, matches `47`, non-Saturday `0`.

- [ ] **Step 7: Run one bounded production visual QA pass**

Start headless Chrome on CDP port `9223`, then run:

```bash
APP_URL=https://53aoe.vercel.app/ QA_CHECK=public-390 node --env-file=.env.local scripts/visual-qa.mjs
APP_URL=https://53aoe.vercel.app/ QA_CHECK=standings-390 node --env-file=.env.local scripts/visual-qa.mjs
```

Expected public metrics: `matchColumns: 47`, `resultMedals: 47`, `dateLabels[0]` matches `01 Ağu 2026 (3)`, no failed images, no runtime errors, no document overflow. Expected standings metrics: `standingsRows: 13`, ranks `1` through `13`, no failed images or runtime errors.

- [ ] **Step 8: Final repository verification**

Run:

```bash
git status --short
git rev-parse HEAD
git ls-remote github refs/heads/main
```

Expected: clean worktree and matching local/remote SHA values.

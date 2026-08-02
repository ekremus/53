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

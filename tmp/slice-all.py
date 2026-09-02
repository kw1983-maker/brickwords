#!/usr/bin/env python3
"""Slice every pack sheet in pictures/ into game/assets/words/."""

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PICTURES = ROOT / "pictures"
OUT = ROOT / "game" / "assets" / "words"
SLICER = ROOT / "tmp" / "slicer2.py"

# pictures/*.png filename -> pack id in js/words.js
SHEETS = {
    "friends.png": "friends",
    "numbers.png": "numbers",
    "colours.png": "colours",
    "at school.png": "school",
    "toys.png": "toys",
    "pets.png": "pets",
    "food.png": "lunch",
    "free time.png": "week",
    "my house.png": "house",
    "clothes.png": "clothes",
    "body parts.png": "body",
    "holiday activities.png": "beach",
    "wherea re you from.png": "countries",
    "my week.png": "subjects",
    "in the past.png": "past",
    "celebration.png": "celebrations",
    "eating right.png": "eating",
    "getting around.png": "transport",
    "helping around.png": "helping",
    "amazing animals.png": "wildlife",
    "get active.png": "sports",
}


def main() -> int:
    subprocess.run([sys.executable, str(ROOT / "tmp" / "gen-pack-map.py")], check=True)
    OUT.mkdir(parents=True, exist_ok=True)
    failed = 0
    for filename, pack_id in SHEETS.items():
        sheet = PICTURES / filename
        if not sheet.exists():
            print(f"MISSING  {filename}")
            failed += 1
            continue
        print(f"\n=== {pack_id}  <=  {filename} ===")
        rc = subprocess.call(
            [sys.executable, str(SLICER), pack_id, str(sheet), str(OUT)],
        )
        if rc != 0:
            failed += 1
    print(f"\n{'failed' if failed else 'done'} — {len(SHEETS) - failed}/{len(SHEETS)} packs")
    return failed


if __name__ == "__main__":
    raise SystemExit(main())

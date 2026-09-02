#!/usr/bin/env python3
"""Emit tmp/pack-map.json from js/words.js (PACKS word order for the slicer)."""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORDS = ROOT / "js" / "words.js"
OUT = ROOT / "tmp" / "pack-map.json"

text = WORDS.read_text(encoding="utf-8")

packs = {}
for m in re.finditer(
    r"id:\s*'([^']+)'[\s\S]*?words:\s*\[([\s\S]*?)\]\s*,\s*(?:quiz:|},|\n\s+\})",
    text,
):
    pid = m.group(1)
    block = m.group(2)
    words = re.findall(r"word:\s*'((?:\\'|[^'])*)'", block)
    words = [w.replace("\\'", "'") for w in words]
    if words:
        packs[pid] = words

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(packs, indent=2) + "\n", encoding="utf-8")
print(f"wrote {OUT} — {len(packs)} packs, {sum(len(v) for v in packs.values())} words")

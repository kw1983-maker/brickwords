#!/usr/bin/env python3
"""
Slice a pack sheet into per-word transparent PNGs.

Usage:
  python tmp/slicer2.py <pack-id> <sheet-path> [out-dir]

Grid layout comes from tmp/pack-map.json → grids[pack-id] as a list of column
counts per row (reading order, left-to-right, top-to-bottom). When omitted,
blob-detection mode splits on transparent / dark gaps.

Each cell is content-trimmed. If multiple disconnected blobs remain, the
largest one is kept — this drops stray kite-string pixels in toys/plane.png.
"""

from __future__ import annotations

import json
import sys
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MAP_PATH = ROOT / "tmp" / "pack-map.json"
GRIDS_PATH = ROOT / "tmp" / "pack-grids.json"

# Pixels at or below this luma are treated as empty background.
BG_LUMA = 18
# Alpha below this after processing is fully transparent.
ALPHA_CUT = 12


def word_slug(w: str) -> str:
    import re

    s = w.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def load_maps():
    words = json.loads(MAP_PATH.read_text(encoding="utf-8"))
    grids = {}
    if GRIDS_PATH.exists():
        grids = json.loads(GRIDS_PATH.read_text(encoding="utf-8"))
    return words, grids


def luma(r, g, b):
    return (54 * r + 183 * g + 19 * b) >> 8


def prepare_rgba(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 10 or luma(r, g, b) <= BG_LUMA:
                px[x, y] = (0, 0, 0, 0)
            elif a < 255:
                # Premultiply-ish cleanup on JPEG fringe
                px[x, y] = (r, g, b, min(255, a))
    return im


def opaque_bbox(im: Image.Image):
    px = im.load()
    w, h = im.size
    min_x, min_y, max_x, max_y = w, h, -1, -1
    for y in range(h):
        for x in range(w):
            if px[x, y][3] > ALPHA_CUT:
                min_x = min(min_x, x)
                min_y = min(min_y, y)
                max_x = max(max_x, x)
                max_y = max(max_y, y)
    if max_x < 0:
        return None
    return min_x, min_y, max_x + 1, max_y + 1


def largest_component_bbox(im: Image.Image):
    px = im.load()
    w, h = im.size
    seen = bytearray(w * h)
    best = None
    best_area = 0

    def idx(x, y):
        return y * w + x

    for y in range(h):
        for x in range(w):
            if seen[idx(x, y)] or px[x, y][3] <= ALPHA_CUT:
                continue
            q = deque([(x, y)])
            seen[idx(x, y)] = 1
            min_x = max_x = x
            min_y = max_y = y
            area = 0
            while q:
                cx, cy = q.popleft()
                area += 1
                min_x = min(min_x, cx)
                max_x = max(max_x, cx)
                min_y = min(min_y, cy)
                max_y = max(max_y, cy)
                for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
                    if 0 <= nx < w and 0 <= ny < h and not seen[idx(nx, ny)]:
                        if px[nx, ny][3] > ALPHA_CUT:
                            seen[idx(nx, ny)] = 1
                            q.append((nx, ny))
            if area > best_area:
                best_area = area
                best = (min_x, min_y, max_x + 1, max_y + 1)
    return best


def trim_wispy_top(im: Image.Image, wide_frac: float = 0.30) -> Image.Image:
    """Drop a thin top tail (kite string bleeding into the cell below)."""
    px = im.load()
    w, h = im.size
    if h < 8:
        return im
    need = max(8, int(w * wide_frac))
    start = 0
    for y in range(h):
        row_w = sum(1 for x in range(w) if px[x, y][3] > ALPHA_CUT)
        if row_w >= need:
            start = y
            break
    if start <= 0:
        return im
    return im.crop((0, start, w, h))


def trim_cell(cell: Image.Image, keep_largest: bool = True) -> Image.Image:
    cell = prepare_rgba(cell)
    bb = largest_component_bbox(cell) if keep_largest else opaque_bbox(cell)
    if not bb:
        return cell
    out = cell.crop(bb)
    out = trim_wispy_top(out)
    bb2 = opaque_bbox(out)
    return out.crop(bb2) if bb2 else out


def slice_fixed_grid(im: Image.Image, cols_per_row: list[int], pad: float = 0.04):
    """Return cell boxes in reading order."""
    w, h = im.size
    rows = len(cols_per_row)
    row_h = h / rows
    boxes = []
    for ri, cols in enumerate(cols_per_row):
        col_w = w / cols
        y0 = int(round(ri * row_h + row_h * pad))
        y1 = int(round((ri + 1) * row_h - row_h * pad))
        for ci in range(cols):
            x0 = int(round(ci * col_w + col_w * pad))
            x1 = int(round((ci + 1) * col_w - col_w * pad))
            boxes.append((x0, y0, x1, y1))
    return boxes


def slice_blob_grid(im: Image.Image):
    """Fallback: split on runs of empty columns/rows (transparent sheets)."""
    im = prepare_rgba(im)
    px = im.load()
    w, h = im.size

    def row_empty(y):
        return all(px[x, y][3] <= ALPHA_CUT for x in range(w))

    def col_empty(x):
        return all(px[x, y][3] <= ALPHA_CUT for y in range(h))

    rows = []
    y = 0
    while y < h:
        while y < h and row_empty(y):
            y += 1
        if y >= h:
            break
        y0 = y
        while y < h and not row_empty(y):
            y += 1
        rows.append((y0, y))

    boxes = []
    for y0, y1 in rows:
        x = 0
        while x < w:
            while x < w and col_empty(x):
                x += 1
            if x >= w:
                break
            x0 = x
            while x < w and not col_empty(x):
                x += 1
            boxes.append((x0, y0, x, y1))
    return boxes


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)

    pack_id = sys.argv[1]
    sheet_path = Path(sys.argv[2])
    out_dir = Path(sys.argv[3]) if len(sys.argv) > 3 else ROOT / "game" / "assets" / "words"
    out_dir.mkdir(parents=True, exist_ok=True)

    words_map, grids = load_maps()
    if pack_id not in words_map:
        print(f"unknown pack {pack_id!r} — run python tmp/gen-pack-map.py")
        sys.exit(1)

    words = words_map[pack_id]
    im = Image.open(sheet_path)

    if pack_id in grids:
        boxes = slice_fixed_grid(im, grids[pack_id])
    else:
        boxes = slice_blob_grid(im)

    if len(boxes) != len(words):
        print(f"warning: {len(boxes)} cells vs {len(words)} words for {pack_id}")

    n = min(len(boxes), len(words))
    for i in range(n):
        word = words[i]
        slug = word_slug(word)
        x0, y0, x1, y1 = boxes[i]
        cell = im.crop((x0, y0, x1, y1))
        # Drop stray overlap blobs (kite tail in plane cell).
        out = trim_cell(cell, keep_largest=True)
        dest = out_dir / f"{slug}.png"
        out.save(dest, "PNG")
        print(f"  {dest.name}  ({out.size[0]}x{out.size[1]})  <- {word!r}")

    print(f"done - {n} icons -> {out_dir}")


if __name__ == "__main__":
    main()

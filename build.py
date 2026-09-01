#!/usr/bin/env python3
"""Build a single self-contained index.html from the modular source in js/ + css/.

The modular files stay the source of truth. This inlines the CSS and merges every
module, in dependency order, into one inline <script type="module"> so the result
can be opened by double-clicking index.html (file://). Three.js is pulled from a
CDN — https CDN imports are allowed over file://, local module files are not.

Run:  python build.py
"""
import re
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent

# Order matters: definitions first, main.js last (it boots the game on load).
JS_ORDER = [
    "js/rbx.js",
    "js/parts.js",
    "js/avatar.js",
    "js/camera.js",
    "js/controller.js",
    "js/audio.js",
    "js/speech.js",
    "js/words.js",
    "js/questions.js",
    "js/quests.js",
    "js/course.js",
    "js/npc.js",
    "js/island.js",
    "js/ui.js",
    "js/cloud.js",
    "js/main.js",
]

IMPORT_RE = re.compile(r"^\s*import\b")
EXPORT_RE = re.compile(r"^(\s*)export\s+")


def strip_module_syntax(src: str) -> str:
    """Drop import statements (single or multi-line) and the `export ` keyword.

    Every module ends up in one shared scope, so imported names resolve on their
    own; only the statements themselves have to go.
    """
    out = []
    in_import = False
    for line in src.splitlines():
        if in_import:
            # A multi-line import ends on the line that closes it.
            if "from " in line or line.rstrip().endswith(";"):
                in_import = False
            continue
        if IMPORT_RE.match(line):
            # If the statement has not finished on this line, keep skipping.
            if "from " not in line and not line.rstrip().endswith(";"):
                in_import = True
            continue
        out.append(EXPORT_RE.sub(r"\1", line))
    return "\n".join(out)


def main() -> None:
    css = (ROOT / "css/style.css").read_text(encoding="utf-8")

    chunks = []
    for rel in JS_ORDER:
        path = ROOT / rel
        if not path.exists():
            print(f"  skip (missing): {rel}")
            continue
        chunks.append(f"// ===== {rel} =====\n{strip_module_syntax(path.read_text(encoding='utf-8'))}")
    js = "\n\n".join(chunks)

    template = (ROOT / "build/template.html").read_text(encoding="utf-8")
    # A visible build time on the title screen. index.html is usually opened
    # straight off the disk over file://, where a browser caches it hard and a
    # plain reload can serve yesterday's copy — which is indistinguishable from
    # the build not having changed at all. This is how you tell the difference.
    stamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    html = (template
            .replace("/*__CSS__*/", css)
            .replace("/*__JS__*/", js)
            .replace("<!--__BUILD__-->", stamp))

    out = ROOT / "index.html"
    out.write_text(html, encoding="utf-8")
    print(f"Built {out.name} ({len(html):,} bytes) from {len(chunks)} modules.")


if __name__ == "__main__":
    main()

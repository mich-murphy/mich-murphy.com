#!/usr/bin/env python3
"""Fails if a comment or the README names a repo file that doesn't exist: scripts/check-refs.py (check.sh runs it).

A renamed or deleted file leaves the comments that name it pointing nowhere. This reads every tracked text file but the
posts and tests, and checks each file name or path in it: a path against the repo root and the folders the templates
and scripts name files from (layouts, layouts/_partials, assets, content/posts), and a bare name against every tracked
file's. Site addresses (/search.json) and build outputs (OUTPUTS) aren't repo files, so they're left alone.
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EXT = r"(?:html|css|js|mjs|py|sh|toml|json|jsonc|xml|md|txt|yaml|nix)"
# a name or path, not part of a site address, a URL, a variable or a template's placeholder
REF = re.compile(rf"(?<![\w/.:@~$<>{{}}%+-])((?:[\w-]+/)*[\w-]+(?:\.[\w-]+)*\.{EXT})(?![\w./-])")
BASES = ["", "layouts/", "layouts/_partials/", "assets/", "content/posts/"]
# what the build writes, and names that aren't files: a tag, a resource Hugo makes, a method
OUTPUTS = {"index.html", "index.md", "index.xml", "search.json", "atom.xml", "node.js", "response.json"}
OUTPUTS |= {"css/home-filters-built.css", "outputFormats.json", "docs/design/HANDOVER.md"}
SKIP = ("content/posts/", "tests/")


def main() -> int:
    # git from PATH, as the devShell and CI have it, with fixed arguments and no shell
    command = ["git", "ls-files"]
    tracked = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, check=True).stdout.split()  # noqa: S603
    names = {Path(f).name for f in tracked}
    missing = []
    for f in tracked:
        if f.startswith(SKIP) or not re.search(rf"\.{EXT}$", f):
            continue
        for n, line in enumerate((ROOT / f).read_text().splitlines(), 1):
            for ref in REF.findall(line):
                if ref in OUTPUTS:
                    continue
                found = any((ROOT / base / ref).exists() for base in BASES) if "/" in ref else ref in names
                if not found:
                    missing.append(f"{f}:{n}: {ref}")
    if missing:
        print("check-refs: these name files that don't exist:", *missing, sep="\n  ", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

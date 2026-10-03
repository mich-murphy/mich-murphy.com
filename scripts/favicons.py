#!/usr/bin/env python3
"""Draws the favicons from the Shadow stamp's pixel map: scripts/favicons.py

It writes static/favicon.svg, static/favicon.png (32x32) and static/apple-touch-icon.png (180x180), so rerun it after
changing the map. It reads the map from the comment in layouts/_partials/mark.html, and stops if that file's fg rects
don't match it: f is fg, b is bg, d is one fg dither cell and . is nothing. Every icon draws the map on a bg plate, so b
and . show the plate. The SVG is dark and turns light with prefers-color-scheme; the PNGs are dark. PNGs scale the map
by a whole number with no smoothing: 2x at 32px, and 9x at 180px, centred with an 18px margin that clears the corners
iOS rounds off.

Plain Python, so it needs nothing installed.
"""

import re
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STATIC = ROOT / "static"
MARK = ROOT / "layouts/_partials/mark.html"

# The map is this many cells square
CELLS = 16

# The palette's bg and fg, dark and light (assets/css/main.css)
DARK = {"bg": "#0f1214", "fg": "#e6e2d6"}
LIGHT = {"bg": "#f5f4f0", "fg": "#0f1214"}


def read_map(mark: str) -> list[str]:
    """The map's rows, indented 4 spaces in mark.html's comment, checked against the file's fg rects so the header
    mark and the favicons can't drift apart."""
    rows = re.findall(r"^ {4}([fbd.]{16})$", mark, re.MULTILINE)
    if len(rows) != CELLS:
        raise SystemExit(f"favicons: found {len(rows)} map rows in {MARK.name}'s comment, not {CELLS}")

    # The fg rects come after the comment and before <g class="knockout">, and must cover the map's f and d cells
    # once each
    fg = mark.split("*/", 1)[1].split('<g class="knockout">')[0]
    runs = re.findall(r'<rect x="(\d+)" y="(\d+)" width="(\d+)" height="1"/>', fg)
    drawn = sorted((int(y), int(x) + i) for x, y, width in runs for i in range(int(width)))
    mapped = [(y, x) for y in range(CELLS) for x in range(CELLS) if rows[y][x] in "fd"]
    if len(runs) != fg.count("<rect") or drawn != mapped:
        raise SystemExit(f"favicons: {MARK.name}'s fg rects don't match its map")
    return rows


def svg(rows: list[str]) -> str:
    """The map on a 16x16 plate, with each row's f runs merged into rects and d as 1x1 rects."""
    lines = []
    for y, row in enumerate(rows):
        rects = []
        x = 0
        while x < CELLS:
            run = 1
            if row[x] == "f":
                while x + run < CELLS and row[x + run] == "f":
                    run += 1
            if row[x] in "fd":
                rects.append(f'<rect x="{x}" y="{y}" width="{run}" height="1"/>')
            x += run
        lines.append("".join(rects))
    return "\n".join(
        [
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">',
            "<!-- The Shadow stamp, drawn by scripts/favicons.py -->",
            f"<style>@media (prefers-color-scheme:light){{.p{{fill:{LIGHT['bg']}}}.m{{fill:{LIGHT['fg']}}}}}</style>",
            f'<rect class="p" width="16" height="16" fill="{DARK["bg"]}"/>',
            f'<g class="m" fill="{DARK["fg"]}">',
            *lines,
            "</g>",
            "</svg>",
            "",
        ]
    )


def png(rows: list[str], size: int, cell: int) -> bytes:
    """The map at cell px a pixel, centred on a size px dark plate, as an 8-bit RGB PNG."""
    margin = (size - CELLS * cell) // 2
    bg, fg = (bytes.fromhex(DARK[k][1:]) for k in ("bg", "fg"))
    raw = bytearray()
    for y in range(size):
        raw.append(0)  # filter type None
        for x in range(size):
            mx, my = (x - margin) // cell, (y - margin) // cell
            on = 0 <= mx < CELLS and 0 <= my < CELLS and rows[my][mx] in "fd"
            raw += fg if on else bg

    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data))

    return b"".join(
        [
            b"\x89PNG\r\n\x1a\n",
            chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)),
            chunk(b"IDAT", zlib.compress(bytes(raw), 9)),
            chunk(b"IEND", b""),
        ]
    )


def main() -> None:
    rows = read_map(MARK.read_text())
    (STATIC / "favicon.svg").write_text(svg(rows))
    (STATIC / "favicon.png").write_bytes(png(rows, 32, 2))
    (STATIC / "apple-touch-icon.png").write_bytes(png(rows, 180, 9))


if __name__ == "__main__":
    main()

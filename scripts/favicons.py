#!/usr/bin/env python3
# Draws the favicons from the Shadow stamp's pixel map: scripts/favicons.py
# It writes static/favicon.svg, static/favicon.png (32x32) and
# static/apple-touch-icon.png (180x180), so rerun it after changing the map.
# The map is the one in layouts/_partials/mark.html: f is fg, b is bg, d is one
# fg dither cell and . is nothing. Every icon draws it on a bg plate, so b and .
# show the plate. The SVG is dark and turns light with prefers-color-scheme; the
# PNGs are dark. PNGs scale the map by a whole number with no smoothing: 2x at
# 32px, and 10x at 180px, centred with a 10px margin, as iOS rounds the corners.
# Plain Python, so it needs nothing installed.
import struct
import zlib
from pathlib import Path

MAP = """
ffffffffffffff..
ffffffffffffff..
ffbbffffffbbffd.
ffbbffffffbbff.d
ffbbbbffbbbbffd.
ffbbbbffbbbbff.d
ffbbffbbffbbffd.
ffbbffbbffbbff.d
ffbbffffffbbffd.
ffbbffffffbbff.d
ffbbffffffbbffd.
ffbbffffffbbff.d
ffffffffffffffd.
ffffffffffffff.d
..d.d.d.d.d.d.d.
...d.d.d.d.d.d.d
""".split()

# The palette's bg and fg, dark and light (assets/css/main.css)
DARK = {"bg": "#0f1214", "fg": "#e6e2d6"}
LIGHT = {"bg": "#f5f4f0", "fg": "#0f1214"}

STATIC = Path(__file__).resolve().parent.parent / "static"


def svg():
    """The map on a 16x16 plate, with each row's f runs merged into rects and d as 1x1 rects."""
    rows = []
    for y, row in enumerate(MAP):
        rects = []
        x = 0
        while x < 16:
            n = 1
            if row[x] == "f":
                while x + n < 16 and row[x + n] == "f":
                    n += 1
            if row[x] in "fd":
                rects.append(f'<rect x="{x}" y="{y}" width="{n}" height="1"/>')
            x += n
        rows.append("".join(rects))
    return "\n".join([
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">',
        "<!-- The Shadow stamp, drawn by scripts/favicons.py -->",
        f"<style>@media (prefers-color-scheme:light){{.p{{fill:{LIGHT['bg']}}}.m{{fill:{LIGHT['fg']}}}}}</style>",
        f'<rect class="p" width="16" height="16" fill="{DARK["bg"]}"/>',
        f'<g class="m" fill="{DARK["fg"]}">',
        *rows,
        "</g>",
        "</svg>",
        "",
    ])


def png(size, cell):
    """The map at cell px a pixel, centred on a size px dark plate, as an 8-bit RGB PNG."""
    margin = (size - 16 * cell) // 2
    bg, fg = (bytes.fromhex(DARK[k][1:]) for k in ("bg", "fg"))
    raw = bytearray()
    for y in range(size):
        raw.append(0)  # filter type None
        for x in range(size):
            mx, my = (x - margin) // cell, (y - margin) // cell
            on = 0 <= mx < 16 and 0 <= my < 16 and MAP[my][mx] in "fd"
            raw += fg if on else bg

    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data))

    return b"".join([
        b"\x89PNG\r\n\x1a\n",
        chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)),
        chunk(b"IDAT", zlib.compress(bytes(raw), 9)),
        chunk(b"IEND", b""),
    ])


assert len(MAP) == 16 and all(len(r) == 16 and set(r) <= set("fbd.") for r in MAP)
(STATIC / "favicon.svg").write_text(svg())
(STATIC / "favicon.png").write_bytes(png(32, 2))
(STATIC / "apple-touch-icon.png").write_bytes(png(180, 10))

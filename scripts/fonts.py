#!/usr/bin/env python3
"""Makes the site's fonts from Monaspace's release: scripts/fonts.py (in `nix develop`, which has fontTools).

It downloads monaspace-variable-v1.400.zip, checks its hash, and cuts each face the site uses out of the variable
TTFs at a fixed weight and slant:
- static/fonts/*.woff2, which the pages load, each subset to the characters its face sets (WEB_CHARS)
- assets/fonts/*.ttf, which the build draws the social cards with (layouts/_partials/social-card.html), subset to the
  characters in CARD, which that partial's title check allows

Only texture healing (the calt feature) is kept: the coding ligatures (ss01-ss10), character variants and the rest
are dropped. Monaspace reserves its names ("Monaspace", "Argon", "Neon", "Xenon", "Radon" and "Krypton") under the SIL
Open Font License, and a subset is a Modified Version (OFL FAQ 2.6), so each file is renamed after its element's
symbol, "MM Ar" for Argon and so on, and names its source in its description. Rerun it after changing any of the
lists below, and commit the fonts it writes.
"""

import hashlib
import io
import urllib.request
import zipfile
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

VERSION = "1.400"
URL = f"https://github.com/githubnext/monaspace/releases/download/v{VERSION}/monaspace-variable-v{VERSION}.zip"
SHA256 = "b69a7f2a3c455c89dcb6cc23b61bb3fb8beecba728ccdebeccd80577e58de0c8"
# Seconds to wait for the download to start or to send more data
TIMEOUT = 60

# element symbol, Monaspace face
FACES = {"Ar": "Argon", "Xe": "Xenon", "Rn": "Radon", "Kr": "Krypton"}
# style name: weight, slant (Monaspace's italics are its slant axis at -11)
STYLES = {"Regular": (400, 0), "Bold": (700, 0), "Italic": (400, -11)}
# the files the pages load (main.css's @font-face rules), and the social cards' (social-card.html)
WEB = [
    ("Ar", "Regular"),
    ("Ar", "Bold"),
    ("Ar", "Italic"),
    ("Xe", "Regular"),
    ("Xe", "Bold"),
    ("Rn", "Regular"),
    ("Kr", "Regular"),
]
CARDS = [("Xe", "Bold"), ("Kr", "Regular")]

# The characters each face's web files keep, as Unicode ranges. A page that sets a character its face doesn't have
# falls back to the next font in main.css's stack. LATIN is Latin-1's letters and signs, and the dashes, quotes,
# bullet and ellipsis that prose uses
LATIN = (
    "U+0020-007E,U+00A0-00A3,U+00A5-00AB,U+00AE-00B1,U+00B4,U+00B6-00B8,U+00BA-00BB,U+00BF-00FF,U+2013-2014,"
    "U+2018-201A,U+201C-201D,U+2022,U+2026"
)
# Box drawing, for the trees that Argon sets: the search results' and a file tree in a post's code
BOX = "U+2500-257F"
WEB_CHARS = {
    # Argon sets prose, UI and code, so it has the most
    "Ar": f"{LATIN},{BOX}",
    # Xenon sets headings
    "Xe": LATIN,
    # Radon sets the comments in code, which are ASCII, and a few marks of punctuation they might use
    "Rn": "U+0020-007E,U+00A0,U+00B7,U+2013-2014,U+2018-201D,U+2022,U+2026",
    # Krypton sets what the build writes, including the single guillemets of the Older and Newer links
    "Kr": f"{LATIN},U+2039-203A",
}
# The social cards' TTFs keep what social-card.html's title check allows
CARD = (
    "U+0020-007E,U+00A0-00AC,U+00AE-0148,U+014A-017E,U+2013-2014,U+2018-201A,U+201C-201E,U+2020-2022,U+2026,"
    "U+2039-203A,U+20AC,U+2122,U+2212,U+2248,U+2260,U+2264-2265"
)

ROOT = Path(__file__).resolve().parent.parent


def unicodes(ranges: str) -> list[int]:
    """The code points in a list of ranges like "U+0020-007E,U+00A0"."""
    points = []
    for r in ranges.split(","):
        first, _, last = r.removeprefix("U+").partition("-")
        points.extend(range(int(first, 16), int(last or first, 16) + 1))
    return points


def rename(font: TTFont, sym: str, style: str) -> None:
    """Names the file "MM <sym>", and keeps Monaspace's copyright and trademark and a note of where it came from"""
    face, family = FACES[sym], f"MM {sym}"
    name = font["name"]
    for nid in [n.nameID for n in name.names if n.nameID not in (0, 7)]:
        name.removeNames(nameID=nid)
    # STAT describes the variable font's axes and styles, with names among those just removed. A file of one fixed style
    # needs none of it, and browsers' font sanitiser (OTS) discards a STAT whose names are missing, with an error in the
    # console
    del font["STAT"]
    for nid, value in {
        1: family,
        2: style,
        3: f"{family} {style} {VERSION}; mich-murphy.com",
        4: f"{family} {style}",
        5: f"Version {VERSION}",
        6: f"MM{sym}-{style}",
        10: f"Monaspace {face} {VERSION} by GitHub Next and Lettermatic, instanced, subset and renamed for "
        "mich-murphy.com under the SIL Open Font License 1.1",
        13: "This Font Software is licensed under the SIL Open Font License, Version 1.1.",
        14: "https://openfontlicense.org",
    }.items():
        name.setName(value, nid, 3, 1, 0x409)
    weight, slant = STYLES[style]
    font["OS/2"].usWeightClass = weight
    bold, italic = weight >= 700, slant != 0
    # fsSelection: italic 0, bold 5, regular 6; macStyle: bold 0, italic 1
    regular = not (bold or italic)
    font["OS/2"].fsSelection = (font["OS/2"].fsSelection & ~0b1100001) | italic | bold << 5 | regular << 6
    font["head"].macStyle = bold | italic << 1


def make(var: TTFont, sym: str, style: str, chars: str, flavor: str | None, out: Path) -> None:
    """Writes one style of a face, cut from its variable font, to out."""
    weight, slant = STYLES[style]
    font = instancer.instantiateVariableFont(var, {"wght": weight, "wdth": 100, "slnt": slant})
    options = subset.Options()
    options.layout_features = ["calt"]
    options.flavor = flavor
    sub = subset.Subsetter(options)
    sub.populate(unicodes=unicodes(chars))
    sub.subset(font)
    rename(font, sym, style)
    font.flavor = flavor
    # keep the release's timestamp, so a rerun writes the same bytes
    font.recalcTimestamp = False
    font.save(out)
    print(f"fonts: wrote {out.relative_to(ROOT)} ({out.stat().st_size} B)")


def main() -> None:
    with urllib.request.urlopen(URL, timeout=TIMEOUT) as response:
        data = response.read()
    digest = hashlib.sha256(data).hexdigest()
    if digest != SHA256:
        raise SystemExit(f"fonts: {URL} has SHA-256 {digest}, not {SHA256}; check the release before changing SHA256")
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        var = {sym: z.read(f"Variable Fonts/Monaspace {face}/Monaspace {face} Var.ttf") for sym, face in FACES.items()}
    for sym, style in WEB:
        out = ROOT / f"static/fonts/MM{sym}-{style}.woff2"
        make(TTFont(io.BytesIO(var[sym])), sym, style, WEB_CHARS[sym], "woff2", out)
    for sym, style in CARDS:
        make(TTFont(io.BytesIO(var[sym])), sym, style, CARD, None, ROOT / f"assets/fonts/MM{sym}-{style}.ttf")


if __name__ == "__main__":
    main()

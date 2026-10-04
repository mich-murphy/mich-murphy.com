#!/usr/bin/env python3
"""Checks and finishes a Hugo build, in CI and locally: scripts/postbuild.py [dir] (default public).

Every page's footer shows the same two figures, for the site rather than the page. In place of __HOME__ goes what a
browser fetches to load the homepage, as the 10 KB and 250KB Clubs measure a site: the page, gzipped, and the files its
head fetches, the preloaded fonts and the SVG icon. In place of __JS__ goes the site's script, the inline <script> that
only the index has. It fails if any page other than the index has a script (a post's JSON-LD is data, not code, so it
doesn't count), if any page is over MAX_GZIP_BYTES gzipped (default 14336, i.e. 14 KB), or if a page isn't UTF-8.

It also compresses the site's PNGs, the social cards, with oxipng, which loses nothing and takes off almost half of
what Hugo's encoder writes. Link previews fetch the cards, and the footer's figures don't count them.

Text is measured gzipped at level 9, with no file name or time in the gzip header, so a size doesn't depend on the
file's name or on which gzip a machine has. Fonts and images are measured as bytes on disk, since servers send them as
they are. Sizes are shown as KB with one decimal (1 KB = 1024 B). A second run only checks, and finds nothing more to
compress. It needs Python's standard library and oxipng, which the devShell has and CI installs.
"""

# Leaves the type hints unevaluated, so the script also runs on the Python 3.9 that macOS comes with
from __future__ import annotations

import gzip
import os
import shutil
import subprocess
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

HOME_PLACEHOLDER = "__HOME__"
JS_PLACEHOLDER = "__JS__"
DEFAULT_MAX_GZIP_BYTES = "14336"
# Files that are compressed already, so a server sends them as they are
PRECOMPRESSED = {".woff2", ".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif"}


class PageParser(HTMLParser):
    """Finds a page's scripts, and the links that make a browser fetch a file as the page loads."""

    def __init__(self) -> None:
        super().__init__()
        self.script_tags: list[str] = []  # each script's opening tag, as the page writes it
        self.script_text: list[str] = []  # and what's inside them
        self.fetched: list[str] = []  # the href of each preload and SVG icon
        self.in_script = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = {name: (value or "").strip() for name, value in attrs}
        if tag == "script":
            # JSON-LD is data for search engines, which a browser doesn't run
            if attributes.get("type", "").lower() != "application/ld+json":
                self.script_tags.append(self.get_starttag_text() or "<script>")
                self.in_script = True
        elif tag == "link":
            rel = attributes.get("rel", "").lower().split()
            svg_icon = "icon" in rel and attributes.get("type", "").lower() == "image/svg+xml"
            if ("preload" in rel or svg_icon) and attributes.get("href"):
                self.fetched.append(attributes["href"])

    def handle_endtag(self, tag: str) -> None:
        if tag == "script":
            self.in_script = False

    def handle_data(self, data: str) -> None:
        if self.in_script:
            self.script_text.append(data)


def parse(html: str) -> PageParser:
    parser = PageParser()
    parser.feed(html)
    parser.close()
    return parser


def gzipped_size(data: bytes) -> int:
    return len(gzip.compress(data, compresslevel=9, mtime=0))


def sent_size(path: Path) -> int:
    """The bytes a server sends for a file."""
    if path.suffix.lower() in PRECOMPRESSED:
        return path.stat().st_size
    return gzipped_size(path.read_bytes())


def kb(size: int) -> str:
    """Bytes as KB with one decimal, rounded half up."""
    tenths = (size * 10 + 512) // 1024
    return f"{tenths // 10}.{tenths % 10} KB"


def compress_pngs(site: Path, failures: list[str]) -> str | None:
    """Compresses the site's PNGs in place with oxipng, losslessly, and says by how much, or None if there are none or
    it fails. --opt 4 takes off 2% more than the default level, and higher levels nothing more, on the cards. Every
    chunk stays, since a photo in a post may need its gamma or orientation, and the cards have none to drop."""
    pngs = sorted(p for p in site.rglob("*.png") if p.is_file())
    if not pngs:
        return None
    oxipng = shutil.which("oxipng")
    if oxipng is None:
        failures.append("oxipng isn't on PATH, so the PNGs weren't compressed; run this in the devShell")
        return None
    before = sum(png.stat().st_size for png in pngs)
    command = [oxipng, "--quiet", "--opt", "4", "--", *map(str, pngs)]
    # oxipng from PATH, as the devShell and CI put it there, on the site's own files, with no shell
    if subprocess.run(command, check=False).returncode:  # noqa: S603
        failures.append(f"oxipng failed on the PNGs in {site}")
        return None
    after = sum(png.stat().st_size for png in pngs)
    return f"compressed {len(pngs)} PNGs from {kb(before)} to {kb(after)}"


def read_page(page: Path, failures: list[str]) -> str | None:
    """A page's text, or None, with a failure noted, if it isn't UTF-8 as Hugo writes it."""
    try:
        return page.read_bytes().decode()
    except UnicodeDecodeError as error:
        failures.append(f"{page}: isn't UTF-8, at byte {error.start}")
        return None


def homepage_figures(index: Path, index_html: str, failures: list[str]) -> tuple[str, str]:
    """The footer's two figures: what loading the homepage fetches, and the site's script."""
    site = index.parent
    parsed = parse(index_html)
    assets = 0
    for href in parsed.fetched:
        asset = site / unquote(urlsplit(href).path).lstrip("/")
        if asset.is_file():
            assets += sent_size(asset)
        else:
            failures.append(f"{index}: its head fetches {href}, which isn't in {site}")
    script = kb(gzipped_size("".join(parsed.script_text).encode()))

    # The homepage's size is part of what it measures: write it, measure again, and repeat while the rounded value
    # changes
    unsized = index_html.replace(JS_PLACEHOLDER, script)
    home = kb(gzipped_size(unsized.encode()) + assets)
    for _ in range(5):
        remeasured = kb(gzipped_size(unsized.replace(HOME_PLACEHOLDER, home).encode()) + assets)
        if remeasured == home:
            break
        home = remeasured
    return home, script


def main() -> int:
    site = Path(sys.argv[1] if len(sys.argv) > 1 and sys.argv[1] else "public")
    max_setting = os.environ.get("MAX_GZIP_BYTES") or DEFAULT_MAX_GZIP_BYTES
    if not (max_setting.isascii() and max_setting.isdigit()):
        print(f"postbuild: MAX_GZIP_BYTES must be a number of bytes, not '{max_setting}'", file=sys.stderr)
        return 2
    max_bytes = int(max_setting)
    if not site.is_dir():
        print(f"postbuild: {site} does not exist; build the site first", file=sys.stderr)
        return 2

    failures: list[str] = []
    # Every page is read first, so one that can't be is a failure like the others, not a crash part-way through
    # writing the footers
    paths = sorted(p for p in site.rglob("*.html") if p.is_file())
    texts = {page: text for page in paths if (text := read_page(page, failures)) is not None}

    index = site / "index.html"
    home = script = None
    if HOME_PLACEHOLDER in (index_html := texts.get(index, "")):
        home, script = homepage_figures(index, index_html, failures)

    pages = len(paths)
    written = largest = 0
    largest_page = None
    for page, html in texts.items():
        if page != index and (script_tags := parse(html).script_tags):
            failures.append(f"{page}: a script outside the index: {script_tags[0]}")

        if HOME_PLACEHOLDER in html:
            if home is None:
                failures.append(f"{page}: its footer needs the homepage's size, but {index} has no {HOME_PLACEHOLDER}")
            else:
                html = html.replace(HOME_PLACEHOLDER, home).replace(JS_PLACEHOLDER, script)
                page.write_bytes(html.encode())
                written += 1

        size = gzipped_size(html.encode())
        if size > largest:
            largest, largest_page = size, page
        if size > max_bytes:
            failures.append(f"{page}: {size} B gzipped, over the {max_bytes} B limit")

    if pages == 0:
        failures.append(f"{site}: no HTML pages")

    compressed = compress_pngs(site, failures)

    if written:
        print(
            f"postbuild: checked {pages} pages in {site}, and wrote the homepage's {home} and the site's {script} of "
            f"script into {written} footers"
        )
    else:
        print(f"postbuild: checked {pages} pages in {site}; no footer to write")
    if largest_page:
        print(
            f"postbuild: largest is {largest_page} at {kb(largest)} ({largest} B gzipped), "
            f"limit {kb(max_bytes)} ({max_bytes} B)"
        )
    if compressed:
        print(f"postbuild: {compressed}")
    if failures:
        # Flush first, so a log that interleaves the two streams keeps this order
        sys.stdout.flush()
        plural = "" if len(failures) == 1 else "s"
        print(f"postbuild: {len(failures)} failure{plural}", *failures, sep="\n", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

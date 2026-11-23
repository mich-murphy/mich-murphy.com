"""Tests for scripts/postbuild.py: python3 -m unittest discover -s tests/python (scripts/check.sh runs them)."""

from __future__ import annotations

import contextlib
import gzip
import importlib.util
import io
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

SCRIPT = Path(__file__).resolve().parents[2] / "scripts/postbuild.py"
spec = importlib.util.spec_from_file_location("postbuild", SCRIPT)
postbuild = importlib.util.module_from_spec(spec)
spec.loader.exec_module(postbuild)

FOOTER = "<footer>home __HOME__ js __JS__</footer>"
HEAD = '<link rel="preload" href="/fonts/a.woff2" as="font"><link rel="icon" href="/icon.svg" type="image/svg+xml">'


def page(body: str = "", head: str = "") -> str:
    return f"<!doctype html><html><head>{head}</head><body>{body}{FOOTER}</body></html>"


class Helpers(unittest.TestCase):
    def test_kb_rounds_half_up_to_one_decimal(self) -> None:
        self.assertEqual(postbuild.kb(0), "0.0 KB")
        self.assertEqual(postbuild.kb(1024), "1.0 KB")
        self.assertEqual(postbuild.kb(1075), "1.0 KB")  # 1.0498
        self.assertEqual(postbuild.kb(1076), "1.1 KB")  # 1.0508
        self.assertEqual(postbuild.kb(13312), "13.0 KB")

    def test_gzipped_size_ignores_name_and_time(self) -> None:
        data = b"hello " * 100
        self.assertEqual(postbuild.gzipped_size(data), len(gzip.compress(data, compresslevel=9, mtime=0)))
        self.assertEqual(postbuild.gzipped_size(data), postbuild.gzipped_size(data))

    def test_parser_finds_scripts_but_not_json_ld(self) -> None:
        parsed = postbuild.parse('<script type="application/ld+json">{}</script><script>run()</script>')
        self.assertEqual(parsed.script_tags, ["<script>"])
        self.assertEqual(parsed.script_text, ["run()"])

    def test_parser_finds_what_the_head_fetches(self) -> None:
        parsed = postbuild.parse(HEAD + '<link rel="icon" href="/icon.png"><link rel="stylesheet" href="/a.css">')
        self.assertEqual(parsed.fetched, ["/fonts/a.woff2", "/icon.svg"])


class Main(unittest.TestCase):
    def setUp(self) -> None:
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.site = Path(tmp.name)
        (self.site / "fonts").mkdir()
        (self.site / "fonts/a.woff2").write_bytes(b"\0" * 2000)
        (self.site / "icon.svg").write_text("<svg/>")

    def write(self, path: str, html: str) -> Path:
        target = self.site / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(html)
        return target

    def run_main(self) -> tuple[int, str, str]:
        out, err = io.StringIO(), io.StringIO()
        argv = ["postbuild.py", str(self.site)]
        with mock.patch.object(sys, "argv", argv), contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            code = postbuild.main()
        return code, out.getvalue(), err.getvalue()

    def test_writes_the_figures_into_every_footer(self) -> None:
        self.write("index.html", page("<script>let a = 1</script>", HEAD))
        post = self.write("post/index.html", page("<p>post</p>"))
        code, out, err = self.run_main()
        self.assertEqual(code, 0, err)
        self.assertIn("into 2 footers", out)
        html = post.read_text()
        self.assertNotIn("__HOME__", html)
        self.assertNotIn("__JS__", html)
        # the homepage's figure counts the font (2000 B, sent as it is) and the gzipped SVG on top of the page
        home = html.split("home ")[1].split(" js")[0]
        self.assertGreater(float(home.split()[0]) * 1024, 2000)

    def test_a_second_run_finds_nothing_to_write(self) -> None:
        self.write("index.html", page("", HEAD))
        self.assertEqual(self.run_main()[0], 0)
        code, out, _ = self.run_main()
        self.assertEqual(code, 0)
        self.assertIn("no footer to write", out)

    def test_fails_on_a_script_outside_the_index(self) -> None:
        self.write("index.html", page("", HEAD))
        self.write("post/index.html", page("<script>evil()</script>"))
        code, _, err = self.run_main()
        self.assertEqual(code, 1)
        self.assertIn("a script outside the index", err)

    def test_json_ld_outside_the_index_is_fine(self) -> None:
        self.write("index.html", page("", HEAD))
        self.write("post/index.html", page('<script type="application/ld+json">{}</script>'))
        self.assertEqual(self.run_main()[0], 0)

    def test_fails_on_a_page_over_the_limit(self) -> None:
        self.write("index.html", page("", HEAD))
        # random-looking text that gzip can't shrink below the limit
        noise = "".join(f"{(i * 7919) % 104729:x}" for i in range(20000))
        self.write("big/index.html", page(noise))
        code, _, err = self.run_main()
        self.assertEqual(code, 1)
        self.assertIn(f"over the {postbuild.MAX_GZIP_BYTES} B limit", err)

    def test_fails_on_a_page_that_isnt_utf8(self) -> None:
        self.write("index.html", page("", HEAD))
        (self.site / "bad.html").write_bytes(b"<p>\xff</p>")
        code, _, err = self.run_main()
        self.assertEqual(code, 1)
        self.assertIn("isn't UTF-8, at byte 3", err)

    def test_fails_when_the_head_fetches_a_missing_file(self) -> None:
        self.write("index.html", page("", HEAD + '<link rel="preload" href="/fonts/gone.woff2" as="font">'))
        code, _, err = self.run_main()
        self.assertEqual(code, 1)
        self.assertIn("/fonts/gone.woff2, which isn't in", err)

    def test_fails_without_pages(self) -> None:
        code, _, err = self.run_main()
        self.assertEqual(code, 1)
        self.assertIn("no HTML pages", err)


if __name__ == "__main__":
    unittest.main()

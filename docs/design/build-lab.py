#!/usr/bin/env python3
"""Build the self-contained theme-lab.html from theme-lab.src.html.

Inlines the 0xProto subsets and the two dither masks. The shade mask is our
own 4x6 tile (1x2 dots, staggered); the dots mask is kept for reference only.
"""
import base64
import pathlib

here = pathlib.Path(__file__).resolve().parent
fonts = here / "fonts"

SHADE = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='6'%3E"
         "%3Cpath d='M0 0h1v2H0zM2 3h1v2H2z'/%3E%3C/svg%3E")
# Reference copy of the "dots" tile explored in an earlier rev; not shipped.
DOTS = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='13' height='28'%3E%3Cpath d='M11.8182 3.65217V2.43478H13V3.65217H11.8182ZM0 25.5652V24.3478H1.18182V25.5652H0ZM0 20.6957V19.4783H1.18182V20.6957H0ZM0 15.8261V14.6087H1.18182V15.8261H0ZM0 10.9565V9.73913H1.18182V10.9565H0ZM0 6.08696V4.86957H1.18182V6.08696H0ZM0 1.21739V0H1.18182V1.21739H0ZM2.36364 28V26.7826H3.54545V28H2.36364ZM2.36364 23.1304V21.913H3.54545V23.1304H2.36364ZM2.36364 18.2609V17.0435H3.54545V18.2609H2.36364ZM2.36364 13.3913V12.1739H3.54545V13.3913H2.36364ZM2.36364 8.52174V7.30435H3.54545V8.52174H2.36364ZM2.36364 3.65217V2.43478H3.54545V3.65217H2.36364ZM4.72727 25.5652V24.3478H5.90909V25.5652H4.72727ZM4.72727 20.6957V19.4783H5.90909V20.6957H4.72727ZM4.72727 15.8261V14.6087H5.90909V15.8261H4.72727ZM4.72727 10.9565V9.73913H5.90909V10.9565H4.72727ZM4.72727 6.08696V4.86957H5.90909V6.08696H4.72727ZM4.72727 1.21739V0H5.90909V1.21739H4.72727ZM7.09091 28V26.7826H8.27273V28H7.09091ZM7.09091 23.1304V21.913H8.27273V23.1304H7.09091ZM7.09091 18.2609V17.0435H8.27273V18.2609H7.09091ZM7.09091 13.3913V12.1739H8.27273V13.3913H7.09091ZM7.09091 8.52174V7.30435H8.27273V8.52174H7.09091ZM7.09091 3.65217V2.43478H8.27273V3.65217H7.09091ZM9.45455 25.5652V24.3478H10.6364V25.5652H9.45455ZM9.45455 20.6957V19.4783H10.6364V20.6957H9.45455ZM9.45455 15.8261V14.6087H10.6364V15.8261H9.45455ZM9.45455 10.9565V9.73913H10.6364V10.9565H9.45455ZM9.45455 6.08696V4.86957H10.6364V6.08696H9.45455ZM9.45455 1.21739V0H10.6364V1.21739H9.45455ZM11.8182 28V26.7826H13V28H11.8182ZM11.8182 23.1304V21.913H13V23.1304H11.8182ZM11.8182 18.2609V17.0435H13V18.2609H11.8182ZM11.8182 13.3913V12.1739H13V13.3913H11.8182ZM11.8182 8.52174V7.30435H13V8.52174H11.8182Z'/%3E%3C/svg%3E"


def b64(name):
    return base64.b64encode((fonts / name).read_bytes()).decode()


src = (here / "theme-lab.src.html").read_text()

# The grep index (every line of every post, with line numbers and heading anchors). Made from
# content/posts by the scoping pass; the site builds the same JSON with Hugo.
idx = here / "grep-index.json"
grep_index = idx.read_text().strip() if idx.exists() else "[]"

# What the index page's search script would weigh: the lab's search functions, crudely minified, gzipped,
# plus about 0.1 KB for the fetch and input wiring the lab does differently.
import gzip, re
code = "".join(part.split("/*js:end*/")[0] for part in src.split("/*js:start*/")[1:])
code = re.sub(r"^\s*//.*$", "", code, flags=re.M)
code = re.sub(r"\s*\n\s*", "", code)
js_kb = f"{len(gzip.compress(code.encode(), 9)) / 1024 + 0.1:.1f}"

out = (src.replace("__GREP_INDEX__", grep_index)
          .replace("__GREP_JS_KB__", js_kb)
          .replace("__OXP_REG__", b64("0xProto-Regular.sub.woff2"))
          .replace("__OXP_BOLD__", b64("0xProto-Bold.sub.woff2"))
          .replace("__MASK_SHADE__", SHADE)
          .replace("__MASK_DOTS__", DOTS))
left = [t for t in ("__OXP_REG__", "__OXP_BOLD__", "__MASK_SHADE__", "__MASK_DOTS__", "__GREP_INDEX__", "__GREP_JS_KB__") if t in out]
assert not left, left
(here / "theme-lab.html").write_text(out)
print(f"theme-lab.html {len(out) // 1024} KB, grep index {len(grep_index) // 1024} KB, grep js {js_kb} KB gz")

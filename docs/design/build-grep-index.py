#!/usr/bin/env python3
"""Build the lab's grep index (grep-index.json) from content/posts/*.md and report its sizes.

Shape: [{"s":slug,"t":title,"d":date,"l":[[lineNo,text,anchor],...]},...]
- lineNo is the real 1-based line number in the source file (front matter included in the count)
- anchor is the id of the nearest preceding heading ("" before the first heading); a heading
  line carries its own id
- blank lines and fence marker lines are skipped
"""
import gzip, json, pathlib, re, sys, unicodedata

OUT = pathlib.Path(__file__).resolve().parent
POSTS = OUT.parents[1] / "content" / "posts"

FENCE = re.compile(r"^ {0,3}(`{3,}|~{3,})")
ATX = re.compile(r"^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$")


def github_id(text: str) -> str:
    """Hugo's goldmark 'github' auto-ID rules (markup/goldmark/autoid.go):
    trim; space or '-' -> '-'; letters/digits/'_' kept and lowercased; everything else dropped."""
    out = []
    for ch in text.strip():
        if ch == " " or ch == "-":
            out.append("-")
        elif ch == "_" or unicodedata.category(ch)[0] in ("L", "N"):
            out.append(ch.lower())
    return "".join(out) or "heading"


LINK = re.compile(r"!?\[([^\]]*)\]\([^)]*\)")
AUTOLINK = re.compile(r"<(https?://[^>]+)>")
BOLD = re.compile(r"\*\*(.+?)\*\*")
LIST = re.compile(r"^\s*(?:[-*+]|\d+\.)\s+")
QUOTE = re.compile(r"^\s*>\s?")


def prose(line: str) -> str:
    """What a reader sees: link text without its URL, no emphasis markers, list or quote markers."""
    line = QUOTE.sub("", line)
    line = LIST.sub("", line)
    line = LINK.sub(r"\1", line)
    line = AUTOLINK.sub(r"\1", line)
    line = BOLD.sub(r"\1", line)
    return line.strip()


# kinds: 0 prose, 1 heading, 2 code
def build(include_code: bool):
    idx = []
    for f in sorted(POSTS.glob("*.md")):
        if f.name == "_index.md":
            continue
        lines = f.read_text().split("\n")
        assert lines[0].strip() in ("+++", "---"), f
        delim = lines[0].strip()
        end = next(i for i in range(1, len(lines)) if lines[i].strip() == delim)
        fm = "\n".join(lines[1:end])
        title = re.search(r'^title\s*=\s*"(.*)"', fm, re.M).group(1)
        date = re.search(r"^date\s*=\s*(\S+)", fm, re.M).group(1)
        tags = re.findall(r'"([^"]+)"', re.search(r"^tags\s*=\s*\[(.*)\]", fm, re.M).group(1))
        seen = {}
        anchor, fence = "", None
        rows = []
        for i in range(end + 1, len(lines)):
            line, n = lines[i], i + 1
            m = FENCE.match(line)
            if fence is None and m:
                fence = m.group(1)[0] * len(m.group(1))
                continue
            if fence is not None:
                if m and m.group(1)[0] == fence[0] and len(m.group(1)) >= len(fence) and line.strip() == m.group(1):
                    fence = None
                    continue
                if include_code and line.strip():
                    rows.append([n, line.rstrip(), anchor, 2])
                continue
            if not line.strip():
                continue
            h = ATX.match(line)
            if h:
                base = github_id(h.group(2) or "")
                k = seen.get(base, 0)
                seen[base] = k + 1
                anchor = base if k == 0 else f"{base}-{k}"
                rows.append([n, (h.group(2) or "").strip(), anchor, 1])
                continue
            text = prose(line)
            # alert markers like > [!NOTE] carry no words
            if text and not re.fullmatch(r"\[!\w+\]", text):
                rows.append([n, text, anchor, 0])
        idx.append({"s": f.stem, "t": title, "d": date, "g": tags, "l": rows})
    idx.sort(key=lambda p: p["d"], reverse=True)
    return idx


def sizes(obj):
    raw = json.dumps(obj, ensure_ascii=False, separators=(",", ":")).encode()
    return raw, len(raw), len(gzip.compress(raw, 9))


full = build(True)
prose = build(False)
raw, r1, g1 = sizes(full)
_, r2, g2 = sizes(prose)
(OUT / "grep-index.json").write_bytes(raw)
nl = sum(len(p["l"]) for p in full)
npl = sum(len(p["l"]) for p in prose)
print(f"grep-index.json: {len(full)} posts, {nl} lines ({nl - npl} in code blocks)")
print(f"with code : raw {r1/1024:.1f} KiB, gzip -9 {g1/1024:.1f} KiB")
print(f"prose only: raw {r2/1024:.1f} KiB, gzip -9 {g2/1024:.1f} KiB")

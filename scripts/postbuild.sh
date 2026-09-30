#!/usr/bin/env bash
# Checks and finishes a Hugo build, in CI and locally: scripts/postbuild.sh [dir]
# (default public). Every page's footer shows the same two figures, for the
# site rather than the page: in place of __HOME__, what a browser fetches to
# load the homepage, as the 10 KB and 250KB Clubs measure a site (the page,
# gzipped, and the files its head fetches: the preloaded fonts and the SVG icon),
# and in place of __JS__, the site's script, which only the index has. It fails
# if any page other than the index has a script, or if any page is over
# MAX_GZIP_BYTES gzipped (default 14336, i.e. 14 KB). Sizes are
# `gzip -9 -c <file> | wc -c` for text, and bytes on disk for woff2 and PNG,
# which servers send as they are; shown as KB with one decimal (1 KB = 1024 B).
# It runs on macOS and Linux, and a second run only checks
set -euo pipefail

dir=${1:-public}
dir=${dir%/}
max=${MAX_GZIP_BYTES:-14336}
home_token=__HOME__ js_token=__JS__

case $max in
  '' | *[!0-9]*)
    echo "postbuild: MAX_GZIP_BYTES must be a number of bytes, not '$max'" >&2
    exit 2
    ;;
esac
# Read as decimal: bash arithmetic takes a leading zero as octal
max=$((10#$max))
if [ ! -d "$dir" ]; then
  echo "postbuild: $dir does not exist; build the site first" >&2
  exit 2
fi

orig=$(mktemp)
trap 'rm -f "$orig"' EXIT

# Gzipped size in bytes of a file, or of stdin
gz() { gzip -9 -c "$@" | wc -c | tr -d ' '; }

# Bytes a server sends for a file: woff2 and images are already compressed
sent() {
  case $1 in
    *.woff2 | *.png | *.jpg | *.webp) wc -c <"$1" | tr -d ' ' ;;
    *) gz "$1" ;;
  esac
}

# Bytes as KB with one decimal, rounded half up
kb() {
  local t=$((($1 * 10 + 512) / 1024))
  printf '%d.%d KB' $((t / 10)) $((t % 10))
}

# The contents of every <script> element in a file, without the tags. The
# opening tag ends at the first > outside quotes, so data-x="a>b" stays in it
script_text() {
  awk '{ s = s $0 "\n" } END {
    while ((i = index(tolower(s), "<script")) > 0) {
      s = substr(s, i + 7); n = length(s); q = ""
      for (j = 1; j <= n; j++) {
        c = substr(s, j, 1)
        if (q != "") { if (c == q) q = "" }
        else if (c == "\"" || c == "\047") q = c
        else if (c == ">") break
      }
      s = substr(s, j + 1)
      e = index(tolower(s), "</script"); if (e == 0) e = length(s) + 1
      printf "%s", substr(s, 1, e - 1); s = substr(s, e)
    }
  }' "$1"
}

# The first <script in a file, with up to 40 characters either side. Hugo's
# minifier writes &lt; in an attribute as <, so it can be a meta description
script_context() {
  awk '{
    i = index(tolower($0), "<script"); if (i == 0) next
    a = i > 40 ? i - 40 : 1
    print substr($0, a, i - a + 47); exit
  }' "$1"
}

pages=0 written=0 big=0 bigf='' nfail=0 fails=''
fail() {
  nfail=$((nfail + 1))
  fails="$fails$1"$'\n'
}

index=$dir/index.html
home='' js=''
if [ -f "$index" ] && grep -q "$home_token" "$index"; then
  # The files the index's head makes a browser fetch as it loads: preloads and
  # the SVG icon. A face or style the index doesn't use (Xenon, Bold) isn't
  # preloaded and doesn't load there, and search's /index.json waits for the box
  assets=0
  while IFS= read -r href; do
    a=$dir$href
    if [ ! -f "$a" ]; then
      fail "$index: its head fetches $href, which isn't in $dir"
      continue
    fi
    assets=$((assets + $(sent "$a")))
  done < <(grep -oE '<link [^>]*>' "$index" |
    grep -E 'rel="?preload|rel="?icon[" ][^>]*type="?image/svg' |
    sed -E 's/.*href="?([^" >]+).*/\1/')
  js=$(kb "$(script_text "$index" | gz)")
  # The homepage's size is part of what it measures: write it, measure again,
  # and repeat while the rounded value changes
  sed "s/$js_token/$js/g" "$index" >"$orig"
  home=$(kb $(($(gz "$orig") + assets)))
  for _ in 1 2 3 4 5; do
    h=$(kb $(($(sed "s/$home_token/$home/g" "$orig" | gz) + assets)))
    if [ "$h" = "$home" ]; then break; fi
    home=$h
  done
fi

while IFS= read -r f; do
  pages=$((pages + 1))
  if grep -qi '<script' "$f" && [ "$f" != "$index" ]; then
    fail "$f: <script> outside the index, at: $(script_context "$f")"
  fi

  if grep -q "$home_token" "$f"; then
    if [ -z "$home" ]; then
      fail "$f: its footer needs the homepage's size, but $index has no $home_token"
    else
      written=$((written + 1))
      sed "s/$home_token/$home/g; s/$js_token/$js/g" "$f" >"$orig"
      cat "$orig" >"$f"
    fi
  fi

  n=$(gz "$f")
  if [ "$n" -gt "$big" ]; then big=$n bigf=$f; fi
  if [ "$n" -gt "$max" ]; then fail "$f: $n B gzipped, over the $max B limit"; fi
done < <(find "$dir" -type f -name '*.html' | sort)

if [ "$pages" -eq 0 ]; then fail "$dir: no HTML pages"; fi

if [ "$written" -gt 0 ]; then
  echo "postbuild: checked $pages pages in $dir, and wrote the homepage's $home and the site's $js of script into $written footers"
else
  echo "postbuild: checked $pages pages in $dir; no footer to write"
fi
if [ -n "$bigf" ]; then
  echo "postbuild: largest is $bigf at $(kb "$big") ($big B gzipped), limit $(kb "$max") ($max B)"
fi
if [ "$nfail" -gt 0 ]; then
  s=s
  if [ "$nfail" -eq 1 ]; then s=''; fi
  printf 'postbuild: %d failure%s\n%s' "$nfail" "$s" "$fails" >&2
  exit 1
fi

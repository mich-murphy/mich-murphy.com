#!/usr/bin/env bash
# Checks and finishes a Hugo build, in CI and locally: scripts/postbuild.sh [dir]
# (default public). It writes each page's gzipped size in place of the footer's
# __WEIGHT__, and on any page with a script the gzipped size of that script in
# place of the footer's "0 B js". It fails if any page other than the index has
# a script, or if any page is over MAX_GZIP_BYTES gzipped (default 14336, i.e.
# 14 KB). Sizes are `gzip -9 -c <file> | wc -c`, shown as KB with one decimal
# (1 KB = 1024 B). It runs on macOS and Linux, and a second run only checks
set -euo pipefail

dir=${1:-public}
dir=${dir%/}
max=${MAX_GZIP_BYTES:-14336}
token=__WEIGHT__

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

while IFS= read -r f; do
  pages=$((pages + 1))
  script=''
  if grep -qi '<script' "$f"; then
    script=1
    if [ "$f" != "$dir/index.html" ]; then
      fail "$f: <script> outside the index, at: $(script_context "$f")"
    fi
  fi

  if grep -q "$token" "$f"; then
    written=$((written + 1))
    if [ -n "$script" ]; then
      # Anchored on the weight token, so only the footer's "0 B js" matches
      sed "s/$token · 0 B js · /$token · $(kb "$(script_text "$f" | gz)") js · /" "$f" >"$orig"
      cat "$orig" >"$f"
    fi
    # The weight is part of what it measures: write it, measure again, and
    # rewrite once if the rounded value changed
    cp "$f" "$orig"
    v=$(kb "$(gz "$f")")
    sed "s/$token/$v/g" "$orig" >"$f"
    w=$(kb "$(gz "$f")")
    if [ "$w" != "$v" ]; then sed "s/$token/$w/g" "$orig" >"$f"; fi
  fi

  n=$(gz "$f")
  if [ "$n" -gt "$big" ]; then big=$n bigf=$f; fi
  if [ "$n" -gt "$max" ]; then fail "$f: $n B gzipped, over the $max B limit"; fi
done < <(find "$dir" -type f -name '*.html' | sort)

if [ "$pages" -eq 0 ]; then fail "$dir: no HTML pages"; fi

echo "postbuild: checked $pages pages in $dir, wrote $written weights"
if [ -n "$bigf" ]; then
  echo "postbuild: largest is $bigf at $(kb "$big") ($big B gzipped), limit $(kb "$max") ($max B)"
fi
if [ "$nfail" -gt 0 ]; then
  s=s
  if [ "$nfail" -eq 1 ]; then s=''; fi
  printf 'postbuild: %d failure%s\n%s' "$nfail" "$s" "$fails" >&2
  exit 1
fi

#!/usr/bin/env bash
# Draws the social card's bases, assets/images/card-base-1.png, -2.png and
# -3.png: scripts/card-base.sh
# Each fills scripts/card-base.html with Argon Regular (static/fonts), the
# header's mark (layouts/_partials/mark.html) and its number of title lines,
# which sizes the box, and screenshots it with headless Chrome at exactly
# 1200x630. Rerun it after changing any of those, and commit the PNGs: the
# build draws each post's title and date on the one whose box fits the title
# (layouts/_partials/social-card.html). It runs on macOS and Linux, with the
# browser CHROME names, or else the first of Google Chrome and Chromium it finds
set -euo pipefail
cd "$(dirname "$0")/.."

chrome=${CHROME:-}
if [ -z "$chrome" ]; then
  for candidate in google-chrome google-chrome-stable chromium chromium-browser \
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"; do
    if command -v "$candidate" >/dev/null; then
      chrome=$candidate
      break
    fi
  done
fi
if [ -z "$chrome" ]; then
  echo "card-base: found no Google Chrome or Chromium; set CHROME to the browser's path" >&2
  exit 1
fi
tmp=$(mktemp -d)
pid=
trap 'if [ -n "$pid" ]; then kill "$pid" 2>/dev/null || true; wait "$pid" 2>/dev/null || true; fi; rm -rf "$tmp"' EXIT

# The font goes in as a data URI, since Chrome won't load a font into a file://
# page from another file. The mark is the partial's <svg>, without its comment
sed -n '/^<svg/,/^<\/svg>/p' layouts/_partials/mark.html >"$tmp/mark.svg"
font=$(base64 <static/fonts/MMAr-Regular.woff2 | tr -d '\n')

for lines in 1 2 3; do
  out=assets/images/card-base-$lines.png
  awk -v font="data:font/woff2;base64,$font" -v mark="$tmp/mark.svg" -v lines="$lines" '
    $0 == "@MARK@" { while ((getline l <mark) > 0) print l; next }
    { sub(/url\(@FONT@\)/, "url(" font ")"); sub(/@LINES@/, lines); print }
  ' scripts/card-base.html >"$tmp/card-base.html"

  # Chrome can keep running after it writes the screenshot, so wait for its
  # "written to file" line (for up to 30 seconds) and then stop it. Each run
  # gets a new profile
  "$chrome" --headless --disable-gpu --hide-scrollbars --no-first-run --no-default-browser-check \
    --use-mock-keychain --user-data-dir="$tmp/profile-$lines" --force-device-scale-factor=1 \
    --window-size=1200,630 --screenshot="$tmp/card.png" "file://$tmp/card-base.html" 2>"$tmp/chrome.log" &
  pid=$!
  for _ in $(seq 300); do
    if grep -q 'written to file' "$tmp/chrome.log" || ! kill -0 "$pid" 2>/dev/null; then break; fi
    sleep 0.1
  done
  kill "$pid" 2>/dev/null || true
  wait "$pid" 2>/dev/null || true
  pid=
  if ! grep -q 'written to file' "$tmp/chrome.log"; then
    echo "card-base: Chrome wrote no screenshot for $out:" >&2
    cat "$tmp/chrome.log" >&2
    exit 1
  fi

  size=$(file "$tmp/card.png")
  case $size in
    *'1200 x 630'*) ;;
    *)
      echo "card-base: expected a 1200x630 PNG for $out, got: $size" >&2
      exit 1
      ;;
  esac
  mv "$tmp/card.png" "$out"
  echo "card-base: wrote $out"
done

#!/usr/bin/env bash
# Draws the social card's base, assets/images/card-base.png: scripts/card-base.sh
# It fills scripts/card-base.html with 0xProto Regular (static/fonts) and the
# header's mark (layouts/_partials/mark.html), and screenshots it with headless
# Chrome at exactly 1200x630. Rerun it after changing any of those, and commit
# the PNG: the build draws each post's title and date on it
# (layouts/_partials/social-card.html). CHROME names the browser if it isn't
# Google Chrome in /Applications
set -euo pipefail
cd "$(dirname "$0")/.."

chrome=${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}
out=assets/images/card-base.png
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

# The font goes in as a data URI, since Chrome won't load a font into a file://
# page from another file. The mark is the partial's <svg>, without its comment
sed -n '/^<svg/,/^<\/svg>/p' layouts/_partials/mark.html >"$tmp/mark.svg"
font=$(base64 <static/fonts/0xProto-Regular.woff2 | tr -d '\n')
awk -v font="data:font/woff2;base64,$font" -v mark="$tmp/mark.svg" '
  $0 == "@MARK@" { while ((getline l <mark) > 0) print l; next }
  { sub(/url\(@FONT@\)/, "url(" font ")"); print }
' scripts/card-base.html >"$tmp/card-base.html"

# Chrome can keep running after it writes the screenshot, so wait for its
# "written to file" line (for up to 30 seconds) and then stop it
"$chrome" --headless --disable-gpu --hide-scrollbars --no-first-run --no-default-browser-check \
  --use-mock-keychain --user-data-dir="$tmp/profile" --force-device-scale-factor=1 \
  --window-size=1200,630 --screenshot="$tmp/card.png" "file://$tmp/card-base.html" 2>"$tmp/chrome.log" &
pid=$!
trap 'kill "$pid" 2>/dev/null || true; wait "$pid" 2>/dev/null || true; rm -rf "$tmp"' EXIT
for _ in $(seq 300); do
  if grep -q 'written to file' "$tmp/chrome.log" || ! kill -0 "$pid" 2>/dev/null; then break; fi
  sleep 0.1
done
if ! grep -q 'written to file' "$tmp/chrome.log"; then
  echo "card-base: Chrome wrote no screenshot:" >&2
  cat "$tmp/chrome.log" >&2
  exit 1
fi

size=$(file "$tmp/card.png")
case $size in
  *'1200 x 630'*) ;;
  *)
    echo "card-base: expected a 1200x630 PNG, got: $size" >&2
    exit 1
    ;;
esac
mv "$tmp/card.png" "$out"
echo "card-base: wrote $out"

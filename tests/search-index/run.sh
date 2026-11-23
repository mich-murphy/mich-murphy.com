#!/usr/bin/env bash
# Builds the site's layouts against the fixture content beside this script and
# diffs the search.json it writes with expected.json: tests/search-index/run.sh
# in the devShell. --update rewrites expected.json from the build
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

cd "$here/../.."
# not --quiet, which would hide why a build failed
HUGO_ENABLEGITINFO=false hugo build --logLevel warn --panicOnWarning \
  --contentDir "$here/content" --destination "$tmp/public" >/dev/null
python3 -m json.tool "$tmp/public/search.json" >"$tmp/search.json"
if [ "${1:-}" = --update ]; then
  cp "$tmp/search.json" "$here/expected.json"
fi
diff -u "$here/expected.json" "$tmp/search.json"
echo "search-index: search.json matches expected.json"

#!/usr/bin/env bash
# Runs the template tests: tests/templates/run.sh. It builds the site in this folder, whose home page checks the real
# partials' results and fails the build on a mismatch
set -euo pipefail
dir=$(cd "$(dirname "$0")" && pwd)
out=$(mktemp -d)
trap 'rm -rf "$out"' EXIT
# not --quiet, which would hide the failures
hugo build --logLevel warn --source "$dir" --destination "$out" >/dev/null
cat "$out/index.html"
echo

#!/usr/bin/env bash
# Builds the site into public, in CI and locally, so both use the same flags:
# scripts/build.sh [hugo flags], e.g. --destination <dir>. --panicOnWarning fails
# the build on any warning, such as a code block in a language with no label
# (render-codeblock.html). It first checks that hugo is exactly the version
# hugo.toml pins (scripts/hugo-version.sh): Hugo itself only rejects an older
# one, so a flake or CI install that moved ahead would otherwise build unnoticed.
# Run scripts/postbuild.py afterwards for the footer's figures and the checks
set -euo pipefail

want=$("$(dirname "$0")/hugo-version.sh")
if ! command -v hugo >/dev/null; then
  echo "build: hugo isn't on PATH; run this in the devShell: nix develop -c scripts/build.sh" >&2
  exit 1
fi
# hugo version prints e.g. "hugo v0.166.0+extended darwin/arm64 ..." or
# "hugo v0.166.0-<commit> linux/amd64 ...": keep the number after the v
have=$(hugo version)
have=${have#hugo v}
have=${have%% *}
have=${have%%[-+]*}
if [ "$have" != "$want" ]; then
  echo "build: hugo.toml pins Hugo $want, but $(command -v hugo) is $have." >&2
  echo "build: install Hugo $want, or update the pin as the README says" >&2
  exit 1
fi

exec hugo build --gc --minify --panicOnWarning "$@"

#!/usr/bin/env bash
# Builds the site into public, in CI and locally, so both use the same flags:
# scripts/build.sh [hugo flags], e.g. --destination <dir>. --panicOnWarning fails
# the build on any warning, such as a code block in a language with no label
# (render-codeblock.html) or a Hugo older than module.hugoVersion (hugo.toml).
# Run scripts/postbuild.py afterwards for the footer's figures and the checks
set -euo pipefail

exec hugo build --gc --minify --panicOnWarning "$@"

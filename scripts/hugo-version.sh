#!/usr/bin/env bash
# Prints the Hugo version the site is built with: scripts/hugo-version.sh
# It's min in hugo.toml's [module.hugoVersion] table, the one place the version
# is pinned. scripts/build.sh checks hugo against it, and CI installs it
set -euo pipefail

config=$(dirname "$0")/../hugo.toml

# The first quoted value of a min key inside [module.hugoVersion]: each table
# header says whether the lines after it are in that table
version=$(awk '
  /^[[:space:]]*\[/ { in_table = /^[[:space:]]*\[module\.hugoVersion\][[:space:]]*(#.*)?$/; next }
  in_table && /^[[:space:]]*min[[:space:]]*=/ {
    if (match($0, /"[^"]*"/)) print substr($0, RSTART + 1, RLENGTH - 2)
    exit
  }
' "$config")

if [[ ! $version =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "hugo-version: no version like \"0.166.0\" for min under [module.hugoVersion] in $config" >&2
  exit 1
fi
echo "$version"

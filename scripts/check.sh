#!/usr/bin/env bash
# Runs every check on the repo's code and the built site: scripts/check.sh
# Run it before pushing, in the devShell, which has the tools:
# `nix develop -c scripts/check.sh`. CI's lint job runs it in the smaller ci
# shell. Every check runs even when an earlier one fails, and the script ends
# by naming the ones that failed, with a non-zero exit if any did
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

tmp=$(mktemp -d) || exit 1
trap 'rm -rf "$tmp"' EXIT

checks=0 failed=()

# check <name> <command...>: runs the command under a header, and notes a failure
check() {
  local name=$1
  shift
  checks=$((checks + 1))
  printf '\n==> %s\n' "$name"
  if "$@"; then
    echo "ok"
  else
    failed+=("$name")
  fi
}

# Builds the site as CI does, finishes it with postbuild.py, and checks every
# link between its pages, #fragments included. --offline skips links to other
# sites, so it needs no network. #_ is left out on purpose: it matches no id,
# so following it closes the Contents box
links() {
  local site=$tmp/public
  scripts/build.sh --quiet --destination "$site" &&
    scripts/postbuild.py "$site" &&
    lychee --offline --no-progress --include-fragments --index-files index.html --root-dir "$site" \
      --exclude '#_$' "$site/**/*.html"
}

check "shellcheck: shell scripts" shellcheck scripts/*.sh
check "shfmt: shell formatting" shfmt -d scripts/*.sh
check "ruff check: Python lint" ruff check scripts
check "ruff format: Python formatting" ruff format --check scripts
check "biome: CSS and JavaScript" biome ci
check "actionlint: workflows" actionlint
# zizmor's pedantic persona adds to its security audits the habits that keep a
# workflow easy to review, like naming every job and saying why it needs each
# permission. The flake pins zizmor, so a new audit only arrives with a nixpkgs
# update. --offline keeps it to the files here, with no GitHub API or token
check "zizmor: workflow security" zizmor --offline --no-progress --persona pedantic .github
check "lychee: the built site's links" links

echo
if [ ${#failed[@]} -gt 0 ]; then
  echo "check: ${#failed[@]} of $checks failed:" >&2
  printf '  %s\n' "${failed[@]}" >&2
  exit 1
fi
echo "check: all $checks passed"

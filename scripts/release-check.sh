#!/usr/bin/env bash
# Release gate — run before every `git tag`. Exit code != 0 = do not tag.
#
#   npm run release:check                 # gate only
#   npm run release:check -- v1.9.3       # + version checks (CHANGELOG entry, tag free)
#
# Steps: build → dist/ committed → node tests → browser gate (Playwright,
# Chromium headless, sandbox/gate-*.html on 127.0.0.1, dist/ files only).
# scripts/release.sh runs this first and stops on red.
set -euo pipefail

cd "$(dirname "$0")/.."
VERSION="${1:-}"
red()   { printf '\033[31m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
step()  { printf '\n\033[1m── %s\033[0m\n' "$*"; }
fail()  { red "RELEASE GATE: RED — $*"; exit 1; }

START=$(date +%s)

if [ -n "$VERSION" ]; then
  step "version $VERSION"
  [[ "$VERSION" =~ ^v[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.]+)?$ ]] || fail "\"$VERSION\" is not vMAJOR.MINOR.PATCH[-pre]"
  if git rev-parse -q --verify "refs/tags/$VERSION" >/dev/null \
     || git ls-remote --exit-code --tags origin "refs/tags/$VERSION" >/dev/null 2>&1; then
    fail "tag $VERSION already exists (locally or on origin) — take the next number"
  fi
  # The changelog entry goes in before the tag, not after (CLAUDE.md, Wydanie).
  # "## v1.9.3 — …" — exact number, so 1.9.0 does not match a 1.9.0-ma.33 heading.
  ESCAPED=$(printf '%s' "${VERSION#v}" | sed 's/[.]/\\./g')
  grep -qE "^#+ v?${ESCAPED}( |$)" CHANGELOG.md || fail "no CHANGELOG.md heading for $VERSION"
fi

step "build"
npm run --silent build >/dev/null || fail "build failed"
# The tag points at a commit; jsDelivr serves dist/ from that commit. A dist/
# that differs from the sources' build would ship something nobody tested.
if ! git diff --quiet -- dist; then
  git --no-pager diff --stat -- dist
  fail "dist/ differs from the committed build — commit the build first"
fi
if [ -n "$(git ls-files --others --exclude-standard -- dist)" ]; then
  git ls-files --others --exclude-standard -- dist
  fail "untracked files in dist/ — commit them first"
fi

step "node tests"
npm test --silent || fail "npm test"

step "browser gate (Playwright)"
# This machine is short on RAM: cap the browser where systemd is available.
if command -v systemd-run >/dev/null 2>&1 && systemd-run --user --scope -q -p MemoryMax=4G true >/dev/null 2>&1; then
  systemd-run --user --scope -q -p MemoryMax=4G npx playwright test || fail "browser gate (see tests/browser/.results/)"
else
  npx playwright test || fail "browser gate (see tests/browser/.results/)"
fi

green "RELEASE GATE: GREEN in $(( $(date +%s) - START ))s${VERSION:+ — $VERSION may be tagged}"

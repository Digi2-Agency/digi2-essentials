#!/usr/bin/env bash
# Release gate — run before every `git tag`. Exit code != 0 = do not tag.
#
#   npm run release:check                 # gate only
#   npm run release:check -- v1.9.3       # + version checks (CHANGELOG entry, tag free, branch)
#
# Steps: build → dist/ committed → node tests → browser gate (Playwright,
# Chromium headless, sandbox/gate-*.html on 127.0.0.1, dist/ files only).
#
# On green with a clean tree it writes <git-common-dir>/release-gate/<HEAD sha>.
# The pre-push hook (.githooks/pre-push) refuses to push a v* tag whose commit
# has no such marker, so a hand-made `git tag` / `npm version` cannot skip
# this. scripts/release.sh runs it first and stops on red.
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
  git rev-parse -q --verify "refs/tags/$VERSION" >/dev/null && fail "tag $VERSION already exists locally — take the next number"
  # ls-remote --exit-code: 0 = found, 2 = not found, anything else = could not ask.
  set +e; git ls-remote --exit-code --tags origin "refs/tags/$VERSION" >/dev/null 2>&1; RC=$?; set -e
  [ "$RC" -eq 0 ] && fail "tag $VERSION already exists on origin — take the next number"
  [ "$RC" -eq 2 ] || fail "could not check origin for tag $VERSION (git ls-remote exit $RC)"
  # The changelog entry goes in before the tag, not after (CLAUDE.md, Wydanie).
  # "## v1.9.3 — …" — exact number, so 1.9.0 does not match a 1.9.0-ma.33 heading.
  ESCAPED=$(printf '%s' "${VERSION#v}" | sed 's/[.]/\\./g')
  grep -qE "^#+ v?${ESCAPED}( |$)" CHANGELOG.md || fail "no CHANGELOG.md heading for $VERSION"
  # A stable tag becomes @latest for every client site: it must be a reviewed
  # commit — on origin/main, or the tip of origin/release/<version> (a patch
  # cut from the previous stable tag, like v1.8.2).
  if [[ "$VERSION" != *-* ]]; then
    git fetch -q origin || fail "git fetch origin failed"
    HEAD_SHA=$(git rev-parse HEAD)
    if ! git merge-base --is-ancestor "$HEAD_SHA" origin/main 2>/dev/null \
       && [ "$(git rev-parse -q --verify "origin/release/$VERSION" || true)" != "$HEAD_SHA" ]; then
      fail "HEAD is neither on origin/main nor the tip of origin/release/$VERSION — push and get it reviewed first"
    fi
  fi
fi

step "build"
npm run --silent build >/dev/null || fail "build failed"
# The tag points at a commit; jsDelivr serves dist/ from that commit. A dist/
# that differs from the sources' build would ship something nobody tested.
if ! git diff --quiet HEAD -- dist; then
  git --no-pager diff --stat HEAD -- dist
  fail "dist/ differs from the committed build — commit the build first"
fi
if [ -n "$(git ls-files --others --exclude-standard -- dist)" ]; then
  git ls-files --others --exclude-standard -- dist
  fail "untracked files in dist/ — commit them first"
fi

step "node tests"
npm test --silent || fail "npm test"

step "browser gate (Playwright)"
# --update-snapshots=none: a missing baseline is a failure, never written on
# the fly (otherwise the next run is green against a picture nobody looked at).
PW=(npx playwright test --update-snapshots=none)
# This machine is short on RAM: cap the browser where systemd is available.
if command -v systemd-run >/dev/null 2>&1 && systemd-run --user --scope -q -p MemoryMax=4G true >/dev/null 2>&1; then
  systemd-run --user --scope -q -p MemoryMax=4G "${PW[@]}" || fail "browser gate (see tests/browser/.results/)"
else
  red "warning: systemd-run unavailable — Chromium runs without the 4G memory cap"
  "${PW[@]}" || fail "browser gate (see tests/browser/.results/)"
fi
if [ -n "$(git status --porcelain -- tests/browser/__screenshots__)" ]; then
  git status --porcelain -- tests/browser/__screenshots__
  fail "screenshot baselines changed or appeared during the run — review and commit them first"
fi

MSG="RELEASE GATE: GREEN in $(( $(date +%s) - START ))s"
if [ -z "$(git status --porcelain)" ]; then
  MARKS="$(git rev-parse --git-common-dir)/release-gate"
  mkdir -p "$MARKS"
  SHA=$(git rev-parse HEAD)
  printf '%s green %s\n' "$(date -Is)" "${VERSION:-}" > "$MARKS/$SHA"
  green "$MSG — ${SHA:0:7} may be tagged${VERSION:+ as $VERSION}"
else
  green "$MSG"
  red "working tree not clean: no release marker written (the pre-push hook will refuse a tag here)"
  git status --porcelain
fi

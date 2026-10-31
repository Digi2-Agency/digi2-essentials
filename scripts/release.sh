#!/usr/bin/env bash
# Release: gate → tag → push tag → purge @latest. Stops before the tag when the
# gate is red, so a broken build never becomes @latest.
#
#   scripts/release.sh v1.9.3 "forms: …"
#
# Stable tags come from main, or from release/<version> (a patch cut from the
# previous stable tag). Prerelease tags (v1.9.0-ma.N) go through the same
# gate; @latest is not purged for them (CLAUDE.md, Wydanie — jsDelivr traps).
set -euo pipefail

cd "$(dirname "$0")/.."
VERSION="${1:?usage: scripts/release.sh vX.Y.Z \"message\"}"
MESSAGE="${2:?usage: scripts/release.sh vX.Y.Z \"message\"}"

BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$VERSION" != *-* ]] && [ "$BRANCH" != "main" ] && [ "$BRANCH" != "release/$VERSION" ]; then
  echo "stable tags are cut from main or release/$VERSION (now on $BRANCH)"; exit 1
fi
# Untracked files count too: a new screenshot baseline nobody committed must
# not ride along into a green gate.
if [ -n "$(git status --porcelain)" ]; then
  git status --porcelain
  echo "working tree not clean"; exit 1
fi
# The hook is what stops a hand-made tag; make sure this clone has it.
[ "$(git config core.hooksPath || true)" = ".githooks" ] || git config core.hooksPath .githooks

bash scripts/release-check.sh "$VERSION"

PREV=$(git describe --tags --abbrev=0 --match 'v[0-9]*' --exclude '*-*' 2>/dev/null || true)

git tag -a "$VERSION" -m "$MESSAGE"
git push origin "$VERSION"

if [[ "$VERSION" == *-* ]]; then
  echo "prerelease $VERSION pushed — @latest not purged."
  exit 0
fi

# Purge every dist file that changed since the previous stable tag.
FILES=$(git diff --name-only "${PREV:-HEAD~1}" "$VERSION" -- dist || true)
FAILED=0
for f in $FILES; do
  url="https://purge.jsdelivr.net/gh/Digi2-Agency/digi2-essentials@latest/$f"
  printf 'purge %s … ' "$f"
  body=$(curl -sS --max-time 30 -w '\n%{http_code}' "$url" || true)
  code=$(printf '%s' "$body" | tail -n1)
  if [ "$code" = "200" ] && printf '%s' "$body" | grep -q '"status": *"finished"'; then
    echo ok
  else
    echo "FAILED (HTTP ${code:-none})"; FAILED=1
  fi
done
if [ "$FAILED" -ne 0 ]; then
  echo "released $VERSION, but purge failed for some files — repeat the purge by hand (tag is already pushed)"
  exit 1
fi
echo "released $VERSION${PREV:+ (changes since $PREV)}"

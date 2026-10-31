#!/usr/bin/env bash
# Release: gate → tag → push tag → purge @latest. Stops before the tag when the
# gate is red, so a broken build never becomes @latest.
#
#   scripts/release.sh v1.9.3 "forms: …"
#
# Prerelease tags (v1.9.0-ma.N) go through the same gate; @latest is not
# purged for them (CLAUDE.md, Wydanie — jsDelivr traps).
set -euo pipefail

cd "$(dirname "$0")/.."
VERSION="${1:?usage: scripts/release.sh vX.Y.Z \"message\"}"
MESSAGE="${2:?usage: scripts/release.sh vX.Y.Z \"message\"}"

[ "$(git rev-parse --abbrev-ref HEAD)" = "main" ] || [[ "$VERSION" == *-* ]] \
  || { echo "stable tags are cut from main"; exit 1; }
git diff --quiet && git diff --cached --quiet || { echo "working tree not clean"; exit 1; }

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
for f in $FILES; do
  url="https://purge.jsdelivr.net/gh/Digi2-Agency/digi2-essentials@latest/$f"
  printf 'purge %s … ' "$f"
  curl -s -o /dev/null -w '%{http_code}\n' "$url" || echo "failed (purge by hand)"
done
echo "released $VERSION${PREV:+ (changes since $PREV)}"

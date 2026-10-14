#!/usr/bin/env bash
# FACT ROYALE - SYNC THE HOLDING PAGE
#
# While the site is dark, under-siege.html is served from THREE paths:
#
#   under-siege.html   the source. This is the one that gets edited.
#   index.html         a copy. What visitors to fact-royale.com actually see.
#   404.html           a copy. What every deep link, bookmark and stale share
#                      URL resolves to, because GitHub Pages serves 404.html
#                      for anything it cannot route.
#
# go-dark.sh made the two copies with cp. Nothing has kept them in step since.
#
# WHY THIS SCRIPT EXISTS
#
# Between September and October 2026 the Under Siege page got substantial
# work: staged wall collapse, debris physics, a rebuilt trebuchet release.
# All of it went into under-siege.html. None of it reached a single visitor,
# because the homepage and every deep link were still serving the September
# copy. The work was committed, pushed, and live at /under-siege - a URL
# nobody visits - while /  served the old version for six weeks.
#
# That is the project's recurring bug in its purest form: one rule, three
# owners. The copies cannot be eliminated (GitHub Pages has no server-side
# includes and no route rewriting), so the next best thing is to make the
# drift impossible to miss.
#
# USAGE
#   ./tools/sync-holding-page.sh           copy source over both targets
#   ./tools/sync-holding-page.sh --check   report drift, change nothing
#
# --check exits non-zero when they differ, so it can gate a commit.
set -euo pipefail
cd "$(dirname "$0")/.."

SRC=under-siege.html
[ -f "$SRC" ] || { echo "$SRC missing - aborting"; exit 1; }
grep -q 'id="gBeam"' "$SRC" || { echo "$SRC does not look like the holding page - aborting"; exit 1; }

# index.html is only a copy of the holding page while the site is dark. Once
# go-live.sh has run it is the real homepage, and overwriting it with the
# Under Siege page would take the site down.
if [ ! -d _app ]; then
  echo "_app/ not found, so the site is LIVE and index.html is the real homepage."
  echo "Refusing to overwrite it. Nothing to sync."
  exit 1
fi

drift=0
for t in index.html 404.html; do
  if [ ! -f "$t" ]; then
    echo "  MISSING  $t"
    drift=1
  elif ! cmp -s "$SRC" "$t"; then
    echo "  DRIFTED  $t  differs from $SRC"
    drift=1
  else
    echo "  ok       $t"
  fi
done

if [ "${1:-}" = "--check" ]; then
  [ "$drift" = "0" ] && echo "In sync." || echo "OUT OF SYNC. Run without --check to fix."
  exit "$drift"
fi

if [ "$drift" = "0" ]; then
  echo "Already in sync; nothing to do."
  exit 0
fi

cp "$SRC" index.html
cp "$SRC" 404.html
echo
echo "Synced. index.html and 404.html now match $SRC."
echo "Commit them, or the fix exists only on this machine."

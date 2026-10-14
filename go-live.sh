#!/usr/bin/env bash
# FACT ROYALE - COME BACK UP
# Exact inverse of go-dark.sh.
set -euo pipefail
cd "$(dirname "$0")"

[ -d _app ] || { echo "_app/ not found - not currently dark"; exit 1; }

# ── Pre-flight: this script is no longer self-sufficient ──────────────
#
# When go-dark.sh ran, coming back up meant restoring seven files and the
# static question files took over again. That is no longer true, and the
# reason is worth stating plainly before anyone runs this.
#
#   1. questions/ was renamed questions-src/ and is NOT served. go-live.sh
#      does not rename it back, on purpose: serving the files again would
#      reopen the hole where anyone can read next month's answers.
#   2. The answers were removed from the public Firestore document, so the
#      browser cannot grade a quiz at all. Only the submitQuiz and
#      commitAnswer Cloud Functions can.
#
# So restoring the files now produces a site with no quiz unless the
# migration has been run and the functions are deployed. The checks below
# refuse rather than let that ship.
echo "== pre-flight: cutover state =="

if ! grep -q 'FR_USE_FIRESTORE = true' _app/quiz.js; then
  cat <<'EOF'
  REFUSING: _app/quiz.js still has FR_USE_FIRESTORE = false.

  questions/ is not served any more, so the static fallback 404s and the
  site would come up with no quiz on any day. Finish the cutover first:

      node tools/migrate-to-firestore.js
      firebase deploy --only functions,firestore:rules
      # enable the Anonymous provider in the Firebase console
      # then set FR_USE_FIRESTORE = true in _app/quiz.js

  Override only if you know why:  ALLOW_NO_FIRESTORE=1 ./go-live.sh
EOF
  [ "${ALLOW_NO_FIRESTORE:-0}" = "1" ] || exit 1
  echo "  overridden by ALLOW_NO_FIRESTORE=1"
else
  echo "  FR_USE_FIRESTORE = true"
fi

if [ -d questions ]; then
  echo "  WARNING: questions/ exists and will be served. That is the pre-dark"
  echo "           leak: every future day readable by anyone. Remove it or"
  echo "           confirm on purpose."
else
  echo "  questions/ absent (static answers not served)"
fi

echo "  reminder: Anonymous sign-in must be enabled in the Firebase console,"
echo "            or no visitor without an account can be graded."
echo

# ── Dry run ──────────────────────────────────────────────────────────
# This script deletes the holding page before it can restore the real one,
# so a failure in the middle leaves the repo with no index.html at all.
# That happened on 2026-10-13: the guard above was added, someone ran the
# script to see whether the guard worked, the guard passed, and the script
# then carried on and did exactly what it is written to do.
#
# --dry-run prints the plan and changes nothing. Use it to inspect this
# script's behaviour instead of running it.
if [ "${1:-}" = "--dry-run" ]; then
  echo "== DRY RUN - nothing will change =="
  echo "  would delete   index.html  (the Under Siege holding page)"
  for f in _app/*; do echo "  would restore  $(basename "$f")"; done
  echo "  would delete   404.html"
  echo
  echo "Run without --dry-run to do it. The site goes public at the next push."
  exit 0
fi

echo "== restoring public entry points =="

# Everything EXCEPT index.html first. These cannot collide with anything at
# root, so if one fails the repo is still coherent and the holding page is
# still in place.
for f in _app/*; do
  b="$(basename "$f")"
  [ "$b" = "index.html" ] && continue
  git mv "$f" "$b" && echo "  $b restored"
done

# index.html last, and the delete is immediately followed by the move rather
# than separated from it by a loop that can fail. git mv refuses to overwrite,
# so the holding page has to go first - but now the window where no
# index.html exists is one command wide instead of seven.
if [ -f _app/index.html ]; then
  rm -f index.html
  git mv _app/index.html index.html && echo "  index.html restored"
fi

# If anything above failed, _app still has contents and rmdir will refuse,
# which is the signal that the restore is incomplete.
if ! rmdir _app 2>/dev/null; then
  echo
  echo "INCOMPLETE: _app/ still contains files:"
  ls _app
  echo "The repo is in a half-restored state. Fix before committing."
  echo "To put the holding page back:  cp under-siege.html index.html"
  exit 1
fi

rm -f 404.html
echo "  404.html removed"

echo
git status --short
cat <<'EOF'

------------------------------------------------------------------
NOT PUSHED YET.

    git commit -m "Back online"
    git push

Check before you push: index.html should be the real homepage again,
not the Under Siege page.
------------------------------------------------------------------
EOF

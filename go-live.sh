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

# Are the answers reachable over HTTP?
#
# This used to test `[ -d questions ]` and print "static answers not
# served" when it was absent. go-dark.sh renamed that directory to
# questions-src/ in September, so from then on the check passed by
# looking for something that no longer existed under that name — while
# questions-src/ sat in the web root serving `answer` and `explanation`
# for all 984 questions. It reported safety for six weeks.
#
# Check the actual property: is there a directory of day files in the web
# root, whatever it is called, and does _config.yml exclude it.
ANSWER_DIRS="$(find . -maxdepth 1 -type d -name 'questions*' -printf '%f ' 2>/dev/null)"
if [ -n "$ANSWER_DIRS" ]; then
  echo "  answer files on disk: $ANSWER_DIRS"
  MISSING=""
  for d in $ANSWER_DIRS; do
    grep -q "^\s*-\s*$d/\?\s*$" _config.yml 2>/dev/null || MISSING="$MISSING $d"
  done
  if [ -n "$MISSING" ]; then
    cat <<EOF

  REFUSING: these directories are in the web root and NOT excluded in
  _config.yml:$MISSING

  GitHub Pages serves every tracked file. A directory of day files
  contains the answer to every future quiz, which makes server-side
  grading decorative.

  Add them to the exclude list in _config.yml, or override knowingly:
      ALLOW_PUBLIC_ANSWERS=1 ./go-live.sh
EOF
    [ "${ALLOW_PUBLIC_ANSWERS:-0}" = "1" ] || exit 1
    echo "  overridden by ALLOW_PUBLIC_ANSWERS=1"
  else
    echo "  all excluded in _config.yml (verify live after pushing:"
    echo "    curl -s -o /dev/null -w '%{http_code}\\n' https://fact-royale.com/questions-src/index.json )"
  fi
else
  echo "  no answer directory in the web root"
fi

if [ ! -f _config.yml ]; then
  echo "  WARNING: no _config.yml. Everything tracked is published."
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
  if [ -f PENDING-REPUBLISH.json ]; then
    if grep -q '"executed": null' PENDING-REPUBLISH.json; then
      # Ask the tool for the date; do not compute it here. A quiz day rolls
      # over five hours after UTC midnight, so `date -u +%F` is the wrong
      # answer between 00:00 and 05:00 UTC — and the right one the rest of
      # the time, which is why it survived a dry run unnoticed.
      START="$(node tools/migrate-to-firestore.js --print-start-date 2>/dev/null || echo '(could not resolve)')"
      echo "  would re-date  the question catalogue, start date = $START:"
      node -e 'const p=require("./PENDING-REPUBLISH.json");console.log(`                 ${p.days} days (${p.questions} questions) from ${p.from}`)' 2>/dev/null || true
    else
      echo "  re-date already executed - would skip"
    fi
  else
    echo "  no PENDING-REPUBLISH.json - no re-date staged"
  fi
  echo "  would delete   index.html  (the Under Siege holding page)"
  for f in _app/*; do echo "  would restore  $(basename "$f")"; done
  echo "  would delete   404.html"
  echo
  echo "Run without --dry-run to do it. The site goes public at the next push."
  exit 0
fi

# ── The staged content re-date ───────────────────────────────────────
#
# The catalogue's source dates run June-September 2026. Published as-is,
# every quiz is in the past and there is no "today" to load: the site comes
# up and the homepage cannot find a quiz. So the days have to be re-dated to
# start on the day the site actually returns — which is today, and was not
# knowable when the decision to do it was made.
#
# That made it exactly the kind of step that gets missed. So it is armed in
# advance (--stage, which rehearses the whole thing including credentials)
# and fired from here rather than remembered.
#
# It runs FIRST, before a single file moves. If the credential has expired or
# the write fails, the repo is untouched and the holding page is still up. A
# launch that dies here is a launch that did not happen, which is the correct
# outcome; a launch that dies after the restore is a broken public site.
if [ -f PENDING-REPUBLISH.json ] && grep -q '"executed": null' PENDING-REPUBLISH.json; then
  echo "== staged content re-date =="
  echo "  publishing the catalogue from $(node tools/migrate-to-firestore.js --print-start-date 2>/dev/null || echo '?')"
  if ! node tools/migrate-to-firestore.js --run-staged; then
    cat <<'EOF'

ABORTED - the content re-date failed, so nothing was restored.

The holding page is still up and the repo is untouched. Most likely the
application-default credential expired:

    gcloud auth application-default login

Then run ./go-live.sh again. The re-date is idempotent and has not been
stamped as executed, so it picks up where it left off.
EOF
    exit 1
  fi
  echo
elif [ -f PENDING-REPUBLISH.json ]; then
  echo "== staged content re-date: already executed, skipping =="
  node -e 'const e=require("./PENDING-REPUBLISH.json").executed;console.log(`  published ${e.publishedFrom} through ${e.through} on ${e.at.slice(0,10)}`)' 2>/dev/null || true
  echo
else
  cat <<'EOF'
== staged content re-date: NONE ==
  No PENDING-REPUBLISH.json. If the catalogue has not been re-dated by hand,
  every quiz is still dated June-September and the site will come up with no
  quiz for today. Check, or stage one:

      node tools/migrate-to-firestore.js --stage --from 2026-06-13 --limit 82

EOF
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

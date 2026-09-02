#!/usr/bin/env bash
# FACT ROYALE - GO DARK
#
# Points every public route at under-siege.html and moves the app's public
# entry points out of the served tree. Admin tools stay live.
#
# Reversible: ./go-live.sh puts everything back.
set -euo pipefail
cd "$(dirname "$0")"

echo "== pre-flight =="
[ -f under-siege.html ] || { echo "under-siege.html missing - aborting"; exit 1; }
grep -q 'id="gBeam"' under-siege.html || { echo "under-siege.html looks wrong - aborting"; exit 1; }

if [ -d _app ]; then echo "_app/ already exists - already dark? aborting"; exit 1; fi
mkdir -p _app

# Public entry points only. Shared dependencies (auth.js, style.css,
# firebase-config.js, icons.js) STAY PUT, because admin.html, live.html and
# review.html all load them. Moving those would take the admin tools down too.
echo
echo "== moving public entry points to _app/ =="
for f in index.html quiz.js mastery.html mastery.js groups.html groups.js notifications.js; do
  if [ -f "$f" ]; then git mv "$f" "_app/$f" && echo "  $f -> _app/$f"; fi
done

echo
echo "== installing the holding page =="
cp under-siege.html index.html
# GitHub Pages serves 404.html for any route it cannot resolve, so every
# deep link, bookmark and stale share URL lands on Under Siege too.
cp under-siege.html 404.html
echo "  index.html  <- under-siege.html"
echo "  404.html    <- under-siege.html"

echo
echo "== staying live (admin only, auth-gated) =="
for f in admin.html live.html review.html; do
  [ -f "$f" ] && echo "  $f"
done

echo
echo "== questions =="
echo "  questions/      $( [ -d questions ] && ls questions | wc -l || echo 0 ) files served"
echo "  questions-src/  $( ls questions-src 2>/dev/null | wc -l ) files (not served)"

echo
echo "== staging =="
git add -A index.html 404.html _app questions questions-src 2>/dev/null || git add -A
git status --short

cat <<'EOF'

------------------------------------------------------------------
NOT PUSHED YET. Review the list above, then:

    git commit -m "Go dark: every public route to Under Siege"
    git push

Still to do by hand (needs the Firebase console, not this script):
    firestore.rules - lock `scores` reads to the admin email
    firebase deploy --only firestore:rules

To come back up:  ./go-live.sh
------------------------------------------------------------------
EOF

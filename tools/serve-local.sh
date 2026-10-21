#!/usr/bin/env bash
# FACT ROYALE - LOCAL TEST SERVER
#
# Assembles a runnable copy of the app in a scratch directory OUTSIDE the
# repo and serves it on localhost. Nothing in the repo is modified, no branch
# is created, and the live site stays dark.
#
# WHY THIS EXISTS
#
# go-dark.sh moved the app's seven public entry points into _app/ and left
# the shared dependencies (auth.js, firebase-config.js, icons.js, style.css)
# at the repo root. Those files reference each other with flat relative
# paths, which are correct at root and 404 from inside _app/. So the app in
# its current location cannot be loaded in a browser at all.
#
# The alternatives were both worse: rewriting the paths would break
# go-live.sh, and running go-live.sh to test would un-dark the public site.
# This flattens a throwaway copy instead.
#
# USAGE
#   ./tools/serve-local.sh          then open http://localhost:8787
#   ./tools/serve-local.sh 9000     a different port
#
# WHAT WILL AND WILL NOT WORK HERE
#
#   Works: Firestore reads, Cloud Function calls, email signup, anonymous
#          sign-in. localhost is an authorized Firebase domain by default.
#   Works against PRODUCTION data. Scores you post are real leaderboard rows
#          and attempts you commit are real. Use a throwaway account, and
#          remember a committed answer cannot be re-answered.
#   Fails: push notifications (needs a service worker at the real origin).
#   Fails: the static question fallback. questions/ is not served any more,
#          so if Firestore has no readable document for the date, the quiz
#          will not load. That is the intended behaviour, not a bug here.
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${1:-8787}"
OUT="${TMPDIR:-/tmp}/fact-royale-local"

[ -d _app ] || { echo "_app/ not found. The app is already at root; serve it directly."; exit 1; }

rm -rf "$OUT"
mkdir -p "$OUT"

echo "== assembling =="
# The app's entry points, flattened out of _app/.
cp _app/* "$OUT"/ && echo "  _app/* -> $(basename "$OUT")/"

# The shared dependencies go-dark.sh deliberately left at root.
for f in auth.js firebase-config.js categories.js icons.js style.css \
         tokens.css app.css manifest.json favicon.svg; do
  [ -f "$f" ] && cp "$f" "$OUT"/ && echo "  $f"
done
[ -d icons ] && cp -r icons "$OUT"/ && echo "  icons/"

# Not copied on purpose:
#   questions-src/  renaming it to questions/ here would let the static
#                   fallback fire, and then a Firestore failure would look
#                   like a success. The whole point of this test is that the
#                   server is the only thing that can grade a quiz.
#   admin/review/studio  they load from root and are still live; test those
#                   on the real site.

cat <<EOF

== serving ==
  http://localhost:$PORT

Test list for the grading cutover:
  1. Signed in, full quiz          score shown, leaderboard row appears
  2. Signed out, full quiz         graded, no row, signup nudge shows
  3. Signed out then sign up       row appears for today WITHOUT replaying
  4. Clear localStorage, replay    bounced to results, streak NOT bumped
  5. Offline mid-quiz              "could not reach the scorer", question
                                   given back, no score lost
  6. DevTools network tab          confirm no answer text is in the quizzes/
                                   response. If it is, the migration ran
                                   with an old version of the script.

THIS TERMINAL WILL NOW APPEAR TO HANG. That is the web server running, not
a stall: a server holds its terminal for as long as it is serving. Leave this
window open and use a DIFFERENT one for git and gcloud.

EDITS SYNC AUTOMATICALLY. A background loop re-copies changed files into
the scratch directory once a second, so you do not need to restart this
after every edit. You DO still need to bump the ?v= on a changed CSS or JS
file, or the browser will keep its cached copy regardless.

Press Ctrl-C here when you are finished testing.

The scratch copy is at:
  $OUT
EOF

# ── keep the scratch copy in step with the repo ───────────────────────
#
# The copy above is a snapshot. Without this, every edit made while the
# server is running is invisible until it is restarted, and a browser
# hard-reload does not help because the server itself is serving stale
# bytes. That cost several rounds of "why has my change not appeared".
#
# cp -u only copies files that are newer, so this is cheap.
REPO="$PWD"
sync_loop() {
  while true; do
    sleep 1
    cp -u "$REPO"/_app/* "$OUT"/ 2>/dev/null
    for f in auth.js firebase-config.js categories.js icons.js style.css \
             tokens.css app.css manifest.json favicon.svg; do
      [ -f "$REPO/$f" ] && cp -u "$REPO/$f" "$OUT"/ 2>/dev/null
    done
  done
}
sync_loop &
SYNC_PID=$!
trap 'kill $SYNC_PID 2>/dev/null' EXIT INT TERM

cd "$OUT"
python3 -m http.server "$PORT" 2>/dev/null || python -m http.server "$PORT"

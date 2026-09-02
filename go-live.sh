#!/usr/bin/env bash
# FACT ROYALE - COME BACK UP
# Exact inverse of go-dark.sh.
set -euo pipefail
cd "$(dirname "$0")"

[ -d _app ] || { echo "_app/ not found - not currently dark"; exit 1; }

# The holding copy of index.html must go first, or git mv refuses to
# overwrite it and the restore half-completes.
rm -f index.html

echo "== restoring public entry points =="
for f in _app/*; do
  b="$(basename "$f")"
  git mv "$f" "$b" && echo "  $b restored"
done
rmdir _app

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

#!/usr/bin/env bash
# Auto add, commit, and push full project to origin Dev
set -e
cd "$(dirname "$0")/.."
git add .
if git diff --staged --quiet; then
  echo "Nothing to commit. Working tree clean."
else
  git commit -m "Update: $(date '+%Y-%m-%d %H:%M')"
fi
git push origin Dev
echo "Done. Pushed to origin/Dev"

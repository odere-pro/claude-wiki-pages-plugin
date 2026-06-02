#!/bin/bash
# Gate 10 — markdown lints clean (mirrors the CI Tier 0 markdownlint step), so
# bare URLs / list-numbering drift in skills, agents, and docs are caught locally.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT" || exit 2
if ! command -v markdownlint-cli2 >/dev/null 2>&1; then
  echo "SKIP: markdownlint-cli2 not installed"
  exit 0
fi
# Match the CI globs; also skip the gitignored worktree/node_modules dirs that
# are not part of the checkout CI lints.
markdownlint-cli2 "**/*.md" "#node_modules" "#.claude"

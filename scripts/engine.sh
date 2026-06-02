#!/bin/bash
# Bridge from bash hooks/agents to the claude-wiki-pages Bun engine.
#
# Bun is the engine runtime, but it is NOT a hard dependency of the plugin: if
# Bun is missing we print a warning and exit 0 so hot-path hooks degrade
# gracefully instead of hard-failing. Bun runs TypeScript directly, so no build
# step is required for the plugin distribution; a prebuilt dist/cli.js is used
# when present (npm install).
#
# Usage: scripts/engine.sh <verify|fix|heal|...> [args...]
set -euo pipefail

ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"

if ! command -v bun >/dev/null 2>&1; then
  printf '[claude-wiki-pages] WARN: Bun not found — engine step skipped. Install from https://bun.sh\n' >&2
  exit 0
fi

if [ -f "$ROOT/dist/cli.js" ]; then
  exec bun "$ROOT/dist/cli.js" "$@"
fi
exec bun "$ROOT/src/cli/cli.ts" "$@"

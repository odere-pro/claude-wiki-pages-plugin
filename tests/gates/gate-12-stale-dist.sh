#!/bin/bash
# Gate 12 — stale dist/cli.js check.
#
# FAIL when dist/cli.js exists AND is older than the newest src/**/*.ts file.
# This catches a contributor forgetting to run `bun run build` after editing
# TypeScript source.
#
# SKIP cleanly when dist/cli.js does not exist (CI rebuilds it; no local
# artefact to compare against).
#
# PASS when dist/cli.js exists and is at least as new as every src/**/*.ts.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT" || exit 2

DIST="dist/cli.js"

if [ ! -f "$DIST" ]; then
  echo "SKIP: $DIST does not exist (run 'bun run build' to create it)"
  exit 0
fi

# Find any src/**/*.ts that is newer than dist/cli.js.
newer="$(find src -name "*.ts" -newer "$DIST" 2>/dev/null | head -1)"

if [ -n "$newer" ]; then
  echo "FAIL: $DIST is stale — '$newer' (and possibly others) is newer."
  echo "      Run 'bun run build' to rebuild dist/cli.js before committing."
  exit 1
fi

echo "OK: $DIST is up to date (no src/**/*.ts is newer)"

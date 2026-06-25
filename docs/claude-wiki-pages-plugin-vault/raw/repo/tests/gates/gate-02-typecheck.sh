#!/bin/bash
# Gate 02 — the engine type-checks clean (tsc --noEmit).
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT" || exit 2
if ! command -v bun >/dev/null 2>&1; then
  echo "SKIP: bun not installed"
  exit 0
fi
bun run typecheck

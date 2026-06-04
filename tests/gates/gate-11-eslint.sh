#!/bin/bash
# Gate 11 — the engine source passes eslint (typescript-eslint, .eslintrc.cjs).
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT" || exit 2
if ! command -v bun >/dev/null 2>&1; then
  echo "SKIP: bun not installed"
  exit 0
fi
bun run lint

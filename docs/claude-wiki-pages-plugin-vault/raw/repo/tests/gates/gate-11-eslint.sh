#!/bin/bash
# Gate 11 — the engine source passes eslint (typescript-eslint, eslint.config.mjs).
# H21: ESLint upgraded from v8 (EOL) to v9; config migrated from .eslintrc.cjs to
# eslint.config.mjs (ESLint 9 flat config). @typescript-eslint@8.18.2 is ESLint-9-compatible.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT" || exit 2
if ! command -v bun >/dev/null 2>&1; then
  echo "SKIP: bun not installed"
  exit 0
fi
bun run lint

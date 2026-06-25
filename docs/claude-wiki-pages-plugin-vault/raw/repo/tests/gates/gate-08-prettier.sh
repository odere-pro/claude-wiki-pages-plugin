#!/bin/bash
# Gate 08 — the engine source and JSON config artifacts are prettier-clean.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT" || exit 2
if ! command -v bun >/dev/null 2>&1; then
  echo "SKIP: bun not installed"
  exit 0
fi
bunx prettier --check "src/**/*.ts" "schemas/**/*.json" "templates/**/*.json"

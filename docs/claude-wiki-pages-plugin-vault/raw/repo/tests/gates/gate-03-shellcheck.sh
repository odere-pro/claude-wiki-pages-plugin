#!/bin/bash
# Gate 03 — all shell scripts pass shellcheck at warning severity.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT" || exit 2
if ! command -v shellcheck >/dev/null 2>&1; then
  echo "SKIP: shellcheck not installed"
  exit 0
fi
shellcheck --severity=warning --format=gcc scripts/*.sh tests/gates/*.sh

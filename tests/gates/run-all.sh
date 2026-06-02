#!/bin/bash
# Quality-gate runner (agentline-style). Runs every tests/gates/gate-NN-*.sh in
# order and reports a pass/fail summary. Exit 0 only when all gates pass.
#
# Usage: bash tests/gates/run-all.sh [--list]
set -uo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$DIR/../.." && pwd)"
cd "$ROOT" || exit 2

GREEN=$'\033[0;32m'
RED=$'\033[0;31m'
BOLD=$'\033[1m'
RESET=$'\033[0m'

gates=()
for g in "$DIR"/gate-*.sh; do
  [ -f "$g" ] && gates+=("$g")
done

if [ "${1:-}" = "--list" ]; then
  for g in "${gates[@]}"; do
    printf '%s\n' "$(basename "$g")"
  done
  exit 0
fi

pass=0
fail=0
failed=()
for g in "${gates[@]}"; do
  name="$(basename "$g" .sh)"
  printf '%s== %s ==%s\n' "$BOLD" "$name" "$RESET"
  if bash "$g"; then
    printf '%sPASS%s %s\n\n' "$GREEN" "$RESET" "$name"
    pass=$((pass + 1))
  else
    printf '%sFAIL%s %s\n\n' "$RED" "$RESET" "$name"
    fail=$((fail + 1))
    failed+=("$name")
  fi
done

printf '%s── Summary ──%s\n' "$BOLD" "$RESET"
printf 'Passed: %d   Failed: %d\n' "$pass" "$fail"
if [ "$fail" -gt 0 ]; then
  printf '%sFailing:%s %s\n' "$RED" "$RESET" "${failed[*]}"
  exit 1
fi
printf '%sAll gates passed.%s\n' "$GREEN" "$RESET"

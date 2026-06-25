#!/bin/bash
# Quality-gate runner (agentline-style). Runs every tests/gates/gate-NN-*.sh and
# reports a pass/fail summary. Exit 0 only when all gates pass.
#
# Gates run in PARALLEL when GNU parallel is available (each gate is an independent
# read-only check; the build step that produces dist/ runs before this script, so
# the gates only read shared state). Falls back to a serial loop without parallel.
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

# Portable logical-core count (nproc on Linux, sysctl on macOS, 4 as a floor).
_cpu_count() {
  command -v nproc >/dev/null 2>&1 && nproc 2>/dev/null && return 0
  sysctl -n hw.ncpu 2>/dev/null && return 0
  echo 4
}

# Run a single gate, printing a self-contained block (header + output + verdict).
run_one_gate() {
  local g="$1" name out rc
  name="$(basename "$g" .sh)"
  out="$(bash "$g" 2>&1)"
  rc=$?
  printf '%s== %s ==%s\n%s\n' "${BOLD}" "${name}" "${RESET}" "${out}"
  if [ "${rc}" -eq 0 ]; then
    printf '%sPASS%s %s\n\n' "${GREEN}" "${RESET}" "${name}"
  else
    printf '%sFAIL%s %s\n\n' "${RED}" "${RESET}" "${name}"
  fi
  return "${rc}"
}

# Single-gate mode: the parallel fan-out re-invokes this script once per gate.
# Re-invoking (instead of exporting a shell function) keeps the worker a clean
# subprocess and sidesteps GNU parallel's function-export caveats.
if [ "${1:-}" = "--run-one" ]; then
  run_one_gate "$2"
  exit $?
fi

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

if command -v parallel >/dev/null 2>&1; then
  joblog="$(mktemp)"
  # --group keeps each gate's output un-interleaved; --keep-order prints them in
  # filename order; --halt never runs every gate regardless of failures; the
  # joblog records each gate's exit status for an authoritative tally.
  printf '%s\n' "${gates[@]}" |
    parallel --jobs "$(_cpu_count)" --keep-order --group --halt never \
      --joblog "${joblog}" bash "$DIR/run-all.sh" --run-one {}
  while IFS=$'\t' read -r _seq _host _start _run _send _recv exitval _sig command; do
    [ "${exitval}" = "Exitval" ] && continue # header row
    name="$(basename "${command##* }" .sh)"
    if [ "${exitval}" = "0" ]; then
      pass=$((pass + 1))
    else
      fail=$((fail + 1))
      failed+=("${name}")
    fi
  done <"${joblog}"
  rm -f "${joblog}"
else
  for g in "${gates[@]}"; do
    if run_one_gate "$g"; then
      pass=$((pass + 1))
    else
      fail=$((fail + 1))
      failed+=("$(basename "$g" .sh)")
    fi
  done
fi

printf '%s── Summary ──%s\n' "${BOLD}" "${RESET}"
printf 'Passed: %d   Failed: %d\n' "${pass}" "${fail}"
if [ "${fail}" -gt 0 ]; then
  printf '%sFailing:%s %s\n' "${RED}" "${RESET}" "${failed[*]}"
  exit 1
fi
printf '%sAll gates passed.%s\n' "${GREEN}" "${RESET}"

#!/bin/bash
# Gate 14 — feature-coverage: the test suite still reads as the technical documentation.
#
# Asserts (via src/core/feature-coverage.ts):
#   - title conformance: every `@test` leads with its FEATURE INDEX label; every
#     top-level `describe(` in a *.test.ts opens with `Feature: ` (ERROR).
#   - index freshness: tests/scripts/*.bats and the FEATURE INDEX rows are set-equal (ERROR).
#   - inventory completeness: every feature (hook/verb/skill/agent/command) has a
#     documenting test. Enforced as a hard error (`--strict-completeness`) — a new
#     skill/agent/command/verb with no documenting test fails the gate.
#
# The detection logic is unit-tested by src/core/feature-coverage.test.ts (gate-01),
# so this gate cannot silently regress to fail-open.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "${ROOT}" || exit 2

if ! command -v bun >/dev/null 2>&1; then
  echo "SKIP: bun not installed"
  exit 0
fi

# Title + index violations AND inventory-completeness gaps all fail the gate.
bun src/core/feature-coverage.ts --strict-completeness
rc=$?
if [ "${rc}" -eq 0 ]; then
  echo "OK: feature-coverage — titles conform, the FEATURE INDEX is fresh, every feature is documented"
  exit 0
fi
exit "${rc}"

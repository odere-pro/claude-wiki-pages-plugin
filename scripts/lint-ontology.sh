#!/bin/bash
# S1-check — predicate domain→range lint checker.
#
# THIN WRAPPER: Delegates to the Bun engine (lint --check ontology).
#
# The full implementation lives in src/core/ontology-lint.ts.
# Dual-run equivalence was verified on tests/fixtures/reference-vault and
# tests/fixtures/minimal-vault (0 warnings each, match:true) before this
# wrapper was written (tmp/migration-plan.md Phase 1, step 4).
#
# Usage:
#   scripts/lint-ontology.sh [--target <vault-path>]
#
# Exit codes (preserved from bash implementation):
#   0 — no violations found (or no profile table present)
#   1 — one or more WARN-level violations found (engine exits 0 for warn-only;
#       mapped here for backward compatibility)
#   2 — hard error (vault not found, etc.)
#
# Respects the four-tier vault resolution from scripts/resolve-vault.sh when
# --target is not given.

set -euo pipefail

# shellcheck source=resolve-vault.sh
source "$(dirname "$0")/resolve-vault.sh"
VAULT=$(resolve_vault)

while [ $# -gt 0 ]; do
  case "$1" in
    --target)
      VAULT="${2%/}"
      shift 2
      ;;
    *) shift ;;
  esac
done

if [ ! -d "$VAULT" ]; then
  printf '\033[0;31mERROR: Vault directory not found at %q\033[0m\n' "$VAULT" >&2
  exit 2
fi

# Capture output and exit code from the engine.
ENGINE_OUTPUT=$(bash "$(dirname "$0")/engine.sh" lint --check ontology --target "$VAULT" 2>&1)
ENGINE_EXIT=$?

printf '%s\n' "$ENGINE_OUTPUT"

# Backward-compatibility mapping: the original bash implementation exited 1 on
# any WARN-level finding, but the engine exits 0 for warn-only results (correct
# per Report semantics — exitCode only fires on error-severity findings).
# Remap: if the engine exited 0 but its text output contains warn-level findings,
# exit 1 so all existing callers (CI, skills, Bats) see the same contract.
# Use grep -q inside an if-condition to avoid triggering set -o pipefail on a
# no-match (grep returns 1 for no match; if-condition absorbs the exit code).
if [ "$ENGINE_EXIT" -eq 0 ]; then
  if printf '%s\n' "$ENGINE_OUTPUT" | grep -qE '^Warnings:[[:space:]]+[1-9]'; then
    exit 1
  fi
fi

exit "$ENGINE_EXIT"

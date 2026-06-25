#!/bin/bash
# Controlled-vocabulary freshness checker (orphaned forms, unreferenced groups,
# tags below the usage floor).
#
# Thin wrapper: delegates to `engine lint --check vocabulary`.
# All logic now lives in src/core/vocabulary-lint.ts (migrated, Phase 1,
# tmp/migration-plan.md §3). This wrapper preserves every existing caller
# signature (CI, skills, fill-gaps) while retiring the bash implementation.
#
# Usage:
#   scripts/lint-vocabulary.sh [--target <vault-path>] [--min-tag-usage N]
#
# Exit codes (preserved from bash implementation):
#   0 — no violations (or no _vocabulary.md present)
#   1 — one or more WARN-level violations (engine exits 0 for warn-only;
#       mapped here for backward compatibility)
#   2 — hard error (vault not found, etc.)

set -euo pipefail

# shellcheck source=resolve-vault.sh
source "$(dirname "$0")/resolve-vault.sh"
VAULT=$(resolve_vault)

MIN_TAG_USAGE=""

while [ $# -gt 0 ]; do
  case "$1" in
    --target)
      VAULT="${2%/}"
      shift 2
      ;;
    --min-tag-usage)
      MIN_TAG_USAGE="$2"
      shift 2
      ;;
    *) shift ;;
  esac
done

if [ ! -d "$VAULT" ]; then
  printf '\033[0;31mERROR: Vault directory not found at %q\033[0m\n' "$VAULT" >&2
  exit 2
fi

# Build engine args, forwarding the optional --min-tag-usage flag.
ENGINE_ARGS=(lint --check vocabulary --target "$VAULT")
if [ -n "$MIN_TAG_USAGE" ]; then
  ENGINE_ARGS+=(--min-tag-usage "$MIN_TAG_USAGE")
fi

# Capture output and exit code from the engine.
ENGINE_OUTPUT=$(bash "$(dirname "$0")/engine.sh" "${ENGINE_ARGS[@]}" 2>&1)
ENGINE_EXIT=$?

printf '%s\n' "$ENGINE_OUTPUT"

# Backward-compatibility mapping: the original bash implementation exited 1 on
# any WARN-level finding, but the engine exits 0 for warn-only results (correct
# per Report semantics — exitCode only fires on error-severity findings).
# Remap: if the engine exited 0 but its text output contains warn-level findings,
# exit 1 so all existing callers (CI, skills, Bats) see the same contract.
if [ "$ENGINE_EXIT" -eq 0 ]; then
  if printf '%s\n' "$ENGINE_OUTPUT" | grep -qE '^Warnings:[[:space:]]+[1-9]'; then
    exit 1
  fi
fi

exit "$ENGINE_EXIT"

#!/bin/bash
# check-duplicate-claims.sh — duplicate-claim advisory (ADR-0014 Part B).
#
# Thin wrapper: delegates to `engine lint --check dup-claims`.
# All logic now lives in src/core/duplicate-claims.ts (migrated, Phase 1,
# tmp/migration-plan.md §3). This wrapper preserves every existing caller
# signature; `--proposed <file>` maps to the engine's `--file <file>`.
#
# Usage:
#   scripts/check-duplicate-claims.sh --target <vault-path> [--proposed <file>]
#
# WARN only: exits 0 in ALL cases (advisory; never blocks promotion). Invoke as
# a review step from skills/review/SKILL.md; do NOT wire as a hook.

set -euo pipefail

# shellcheck source=resolve-vault.sh
source "$(dirname "$0")/resolve-vault.sh"
VAULT=$(resolve_vault)

PROPOSED_FILE=""

while [ $# -gt 0 ]; do
  case "$1" in
    --target)
      VAULT="${2%/}"
      shift 2
      ;;
    --proposed)
      PROPOSED_FILE="$2"
      shift 2
      ;;
    *) shift ;;
  esac
done

if [ ! -d "$VAULT" ]; then
  printf '\033[0;31mERROR: Vault directory not found at %q\033[0m\n' "$VAULT" >&2
  exit 2
fi

# Build engine args, mapping --proposed → --file.
ENGINE_ARGS=(lint --check dup-claims --target "$VAULT")
if [ -n "$PROPOSED_FILE" ]; then
  ENGINE_ARGS+=(--file "$PROPOSED_FILE")
fi

# WARN-only: surface the engine's findings but always exit 0 (never block).
bash "$(dirname "$0")/engine.sh" "${ENGINE_ARGS[@]}" 2>&1 || true

exit 0

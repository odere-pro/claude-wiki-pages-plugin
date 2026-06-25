#!/bin/bash
# scripts/verify-output.sh — verify the portable-markdown contract for files
# produced by the `markdown` skill.
#
# Thin wrapper: delegates to `engine lint --check output`.
# All logic now lives in src/core/output-check.ts (migrated, Phase 1,
# tmp/migration-plan.md §3). This wrapper preserves the original calling
# convention exactly: a single positional <vault-root> argument.
#
# Usage:
#   scripts/verify-output.sh <vault-root>
#
# The vault root is the directory that contains `output/`; this audits that
# subtree only.
#
# Exit codes (preserved from the bash implementation):
#   0  every file under <vault>/output/ conforms (or output/ is empty/absent)
#   1  one or more files violate the portable-markdown contract
#   2  usage error / vault root not found

set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "usage: $0 <vault-root>" >&2
  exit 2
fi

VAULT_ROOT="$1"

if [ ! -d "$VAULT_ROOT" ]; then
  echo "verify-output: vault root not found: $VAULT_ROOT" >&2
  exit 2
fi

# Capture output and exit code from the engine.
ENGINE_OUTPUT=$(bash "$(dirname "$0")/engine.sh" lint --check output --target "$VAULT_ROOT" 2>&1)
ENGINE_EXIT=$?

# Decide pass/fail. The engine models contract violations as warn findings and
# exits 0 for warn-only results; remap warn-only to a violation so every caller
# (the smoke suite, skills) sees the original exit-1-on-violation contract.
VIOLATION=0
if [ "$ENGINE_EXIT" -ne 0 ]; then
  VIOLATION=1
elif printf '%s\n' "$ENGINE_OUTPUT" | grep -qE '^Warnings:[[:space:]]+[1-9]'; then
  VIOLATION=1
fi

# Preserve the original's behavior: SILENT on a clean/empty output/ (exit 0);
# emit the engine's findings plus a summary line only when something violates.
if [ "$VIOLATION" -eq 1 ]; then
  printf '%s\n' "$ENGINE_OUTPUT"
  echo "verify-output: file(s) violate the portable-markdown contract" >&2
  exit 1
fi

exit 0

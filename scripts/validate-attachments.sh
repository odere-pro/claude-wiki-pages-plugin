#!/bin/bash
# PreToolUse: blocks writes to vault/wiki/_sources/ when source_format != text
# but attachment_path is missing or the referenced file does not exist.
#
# Phase 3 (hook-gates): the decision authority is now the Bun engine
# (src/core/attachment-check.ts via `engine hook --gate attachments`). This script
# is a thin stdin→engine wrapper that preserves the hook contract VERBATIM:
#   - reads the PreToolUse tool JSON from stdin,
#   - emits {"decision":"block","reason":…} on stdout for a blocked write,
#   - ALWAYS exits 0 (a non-zero hook exit is a harness error, not a policy block).
# The engine reconstructs the post-operation content (Write content; Edit = disk
# content with old_string→new_string applied) and validates the attachment.
#
# FAIL-CLOSED (the Phase-3 safety upgrade): a non-text source with a missing or
# dangling attachment is a provenance-integrity failure, so this SECURITY gate
# BLOCKS when Bun is absent — scoped to in-scope source notes
# (<vault>/wiki/_sources/*.md) so a missing-Bun box does not block unrelated edits.
set -euo pipefail

# shellcheck source=resolve-vault.sh
source "$(dirname "$0")/resolve-vault.sh"
# shellcheck source=lib-validate-gate.sh
source "$(dirname "$0")/lib-validate-gate.sh"
VAULT=$(resolve_vault)
VAULT_NAME=$(basename "$VAULT")

INPUT=$(cat)

if ! command -v bun >/dev/null 2>&1; then
  # Fail-closed, but SCOPED: only block in-scope source-note writes
  # (<vault>/wiki/_sources/*.md). Other paths pass through.
  FILE_PATH=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // .tool_input.file // empty' 2>/dev/null || true)
  case "$FILE_PATH" in
    */"${VAULT_NAME}"/wiki/_sources/*.md)
      emit_block_decision "attachments gate: Bun is required to validate source-note attachments but was not found. Install Bun from https://bun.sh, then retry the write. (Security gate fails closed — the write is blocked until the attachment check can run.)"
      ;;
  esac
  exit 0
fi

# Pipe the ORIGINAL stdin to the engine entry; --target pins the resolved vault.
printf '%s' "$INPUT" | bash "$(dirname "$0")/engine.sh" hook --gate attachments --target "$VAULT"
exit 0

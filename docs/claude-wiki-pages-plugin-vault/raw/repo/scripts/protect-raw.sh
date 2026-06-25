#!/bin/bash
# PreToolUse: blocks edits to existing files in <vault>/raw/ (sources are immutable)
# Vault resolved via CLAUDE_WIKI_PAGES_VAULT, auto-detection, or default (docs/vault)
# Allows Write to NEW files (adding sources), blocks Edit to existing files.
#
# Phase 3 (hook-gates): the decision authority is now the Bun engine
# (src/core/protect-raw-check.ts via `engine hook --gate protect-raw`). This script
# is a thin stdin→engine wrapper that preserves the hook contract VERBATIM:
#   - reads the PreToolUse tool JSON from stdin,
#   - emits {"decision":"block","reason":…} on stdout for a blocked write,
#   - ALWAYS exits 0 (a non-zero hook exit is a harness error, not a policy block).
#
# The raw-immutability rules — default-deny under raw/, the sanctioned
# agent-session carve-out (raw/agent-sessions/ + frontmatter source_type marker),
# and the symlink/traversal canonicalisation — all live in the engine module now.
#
# FAIL-CLOSED (the Phase-3 safety upgrade): raw/ immutability is a SECURITY
# boundary. When Bun is absent at hook time, BLOCK any write the gate would have
# guarded (a target under <vault>/raw/) with an install-Bun reason — never
# fail-open, so a missing-Bun box cannot mutate an immutable source.
set -euo pipefail

# shellcheck source=resolve-vault.sh
source "$(dirname "$0")/resolve-vault.sh"
# shellcheck source=lib-validate-gate.sh
source "$(dirname "$0")/lib-validate-gate.sh"
VAULT=$(resolve_vault)
VAULT_NAME=$(basename "${VAULT}")

INPUT=$(cat)

if ! command -v bun >/dev/null 2>&1; then
  # Fail-closed, but SCOPED: only block writes the engine WOULD guard — a target
  # under <vault>/raw/ (canonicalised so a traversal/symlink cannot evade the
  # scope check). Other paths pass through so unrelated edits are not blocked.
  FILE_PATH=$(printf '%s' "${INPUT}" | jq -r '.tool_input.file_path // .tool_input.file // empty' 2>/dev/null || true)
  if [ -n "${FILE_PATH}" ]; then
    # Canonicalise the directory (target may not exist yet) and re-append base.
    _dir=$(dirname "${FILE_PATH}")
    _base=$(basename "${FILE_PATH}")
    if cd "${_dir}" 2>/dev/null; then
      _canon="$(pwd -P)/${_base}"
    else
      _canon="${FILE_PATH}"
    fi
    _guarded=0
    if [ -n "${VAULT_NAME}" ]; then
      case "${_canon}" in */"${VAULT_NAME}"/raw/*) _guarded=1 ;; esac
    else
      case "${_canon}" in */raw/*) _guarded=1 ;; esac
    fi
    if [ "${_guarded}" -eq 1 ]; then
      emit_block_decision "protect-raw gate: Bun is required to enforce raw/ immutability but was not found. Install Bun from https://bun.sh, then retry the write. (Security gate fails closed — the write is blocked until the immutability check can run.)"
    fi
  fi
  exit 0
fi

# Pipe the ORIGINAL stdin to the engine entry; --target pins the same resolved
# vault the bash side computed so the raw/ boundary + carve-out match exactly.
printf '%s' "${INPUT}" | bash "$(dirname "$0")/engine.sh" hook --gate protect-raw --target "${VAULT}"
exit 0

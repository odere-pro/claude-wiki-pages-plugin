#!/usr/bin/env bash
# enforce-dmi.sh — PreToolUse enforcement for skill:side-effecting-no-dmi
#
# Blocks writes to skills/*/SKILL.md when the file contains side-effecting
# verbs (scaffold/deploy/commit/push/publish/release/delete/post/write) in the
# body but does NOT carry `disable-model-invocation: true` in frontmatter.
#
# Phase 3 (hook-gates): the decision authority is now the Bun engine
# (src/core/dmi-check.ts via `engine hook --gate dmi`). This script is a thin
# stdin→engine wrapper. CRITICAL contract preserved VERBATIM: enforce-dmi is the
# lone HARD-block hook — it writes the two-line `[enforce-dmi] …` message to
# STDERR and exits 2 (Claude treats exit 2 as a hard PreToolUse block). It does
# NOT signal via stdout JSON. The engine reproduces the exact stderr text and
# returns exit 2; this wrapper passes that exit code through.
#
# Exit codes: 0 = pass, 2 = block (the engine's exit 2 is forwarded verbatim).
#
# FAIL-CLOSED (the Phase-3 safety upgrade): this is a SECURITY gate, so when Bun
# is absent at hook time it HARD-blocks (exit 2) an in-scope SKILL.md write with
# an install-Bun stderr reason — scoped to skills/*/SKILL.md so a missing-Bun box
# does not block unrelated edits.
set -euo pipefail

INPUT=$(cat)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if ! command -v bun >/dev/null 2>&1; then
  # Fail-closed, but SCOPED to skills/*/SKILL.md (the only paths the gate acts on).
  # Extract file_path without bun: a minimal jq read (jq is in every hook shell).
  FILE_PATH=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // .tool_input.file // empty' 2>/dev/null || true)
  case "$FILE_PATH" in
    */skills/*/SKILL.md)
      echo "[enforce-dmi] BLOCKED: Bun is required to enforce the disable-model-invocation rule but was not found. Install Bun from https://bun.sh, then retry the edit." >&2
      echo "[enforce-dmi] Security gate fails closed — the SKILL.md write is blocked until the check can run." >&2
      exit 2
      ;;
  esac
  exit 0
fi

# Pipe the ORIGINAL stdin to the engine entry. The engine writes the two-line
# stderr block message and returns exit 2 on a hard block (else exit 0); forward
# its exit code verbatim so the hard-block semantics are preserved.
#
# Capture the exit code without letting `set -e` abort before `exit` (a non-zero
# engine exit is a deliberate hard block, not a script error).
_rc=0
printf '%s' "$INPUT" | bash "$SCRIPT_DIR/engine.sh" hook --gate dmi || _rc=$?
exit "$_rc"

#!/usr/bin/env bash
# enforce-must-rule.sh — PreToolUse warning for claude-md:must-rule-with-no-hook
#
# When a CLAUDE.md edit introduces an imperative "must / never / always" rule,
# remind the author to back it with an enforcement hook or CI check — an
# unenforced rule is a polite request, not a guarantee. Non-blocking by design:
# this hook only warns and ALWAYS exits 0, so it never interrupts an edit.
#
# Phase 3 (hook-gates): the decision authority is now the Bun engine
# (src/core/must-rule-check.ts via `engine hook --gate must-rule`). This script
# is a thin stdin→engine wrapper that preserves the hook contract VERBATIM: the
# engine writes the two-line `[enforce-must-rule] …` notice to STDERR (with the
# same per-line must/never/always count) and always returns exit 0.
#
# Path-filtered inside the engine (the hook matcher is the broad Write|Edit|
# MultiEdit), so it is a no-op for any file that is not a CLAUDE.md.
#
# FAIL-OPEN (ADVISORY gate): this is not a security boundary. When Bun is absent
# we simply skip the advisory notice and exit 0 — the write always proceeds.
#
# Exit codes: 0 = always (warning only; never blocks).
set -euo pipefail

INPUT=$(cat)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if ! command -v bun >/dev/null 2>&1; then
  # Advisory: fail OPEN — skip the notice, never block.
  exit 0
fi

# Pipe the ORIGINAL stdin to the engine entry. The engine writes the advisory
# stderr notice when applicable and always returns exit 0.
printf '%s' "$INPUT" | bash "$SCRIPT_DIR/engine.sh" hook --gate must-rule
exit 0

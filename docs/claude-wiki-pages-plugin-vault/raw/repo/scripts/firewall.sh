#!/bin/bash
# PreToolUse: confines Write/Edit to the resolved vault (+ firewall.allowPaths),
# minus firewall.denyPaths, minus sibling registered vaults (cross-vault).
#
# Phase 3 (firewall-twin-retire): the decision authority is now the Bun engine
# (src/core/firewall.ts via `engine hook --gate firewall`). This script is a thin
# stdin→engine wrapper that preserves the hook contract VERBATIM:
#   - reads the PreToolUse tool JSON from stdin,
#   - emits {"decision":"block","reason":…} on stdout for a rejected write,
#   - ALWAYS exits 0 (a non-zero hook exit is a harness error, not a policy block).
#
# What stays in bash (migration-plan.md "What stays in bash"): the four-tier vault
# resolution and the registry-derived cross-vault set — the bash spine that a TS
# module cannot `source`. This wrapper computes OTHER_VAULTS (env override or the
# registry, fail-closed) and hands them to the engine via --other-vaults.
#
# FAIL-CLOSED (the Phase-3 safety upgrade): when Bun is absent at hook time this
# is a SECURITY gate — it BLOCKS the write with an install-Bun reason rather than
# letting an unvalidated write through. Never fail-open.
#
# shellcheck source=resolve-vault.sh
source "$(dirname "$0")/resolve-vault.sh"
# shellcheck source=lib-validate-gate.sh
source "$(dirname "$0")/lib-validate-gate.sh"

# B01 / strict mode: the sourceable libs are loaded BEFORE strict mode is enabled
# (they omit set -euo pipefail so they do not mutate the caller's options — see
# scripts/CLAUDE.md "Sourceable vs. executable"). Strict mode here governs only
# the operational code below.
set -euo pipefail
VAULT=$(resolve_vault)

# CLI mode (--file <path> [--json]) is the non-hook surface used by tests and the
# parity gate. It is NOT a second decision implementation: the verdict still comes
# from the Bun engine (firewall-twin-retire kept the engine as the sole authority).
# This wrapper only RESHAPES the engine verdict into the --json findings envelope
# (src/core/report.ts Finding shape) so the pre-existing N11 conformance suite
# (tests/scripts/json-envelope.bats) keeps its caller contract — mirroring the
# sibling frontmatter-validate unit, which likewise retained its CLI --json mode.
CLI_FILE=""
CLI_MODE=0
JSON_MODE=0
while [ $# -gt 0 ]; do
  case "$1" in
    --target)
      VAULT="${2%/}"
      shift 2
      ;;
    --file)
      CLI_FILE="$2"
      CLI_MODE=1
      shift 2
      ;;
    --json)
      JSON_MODE=1
      shift
      ;;
    *) shift ;;
  esac
done

# Other registered vault roots for cross-vault confinement.
# DEFAULT: derived from the registry (vaults[] minus current_vault_path) so the
# cross-vault rule is active in the real PreToolUse hook with no env var.
# OVERRIDE: CLAUDE_WIKI_PAGES_OTHER_VAULTS (colon-separated) wins when set.
# registry_other_vaults is read-only (the firewall hook must never write settings).
#
# Fail-closed (ADR-0016 N4): when registry_other_vaults exits non-zero (malformed
# JSON or current_vault_path ∉ vaults[]), OTHER_VAULTS is set to the active vault
# path so the engine's cross-vault check fires for every write — including to the
# active vault — yielding ZERO writable roots.
OTHER_VAULTS=""
if [ -n "${CLAUDE_WIKI_PAGES_OTHER_VAULTS:-}" ]; then
  OTHER_VAULTS="$CLAUDE_WIKI_PAGES_OTHER_VAULTS"
else
  _ov_rc=0
  # registry_other_vaults emits one path per line; collapse to colon-separated.
  _ov_lines=$(registry_other_vaults) || _ov_rc=$?
  if [ "$_ov_rc" -ne 0 ]; then
    # Fail-closed: use the active vault path as a sentinel sibling so cross-vault
    # fires for every write (zero writable roots).
    OTHER_VAULTS="$VAULT"
  else
    OTHER_VAULTS=$(printf '%s' "$_ov_lines" | tr '\n' ':' | sed 's/:$//')
  fi
fi

# ── CLI mode (--file) — delegated to the Bun engine, reshaped to --json ─────────
# Early arg validation: --json with no --file is a usage error (exit 2), matching
# the pre-twin-retirement contract the json-envelope conformance suite pins.
if [ "$JSON_MODE" -eq 1 ] && [ "$CLI_MODE" -eq 0 ]; then
  exit 2
fi

if [ "$CLI_MODE" -eq 1 ]; then
  # Fail-closed (security gate): the verdict authority is the engine. If Bun is
  # absent we cannot decide, so a JSON consumer gets a block finding (exit 1) and
  # a text consumer gets BLOCK — never a silent allow.
  if ! command -v bun >/dev/null 2>&1; then
    _reason="firewall gate: Bun is required to confine writes but was not found. Install Bun from https://bun.sh, then retry. (Security gate fails closed — the write is blocked until the boundary check can run.)"
    if [ "$JSON_MODE" -eq 1 ]; then
      jq -cn --arg sev "error" --arg check "firewall" --arg msg "$_reason" --arg file "$CLI_FILE" \
        '{"findings":[{"severity":$sev,"check":$check,"message":$msg,"file":$file}]}'
    else
      echo "BLOCK [bun-absent] $CLI_FILE (mode=enforce)"
    fi
    exit 1
  fi

  # Ask the engine for the verdict; it prints "ALLOW|BLOCK [rule] file (mode=…)"
  # and exits 0 (allowed) / 1 (blocked). Capture both so set -e does not abort.
  _eng_rc=0
  _eng_out=$(bash "$(dirname "$0")/engine.sh" firewall --file "$CLI_FILE" --target "$VAULT" --other-vaults "$OTHER_VAULTS" 2>/dev/null) || _eng_rc=$?

  if [ "$JSON_MODE" -eq 1 ]; then
    if [ "$_eng_rc" -eq 0 ]; then
      printf '{"findings":[]}\n'
      exit 0
    fi
    # Blocked: derive the rule and mode from the engine line for the message.
    _rule=$(printf '%s' "$_eng_out" | sed -n 's/^BLOCK \[\([^]]*\)\].*/\1/p')
    [ -z "$_rule" ] && _rule="blocked"
    _mode=$(printf '%s' "$_eng_out" | sed -n 's/.*(mode=\([^)]*\)).*/\1/p')
    [ -z "$_mode" ] && _mode="enforce"
    _msg=$(printf 'firewall: write blocked by %s rule for path: %s (mode=%s)' "$_rule" "$CLI_FILE" "$_mode")
    jq -cn --arg sev "error" --arg check "firewall" --arg msg "$_msg" --arg file "$CLI_FILE" \
      '{"findings":[{"severity":$sev,"check":$check,"message":$msg,"file":$file}]}'
    exit 1
  fi

  # Text CLI mode: pass the engine's ALLOW/BLOCK line through and mirror its exit.
  printf '%s\n' "$_eng_out"
  exit "$_eng_rc"
fi

# ── hook mode (stdin) — delegated to the Bun engine (Phase 3 migration) ─────────
# The hot-path PreToolUse decision is now made by `engine hook --gate firewall`
# (src/commands/hook/firewall-gate.ts → src/core/firewall.ts), which replaces the
# inline bash decide()/_realpath_physical glob+symlink logic. The stdin shape, the
# {"decision":"block","reason":…} stdout contract, and the always-exit-0 hook
# semantics are preserved VERBATIM — the engine emits the same B03-redacted block
# JSON (vault basename only) the bash inline path did.
INPUT=$(cat)

if ! command -v bun >/dev/null 2>&1; then
  # Only block writes the engine WOULD gate: a non-empty file_path. Other inputs
  # (no path) pass through, so a missing-Bun box does not block unrelated events.
  _fp=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // .tool_input.file // empty' 2>/dev/null || true)
  if [ -n "$_fp" ]; then
    emit_block_decision "firewall gate: Bun is required to confine writes to the active vault but was not found. Install Bun from https://bun.sh, then retry the write. (Security gate fails closed — the write is blocked until the boundary check can run.)"
  fi
  exit 0
fi

# Pipe the ORIGINAL stdin to the engine entry; --target pins the same resolved
# vault the bash side computed, --other-vaults carries the registry/env set.
printf '%s' "$INPUT" | bash "$(dirname "$0")/engine.sh" hook --gate firewall --target "$VAULT" --other-vaults "$OTHER_VAULTS"
exit 0

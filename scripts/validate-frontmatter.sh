#!/bin/bash
# PreToolUse: blocks writes to vault/wiki/ missing required frontmatter.
# Usage (CLI): scripts/validate-frontmatter.sh [--target <vault-path>] [--json]
# Default target: $CLAUDE_WIKI_PAGES_VAULT (fallback: docs/vault)
# Runs on macOS (BSD) and Linux (GNU)
#
# Since frontmatter-cli-retire (tmp/migration-plan.md "What is left" #2) this
# script is a THIN stdin/CLI → engine wrapper. The 447-line awk-YAML parser is
# gone: BOTH the hot-path PreToolUse hook AND the CLI/JSON batch validation are
# decided by the Bun engine, which uses a real `yaml` parser
# (src/core/frontmatter-validate.ts) with the SAME required-field rules
# single-sourced from the schema's "### Required fields by type" table
# (ADR-0014) and the SAME bundled-template fallback for pre-table vaults.
#
#   - Hook mode (stdin):     engine hook --gate frontmatter --target <vault>
#   - CLI mode (--target):   engine hook --gate frontmatter --cli --target <vault> [--json]
#
# FAIL-CLOSED (the Phase-3 safety upgrade): this is a SECURITY gate. When Bun is
# absent the hook BLOCKS a wiki write with an install-Bun reason rather than
# letting an unvalidated write through. The CLI mode degrades to exit 2 (cannot
# validate) on a missing-Bun box — never a silent pass.
set -euo pipefail

# shellcheck source=resolve-vault.sh
source "$(dirname "$0")/resolve-vault.sh"
# shellcheck source=lib-validate-gate.sh
source "$(dirname "$0")/lib-validate-gate.sh"
VAULT=$(resolve_vault)
TARGET_SET=0
JSON_MODE=0
while [ $# -gt 0 ]; do
  case "$1" in
    --target)
      VAULT="${2%/}"
      TARGET_SET=1
      shift 2
      ;; # explicit CLI flag overrides auto-detection
    --json)
      JSON_MODE=1
      shift
      ;;
    *) shift ;;
  esac
done
VAULT_NAME=$(basename "$VAULT")

# ── CLI mode (--target) — delegated to the Bun engine ─────────────────────────
# Replaces the awk validate_content loop over <vault>/wiki/**.md. The engine
# (src/commands/hook/frontmatter-cli.ts) walks the wiki tree, resolves the schema
# table (vault CLAUDE.md, else bundled template), and emits the SAME contract:
#   --json: {"findings":[…]} envelope, exit 1 on any finding else 0; exit 2 when
#           <vault>/wiki/ is absent (bad target).
#   plain:  ONE OK:/ERROR: line PER wiki page (the bash green/red loop contract),
#           then an Errors:/OK: summary; same exit codes. The per-file line format
#           is load-bearing — scripts/eval-ingest-extract.sh:_score_schema counts
#           one ".md" line per page, so a single summary line would read as zero
#           pages (frontmatter-cli-retire regression).
# When Bun is absent the CLI cannot validate — exit 2 (never a silent pass).
if [ "$TARGET_SET" -eq 1 ]; then
  if ! command -v bun >/dev/null 2>&1; then
    if [ "$JSON_MODE" -eq 1 ]; then
      printf '{"findings":[]}\n'
    else
      printf 'ERROR: Bun is required to validate frontmatter but was not found. Install Bun from https://bun.sh\n'
    fi
    exit 2
  fi
  if [ "$JSON_MODE" -eq 1 ]; then
    exec bash "$(dirname "$0")/engine.sh" hook --gate frontmatter --cli --target "$VAULT" --json
  fi
  exec bash "$(dirname "$0")/engine.sh" hook --gate frontmatter --cli --target "$VAULT"
fi

# ── Hook mode (stdin) — delegated to the Bun engine (Phase 3 migration) ───────
# The hot-path PreToolUse decision is made by `engine hook --gate frontmatter`
# (src/commands/hook/), which replaces the awk-YAML parser with a real `yaml`
# parser (src/core/frontmatter-validate.ts). The stdin shape, the
# {"decision":"block","reason":…} stdout contract, and the always-exit-0 hook
# semantics are preserved VERBATIM — the engine emits the same block JSON the
# bash inline path did, with the same per-type / path / source-format rules
# single-sourced from the schema table (ADR-0014), plus the bundled-template
# fallback for pre-table vaults.
#
# FAIL-CLOSED (the explicit Phase-3 safety upgrade over the old fail-open hook):
# this is a SECURITY gate, so when Bun is absent we BLOCK the write with an
# install-Bun reason rather than letting an unvalidated write through.
INPUT=$(cat)

if ! command -v bun >/dev/null 2>&1; then
  # Only block writes the engine WOULD gate: markdown under <vault>/wiki/.
  # Other paths pass through (the engine's path filter would have allowed them),
  # so a missing-Bun box does not block unrelated edits.
  _fp=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // .tool_input.file // empty' 2>/dev/null || true)
  if [ -n "$_fp" ]; then
    # Canonicalise the directory (target may not exist yet) and re-append base so
    # a LLM-crafted path with ../ traversal sequences cannot evade the scope check.
    _dir=$(dirname "$_fp")
    _base=$(basename "$_fp")
    if cd "$_dir" 2>/dev/null; then
      _fp_canon="$(pwd -P)/$_base"
    else
      _fp_canon="$_fp"
    fi
    case "$_fp_canon" in
      */"${VAULT_NAME}"/wiki/*.md)
        emit_block_decision "frontmatter gate: Bun is required to validate wiki frontmatter but was not found. Install Bun from https://bun.sh, then retry the write. (Security gate fails closed — the write is blocked until validation can run.)"
        ;;
    esac
  fi
  exit 0
fi

# Pipe the ORIGINAL stdin to the engine entry; --target pins the same resolved
# vault the bash side computed so vaultName / path checks match exactly.
printf '%s' "$INPUT" | bash "$(dirname "$0")/engine.sh" hook --gate frontmatter --target "$VAULT"
exit 0

#!/usr/bin/env bash
# scope-guard.sh — PreToolUse advisory scope warning for Read/Grep/Glob calls.
#
# When a Read, Grep, or Glob tool call targets a path outside the vault or
# outside the active skill's declared L3/L4 input contract, emit an advisory
# warning on stderr. NEVER blocks (always exit 0) — the intent is observability
# and interpretability, not enforcement. Enforcement is the firewall's job.
#
# Modelled on scripts/enforce-must-rule.sh:
#   - Read tool input JSON from stdin.
#   - Extract tool_name and the relevant path field.
#   - Compare against the resolved vault root.
#   - Emit advisory to stderr; exit 0.
#
# Exit codes: 0 = always (warning only; never blocks).

set -euo pipefail

# Read tool input from stdin (Claude passes it as JSON).
INPUT=$(cat)

# Extract tool_name from the JSON payload.
TOOL_NAME=$(printf '%s' "$INPUT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(d.get('tool_name', ''))
" 2>/dev/null || true)

# Only act on Read, Grep, Glob calls — no-op otherwise.
case "$TOOL_NAME" in
  Read | Grep | Glob) ;;
  *) exit 0 ;;
esac

# Extract the relevant path from the tool_input.
# Read: tool_input.file_path
# Grep: tool_input.path
# Glob: tool_input.pattern (may not be a vault path — best-effort)
FILE_PATH=$(printf '%s' "$INPUT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
ti = d.get('tool_input', {})
print(ti.get('file_path') or ti.get('path') or ti.get('pattern') or '')
" 2>/dev/null || true)

[ -z "$FILE_PATH" ] && exit 0

# Resolve the active vault path using the sourced helper.
# Source resolve-vault.sh (non-strict: it must not mutate our shell options).
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=resolve-vault.sh
source "${SCRIPT_DIR}/resolve-vault.sh" 2>/dev/null || true
VAULT=$(resolve_vault 2>/dev/null || echo "")

[ -z "$VAULT" ] && exit 0

# Normalise both paths: expand to absolute where possible.
# Use python3 for consistent path normalisation.
NORM_FILE=$(python3 -c "import os, sys; print(os.path.realpath(sys.argv[1]))" "$FILE_PATH" 2>/dev/null || printf '%s' "$FILE_PATH")
NORM_VAULT=$(python3 -c "import os, sys; print(os.path.realpath(sys.argv[1]))" "$VAULT" 2>/dev/null || printf '%s' "$VAULT")

# Warn when the path is under the vault but outside well-known read boundaries
# (vault/ root is acceptable for CLAUDE.md / _vocabulary.md / wiki/**).
# A path completely outside the vault is the primary concern.
case "$NORM_FILE" in
  "${NORM_VAULT}/"* | "${NORM_VAULT}")
    # Path is inside the vault — no advisory needed.
    exit 0
    ;;
  *)
    # Path is outside the vault — emit an advisory.
    echo "[scope-guard] ADVISORY: ${TOOL_NAME} targeting path outside the active vault." >&2
    echo "[scope-guard]   path:  ${FILE_PATH}" >&2
    echo "[scope-guard]   vault: ${VAULT}" >&2
    echo "[scope-guard]   Agents should read only vault-scoped paths. This is a warning only — the read will proceed." >&2
    ;;
esac

exit 0

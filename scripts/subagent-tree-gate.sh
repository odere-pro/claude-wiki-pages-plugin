#!/bin/bash
# SubagentStop: strict-tree conformance gate (ADR-0036).
#
# After a write-path agent that is supposed to LEAVE the vault tree-shaped
# (polish, maintenance) returns, verify the vault is actually a strict tree and
# WARN — non-blocking — when violations remain: cross-tree edges, parent-chain
# cycles, or multi-parent pages. The polish agent runs strict-tree-reduce --apply
# as its Step 0 self-heal; a non-zero count here means that heal did not converge,
# so the user should re-run /claude-wiki-pages:wiki (the heal route) or
# `bash scripts/strict-tree-reduce.sh --apply` directly.
#
# Ingest and curator are deliberately NOT gated: they write pages, but polish
# heals the tree AFTER them (orchestrator Step 3), so gating those would warn
# before the heal has run. Read-only; never writes; degrades silently when Bun
# is absent; ALWAYS exits 0 (a non-zero exit from a hook is a harness error).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

INPUT=$(cat)
AGENT_NAME=$(echo "$INPUT" | jq -r '.agent_name // empty' 2>/dev/null || echo "")

case "$AGENT_NAME" in
  claude-wiki-pages-polish-agent | claude-wiki-pages-maintenance-agent) ;;
  *) exit 0 ;;
esac

# The tree metric needs Bun; degrade silently when it is unavailable.
command -v bun >/dev/null 2>&1 || exit 0

# shellcheck source=resolve-vault.sh
source "${SCRIPT_DIR}/resolve-vault.sh"
VAULT="$(resolve_vault)"
[ -d "$VAULT/wiki" ] || exit 0

REPORT=$(bash "${SCRIPT_DIR}/tree-lint.sh" --target "$VAULT" --json 2>/dev/null || echo "")
[ -n "$REPORT" ] || exit 0

CROSS=$(echo "$REPORT" | jq -r '.metric.crossTreeEdgeCount // 0' 2>/dev/null || echo 0)
CYCLES=$(echo "$REPORT" | jq -r '.metric.cycleCount // 0' 2>/dev/null || echo 0)
MULTI=$(echo "$REPORT" | jq -r '.metric.multiParentCount // 0' 2>/dev/null || echo 0)
CONF=$(echo "$REPORT" | jq -r '.metric.treeConformance // 1' 2>/dev/null || echo 1)

if [ "${CROSS:-0}" -gt 0 ] || [ "${CYCLES:-0}" -gt 0 ] || [ "${MULTI:-0}" -gt 0 ]; then
  echo "TREE GATE: ${AGENT_NAME} left strict-tree violations (cross-tree=${CROSS}, cycles=${CYCLES}, multi-parent=${MULTI}, conformance=${CONF}). The self-heal did not converge — re-run /claude-wiki-pages:wiki or 'bash scripts/strict-tree-reduce.sh --apply'."
fi

exit 0

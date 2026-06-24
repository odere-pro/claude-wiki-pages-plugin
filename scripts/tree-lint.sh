#!/bin/bash
# tree-lint.sh — read-only strict-tree conformance report (ADR-0036).
#
# Reports, against the `parent:` spine, every shape the strict tree forbids:
# orphans (no parent), multi-parent pages, parent-chain cycles, oversaturated
# nodes (out-degree over a threshold), and every non-spine edge among visible
# topic pages — each tagged cross-tree, transitive-redundant, or intra-tree.
#
# The detector half of the strict-tree machinery; the remediation twin is
# scripts/strict-tree-reduce.sh. A thin bash wrapper over scripts/tree-lint.ts
# (Bun); mirrors graph-quality.sh. No network, no embeddings (NO-RAG). Read-only;
# never writes to the vault.
#
# Usage:
#   scripts/tree-lint.sh [--target <vault-path>] [--json] [--max-saturation <n>]
#
# Exit codes: 0 always (it reports; callers decide gates from the JSON/output).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

TARGET=""
JSON=0
MAX_SAT=""
while [ $# -gt 0 ]; do
  case "$1" in
    --target)
      TARGET="${2:-}"
      shift 2
      ;;
    --json)
      JSON=1
      shift
      ;;
    --max-saturation)
      MAX_SAT="${2:-}"
      shift 2
      ;;
    -h | --help)
      sed -n '2,20p' "$0"
      exit 0
      ;;
    *)
      echo "tree-lint: unknown arg: $1" >&2
      exit 0
      ;;
  esac
done

# Resolve the vault the same way every other script does, unless --target given.
if [ -z "$TARGET" ]; then
  # shellcheck source=resolve-vault.sh
  source "${SCRIPT_DIR}/resolve-vault.sh"
  TARGET="$(resolve_vault)"
fi

if ! command -v bun >/dev/null 2>&1; then
  echo "[claude-wiki-pages] tree-lint: Bun not found — skipped." >&2
  exit 0
fi

if [ ! -d "$TARGET/wiki" ]; then
  echo "[claude-wiki-pages] tree-lint: no wiki/ under '$TARGET'." >&2
  exit 0
fi

ARGS=(--target "$TARGET")
[ "$JSON" = "1" ] && ARGS+=(--json)
[ -n "$MAX_SAT" ] && ARGS+=(--max-saturation "$MAX_SAT")
exec bun "$SCRIPT_DIR/tree-lint.ts" "${ARGS[@]}"

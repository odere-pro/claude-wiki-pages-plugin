#!/bin/bash
# strict-tree-reduce.sh — strict-tree remediation (ADR-0036).
#
# The SOLE link reducer: demotes every NON-SPINE
# [[wikilink]] among visible topic pages (siblings, transitive-redundant ancestor
# links, cross-tree mentions) to plain text and prunes non-spine association
# frontmatter, so the graph draws only the `parent:` spine. When a cross-tree
# edge is demoted, the target tree is recorded as a nested `topic/<tree>` tag on
# the source (tag de-cycle) so the relationship stays discoverable without an
# edge. Dry-run by default; `--apply` rewrites in place (run inside git — the
# polish agent git-checkpoints it). Never touches parent/sources/children or
# creates dangling links; idempotent on a tree-shaped vault.
#
# A thin bash wrapper over scripts/strict-tree-reduce.ts (Bun); shares the
# demote core (src/core/link-demote.ts) with the engine's resolver.
# No network, no embeddings (NO-RAG).
#
# Usage:
#   scripts/strict-tree-reduce.sh [--target <vault>] [--apply] [--json] [--max-saturation <n>]
#
# Exit codes: 0 always (it reports; callers gate from the JSON/output).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

TARGET=""
APPLY=0
JSON=0
MAX_SAT=""
while [ $# -gt 0 ]; do
  case "$1" in
    --target)
      TARGET="${2:-}"
      shift 2
      ;;
    --apply)
      APPLY=1
      shift
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
      sed -n '2,22p' "$0"
      exit 0
      ;;
    *)
      echo "strict-tree-reduce: unknown arg: $1" >&2
      exit 0
      ;;
  esac
done

if [ -z "$TARGET" ]; then
  # shellcheck source=resolve-vault.sh
  source "${SCRIPT_DIR}/resolve-vault.sh"
  TARGET="$(resolve_vault)"
fi

if ! command -v bun >/dev/null 2>&1; then
  echo "[claude-wiki-pages] strict-tree-reduce: Bun not found — skipped." >&2
  exit 0
fi

if [ ! -d "$TARGET/wiki" ]; then
  echo "[claude-wiki-pages] strict-tree-reduce: no wiki/ under '$TARGET'." >&2
  exit 0
fi

ARGS=(--target "$TARGET")
[ "$APPLY" = "1" ] && ARGS+=(--apply)
[ "$JSON" = "1" ] && ARGS+=(--json)
[ -n "$MAX_SAT" ] && ARGS+=(--max-saturation "$MAX_SAT")
exec bun "$SCRIPT_DIR/strict-tree-reduce.ts" "${ARGS[@]}"

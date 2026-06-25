#!/bin/bash
# graph-quality.sh — deterministic dangling-wikilink scanner + topic-cluster metric.
#
# The Bun engine's `verify` checks structural integrity but does NOT detect
# dangling [[wikilinks]] (links whose target resolves to no page) — those show up
# as empty grey nodes in Obsidian's graph. This script fills that gap, and also
# measures how concentrated the graph is around the project's core topic clusters.
#
# Thin bash wrapper over scripts/graph-quality.ts (Bun): no network, no
# embeddings — consistent with the NO-RAG stance (ADR-0007). The analysis reuses
# the engine's own Obsidian-accurate resolver (src/core/link-resolver.ts) rather
# than re-implementing it. Read-only; never writes to the vault.
#
# Usage:
#   scripts/graph-quality.sh [--target <vault-path>] [--json]
#
# Resolution model (mirrors Obsidian, ADR-0031): a link [[T]] (after stripping a
#   trailing "|alias" and "#heading"/"^block" anchor) resolves iff, case-
#   insensitively, T equals some page's wiki-relative PATH (with or without .md),
#   its filename stem, its `title:`, or one of its `aliases:`. Path and basename
#   are what Obsidian resolves; title/alias are a superset. No space<->hyphen
#   fuzzing — that mismatch is exactly what produces empty nodes.
#
# Cluster model: each topic-bearing page (everything under wiki/ except _sources/,
#   _synthesis/, and the root index.md/log.md/manifest.md) is assigned to one of
#   the 7 core clusters by its top-level folder; anything else is "other".
#   Hub pages are the per-folder notes <cluster>/<cluster>.md.
#     Cn = pages in the 7 clusters / all topic-bearing pages.
#     Ch = resolved wikilink edges touching a hub page / all resolved edges.
#
# Exit codes: 0 always (it reports; callers decide gates from the JSON/output).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

TARGET=""
JSON=0
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
    -h | --help)
      sed -n '2,40p' "$0"
      exit 0
      ;;
    *)
      echo "graph-quality: unknown arg: $1" >&2
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
  echo "[claude-wiki-pages] graph-quality: Bun not found — skipped." >&2
  exit 0
fi

if [ ! -d "$TARGET/wiki" ]; then
  echo "[claude-wiki-pages] graph-quality: no wiki/ under '$TARGET'." >&2
  exit 0
fi

JSON_FLAG=""
[ "$JSON" = "1" ] && JSON_FLAG="--json"
# shellcheck disable=SC2086
exec bun "$SCRIPT_DIR/graph-quality.ts" --target "$TARGET" $JSON_FLAG

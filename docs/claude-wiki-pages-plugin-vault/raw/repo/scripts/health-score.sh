#!/bin/bash
# health-score.sh — the vault's single self-health estimate (0–100 + grade).
#
# A deterministic AGGREGATION of signals the engine already emits (graph-quality
# + engine verify) into one number, plus a concrete `issues`/`needsHeal` list the
# orchestrator uses to decide whether `/claude-wiki-pages:wiki` should run a
# self-heal pass (e.g. after a plugin update). No new measurement; no network, no
# embeddings (NO-RAG, ADR-0007). Read-only.
#
# Usage:
#   scripts/health-score.sh [--target <vault-path>] [--json]
#
# Exit codes: 0 always (it reports; callers gate on the JSON/output).
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
      sed -n '2,14p' "$0"
      exit 0
      ;;
    *)
      echo "health-score: unknown arg: $1" >&2
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
  echo "[claude-wiki-pages] health-score: Bun not found — skipped." >&2
  exit 0
fi

if [ ! -d "$TARGET/wiki" ]; then
  echo "[claude-wiki-pages] health-score: no wiki/ under '$TARGET'." >&2
  exit 0
fi

JSON_FLAG=""
[ "$JSON" = "1" ] && JSON_FLAG="--json"
# shellcheck disable=SC2086
exec bun "$SCRIPT_DIR/health-score.ts" --target "$TARGET" $JSON_FLAG

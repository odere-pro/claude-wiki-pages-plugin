#!/bin/bash
# expand-records.sh — structured record fan-out (ADR-0036, #57).
#
# Reads a JSON/CSV/YAML array source from vault/raw/ and generates one wiki
# page per record, hub folder-notes, and a parent: spine (record → hub →
# topic root), following the strict-tree topology. Cross-record relations
# become nested taxonomy tags (family/<x>, severity/<x>, principle/<x>) —
# never wikilinks — so the graph is born tree-shaped.
#
# A thin bash wrapper over scripts/expand-records.ts (Bun). No network,
# no embeddings (NO-RAG). Dry-run by default; --apply writes pages.
# Idempotent: pages that already exist are silently skipped.
#
# Usage:
#   scripts/expand-records.sh --target <vault> --source <path> --topic <folder>
#                              [--apply] [--json]
#                              [--id-field name]
#                              [--title-field name]
#                              [--hub-field name]
#                              [--tag-fields a,b,c]
#                              [--relation-fields a,b]
#                              [--records-key name]
#                              [--type entity|concept]
#                              [--date YYYY-MM-DD]
#
# Exit codes: 0 always (reports; callers gate from JSON/output).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

TARGET=""
SOURCE=""
TOPIC=""
ARGS_EXTRA=()

while [ $# -gt 0 ]; do
  case "$1" in
    --target)
      TARGET="${2:-}"
      shift 2
      ;;
    --source)
      SOURCE="${2:-}"
      ARGS_EXTRA+=(--source "$SOURCE")
      shift 2
      ;;
    --topic)
      TOPIC="${2:-}"
      ARGS_EXTRA+=(--topic "$TOPIC")
      shift 2
      ;;
    --apply | --json)
      ARGS_EXTRA+=("$1")
      shift
      ;;
    --id-field | --title-field | --hub-field | --tag-fields | --relation-fields | --records-key | --type | --entity-type-field | --date)
      ARGS_EXTRA+=("$1" "${2:-}")
      shift 2
      ;;
    -h | --help)
      sed -n '2,28p' "$0"
      exit 0
      ;;
    *)
      echo "expand-records: unknown arg: $1" >&2
      exit 0
      ;;
  esac
done

if [ -z "$TARGET" ]; then
  # shellcheck source=resolve-vault.sh
  source "${SCRIPT_DIR}/resolve-vault.sh"
  TARGET="$(resolve_vault)"
fi

if [ -z "$SOURCE" ]; then
  echo "[claude-wiki-pages] expand-records: --source is required." >&2
  exit 0
fi

if [ -z "$TOPIC" ]; then
  echo "[claude-wiki-pages] expand-records: --topic is required." >&2
  exit 0
fi

if ! command -v bun >/dev/null 2>&1; then
  echo "[claude-wiki-pages] expand-records: Bun not found — skipped." >&2
  exit 0
fi

if [ ! -d "$TARGET/wiki" ]; then
  echo "[claude-wiki-pages] expand-records: no wiki/ under '$TARGET'." >&2
  exit 0
fi

exec bun "$SCRIPT_DIR/expand-records.ts" --target "$TARGET" "${ARGS_EXTRA[@]}"

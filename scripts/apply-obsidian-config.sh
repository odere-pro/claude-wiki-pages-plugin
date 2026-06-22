#!/bin/bash
# apply-obsidian-config.sh — deterministic, idempotent writer for a vault's
# .obsidian/graph.json + .obsidian/app.json (topic-island graph filter, the
# wiki-only exclusions, and per-topic color groups).
#
# Thin bash wrapper over scripts/apply-obsidian-config.ts (Bun). Replaces the
# polish agent's prose-driven graph config, which only wrote the island/search
# FILTER scaffold when graph.json was ABSENT — so once Obsidian created
# graph.json with its harmful defaults (search:"", hideUnresolved:false,
# showTags:true) the filters never landed and raw/ + _sources/ leaked into the
# graph as a gray sprawl. This asserts the filters merge-only on EVERY run.
# See ADR-0035. Read-only outside .obsidian/.
#
# Usage:
#   scripts/apply-obsidian-config.sh [--target <vault>] [--json] [--check]
#
# Exit codes: 0 on success (write or in-sync check); 3 when --check finds drift.
# Fail-open: a missing Bun or wiki/ is a skip (exit 0), never a hard error.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

TARGET=""
PASS=()
while [ $# -gt 0 ]; do
  case "$1" in
    --target)
      TARGET="${2:-}"
      shift 2
      ;;
    --json)
      PASS+=("--json")
      shift
      ;;
    --check)
      PASS+=("--check")
      shift
      ;;
    -h | --help)
      sed -n '2,18p' "$0"
      exit 0
      ;;
    *)
      echo "apply-obsidian-config: unknown arg: $1" >&2
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
  echo "[claude-wiki-pages] apply-obsidian-config: Bun not found — skipped." >&2
  exit 0
fi

if [ ! -d "$TARGET/wiki" ]; then
  echo "[claude-wiki-pages] apply-obsidian-config: no wiki/ under '$TARGET'." >&2
  exit 0
fi

# Forwards --json/--check to the engine. The ${PASS[@]+...} guard keeps the
# empty-array expansion safe under `set -u` on bash 3.2 (macOS default). The
# engine surfaces exit 3 on --check drift; write mode exits 0.
exec bun "$SCRIPT_DIR/apply-obsidian-config.ts" --target "$TARGET" ${PASS[@]+"${PASS[@]}"}

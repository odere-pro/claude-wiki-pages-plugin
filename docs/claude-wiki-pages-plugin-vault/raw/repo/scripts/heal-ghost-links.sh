#!/bin/bash
# heal-ghost-links.sh — deterministically rewrite ghost wikilinks to piped
# basename form [[file-basename|Display]].
#
# A ghost link resolves via a page's title:/aliases: but not its filename, so the
# plugin's index resolves it yet Obsidian renders it as a gray ghost node (the
# canonical case is a body source citation `[[Source: ADR 0001 — …]]`). The
# curator used to heal these by hand; this makes the heal deterministic so a real
# ingest cannot ship 100+ ghosts. See ADR-0035 and src/core/ghost-link-check.ts.
#
# Thin bash wrapper over scripts/heal-ghost-links.ts (Bun). Writes only wiki/
# pages; never touches raw/.
#
# Usage:
#   scripts/heal-ghost-links.sh [--target <vault>] [--json] [--check]
#
# Exit codes: 0 on success; with --check, 3 when ghost links remain (gate
# signal). Fail-open: missing Bun or wiki/ is a skip (exit 0).
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
      echo "heal-ghost-links: unknown arg: $1" >&2
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
  echo "[claude-wiki-pages] heal-ghost-links: Bun not found — skipped." >&2
  exit 0
fi

if [ ! -d "$TARGET/wiki" ]; then
  echo "[claude-wiki-pages] heal-ghost-links: no wiki/ under '$TARGET'." >&2
  exit 0
fi

# The ${PASS[@]+...} guard keeps the empty-array expansion safe under `set -u`
# on bash 3.2 (macOS default). --check surfaces exit 3 on drift.
exec bun "$SCRIPT_DIR/heal-ghost-links.ts" --target "$TARGET" ${PASS[@]+"${PASS[@]}"}

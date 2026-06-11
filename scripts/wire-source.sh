#!/bin/bash
# wire-source.sh — register a git work tree (typically the host project) as a
# docs-only ingest source for the wiki.
#
#   wire-source.sh add [--name <n>] [--path <dir>] [--vault <vault>]
#
# Registers a wired-source record in settings.json (default include globs are
# DOCS-ONLY: markdown, READMEs, docs/, ADRs, RFCs — never source code), then
# runs the initial pull via sync-source.sh so the matching docs land under
# raw/wired/<name>/ as immutable snapshots ready for ingest.
#
# Refuses a path that is not a git work tree: change detection is git-diff
# based, so a wired source must be a repo. The vault path itself is always
# auto-excluded — the wiki must never ingest its own output.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=resolve-vault.sh
source "${SCRIPT_DIR}/resolve-vault.sh"

SUB="${1:-}"
if [ "$SUB" != "add" ]; then
  echo "usage: wire-source.sh add [--name <n>] [--path <dir>] [--vault <vault>]" >&2
  exit 1
fi
shift

SRC_PATH="."
NAME=""
VAULT=""
while [ $# -gt 0 ]; do
  case "$1" in
    --name)
      NAME="$2"
      shift 2
      ;;
    --path)
      SRC_PATH="${2%/}"
      shift 2
      ;;
    --vault)
      VAULT="${2%/}"
      shift 2
      ;;
    *) shift ;;
  esac
done

if ! git -C "$SRC_PATH" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "[claude-wiki-pages] ERROR: \"$SRC_PATH\" is not a git work tree — sync detection is git-diff based. Run 'git init' there first." >&2
  exit 1
fi

[ -z "$VAULT" ] && VAULT=$(resolve_vault)
[ -z "$NAME" ] && NAME=$(basename "$(cd "$SRC_PATH" && pwd)")

# Docs-only include set; the vault (and the usual build/dependency dirs) are
# excluded so the wiki never ingests its own output or generated noise.
INCLUDE_JSON='["README*","*.md","docs/**","adr/**","adrs/**","rfcs/**","doc/**"]'
EXCLUDE_JSON=$(printf '["%s/**","node_modules/**",".git/**","dist/**","build/**","tmp/**","vendor/**",".obsidian/**"]' "$VAULT")

if ! wired_add "$NAME" "$SRC_PATH" "$VAULT" "$INCLUDE_JSON" "$EXCLUDE_JSON"; then
  echo "[claude-wiki-pages] ERROR: could not register wired source \"$NAME\"" >&2
  exit 1
fi
echo "WIRED: ${NAME} (path=${SRC_PATH}, vault=${VAULT}, docs-only)"

# Initial pull: snapshot every matching doc, then record HEAD as the sync point.
bash "${SCRIPT_DIR}/sync-source.sh" pull --name "$NAME"

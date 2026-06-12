#!/bin/bash
# obsidian-rename.sh — backlink-safe rename/move of a wiki page via the
# Obsidian CLI, with a deterministic fallback contract.
#
#   obsidian-rename.sh --from <vault-rel-path.md> --to <vault-rel-path.md> [--target <vault>]
#
# Obsidian's app.fileManager.renameFile() updates every [[wikilink]] backlink
# from the metadata cache — exactly the rewrite the curator does by hand today
# on title-collision renames. This helper wraps that call behind the plugin's
# degradation contract:
#
#   exit 0 — renamed AND post-condition verified on disk (new path exists,
#            old path gone). Backlinks are updated by Obsidian.
#   exit 3 — skip: obsidian CLI absent, app/vault unreachable, or the rename
#            did not take effect (post-condition failed). Caller falls back to
#            the manual `git mv` + link-rewrite sequence. Prints exactly:
#            [skip] cli-rename: obsidian-cli unavailable
#   exit 2 — usage error (missing/invalid arguments, --from absent on disk,
#            --to escaping the vault). Caller must not fall back blindly.
#
# The on-disk post-condition is the safety net for any CLI-behavior
# uncertainty: if the eval call "succeeds" but the file did not move, we skip
# rather than corrupt state.
#
# A CLI rename is a plain filesystem move: git detects the rename at commit
# time, and the curator's existing `snapshot.sh post` captures it — no extra
# git plumbing here. CLI writes bypass the PreToolUse hooks, so the caller's
# post-phase `engine.sh verify` pass is mandatory (curator Phase 5 already is).
#
# Vault scoping per skills/obsidian-vault: every CLI call carries the resolved
# vault explicitly; never the CLI's "current" vault.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=resolve-vault.sh
source "${SCRIPT_DIR}/resolve-vault.sh"
VAULT=$(resolve_vault)

FROM=""
TO=""
while [ $# -gt 0 ]; do
  case "$1" in
    --target)
      VAULT="${2%/}"
      shift 2
      ;;
    --from)
      FROM="$2"
      shift 2
      ;;
    --to)
      TO="$2"
      shift 2
      ;;
    *) shift ;;
  esac
done

usage_error() {
  echo "[claude-wiki-pages] obsidian-rename: $1" >&2
  echo "usage: obsidian-rename.sh --from <vault-rel.md> --to <vault-rel.md> [--target <vault>]" >&2
  exit 2
}

[ -n "$FROM" ] && [ -n "$TO" ] || usage_error "--from and --to are required"
[ -d "$VAULT" ] || usage_error "vault not found: $VAULT"
[ -f "$VAULT/$FROM" ] || usage_error "--from does not exist: $VAULT/$FROM"

# Confinement: both paths must stay inside the vault (no traversal, no
# absolute paths) and inside wiki/ — raw/ is immutable and out of scope.
check_rel() {
  case "$1" in
    /* | *..*) usage_error "path escapes the vault: $1" ;;
    wiki/*) ;;
    *) usage_error "only wiki/ pages can be renamed (got: $1)" ;;
  esac
}
check_rel "$FROM"
check_rel "$TO"
[ -e "$VAULT/$TO" ] && usage_error "--to already exists: $VAULT/$TO"

skip() {
  echo "[skip] cli-rename: obsidian-cli unavailable"
  exit 3
}

command -v obsidian >/dev/null 2>&1 || skip
command -v jq >/dev/null 2>&1 || skip

# Obsidian identifies vaults by their folder; pass the resolved vault
# explicitly (obsidian-vault guard). JSON-escape the paths into the JS.
FROM_JS=$(printf '%s' "$FROM" | jq -Rr '@json')
TO_JS=$(printf '%s' "$TO" | jq -Rr '@json')
CODE="await app.fileManager.renameFile(app.vault.getAbstractFileByPath(${FROM_JS}), ${TO_JS})"

obsidian eval code="$CODE" --vault "$VAULT" >/dev/null 2>&1 || skip

# Post-condition: trust the disk, not the CLI exit code. The destination
# directory may be created by Obsidian; the source must be gone.
if [ -f "$VAULT/$TO" ] && [ ! -e "$VAULT/$FROM" ]; then
  echo "RENAMED: ${FROM} -> ${TO} (backlinks updated by Obsidian)"
  exit 0
fi
skip

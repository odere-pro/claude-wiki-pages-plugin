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
set -euo pipefail

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

# Confinement: both paths must resolve physically inside vault/wiki/ using
# realpath — mirrors protect-raw.sh/firewall.sh canonicalization so a
# traversal (../../etc/passwd) or a symlink escape cannot slip past the check.
# String-glob checks ("*..*") are insufficient because a crafted path like
# "wiki/a%2F..%2F../etc" can bypass them on some filesystems.
confine_to_wiki() {
  local rel="$1" abs_vault abs_wiki abs_target
  # Reject absolute paths before touching the filesystem.
  case "$rel" in
    /*) usage_error "path must be relative, not absolute: $rel" ;;
  esac
  # Reject the name-only case (must start with wiki/).
  case "$rel" in
    wiki/*) ;;
    *) usage_error "only wiki/ pages can be renamed (got: $rel)" ;;
  esac
  # Resolve the vault to its canonical physical path.
  abs_vault=$(cd "$VAULT" 2>/dev/null && pwd -P) || usage_error "cannot resolve vault: $VAULT"
  abs_wiki="${abs_vault}/wiki"
  # The FROM path must exist; the TO path may not exist yet. Resolve the
  # parent directory and reattach the basename so realpath-style resolution
  # works for both. The parent dir MUST exist for a safe rename.
  local dir base
  dir=$(dirname "${abs_vault}/${rel}")
  base=$(basename "${abs_vault}/${rel}")
  abs_target=$(cd "$dir" 2>/dev/null && printf '%s/%s' "$(pwd -P)" "$base") ||
    usage_error "cannot resolve parent directory for path: $rel"
  # Physical confinement: resolved path must have abs_wiki/ as its prefix.
  case "$abs_target" in
    "${abs_wiki}/"*) ;;
    *) usage_error "path escapes the vault wiki/: $rel (resolved to $abs_target)" ;;
  esac
}
confine_to_wiki "$FROM"
confine_to_wiki "$TO"
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

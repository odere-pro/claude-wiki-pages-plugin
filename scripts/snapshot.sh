#!/bin/bash
# snapshot.sh — the single agent-facing entry for git-bounding an LLM write phase.
#
#   snapshot.sh pre  [--target <vault>] [--op <id>]
#   snapshot.sh post [--target <vault>] [--op <id>] [--label "<msg>"]
#
# Delegates to the Bun engine (`engine.sh snapshot ...`) when Bun is present;
# otherwise falls back to inline git so the commit guarantee holds on degraded
# installs too. Honors gitCheckpoint.mode (off → no-op) and is pathspec-scoped
# to the vault, so a vault inside the user's project repo never stages their
# unrelated files. ALWAYS exits 0 — snapshot reports, it never gates a write.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=resolve-vault.sh
source "${SCRIPT_DIR}/resolve-vault.sh"
VAULT=$(resolve_vault)

SUB="${1:-}"
[ "$SUB" = "pre" ] || [ "$SUB" = "post" ] || {
  echo "[claude-wiki-pages] snapshot: usage: snapshot.sh <pre|post> [--target <vault>] [--op <id>] [--label <msg>]" >&2
  exit 0
}
shift

OP=""
LABEL="claude-wiki-pages write phase"
while [ $# -gt 0 ]; do
  case "$1" in
    --target)
      VAULT="${2%/}"
      shift 2
      ;;
    --op)
      OP="$2"
      shift 2
      ;;
    --label)
      LABEL="$2"
      shift 2
      ;;
    *) shift ;;
  esac
done

[ -d "$VAULT" ] || exit 0
[ -z "$OP" ] && OP="snap-$(date +%Y%m%d%H%M%S 2>/dev/null || echo 0)"

# ── Engine path (Bun present) ────────────────────────────────────────────────
if command -v bun >/dev/null 2>&1; then
  bash "${SCRIPT_DIR}/engine.sh" snapshot "$SUB" --target "$VAULT" --op "$OP" --label "$LABEL" || true
  exit 0
fi

# ── Bash fallback (no Bun) — same semantics, inline git ─────────────────────
PROJECT_CFG=".claude/claude-wiki-pages.json"
USER_CFG="${CLAUDE_CONFIG_DIR:-$HOME/.config}/claude-wiki-pages/config.json"

cfg_scalar() {
  local filter="$1" val=""
  command -v jq >/dev/null 2>&1 || return
  [ -f "$PROJECT_CFG" ] && val=$(jq -r "${filter} // empty" "$PROJECT_CFG" 2>/dev/null)
  if [ -z "$val" ] && [ -f "$USER_CFG" ]; then
    val=$(jq -r "${filter} // empty" "$USER_CFG" 2>/dev/null)
  fi
  printf '%s' "$val"
}

MODE="${CLAUDE_WIKI_PAGES_GITCHECKPOINT_MODE:-$(cfg_scalar '.gitCheckpoint.mode')}"
[ -z "$MODE" ] && MODE="commit"
if [ "$MODE" = "off" ]; then
  echo "snapshot ${SUB}: skipped (gitCheckpoint.mode=off)"
  exit 0
fi

# Internal bookkeeping identity — never user-attributed, never GPG-blocked.
GIT=(git -C "$VAULT" -c user.name=claude-wiki-pages
  -c user.email=claude-wiki-pages@users.noreply.github.com
  -c commit.gpgsign=false)

# Guarantee coverage: some repo must contain the vault before any commit.
if ! git -C "$VAULT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git -C "$VAULT" init >/dev/null 2>&1 || true
  "${GIT[@]}" add -A -- . >/dev/null 2>&1 || true
  "${GIT[@]}" commit --no-verify -m "chore(claude-wiki-pages): initial vault commit" -- . >/dev/null 2>&1 || true
fi

if [ "$SUB" = "pre" ]; then
  ISO=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo "?")
  if [ "$MODE" = "branch" ] || [ "$MODE" = "both" ]; then
    "${GIT[@]}" branch "cwp/checkpoint/${OP}" >/dev/null 2>&1 || true
  fi
  "${GIT[@]}" add -A -- . >/dev/null 2>&1 || true
  "${GIT[@]}" commit --no-verify --allow-empty -m "checkpoint: claude-wiki-pages pre-heal ${ISO} ${OP}" -- . >/dev/null 2>&1 || true
  SHA=$("${GIT[@]}" rev-parse --short HEAD 2>/dev/null || echo "?")
  echo "snapshot pre: checkpoint ${SHA} (rollback: git revert ${SHA})"
else
  if [ -z "$(git -C "$VAULT" status --porcelain -- . 2>/dev/null | head -1)" ]; then
    echo "snapshot post: nothing to commit (vault clean)"
    exit 0
  fi
  "${GIT[@]}" add -A -- . >/dev/null 2>&1 || true
  "${GIT[@]}" commit --no-verify -m "snapshot: ${LABEL} ${OP}" -- . >/dev/null 2>&1 || true
  SHA=$("${GIT[@]}" rev-parse --short HEAD 2>/dev/null || echo "?")
  echo "snapshot post: committed ${SHA} (${LABEL}; rollback: git revert ${SHA})"
fi

exit 0

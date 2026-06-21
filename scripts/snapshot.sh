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
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=resolve-vault.sh
source "${SCRIPT_DIR}/resolve-vault.sh"
# shellcheck source=vault-lock.sh
source "${SCRIPT_DIR}/vault-lock.sh"
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
  command -v jq >/dev/null 2>&1 || return 0
  # Use `|| true` so a malformed config file does not abort the caller under
  # set -e; a missing/invalid key is silently treated as empty (best-effort).
  [ -f "$PROJECT_CFG" ] && val=$(jq -r "${filter} // empty" "$PROJECT_CFG" 2>/dev/null || true)
  if [ -z "$val" ] && [ -f "$USER_CFG" ]; then
    val=$(jq -r "${filter} // empty" "$USER_CFG" 2>/dev/null || true)
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

if [ "$SUB" = "pre" ]; then
  # H09 fix: acquire the advisory vault lock BEFORE any git operation,
  # including ensureRepo.  Putting ensureRepo inside the lock means two
  # concurrent bash-fallback pre invocations cannot race over git init /
  # index / the initial commit.  The lock covers the entire pre critical
  # section: ensureRepo → branch → add → commit.
  # C01: fail-closed on timeout — skip all git ops rather than run them
  # outside the lock.
  if ! vault_lock_acquire "$VAULT"; then
    echo "snapshot pre: WARN: could not acquire vault lock — skipping checkpoint to avoid race (C01)" >&2
    echo "snapshot pre: skipped (lock timeout)"
    exit 0
  fi
  # ensureRepo inside the lock (H09): guarantee coverage without the race.
  # M33: add uses the explicit scoped pathspec -- . (not -A) so a vault that
  # lives inside a parent-project repo never stages unrelated files.
  if ! git -C "$VAULT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    git -C "$VAULT" init >/dev/null 2>&1 || true
    "${GIT[@]}" add -- . >/dev/null 2>&1 || true
    "${GIT[@]}" commit --no-verify -m "chore(claude-wiki-pages): initial vault commit" -- . >/dev/null 2>&1 || true
  fi
  ISO=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo "?")
  if [ "$MODE" = "branch" ] || [ "$MODE" = "both" ]; then
    "${GIT[@]}" branch "cwp/checkpoint/${OP}" >/dev/null 2>&1 || true
  fi
  # Explicit scoped pathspec (M33): -- . instead of -A alone to prevent
  # pathspec confusion when the vault inherits a parent-project repo.
  "${GIT[@]}" add -- . >/dev/null 2>&1 || true
  "${GIT[@]}" commit --no-verify --allow-empty -m "checkpoint: claude-wiki-pages pre-heal ${ISO} ${OP}" -- . >/dev/null 2>&1 || true
  SHA=$("${GIT[@]}" rev-parse --short HEAD 2>/dev/null || echo "?")
  vault_lock_release "$VAULT"
  echo "snapshot pre: checkpoint ${SHA} (rollback: git revert ${SHA})"
else
  # post degraded-path ensureRepo: when pre was skipped or the repo vanished,
  # recover coverage before the lock.  ensureRepo is idempotent; the
  # data-mutating sequence (isClean → appendLog → commit) is inside the lock.
  # M33: use explicit scoped pathspec -- . (not -A) here too.
  if ! git -C "$VAULT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    git -C "$VAULT" init >/dev/null 2>&1 || true
    "${GIT[@]}" add -- . >/dev/null 2>&1 || true
    "${GIT[@]}" commit --no-verify -m "chore(claude-wiki-pages): initial vault commit" -- . >/dev/null 2>&1 || true
  fi
  if [ -z "$(git -C "$VAULT" status --porcelain -- . 2>/dev/null | head -1)" ]; then
    echo "snapshot post: nothing to commit (vault clean)"
    exit 0
  fi
  # Acquire the advisory vault lock to guard the isClean→appendLog→commit
  # sequence against concurrent post invocations (H09 / H07 pattern).
  # C01: fail-closed on timeout — skip the git ops to avoid racing.
  if ! vault_lock_acquire "$VAULT"; then
    echo "snapshot post: WARN: could not acquire vault lock — skipping commit to avoid race (C01)" >&2
    echo "snapshot post: skipped (lock timeout)"
    exit 0
  fi
  # Re-check cleanliness inside the lock to close the TOCTOU window.
  if [ -z "$(git -C "$VAULT" status --porcelain -- . 2>/dev/null | head -1)" ]; then
    vault_lock_release "$VAULT"
    echo "snapshot post: nothing to commit (vault clean)"
    exit 0
  fi
  # Paper trace: record the pre-state SHA in wiki/log.md BEFORE committing so
  # the entry lands inside the snapshot commit (a commit cannot contain its
  # own SHA). Mirrors the engine's snapshot post behavior.
  if [ -f "${VAULT}/wiki/log.md" ]; then
    PRE=$("${GIT[@]}" rev-parse --short HEAD 2>/dev/null || echo "")
    DAY=$(date -u +%Y-%m-%d 2>/dev/null || echo "0000-00-00")
    {
      printf '\n## [%s] snapshot | %s (%s)\n\n' "${DAY}" "${LABEL}" "${OP}"
      [ -n "${PRE}" ] && printf -- '- pre-state: %s\n' "${PRE}"
      printf -- '- rollback: git revert the snapshot commit below\n'
    } >>"${VAULT}/wiki/log.md" 2>/dev/null || true
  fi
  # Explicit scoped pathspec (M33): -- . instead of -A alone.
  "${GIT[@]}" add -- . >/dev/null 2>&1 || true
  "${GIT[@]}" commit --no-verify -m "snapshot: ${LABEL} ${OP}" -- . >/dev/null 2>&1 || true
  SHA=$("${GIT[@]}" rev-parse --short HEAD 2>/dev/null || echo "?")
  vault_lock_release "$VAULT"
  echo "snapshot post: committed ${SHA} (${LABEL}; rollback: git revert ${SHA})"
fi

exit 0

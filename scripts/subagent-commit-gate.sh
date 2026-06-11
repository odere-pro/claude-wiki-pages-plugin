#!/bin/bash
# SubagentStop: commit backstop for the write-path agents.
#
# The write-path agents (ingest, curator, polish, maintenance) git-bound their
# own writes via snapshot.sh / engine heal — this hook is the safety net for
# anything left dirty when one of them returns (a phase that died mid-write, a
# skipped snapshot call, a degraded path). It commits residual vault changes as
# one labelled backstop commit so no LLM write ever escapes git coverage.
#
# NEVER blocks: every step is best-effort and the script always exits 0. It is
# pathspec-scoped to the vault, so a vault inheriting the parent project repo
# never swallows the user's unrelated files. Honors gitCheckpoint.mode=off.
set -uo pipefail

INPUT=$(cat)
AGENT_NAME=$(echo "${INPUT}" | jq -r '.agent_name // empty' 2>/dev/null) || AGENT_NAME=""

case "${AGENT_NAME}" in
  claude-wiki-pages-ingest-agent | claude-wiki-pages-curator-agent | claude-wiki-pages-polish-agent | claude-wiki-pages-maintenance-agent) ;;
  *) exit 0 ;;
esac

# shellcheck source=resolve-vault.sh
source "$(dirname "$0")/resolve-vault.sh"
VAULT=$(resolve_vault)
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
case "${VAULT}" in
  /*) ;;
  *) VAULT="${PROJECT_DIR}/${VAULT}" ;;
esac
[ -d "${VAULT}" ] || exit 0

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
[ "$MODE" = "off" ] && exit 0

# Internal bookkeeping identity — never user-attributed, never GPG-blocked.
GIT=(git -C "${VAULT}" -c user.name=claude-wiki-pages
  -c user.email=claude-wiki-pages@users.noreply.github.com
  -c commit.gpgsign=false)

# Guarantee coverage even on degraded paths: if no repo contains the vault,
# create one (mirrors scaffold-vault.sh's fallback).
if ! git -C "${VAULT}" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git -C "${VAULT}" init >/dev/null 2>&1 || true
fi

# Cheap dirty probe, scoped to the vault.
DIRTY=$(git -C "${VAULT}" status --porcelain -- . 2>/dev/null | head -1) || DIRTY=""
[ -z "${DIRTY}" ] && exit 0

ISO=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo "?")
# Paper trace: log the backstop with its pre-state SHA before committing, so
# the entry lands inside the backstop commit (a commit cannot contain its own
# SHA). Only appends when the log already exists — a hook never creates it.
if [ -f "${VAULT}/wiki/log.md" ]; then
  PRE=$("${GIT[@]}" rev-parse --short HEAD 2>/dev/null || echo "")
  DAY=$(date -u +%Y-%m-%d 2>/dev/null || echo "0000-00-00")
  {
    printf '\n## [%s] snapshot | %s backstop (%s)\n\n' "${DAY}" "${AGENT_NAME}" "${ISO}"
    [ -n "${PRE}" ] && printf -- '- pre-state: %s\n' "${PRE}"
    printf -- '- rollback: git revert the backstop commit below\n'
  } >>"${VAULT}/wiki/log.md" 2>/dev/null || true
fi
"${GIT[@]}" add -A -- . >/dev/null 2>&1 || true
"${GIT[@]}" commit --no-verify -m "snapshot: claude-wiki-pages ${AGENT_NAME} post-write backstop ${ISO}" -- . >/dev/null 2>&1 || true

PUSH=$(cfg_scalar '.gitCheckpoint.push')
if [ "${PUSH}" = "auto" ]; then
  git -C "${VAULT}" push >/dev/null 2>&1 || true
fi

SHA=$("${GIT[@]}" rev-parse --short HEAD 2>/dev/null) || SHA="?"
echo "COMMIT BACKSTOP: ${AGENT_NAME} left uncommitted vault changes — committed as ${SHA} (rollback: git revert ${SHA})." >&2

exit 0

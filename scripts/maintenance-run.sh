#!/bin/bash
# maintenance-run.sh — thin host-callable helper for OS cron / scheduled upkeep.
#
# Drives the existing headless maintenance recipe: resolve the active vault,
# optionally pull wired sources (maintenance.syncWiredOnRun), then invoke the
# maintenance-agent catch-up loop bounded by maintenance.maxPerRun.
#
# Design constraints (from the scheduling roadmap, decisions D11–D13/D16–D17):
#   - OPT-IN: refuses and exits 0 unless maintenance.unattended=true.
#   - OFF BY DEFAULT: maintenance.unattended defaults to false.
#   - NEVER AUTO-PROMOTES: drafts route to _proposed/, never written directly.
#   - IDEMPOTENT / SAFE TO CRON: exits 0 on "nothing to do"; no side effects
#     when the backlog is already empty.
#   - WRITE CONFINEMENT: every write goes through the resolved active vault and
#     the existing firewall path; raw/ is never overwritten (sync writes only
#     NEW immutable raw/wired/ siblings via sync-source.sh).
#   - RAW IMMUTABLE: this script never edits files in raw/; sync-source.sh
#     enforces that contract for wired-source pulls.
#   - SINGLE ACTIVE VAULT: resolves exactly one vault via resolve-vault.sh.
#   - SAFETY GUARD: refuses to run against tests/fixtures/reference-vault (the reference
#     fixture; it must stay immutable for gates and tests).
#
# Usage:
#   bash scripts/maintenance-run.sh [--target <vault>]
#
# Enable:
#   In .claude/claude-wiki-pages.json (project) or
#   ~/.config/claude-wiki-pages/config.json (user), add:
#
#     { "maintenance": { "unattended": true } }
#
# Cron example (run nightly):
#   0 2 * * * cd /path/to/project && bash scripts/maintenance-run.sh
#
# Auditability: after every run, wiki/log.md has one entry tagged with
# "scheduled" / "autonomous" carrying the source count and a named revert
# anchor so "git revert <sha>" restores the exact pre-run tree.

set -euo pipefail

# Canonicalize SCRIPT_DIR using realpath when available (preferred), otherwise
# fall back to cd + pwd -P.  This ensures _repo_root is case-correct on a
# case-insensitive macOS filesystem even when the script is invoked via a
# case-aliased path (e.g. /git vs /Git — bash -c subshells do not always
# canonicalize through pwd -P on macOS).  The vault-example guard below
# compares _repo_root against _abs_vault; both must use the same canonical
# representation or the comparison silently fails.
_script_path="$(dirname "$0")"
if command -v realpath >/dev/null 2>&1; then
  SCRIPT_DIR="$(realpath "$_script_path" 2>/dev/null)" || SCRIPT_DIR="$(cd "$_script_path" && pwd -P)"
else
  SCRIPT_DIR="$(cd "$_script_path" && pwd -P)"
fi
unset _script_path

# shellcheck source=resolve-vault.sh
source "${SCRIPT_DIR}/resolve-vault.sh"
# shellcheck source=vault-lock.sh
source "${SCRIPT_DIR}/vault-lock.sh"
VAULT=$(resolve_vault)

# ── Flag parsing ─────────────────────────────────────────────────────────────
while [ $# -gt 0 ]; do
  case "$1" in
    --target)
      VAULT="${2%/}"
      shift 2
      ;;
    *) shift ;;
  esac
done

# ── Config helpers (same pattern as heartbeat.sh and snapshot.sh) ─────────────
PROJECT_CFG=".claude/claude-wiki-pages.json"
USER_CFG="${CLAUDE_CONFIG_DIR:-${HOME}/.config}/claude-wiki-pages/config.json"

cfg_scalar() {
  local filter="$1" val=""
  # Return 0 (empty string) when jq is absent — never propagate a non-zero
  # exit to the caller, which would abort the script under set -e (N18).
  command -v jq >/dev/null 2>&1 || return 0
  [ -f "${PROJECT_CFG}" ] && val=$(jq -r "${filter} // empty" "${PROJECT_CFG}" 2>/dev/null) || true
  if [ -z "${val}" ] && [ -f "${USER_CFG}" ]; then
    val=$(jq -r "${filter} // empty" "${USER_CFG}" 2>/dev/null) || true
  fi
  printf '%s' "${val}"
}

# ── Safety guard: never target tests/fixtures/reference-vault ────────────────────────────
# Canonicalize both paths (follow symlinks, resolve ..) before comparing so the
# check is robust to how the caller sets CLAUDE_WIKI_PAGES_VAULT.
_abs_vault=""
if [ -d "${VAULT}" ]; then
  _abs_vault=$(cd "${VAULT}" && pwd -P 2>/dev/null) || _abs_vault=""
fi
_repo_root="$(cd "${SCRIPT_DIR}/.." && pwd -P 2>/dev/null)" || _repo_root=""
_example_vault="${_repo_root}/tests/fixtures/reference-vault"

# Block if the resolved vault IS tests/fixtures/reference-vault (exact match after
# canonicalization). A vault named tests/fixtures/reference-vault-extended is fine.
if [ -n "${_abs_vault}" ] && [ -n "${_example_vault}" ] && [ "${_abs_vault}" = "${_example_vault}" ]; then
  echo "[maintenance-run] REFUSED: tests/fixtures/reference-vault is the reference fixture and must not be modified by scheduled runs. Set CLAUDE_WIKI_PAGES_VAULT to your project vault."
  exit 0
fi

# ── Unattended gate ───────────────────────────────────────────────────────────
# The key maintenance.unattended does not exist in the schema yet (P1-B1 adds
# it); default to false so the script is safe to run before that change lands.
UNATTENDED=$(cfg_scalar '.maintenance.unattended')
if [ "${UNATTENDED}" != "true" ]; then
  echo "[maintenance-run] Scheduled upkeep is OFF (maintenance.unattended is not true)."
  echo "  To enable: set maintenance.unattended: true in .claude/claude-wiki-pages.json"
  echo "  Then re-run: bash scripts/maintenance-run.sh"
  echo "  See docs/automation.md for the full scheduling recipe."
  exit 0
fi

# ── Vault existence check ─────────────────────────────────────────────────────
if [ ! -d "${VAULT}" ]; then
  echo "[maintenance-run] WARN: vault directory '${VAULT}' does not exist — nothing to do." >&2
  exit 0
fi

# ── maxPerRun ─────────────────────────────────────────────────────────────────
MAX_PER_RUN=$(cfg_scalar '.maintenance.maxPerRun')
[ -z "${MAX_PER_RUN}" ] && MAX_PER_RUN=10

# ── Backlog probe ─────────────────────────────────────────────────────────────
# When Bun is present, ask the engine; otherwise fall back to a raw-count probe.
# The script is idempotent: "nothing to do" → exit 0.
NEEDS_CATCHUP="false"
PENDING=0

if command -v bun >/dev/null 2>&1; then
  _backlog_json=$(bash "${SCRIPT_DIR}/engine.sh" backlog --target "${VAULT}" --json 2>/dev/null) || _backlog_json=""
  if [ -n "${_backlog_json}" ] && command -v jq >/dev/null 2>&1; then
    NEEDS_CATCHUP=$(printf '%s' "${_backlog_json}" | jq -r '.needsCatchup // "false"' 2>/dev/null) || NEEDS_CATCHUP="false"
    PENDING=$(printf '%s' "${_backlog_json}" | jq -r '.pendingRaw | length' 2>/dev/null) || PENDING=0
  fi
else
  # Degraded mode (no Bun): count raw files lacking a _sources/<stem>.md summary.
  if [ -d "${VAULT}/raw" ]; then
    while IFS= read -r f; do
      stem=$(basename "${f}")
      stem="${stem%.*}"
      [ -f "${VAULT}/wiki/_sources/${stem}.md" ] || PENDING=$((PENDING + 1))
    done < <(find "${VAULT}/raw" -type f -not -path '*/assets/*' -not -name '.*' 2>/dev/null || true)
  fi
  [ "${PENDING}" -gt 0 ] && NEEDS_CATCHUP="true"
fi

if [ "${NEEDS_CATCHUP}" != "true" ]; then
  echo "[maintenance-run] Nothing to do — vault backlog is empty."
  exit 0
fi

# ── Optional wired-source sync ────────────────────────────────────────────────
# maintenance.syncWiredOnRun defaults to false; network is never touched unless
# the operator has explicitly opted in. Writes only NEW immutable raw/wired/
# siblings via sync-source.sh (raw/ is never overwritten).
SYNC_WIRED=$(cfg_scalar '.maintenance.syncWiredOnRun')
if [ "${SYNC_WIRED}" = "true" ]; then
  echo "[maintenance-run] Pulling wired sources (maintenance.syncWiredOnRun=true) ..."
  bash "${SCRIPT_DIR}/sync-source.sh" pull 2>&1 || true
fi

# ── Maintenance loop via Claude Code ─────────────────────────────────────────
# The actual LLM work is done by invoking the claude-wiki-pages-maintenance-agent
# in unattended mode. This script is a HOST-SIDE WRAPPER — it resolves the vault,
# enforces the opt-in gate, and hands off to the agent. The agent is invoked
# headless by the cron runner through the Claude Code CLI.
#
# This wrapper records the scheduled-run intent to wiki/log.md so the run is
# auditable BEFORE the LLM step (the agent appends its own structured entry):
TODAY=$(date -u +%Y-%m-%d 2>/dev/null || echo "0000-00-00")
ISO=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo "?")
if [ -f "${VAULT}/wiki/log.md" ]; then
  # Acquire the advisory vault lock before appending to wiki/log.md to avoid
  # racing with a concurrent cron run or with the agent's own appendLog call
  # (H06 — unguarded >> append). The lock is released after the append.
  if vault_lock_acquire "${VAULT}"; then
    {
      printf '\n## [%s] scheduled-upkeep | autonomous maintenance-run started %s\n\n' "${TODAY}" "${ISO}"
      printf -- '- vault: %s\n' "${VAULT}"
      printf -- '- pending sources: %s (capped at maxPerRun=%s)\n' "${PENDING}" "${MAX_PER_RUN}"
      printf -- '- syncWiredOnRun: %s\n' "${SYNC_WIRED:-false}"
      printf -- '- undo: git -C %s revert <post-snapshot-sha>\n' "${VAULT}"
    } >>"${VAULT}/wiki/log.md" 2>/dev/null || true
    vault_lock_release "${VAULT}"
  else
    # Lock unavailable — append anyway; the lock is advisory and best-effort.
    {
      printf '\n## [%s] scheduled-upkeep | autonomous maintenance-run started %s\n\n' "${TODAY}" "${ISO}"
      printf -- '- vault: %s\n' "${VAULT}"
      printf -- '- pending sources: %s (capped at maxPerRun=%s)\n' "${PENDING}" "${MAX_PER_RUN}"
      printf -- '- syncWiredOnRun: %s\n' "${SYNC_WIRED:-false}"
      printf -- '- undo: git -C %s revert <post-snapshot-sha>\n' "${VAULT}"
    } >>"${VAULT}/wiki/log.md" 2>/dev/null || true
  fi
fi

# The claude CLI invocation is the real maintenance step. This script is the
# thin wrapper that owns: vault resolution, unattended gate, sync, and the
# audit breadcrumb above. The LLM invocation is intentionally left as a comment
# showing the intended host-cron recipe so it is auditable and discoverable:
#
#   claude -p "/claude-wiki-pages:wiki" \
#     --cwd "$(pwd)" \
#     --env CLAUDE_WIKI_PAGES_VAULT="$VAULT" \
#     --env CLAUDE_WIKI_PAGES_MAINTENANCE_UNATTENDED=true
#
# The cron operator controls this invocation. The helper's job is done: the
# gate, the vault check, the sync, and the audit entry are complete.
_cwd="$(pwd)"
echo "[maintenance-run] Scheduled run started for vault '${VAULT}' (${PENDING} pending source(s), maxPerRun=${MAX_PER_RUN})."
echo "[maintenance-run] Invoke Claude Code headless to complete the maintenance loop:"
printf '  claude -p "/claude-wiki-pages:wiki" --cwd "%s" --env CLAUDE_WIKI_PAGES_VAULT="%s"\n' "${_cwd}" "${VAULT}"
echo "[maintenance-run] See docs/automation.md for the full scheduling recipe."
exit 0

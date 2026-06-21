#!/bin/bash
# SessionStart: initialise plugin settings then print schema reminder.
# If the vault directory does not exist yet, prints a setup prompt instead
# so the user knows to run the onboarding wizard.
# Also surfaces a one-line notice when Bun (the deterministic engine runtime) is
# missing — the plugin still works (bash hooks are unaffected), but the engine
# commands and git-checkpointed self-heal are disabled until Bun is on PATH.
#
# Always emits:
#   INDEX: pointer to vault's MOC (wiki/index.md) when it exists — orients the
#          agent at session start without loading MOC content into context.
#   NEXT:  a config-independent suggested next step, derived deterministically
#          from vault filesystem state (no settings.json required).
set -euo pipefail

# shellcheck source=resolve-vault.sh
source "$(dirname "$0")/resolve-vault.sh"
init_vault_settings
VAULT=$(resolve_vault)
# P1.1: Resolve to an absolute canonical path so the REMINDER pointer is never
# relative (e.g. "docs/vault"). Use `cd … && pwd -P` to follow symlinks.
# If the directory does not exist the cd fails, _ABS_VAULT stays empty, and we
# fall into the SETUP branch — no broken pointer is ever emitted.
_ABS_VAULT=""
if [ -d "$VAULT" ]; then
  _ABS_VAULT=$(cd "$VAULT" && pwd -P 2>/dev/null) || true
fi
if [ -z "$_ABS_VAULT" ]; then
  echo "SETUP: Vault not found at '${VAULT}'. Run /claude-wiki-pages:init to initialise your vault, or set a different path: bash scripts/set-vault.sh <path>"
  echo "NEXT: run /claude-wiki-pages:wiki to initialise the vault and follow the onboarding wizard."
else
  VAULT="$_ABS_VAULT"
  echo "REMINDER: Read ${VAULT}/CLAUDE.md before any wiki operation. It is the authoritative schema — skill defaults that conflict with it must be overridden."
  # C4-read: MOC pointer — lets the agent orient to the vault's table of contents
  # without loading its content into context. Emitted only when the file exists.
  if [ -f "${VAULT}/wiki/index.md" ]; then
    echo "INDEX: Vault table of contents is at ${VAULT}/wiki/index.md — read it to orient before any query or ingest."
  fi
  # U3: Config-independent NEXT line. "Pending" = raw sources ADDED or CHANGED
  # since the last logged operation. wiki/log.md is appended on every ingest /
  # lint / snapshot, so its mtime marks the last sync; a raw file newer than it
  # is genuinely unprocessed. Counting *all* raw files (the previous behavior)
  # overstated this wildly — every already-ingested source looked "pending"
  # (e.g. 90 raw sources, all ingested, reported as 90 pending).
  _raw_pending=0
  if [ -d "${VAULT}/raw" ]; then
    _log="${VAULT}/wiki/log.md"
    if [ -f "${_log}" ]; then
      _raw_pending=$(find "${VAULT}/raw" -type f -not -path '*/assets/*' -not -name '.*' -newer "${_log}" 2>/dev/null | wc -l | tr -d ' ')
    else
      # No log yet (fresh vault) — every raw source is genuinely pending.
      _raw_pending=$(find "${VAULT}/raw" -type f -not -path '*/assets/*' -not -name '.*' 2>/dev/null | wc -l | tr -d ' ')
    fi
  fi
  if [ "${_raw_pending}" -gt 0 ]; then
    echo "NEXT: run /claude-wiki-pages:wiki to process ${_raw_pending} pending source(s) in raw/."
  else
    echo "NEXT: run /claude-wiki-pages:wiki to query, ingest, or maintain the vault."
  fi
fi
if ! command -v bun >/dev/null 2>&1; then
  echo "ERROR: Bun is required and not installed — the deterministic engine (verify/fix/heal/doctor/config), json-tool.ts, settings-tool.ts, and git-checkpointed self-heal are disabled; schema-enforcing hooks still run. Install: curl -fsSL https://bun.sh/install | bash  (then restart the session). See https://bun.sh/install or run /claude-wiki-pages:doctor."
fi
# jq pre-flight: unlike Bun, jq absence is NOT graceful — the JSON-parsing
# PreToolUse guards (firewall, frontmatter, raw-protect) cannot read the
# tool-call payload and pass writes through unchecked. Surface it loudly.
if ! command -v jq >/dev/null 2>&1; then
  echo "NOTICE: jq is not installed — the schema-enforcing hooks (firewall, frontmatter, raw-protect) cannot parse tool-call JSON and writes pass through unchecked. Install: brew install jq (macOS) or sudo apt-get install jq (Linux), then restart the session. See /claude-wiki-pages:doctor."
fi

# _ss_with_timeout <secs> <cmd...>
# Runs a command with a hard wall-clock limit regardless of which timeout
# utility is available:
#   1. GNU  timeout  (Linux default, macOS with coreutils)
#   2. BSD  gtimeout (macOS Homebrew coreutils: brew install coreutils)
#   3. Pure-bash fallback: background the command, race a sleep watchdog, and
#      kill whichever finishes last.  Avoids an unbounded call on systems where
#      neither utility is installed.  Mirrors the pattern in heartbeat.sh.
_ss_with_timeout() {
  local secs="$1"
  shift
  if command -v timeout >/dev/null 2>&1; then
    timeout "$secs" "$@"
    return $?
  fi
  if command -v gtimeout >/dev/null 2>&1; then
    gtimeout "$secs" "$@"
    return $?
  fi
  # Pure-bash fallback: race command against a sleep watchdog.
  "$@" &
  local _cmd_pid=$!
  (
    sleep "$secs" 2>/dev/null
    kill "$_cmd_pid" 2>/dev/null
  ) &
  local _wdog_pid=$!
  local _rc=0
  wait "$_cmd_pid" 2>/dev/null || _rc=$?
  kill "$_wdog_pid" 2>/dev/null || true
  wait "$_wdog_pid" 2>/dev/null || true
  return "$_rc"
}

# Surface a maintenance catch-up recommendation when enabled (maintenance.enabled).
# Silent no-op by default; never mutates the vault.
# M26: wrap heartbeat.sh with a timeout so SessionStart cannot hang when the
# engine.sh backlog call blocks (e.g. on a slow filesystem or a hung git lock).
# 10 s is generous for a heartbeat probe; adjust via CLAUDE_WIKI_PAGES_HEARTBEAT_TIMEOUT_SEC.
# _ss_with_timeout provides a pure-bash watchdog on systems without GNU/BSD timeout.
_hb_timeout="${CLAUDE_WIKI_PAGES_HEARTBEAT_TIMEOUT_SEC:-10}"
_ss_with_timeout "${_hb_timeout}" bash "$(dirname "$0")/heartbeat.sh" || true

# Degraded-mode advisory (ADR-0018): when a local model is enabled AND an offline
# policy is set, probe reachability and surface which tier is available or BLOCKED.
# Strictly opt-in — silent unless localModel.enabled && offlinePolicy != "off" —
# and best-effort: the probe has hard timeouts and the whole block is wrapped so a
# miss never aborts the hook. No network is touched in the default (off) policy.
# M26: wrap the engine config call with a bounded timeout so SessionStart cannot
# hang when the engine blocks (e.g. on a slow filesystem or a hung git lock).
# Default 10 s; overridable via CLAUDE_WIKI_PAGES_CONFIG_TIMEOUT_SEC.
_cfg_timeout="${CLAUDE_WIKI_PAGES_CONFIG_TIMEOUT_SEC:-10}"
if command -v bun >/dev/null 2>&1 && command -v jq >/dev/null 2>&1; then
  # `config` exits 1 when localModelErrors is non-empty; `|| true` keeps the
  # captured JSON (command substitution captures stdout regardless of exit code).
  _cfg=$(_ss_with_timeout "${_cfg_timeout}" bash "$(dirname "$0")/engine.sh" config --json 2>/dev/null) || true
  if [ -n "${_cfg}" ]; then
    _lm_enabled=$(printf '%s' "${_cfg}" | jq -r '.config.localModel.enabled' 2>/dev/null) || _lm_enabled="false"
    _policy=$(printf '%s' "${_cfg}" | jq -r '.config.localModel.offlinePolicy // "off"' 2>/dev/null) || _policy="off"
    if [ "${_lm_enabled}" = "true" ] && [ "${_policy}" != "off" ]; then
      _tier=$(printf '%s' "${_cfg}" | jq -r '.config.localModel.tier // "draft"' 2>/dev/null) || _tier="draft"
      _endpoint=$(printf '%s' "${_cfg}" | jq -r '.config.localModel.endpoint // "http://localhost:11434"' 2>/dev/null) || _endpoint="http://localhost:11434"
      _lm_errors=$(printf '%s' "${_cfg}" | jq -r '.localModelErrors | length' 2>/dev/null) || _lm_errors="0"
      _reach=$(bash "$(dirname "$0")/reachability.sh" --policy "${_policy}" --endpoint "${_endpoint}" 2>/dev/null) || _reach=""
      _ollama=$(printf '%s' "${_reach}" | jq -r '.ollama // "down"' 2>/dev/null) || _ollama="down"
      _claude=$(printf '%s' "${_reach}" | jq -r '.claudeApi // "unreachable"' 2>/dev/null) || _claude="unreachable"
      if [ "${_lm_errors}" != "0" ]; then
        echo "DEGRADED: local-model tier '${_tier}' is BLOCKED (not gate-approved). Claude=${_claude}, Ollama=${_ollama}. Run 'bash scripts/engine.sh config validate' for the teaching message; keep localModel.enabled false to stay Claude-primary."
      elif [ "${_claude}" = "unreachable" ] && [ "${_ollama}" = "up" ]; then
        echo "DEGRADED: Claude unreachable, Ollama up — local '${_tier}' drafting is available offline. Run /claude-wiki-pages:draft, or 'bash scripts/offline-draft.sh' (drafts land in _proposed/ for review)."
      elif [ "${_ollama}" != "up" ]; then
        echo "DEGRADED: no local fallback — Ollama is ${_ollama} at ${_endpoint}. Claude=${_claude}. Start 'ollama serve' to enable offline '${_tier}' drafting."
      else
        echo "DEGRADED: offlinePolicy='${_policy}', tier='${_tier}' ready. Claude=${_claude}, Ollama=${_ollama}."
      fi
    fi
  fi
fi

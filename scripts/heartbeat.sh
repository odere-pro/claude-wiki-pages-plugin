#!/bin/bash
# Surfaces a one-line maintenance catch-up recommendation when the vault has a
# backlog (unprocessed raw sources or an overdue lint). Called from SessionStart
# and runnable manually; safe to run anywhere.
#
# It never invokes an LLM or mutates the vault — bash cannot ingest. It only
# *recommends* running /claude-wiki-pages:wiki, which is the LLM step. Off by
# default (maintenance.enabled=false) so nothing autonomous runs unbidden; a
# cooldown stamp prevents it from nagging every session.

# shellcheck source=resolve-vault.sh
source "$(dirname "$0")/resolve-vault.sh"
VAULT=$(resolve_vault)

while [ $# -gt 0 ]; do
  case "$1" in
    --target)
      VAULT="${2%/}"
      shift 2
      ;;
    *) shift ;;
  esac
done

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

ENABLED=$(cfg_scalar '.maintenance.enabled')
[ "$ENABLED" = "true" ] || exit 0 # opt-in only
[ -d "$VAULT" ] || exit 0

LINT_DAYS=$(cfg_scalar '.maintenance.lintEveryDays')
[ -z "$LINT_DAYS" ] && LINT_DAYS=7
COOLDOWN=$(cfg_scalar '.maintenance.cooldownMinutes')
[ -z "$COOLDOWN" ] && COOLDOWN=60

# Cooldown: skip if we emitted a recommendation within the window.
STAMP="$(dirname "$CLAUDE_WIKI_PAGES_SETTINGS")/last-heartbeat"
NOW=$(date +%s 2>/dev/null || echo 0)
if [ -f "$STAMP" ] && [ "$COOLDOWN" -gt 0 ]; then
  LAST=$(cat "$STAMP" 2>/dev/null || echo 0)
  if [ "$NOW" -ne 0 ] && [ $((NOW - LAST)) -lt $((COOLDOWN * 60)) ]; then
    exit 0
  fi
fi

# Prefer the deterministic engine; fall back to a minimal bash probe.
# M27: wrap engine.sh with a timeout so the heartbeat cannot block the session
# indefinitely on a slow or hung Bun process. Default 30 s; overridable via
# CLAUDE_WIKI_PAGES_HEARTBEAT_TIMEOUT. On timeout the engine probe is skipped
# and the script falls through to degraded mode.
_ENGINE_TIMEOUT="${CLAUDE_WIKI_PAGES_HEARTBEAT_TIMEOUT:-30}"
NEEDS=""
PENDING=0
DAYS="?"
# Use timeout when available (GNU coreutils; brew install coreutils on macOS).
# Without it the engine call is still guarded by the cooldown stamp so it will
# not repeat on every session start — the timeout is defence-in-depth only.
if command -v timeout >/dev/null 2>&1; then
  JSON=$(timeout "$_ENGINE_TIMEOUT" bash "$(dirname "$0")/engine.sh" backlog --target "$VAULT" --json 2>/dev/null || true)
else
  JSON=$(bash "$(dirname "$0")/engine.sh" backlog --target "$VAULT" --json 2>/dev/null || true)
fi
if [ -n "$JSON" ] && command -v jq >/dev/null 2>&1 && printf '%s' "$JSON" | jq -e . >/dev/null 2>&1; then
  NEEDS=$(printf '%s' "$JSON" | jq -r '.needsCatchup')
  PENDING=$(printf '%s' "$JSON" | jq -r '.pendingRaw | length')
  DAYS=$(printf '%s' "$JSON" | jq -r '.daysSinceLint // "?"')
else
  # Degraded mode (no Bun / engine timeout): count raw files lacking a
  # _sources/<stem>.md summary.
  # M28: avoid a busy-polling loop — use find once with -exec to build the
  # count without repeatedly forking basename/stat for each file. We pipeline
  # once to count, then check individual stems only for the matched set.
  if [ -d "$VAULT/raw" ]; then
    while IFS= read -r f; do
      stem="${f##*/}"
      stem="${stem%.*}"
      [ -f "$VAULT/wiki/_sources/${stem}.md" ] || PENDING=$((PENDING + 1))
    done < <(find "$VAULT/raw" -maxdepth 3 -type f \
      -not -path '*/assets/*' -not -name '.*' 2>/dev/null)
  fi
  [ "$PENDING" -gt 0 ] && NEEDS="true" || NEEDS="false"
fi

EMITTED=0
if [ "$NEEDS" = "true" ]; then
  echo "CATCHUP: ${PENDING} pending source(s), ${DAYS} day(s) since lint — run /claude-wiki-pages:wiki to process the backlog."
  EMITTED=1
fi

# Wired-source notice (informational; sync is manual by design, so it never
# flips needsCatchup). Engine-only: the degraded no-bun probe skips it.
if [ -n "$JSON" ] && command -v jq >/dev/null 2>&1; then
  while IFS='|' read -r wname wcount; do
    [ -z "$wname" ] && continue
    [ "${wcount:-0}" -gt 0 ] || continue
    echo "SYNC: wired source \"${wname}\" has ${wcount} changed doc(s) — run /claude-wiki-pages:sync to snapshot them."
    EMITTED=1
  done < <(printf '%s' "$JSON" | jq -r '(.wiredChanges // [])[] | "\(.name)|\(.changed)"' 2>/dev/null)
fi

# P1-B5: Advisory when backlog exists but unattended scheduling is not enabled.
# Helps the operator discover maintenance-run.sh without being prescriptive.
# Emitted only when the heartbeat is already surfacing something (NEEDS=true),
# so it never adds noise to a clean vault.
if [ "$NEEDS" = "true" ]; then
  UNATTENDED=$(cfg_scalar '.maintenance.unattended')
  if [ "$UNATTENDED" != "true" ]; then
    echo "MAINTENANCE: ${PENDING} pending; enable scheduled upkeep: set maintenance.unattended=true and run bash scripts/maintenance-run.sh on a cron schedule. See docs/automation.md."
    EMITTED=1
  fi
fi

[ "$EMITTED" -eq 1 ] && [ "$NOW" -ne 0 ] && printf '%s' "$NOW" >"$STAMP" 2>/dev/null
exit 0

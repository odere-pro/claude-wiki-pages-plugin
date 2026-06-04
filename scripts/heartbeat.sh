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
NEEDS=""
PENDING=0
DAYS="?"
JSON=$(bash "$(dirname "$0")/engine.sh" backlog --target "$VAULT" --json 2>/dev/null || true)
if [ -n "$JSON" ] && command -v jq >/dev/null 2>&1 && printf '%s' "$JSON" | jq -e . >/dev/null 2>&1; then
  NEEDS=$(printf '%s' "$JSON" | jq -r '.needsCatchup')
  PENDING=$(printf '%s' "$JSON" | jq -r '.pendingRaw | length')
  DAYS=$(printf '%s' "$JSON" | jq -r '.daysSinceLint // "?"')
else
  # Degraded mode (no Bun): count raw files lacking a _sources/<stem>.md summary.
  if [ -d "$VAULT/raw" ]; then
    while IFS= read -r f; do
      stem=$(basename "$f")
      stem="${stem%.*}"
      [ -f "$VAULT/wiki/_sources/${stem}.md" ] || PENDING=$((PENDING + 1))
    done < <(find "$VAULT/raw" -type f -not -path '*/assets/*' -not -name '.*' 2>/dev/null)
  fi
  [ "$PENDING" -gt 0 ] && NEEDS="true" || NEEDS="false"
fi

if [ "$NEEDS" = "true" ]; then
  echo "CATCHUP: ${PENDING} pending source(s), ${DAYS} day(s) since lint — run /claude-wiki-pages:wiki to process the backlog."
  [ "$NOW" -ne 0 ] && printf '%s' "$NOW" >"$STAMP" 2>/dev/null
fi
exit 0

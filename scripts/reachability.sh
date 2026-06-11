#!/bin/bash
# reachability.sh — the deterministic Layer 4 reachability probe (ADR-0018).
#
# Reports, as one JSON object on stdout, whether the local Ollama endpoint and
# the Anthropic API are reachable. It performs NO network call when the effective
# localModel.offlinePolicy is "off" (the default) — degraded-mode awareness is
# strictly opt-in. It fails closed: any error reports down/unreachable, never a
# false "up". All network code lives here in bash, never in the TypeScript engine,
# so the engine stays free of fetch/http tokens (gate-13 NO-RAG).
#
# §5 NO-RAG: plain reachability checks — no embeddings, no model inference.
#
# The Anthropic check is an UNAUTHENTICATED HEAD: any HTTP response (including a
# 401) means the host answered, so it is "reachable". The API key is never sent.
#
# Output (stdout):
#   {"ollama":"up|down|unprobed","claudeApi":"reachable|unreachable|unprobed",
#    "policy":"<offlinePolicy>","endpoint":"<ollama endpoint>"}
#
# Exit codes:
#   0  probe completed (including the no-probe "off" case) — read the JSON
#   2  usage error / jq missing
#
# Usage:
#   scripts/reachability.sh [--json] [--endpoint <url>] [--policy <strict|prefer-local|off>]
#   scripts/reachability.sh --help
#
# --endpoint / --policy override the effective config (so a caller that already
# read the config — session-start.sh — need not pay for a second engine call).
# When omitted, the values are read from `engine.sh config --json`.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

die() {
  echo "ERROR: $*" >&2
  exit 2
}

usage() {
  sed -n '/^# Usage:/,/^set -euo/p' "${BASH_SOURCE[0]}" | sed '$d' | sed 's/^# \{0,1\}//'
}

# Read one field from the effective config; echo $2 when the engine is
# unavailable (e.g. Bun missing) or the field is empty. Fail-soft by design.
config_field() { # $1 = jq filter, $2 = default
  local val
  val=$(bash "$ROOT/scripts/engine.sh" config --json 2>/dev/null | jq -r "$1 // empty" 2>/dev/null) || val=""
  if [ -n "$val" ]; then printf '%s' "$val"; else printf '%s' "$2"; fi
}

main() {
  local endpoint="" policy=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --json) shift ;; # output is always JSON; accepted for symmetry
      --endpoint)
        endpoint="${2:-}"
        shift 2
        ;;
      --policy)
        policy="${2:-}"
        shift 2
        ;;
      --help | -h)
        usage
        exit 0
        ;;
      *)
        usage >&2
        die "unknown flag: $1"
        ;;
    esac
  done

  command -v jq >/dev/null 2>&1 || die "jq is required"

  [ -n "$policy" ] || policy=$(config_field '.config.localModel.offlinePolicy' "off")
  [ -n "$endpoint" ] || endpoint=$(config_field '.config.localModel.endpoint' "http://localhost:11434")

  local ollama claude
  if [ "$policy" = "off" ]; then
    # Opt-in only: no network call in the default policy.
    ollama="unprobed"
    claude="unprobed"
  else
    if curl -sS --fail --connect-timeout 5 --max-time 5 "$endpoint/api/tags" >/dev/null 2>&1; then
      ollama="up"
    else
      ollama="down"
    fi
    # No --fail: a 401/404 still means the host answered → reachable. Only a
    # connection/DNS/timeout error (curl rc != 0) counts as unreachable.
    if curl -sS --head --connect-timeout 5 --max-time 5 https://api.anthropic.com/ >/dev/null 2>&1; then
      claude="reachable"
    else
      claude="unreachable"
    fi
  fi

  jq -n --arg o "$ollama" --arg c "$claude" --arg p "$policy" --arg e "$endpoint" \
    '{ollama:$o, claudeApi:$c, policy:$p, endpoint:$e}'
}

main "$@"

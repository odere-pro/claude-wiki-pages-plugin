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
# Circuit Breaker (Ollama probe only):
#   State is persisted in CB_STATE_FILE (default: /tmp/claude-wiki-pages-cb-ollama.json).
#   States: closed (normal probing), open (fail fast — Ollama is known down),
#           half-open (cooldown elapsed — one trial probe before resuming).
#   Failure threshold: CB_FAILURE_THRESHOLD consecutive failures → open.
#   Cooldown: CB_COOLDOWN_SEC seconds in the open state before half-open trial.
#   While open the breaker returns "down" without touching the network, bounding
#   failure blast radius when Ollama is unreachable (known-vulnerable-dependency).
#
# Output (stdout):
#   {"ollama":"up|down|unprobed","claudeApi":"reachable|unreachable|unprobed",
#    "policy":"<offlinePolicy>","endpoint":"<ollama endpoint>",
#    "circuitBreaker":"closed|open|half-open"}
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

# ---------------------------------------------------------------------------
# Circuit Breaker — Ollama probe
#
# State is stored in a small JSON file so it persists across the multiple
# reachability.sh invocations that can happen inside one session (e.g.
# session-start + offline-draft + offline-query).  All reads/writes use
# atomic temp-file rename so concurrent callers cannot corrupt state.
#
# Public interface (called only from probe_ollama below):
#   cb_state       — print current state: closed|open|half-open
#   cb_record_success  — record a successful probe → transition to closed
#   cb_record_failure  — record a failed probe; trip to open after threshold
# ---------------------------------------------------------------------------
CB_STATE_FILE="${CLAUDE_WIKI_PAGES_CB_STATE:-/tmp/claude-wiki-pages-cb-ollama.json}"
CB_FAILURE_THRESHOLD="${CLAUDE_WIKI_PAGES_CB_THRESHOLD:-3}"
CB_COOLDOWN_SEC="${CLAUDE_WIKI_PAGES_CB_COOLDOWN:-30}"
# Lock file for the CB state RMW critical section. flock(1) is used below to
# serialise concurrent reachability.sh invocations (session-start, offline-draft,
# offline-query can all fire within one session). The lock file is separate from
# the state file so a failing write never corrupts the lock descriptor.
CB_LOCK_FILE="${CB_STATE_FILE}.lock"

# _cb_read_json — emit the raw state JSON; return an empty-state object on
# any read/parse failure (fail-closed: no error propagated to callers).
_cb_read_json() {
  local json
  json=$(cat -- "$CB_STATE_FILE" 2>/dev/null) || json=""
  if [ -z "$json" ]; then
    printf '{"state":"closed","failures":0,"openedAt":0}'
    return
  fi
  # Validate: must have a state field; fall back to closed on corruption.
  local s
  s=$(printf '%s' "$json" | jq -r '.state // empty' 2>/dev/null) || s=""
  if [ -z "$s" ]; then
    printf '{"state":"closed","failures":0,"openedAt":0}'
    return
  fi
  printf '%s' "$json"
}

# _cb_write_json — atomically write a new state JSON.
_cb_write_json() { # $1 = json string
  local tmp
  tmp=$(mktemp "${CB_STATE_FILE}.XXXXXX") || return 0
  printf '%s\n' "$1" >"$tmp"
  mv -f "$tmp" "$CB_STATE_FILE" 2>/dev/null || rm -f "$tmp"
}

# cb_state — print the effective circuit-breaker state for the current moment.
# Transitions open→half-open automatically when the cooldown has elapsed.
# The entire read-modify-write is serialised under an flock(1) critical section
# so concurrent reachability.sh invocations cannot lose a transition update.
cb_state() {
  local json state opened_at now elapsed
  # Open the lock file on fd 9 and acquire an exclusive lock (wait up to 5 s).
  # If flock is unavailable or the wait times out, proceed without the lock
  # rather than blocking the probe — fail-soft for the read path.
  (
    flock -w 5 9 2>/dev/null || true
    json=$(_cb_read_json)
    state=$(printf '%s' "$json" | jq -r '.state' 2>/dev/null) || state="closed"
    if [ "$state" = "open" ]; then
      opened_at=$(printf '%s' "$json" | jq -r '.openedAt' 2>/dev/null) || opened_at=0
      now=$(date +%s 2>/dev/null) || now=0
      elapsed=$((now - opened_at))
      if [ "$elapsed" -ge "$CB_COOLDOWN_SEC" ] 2>/dev/null; then
        # Cooldown elapsed: transition to half-open for the next trial probe.
        local new_json
        new_json=$(printf '%s' "$json" | jq '.state = "half-open"' 2>/dev/null) || new_json="$json"
        _cb_write_json "$new_json"
        state="half-open"
      fi
    fi
    printf '%s' "$state"
  ) 9>>"$CB_LOCK_FILE"
}

# cb_record_success — a probe succeeded; reset failures and close the breaker.
# Serialised under an flock(1) critical section to prevent a concurrent failure
# record from racing this reset (last-writer-wins would lose the reset).
cb_record_success() {
  (
    flock -w 5 9 2>/dev/null || true
    _cb_write_json '{"state":"closed","failures":0,"openedAt":0}'
  ) 9>>"$CB_LOCK_FILE"
}

# cb_record_failure — a probe failed; increment the counter and trip to open
# once CB_FAILURE_THRESHOLD consecutive failures are observed.
# The entire read-increment-write is serialised under an flock(1) critical
# section so two concurrent probes cannot each read the same counter value and
# each write failures=1 (losing one increment, delaying the trip to "open").
cb_record_failure() {
  (
    flock -w 5 9 2>/dev/null || true
    local json failures new_failures now new_state new_json
    json=$(_cb_read_json)
    failures=$(printf '%s' "$json" | jq -r '.failures' 2>/dev/null) || failures=0
    new_failures=$((failures + 1))
    now=$(date +%s 2>/dev/null) || now=0
    if [ "$new_failures" -ge "$CB_FAILURE_THRESHOLD" ] 2>/dev/null; then
      new_state="open"
    else
      # Preserve current state (closed or half-open) — not yet at threshold.
      new_state=$(printf '%s' "$json" | jq -r '.state' 2>/dev/null) || new_state="closed"
    fi
    new_json=$(printf '%s' "$json" |
      jq --arg s "$new_state" --argjson f "$new_failures" --argjson t "$now" \
        '.state=$s | .failures=$f | if $s == "open" then .openedAt=$t else . end' \
        2>/dev/null) || new_json="{\"state\":\"$new_state\",\"failures\":$new_failures,\"openedAt\":$now}"
    _cb_write_json "$new_json"
  ) 9>>"$CB_LOCK_FILE"
}

# validate_ollama_endpoint — enforce a host allow-list so that a misconfigured
# or attacker-supplied endpoint cannot be used as an SSRF vector to reach
# internal services (e.g. cloud IMDS at 169.254.169.254).
#
# Allowed hosts (case-insensitive):
#   localhost           — the well-known loopback name
#   127.0.0.0/8         — the full loopback range (127.x.x.x with exactly
#                         three octets of 0-255 each)
#
# The extraction pipeline:
#   1. Strip the scheme (http:// or https://).
#   2. Strip userinfo (anything before @) — prevents 127.0.0.1@evil.com bypass.
#   3. Strip the port and any path suffix.
#   4. Lower-case for case-insensitive comparison.
#
# The 127.x.x.x pattern is anchored with a regex to match ONLY the loopback
# block — 127. followed by three dot-separated decimal groups — preventing
# 127.0.0.1.evil.com from matching the previously unanchored glob '127.*'.
#
# Prints nothing on success; writes an error to stderr and returns 1 on denial.
validate_ollama_endpoint() { # $1 = endpoint URL
  local url="$1"
  # Strip scheme, then userinfo (@), then port and path.
  local host
  host=$(printf '%s' "$url" |
    sed 's|^[^:]*://||' |
    sed 's|^[^@]*@||' |
    sed 's|[:/].*||' |
    tr '[:upper:]' '[:lower:]')
  case "$host" in
    localhost) return 0 ;;
    *)
      # Anchor the 127.x.x.x check: must be exactly 127.<octet>.<octet>.<octet>
      # with no trailing characters.  printf|grep is POSIX-portable and avoids
      # the unanchored glob '127.*' that matched 127.0.0.1.evil.com.
      if printf '%s' "$host" | grep -qE '^127\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$'; then
        return 0
      fi
      printf 'ERROR: Ollama endpoint host "%s" is not on the allow-list (must be localhost or 127.x.x.x)\n' \
        "$host" >&2
      return 1
      ;;
  esac
}

# probe_claude_api — the Gateway for the Anthropic Claude API reachability check.
#
# Encapsulates the vendor-specific endpoint and probe semantics behind a named
# boundary so callers are not coupled to the Anthropic URL or curl options.
# The check is intentionally UNAUTHENTICATED (HEAD only): any HTTP response,
# including a 401, means the host answered → "reachable". The API key is
# never sent. Only a connection/DNS/timeout error counts as "unreachable".
#
# Prints "reachable" or "unreachable". Exits with 0 in both cases so the
# caller can branch on the string value without checking the exit code.
#
# The constant CLAUDE_API_ENDPOINT can be overridden via the environment for
# testing or air-gapped environments without editing this file.
CLAUDE_API_ENDPOINT="${CLAUDE_WIKI_PAGES_CLAUDE_API_ENDPOINT:-https://api.anthropic.com/}"

probe_claude_api() {
  if curl -sS --head --connect-timeout 5 --max-time 5 "$CLAUDE_API_ENDPOINT" >/dev/null 2>&1; then
    printf 'reachable'
  else
    printf 'unreachable'
  fi
}

# probe_ollama — the circuit-breaker-wrapped Ollama reachability check.
# Prints "up" or "down"; updates breaker state.
probe_ollama() { # $1 = endpoint URL
  local endpoint="$1"
  local current_state
  current_state=$(cb_state)

  case "$current_state" in
    open)
      # Breaker is open: fail fast without a network call (bounded blast radius).
      printf 'down'
      return
      ;;
    half-open)
      # Cooldown elapsed: make one trial probe to check if Ollama recovered.
      if curl -sS --fail --connect-timeout 5 --max-time 5 "$endpoint/api/tags" >/dev/null 2>&1; then
        cb_record_success
        printf 'up'
      else
        cb_record_failure
        printf 'down'
      fi
      return
      ;;
    closed | *)
      # Normal path: probe and track results.
      if curl -sS --fail --connect-timeout 5 --max-time 5 "$endpoint/api/tags" >/dev/null 2>&1; then
        cb_record_success
        printf 'up'
      else
        cb_record_failure
        printf 'down'
      fi
      return
      ;;
  esac
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

  # Validate endpoint host before any network call — SSRF guard.
  validate_ollama_endpoint "$endpoint" || die "refused unsafe Ollama endpoint: $endpoint"

  local ollama claude cb
  if [ "$policy" = "off" ]; then
    # Opt-in only: no network call in the default policy.
    ollama="unprobed"
    claude="unprobed"
    cb="closed"
  else
    # Circuit-breaker-wrapped Ollama probe: fails fast while the breaker is
    # open (repeated failures detected) and re-probes after the cooldown.
    ollama=$(probe_ollama "$endpoint")
    cb=$(cb_state)
    # Delegate to the Claude API gateway — see probe_claude_api above.
    claude=$(probe_claude_api)
  fi

  jq -n --arg o "$ollama" --arg c "$claude" --arg p "$policy" --arg e "$endpoint" --arg b "$cb" \
    '{ollama:$o, claudeApi:$c, policy:$p, endpoint:$e, circuitBreaker:$b}'
}

main "$@"

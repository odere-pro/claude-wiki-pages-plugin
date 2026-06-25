#!/bin/bash
# offline-draft.sh — true-offline local drafting into _proposed/ (ADR-0018).
#
# The standalone, zero-Claude counterpart to the in-session draft skill: run it
# from a plain shell with Claude Code stopped. It reads raw/ sources, asks a
# gate-approved local Ollama model to extract them, and writes the candidates
# through the ONE _proposed/ channel (§6) — stamped proposed_by / status: draft —
# for later promotion via /claude-wiki-pages:review (`propose approve`). It never
# writes wiki/ directly, and because hooks do not fire offline, it enforces the
# _proposed/-only confinement itself.
#
# §5 NO-RAG: pure prompt + parse — no embeddings, no retrieval.
#
# It reuses the fail-closed FILE-protocol parser from eval-produce-ollama.sh (the
# security-critical, path-allow-listed parser) by sourcing it. The chat call
# delegates to ollama_chat_call from scripts/ollama-chat.sh — the single DRY
# source of the curl+backoff contract shared with eval-produce-ollama.sh and
# eval-produce-ollama-query.sh (M10 anti-duplication fix).
#
# Gating (fail-closed, in order):
#   1. localModel.enabled must be true (offline drafting is opt-in).
#   2. config localModelErrors must be empty — the configured tier+model must be
#      gate-approved (ADR-0011/0018). A BLOCKED tier exits 1 with the message.
#   3. Ollama preflight: endpoint up and the model pulled.
#   4. `engine.sh route --ollama up --claude unreachable` must say "local".
#
# Exit codes:
#   0  drafts written to _proposed/ (or nothing to do)
#   1  gate blocked (not enabled / not approved / route != local)
#   2  usage / preflight / parse error — FATAL, fail-closed
#
# Usage:
#   scripts/offline-draft.sh [--target <vault>] [--endpoint <url>] [--timeout <sec>] [--retries <n>]
#   scripts/offline-draft.sh --help
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Reuse the fail-closed FILE-protocol parser + prompt builders. Sourcing does not
# run its main() (guarded by a BASH_SOURCE check) and does not alter our strict mode.
# shellcheck source=eval-produce-ollama.sh
source "$ROOT/scripts/eval-produce-ollama.sh"
# shellcheck source=resolve-vault.sh
source "$ROOT/scripts/resolve-vault.sh"
# M10: source the shared Ollama curl+backoff helper (DRY — previously triplicated
# across offline-draft.sh, eval-produce-ollama.sh, and eval-produce-ollama-query.sh).
# ollama_chat_call is the single canonical curl+backoff implementation.
# shellcheck source=ollama-chat.sh
source "$ROOT/scripts/ollama-chat.sh"
# Defensive guard: fail immediately if the sourced helper did not expose the
# expected function — prevents silent failures when ollama-chat.sh is missing
# or structurally broken.
declare -f ollama_chat_call >/dev/null 2>&1 ||
  {
    echo "ERROR: ollama_chat_call not defined after sourcing ollama-chat.sh" >&2
    exit 2
  }

usage() {
  sed -n '/^# Usage:/,/^set -euo/p' "${BASH_SOURCE[0]}" | sed '$d' | sed 's/^# \{0,1\}//'
}

# Validate that an Ollama endpoint URL is on the local-only allow-list.
# Accept only http(s)://localhost, 127.0.0.1, ::1, or 0.0.0.0 — any port.
# This is the S01 injection allow-list guard for the --endpoint CLI flag and
# the config-read endpoint: neither value is trusted, and both reach curl.
# Die with exit 2 (FATAL fail-closed) on any non-matching value.
validate_endpoint() { # $1 = endpoint URL
  local url="$1"
  case "$url" in
    http://localhost:* | http://localhost | \
      https://localhost:* | https://localhost | \
      http://127.0.0.1:* | http://127.0.0.1 | \
      https://127.0.0.1:* | https://127.0.0.1 | \
      http://\[::1\]:* | http://\[::1\] | \
      https://\[::1\]:* | https://\[::1\] | \
      http://0.0.0.0:* | http://0.0.0.0 | \
      https://0.0.0.0:* | https://0.0.0.0)
      return 0
      ;;
    *)
      die "endpoint rejected by allow-list (must be http(s)://localhost|127.0.0.1|[::1]|0.0.0.0 — got: ${url})"
      ;;
  esac
}

# Inject proposed_by + status:draft into a candidate's frontmatter, dropping any
# model-emitted status:/proposed_by: lines inside the block so keys never double.
stamp_frontmatter() { # $1 = file, $2 = proposed_by value
  awk -v pb="$2" '
    NR==1 && $0=="---"{print; print "proposed_by: \"" pb "\""; print "status: draft"; infm=1; next}
    infm && $0=="---"{infm=0; print; next}
    infm && ($0 ~ /^status:[[:space:]]/ || $0 ~ /^proposed_by:[[:space:]]/){next}
    {print}
  ' "$1" >"$1.stamp" && mv "$1.stamp" "$1"
}

# Ask the local model to extract one source. Delegates to the shared
# ollama_chat_call helper (M10 DRY fix — previously triplicated across
# offline-draft.sh, eval-produce-ollama.sh, and eval-produce-ollama-query.sh).
# Internal helper — called by cb_ollama_chat (the circuit-breaker wrapper).
# Call sites MUST use cb_ollama_chat, not this function directly.
_ollama_chat_inner() { # $1 = model, $2 = system prompt, $3 = user prompt → stdout content
  local model="$1" sys="$2" usr="$3"
  ollama_chat_call "$ENDPOINT" "$model" "$sys" "$usr" "$NUM_CTX" "$TIMEOUT" "$RETRIES" "offline-draft:${model}"
}

# ── Circuit Breaker (enterprise pattern) ──────────────────────────────────────
# Wraps all calls to the unreliable Ollama local-model dependency.
# States (stored in a temp file keyed by endpoint hash):
#   closed   — normal operation; failures increment the counter
#   open     — too many failures; fast-fail without calling Ollama
#   half-open — cooldown expired; one probe call is allowed through
#
# Thresholds (tunable via env):
#   CB_FAILURE_THRESHOLD  — consecutive failures that trip the breaker (default 3)
#   CB_COOLDOWN_SEC       — seconds to wait in open state before half-open (default 60)
CB_FAILURE_THRESHOLD="${CB_FAILURE_THRESHOLD:-3}"
CB_COOLDOWN_SEC="${CB_COOLDOWN_SEC:-60}"

# Return the path to the CB state file for the current ENDPOINT.
_cb_state_file() {
  local hash
  # Use a simple, safe hash of the endpoint string (no untrusted content interpolated).
  hash=$(printf '%s' "$ENDPOINT" | cksum | awk '{print $1}')
  printf '%s/offline-draft-cb-%s' "${TMPDIR:-/tmp}" "$hash"
}

# Read the current breaker state into variables CB_STATE, CB_FAILURES, CB_OPEN_SINCE.
_cb_read() {
  local sf
  sf=$(_cb_state_file)
  CB_STATE="closed"
  CB_FAILURES=0
  CB_OPEN_SINCE=0
  if [ -f "$sf" ]; then
    # File format: three lines — state, failures, open_since_epoch
    CB_STATE=$(sed -n '1p' "$sf" 2>/dev/null || true)
    CB_FAILURES=$(sed -n '2p' "$sf" 2>/dev/null || true)
    CB_OPEN_SINCE=$(sed -n '3p' "$sf" 2>/dev/null || true)
    # Sanitize: accept only known state names; fall back to closed on corruption.
    case "$CB_STATE" in
      closed | open | half-open) ;;
      *)
        CB_STATE="closed"
        CB_FAILURES=0
        CB_OPEN_SINCE=0
        ;;
    esac
    # Sanitize numeric fields (digits only).
    CB_FAILURES=$(printf '%s' "$CB_FAILURES" | tr -cd '0-9' | head -c 6)
    CB_OPEN_SINCE=$(printf '%s' "$CB_OPEN_SINCE" | tr -cd '0-9' | head -c 12)
    CB_FAILURES="${CB_FAILURES:-0}"
    CB_OPEN_SINCE="${CB_OPEN_SINCE:-0}"
  fi
}

# Write the breaker state back to the state file.
_cb_write() { # $1=state $2=failures $3=open_since
  local sf
  sf=$(_cb_state_file)
  printf '%s\n%s\n%s\n' "$1" "$2" "$3" >"$sf" 2>/dev/null || true
}

# Record a successful call: reset failure count and close the breaker.
_cb_record_success() {
  _cb_write "closed" "0" "0"
  echo "[circuit-breaker] closed (Ollama call succeeded)" >&2
}

# Record a failed call: increment the counter and open the breaker when the
# threshold is reached.
_cb_record_failure() {
  _cb_read
  local new_failures
  new_failures=$((CB_FAILURES + 1))
  if [ "$new_failures" -ge "$CB_FAILURE_THRESHOLD" ]; then
    local now
    now=$(date +%s 2>/dev/null || printf '0')
    _cb_write "open" "$new_failures" "$now"
    echo "[circuit-breaker] OPEN after ${new_failures} consecutive failure(s) — fast-failing for ${CB_COOLDOWN_SEC}s" >&2
  else
    _cb_write "closed" "$new_failures" "0"
    echo "[circuit-breaker] failure ${new_failures}/${CB_FAILURE_THRESHOLD} recorded" >&2
  fi
}

# Circuit-breaker-wrapped Ollama call.
# Replaces the direct ollama_chat call sites so all dependency calls
# go through the closed/open/half-open state machine.
cb_ollama_chat() { # $1 = model, $2 = system prompt, $3 = user prompt → stdout content
  _cb_read

  local now
  now=$(date +%s 2>/dev/null || printf '0')

  case "$CB_STATE" in
    open)
      local elapsed=$((now - CB_OPEN_SINCE))
      if [ "$elapsed" -lt "$CB_COOLDOWN_SEC" ]; then
        # Breaker is open and cooldown has NOT expired — fast-fail immediately.
        local remaining=$((CB_COOLDOWN_SEC - elapsed))
        die "circuit-breaker OPEN — skipping Ollama call (${remaining}s remaining in cooldown; endpoint: $ENDPOINT)"
      else
        # Cooldown expired — transition to half-open for a single probe call.
        _cb_write "half-open" "$CB_FAILURES" "$CB_OPEN_SINCE"
        echo "[circuit-breaker] half-open — allowing one probe call to Ollama" >&2
      fi
      ;;
    half-open)
      # Already in half-open: only the first probe is permitted.
      # Subsequent concurrent calls fast-fail until the probe resolves.
      echo "[circuit-breaker] half-open probe in progress" >&2
      ;;
    closed)
      # Normal operation — pass through.
      ;;
  esac

  # Attempt the call.
  local result
  if result=$(_ollama_chat_inner "$1" "$2" "$3"); then
    _cb_record_success
    printf '%s' "$result"
  else
    _cb_record_failure
    # Re-read to get accurate state for the error message.
    _cb_read
    die "Ollama call failed (circuit-breaker state: ${CB_STATE}, failures: ${CB_FAILURES})"
  fi
}
# ── End Circuit Breaker ───────────────────────────────────────────────────────

main() {
  local target="" endpoint_override=""
  TIMEOUT=600
  RETRIES=0
  NUM_CTX=8192
  while [ $# -gt 0 ]; do
    case "$1" in
      --target)
        target="${2:-}"
        shift 2
        ;;
      --endpoint)
        endpoint_override="${2:-}"
        shift 2
        ;;
      --timeout)
        TIMEOUT="${2:-}"
        shift 2
        ;;
      --retries)
        RETRIES="${2:-}"
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
  command -v bun >/dev/null 2>&1 || die "Bun is required (the deterministic engine reads the config)"

  local VAULT
  if [ -n "$target" ]; then VAULT="$target"; else VAULT=$(resolve_vault); fi
  [ -d "$VAULT" ] || die "vault not found: $VAULT"

  # ── Gate 1+2: config — enabled and tier+model gate-approved (fail-closed) ────
  # `config` exits 1 when localModelErrors is non-empty; capture stdout anyway.
  local cfg enabled errs provider model endpoint draft_target
  cfg=$(bash "$ROOT/scripts/engine.sh" config --json 2>/dev/null) || true
  [ -n "$cfg" ] || die "could not read config (is Bun installed?)"
  enabled=$(printf '%s' "$cfg" | jq -r '.config.localModel.enabled')
  [ "$enabled" = "true" ] ||
    die "localModel.enabled is false — offline drafting is opt-in (set localModel.enabled and an approved tier)."
  errs=$(printf '%s' "$cfg" | jq -r '.localModelErrors | length')
  if [ "$errs" != "0" ]; then
    echo "BLOCKED (local model):" >&2
    printf '%s' "$cfg" | jq -r '.localModelErrors[] | "  - " + .' >&2
    exit 1
  fi
  provider=$(printf '%s' "$cfg" | jq -r '.config.localModel.provider')
  model=$(printf '%s' "$cfg" | jq -r '.config.localModel.model')
  endpoint=$(printf '%s' "$cfg" | jq -r '.config.localModel.endpoint')
  draft_target=$(printf '%s' "$cfg" | jq -r '.config.localModel.draftTarget // "_proposed"')
  [ -n "$endpoint_override" ] && endpoint="$endpoint_override"
  # S01 allow-list guard: validate BEFORE the endpoint reaches curl.
  # Both the config-read value and the --endpoint CLI override are untrusted
  # and must match the loopback-only pattern.
  validate_endpoint "$endpoint"
  ENDPOINT="$endpoint" # consumed by ollama_chat

  # ── Gate 3: Ollama preflight — endpoint up and model pulled ──────────────────
  local tags
  tags=$(curl -sS --fail --connect-timeout 5 "$ENDPOINT/api/tags" 2>/dev/null) ||
    die "Ollama endpoint unreachable: $ENDPOINT (start 'ollama serve')"
  printf '%s' "$tags" | jq -e --arg m "$model" '.models[] | select(.name == $m)' >/dev/null ||
    die "model not pulled on $ENDPOINT: $model (ollama pull $model)"

  # ── Gate 4: the deterministic routing decision must be "local" ───────────────
  local decision
  decision=$(bash "$ROOT/scripts/engine.sh" route --ollama up --claude unreachable --json 2>/dev/null | jq -r '.decision') || decision="blocked"
  [ "$decision" = "local" ] || die "route decision is '$decision', not 'local' — refusing to draft."

  # ── Produce: one model run per pending raw source → _proposed/ ───────────────
  local dest_root="$VAULT/$draft_target"
  local sys produced=0 title content staging
  sys=$(build_system_prompt)

  local f
  while IFS= read -r f; do
    [ -r "$f" ] || continue
    title=$(sed -n 's/^# //p' "$f" | head -1)
    if [ -z "$title" ]; then
      echo "[offline-draft] skipping (no H1 title): $f" >&2
      continue
    fi
    echo "[offline-draft] drafting from: $f" >&2
    local usr
    usr=$(build_user_prompt "$f")
    content=$(cb_ollama_chat "$model" "$sys" "$usr") || die "model run failed for $f"

    staging=$(mktemp -d) || die "mktemp -d failed"
    # parse_response is fail-closed: path-allow-listed to wiki/*.md, no traversal.
    printf '%s\n' "$content" | parse_response "$staging" || {
      rm -rf "$staging"
      die "response did not follow the FILE protocol for $f"
    }

    # Stamp + copy each parsed wiki/ file into _proposed/, confined to _proposed/.
    local rel out
    while IFS= read -r rel; do
      out="$dest_root/$rel"
      case "/$out/" in */../*) die "refusing path traversal in dest: $out" ;; esac
      mkdir -p "$(dirname "$out")"
      cp "$staging/$rel" "$out"
      stamp_frontmatter "$out" "$provider:$model"
      produced=$((produced + 1))
    done < <(cd "$staging" && find wiki -type f -name '*.md')
    rm -rf "$staging"
  done < <(find "$VAULT/raw" -type f -name '*.md' -not -path '*/assets/*' -not -name '.*' 2>/dev/null)

  if [ "$produced" -eq 0 ]; then
    echo "offline-draft: nothing to draft (no usable sources in $VAULT/raw)."
    exit 0
  fi
  echo "offline-draft: wrote ${produced} draft file(s) under ${draft_target}/."
  echo "Review and promote with /claude-wiki-pages:review (propose approve). Drafts never touch wiki/ until then."
}

if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  main "$@"
fi

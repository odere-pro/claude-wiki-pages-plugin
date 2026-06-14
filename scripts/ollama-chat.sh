#!/bin/bash
# ollama-chat.sh — shared Ollama chat-completion helper with exponential
# timeout backoff.
#
# SOURCEABLE (not executable). Source this file to get `ollama_chat_call`,
# the single canonical implementation of the curl + retry pattern used by:
#
#   - scripts/offline-draft.sh        (ollama_chat)
#   - scripts/eval-produce-ollama.sh  (inline in produce_case)
#   - scripts/eval-produce-ollama-query.sh (query_ollama_chat)
#
# M10: these three blocks were triplicated with minor variation. This helper
# is the single DRY source of truth for the Ollama curl + backoff contract.
#
# Interface:
#   ollama_chat_call <endpoint> <model> <system-prompt> <user-prompt> \
#                    <num-ctx> <timeout-sec> <retries> [<label>]
#
#   Echoes the model's text content (`.message.content`) on success.
#   On failure: die() with exit 2 (fail-closed; never a silent empty result).
#
# Requires: jq, curl, and a `die` function defined in the sourcing script.
# Callers must define `die()` before sourcing this file.
#
# The payload template:
#   {model, stream:false, options:{temperature:0, seed:42, top_p:1,
#    num_ctx, num_predict:-1}, messages:[{role:system},{role:user}]}
# These options (M13) are the centralized Ollama sampling defaults; they are
# defined once here rather than repeated per call site.

# ── Centralized Ollama sampling defaults (M13) ────────────────────────────────
# These are the PM-ratified, reproducibility-critical options for every
# Ollama call in the quality gate and offline drafting workflows.
# Override by passing different values directly to ollama_chat_call if needed
# (the function signature takes explicit parameters, not these globals).
readonly OLLAMA_DEFAULT_TEMPERATURE=0
readonly OLLAMA_DEFAULT_SEED=42
readonly OLLAMA_DEFAULT_TOP_P=1
readonly OLLAMA_DEFAULT_NUM_PREDICT=-1

# ── Core function ─────────────────────────────────────────────────────────────

# ollama_chat_call <endpoint> <model> <sys> <usr> <num_ctx> <timeout_sec> <retries> [label] [audit_file]
# Echoes the model's text content. Exits 2 via die() on error.
# Optional 9th arg <audit_file>: when non-empty, the raw Ollama JSON response is
# copied there (for audit / replay) before .message.content is extracted.
# Callers that do not need an audit file omit the arg (backwards-compatible).
ollama_chat_call() {
  local endpoint="$1" model="$2" sys="$3" usr="$4"
  local num_ctx="$5" timeout_sec="$6" retries="$7"
  local label="${8:-${model}}" # human label for log messages (optional)
  local audit_file="${9:-}"    # optional: persist raw JSON response here

  local payload response attempt=0 t="$timeout_sec" got=0
  payload=$(mktemp) || die "ollama_chat_call: mktemp failed"
  response=$(mktemp) || die "ollama_chat_call: mktemp failed"

  # Build payload using jq (never interpolating values into shell — injection-safe).
  jq -n \
    --arg model "$model" \
    --arg sys "$sys" \
    --arg usr "$usr" \
    --argjson nc "$num_ctx" \
    --argjson temp "$OLLAMA_DEFAULT_TEMPERATURE" \
    --argjson seed "$OLLAMA_DEFAULT_SEED" \
    --argjson top_p "$OLLAMA_DEFAULT_TOP_P" \
    --argjson num_predict "$OLLAMA_DEFAULT_NUM_PREDICT" \
    '{model:$model, stream:false,
      options:{temperature:$temp, seed:$seed, top_p:$top_p,
               num_ctx:$nc, num_predict:$num_predict},
      messages:[{role:"system",content:$sys},{role:"user",content:$usr}]}' \
    >"$payload" || die "ollama_chat_call: payload build failed for $label"

  while :; do
    if curl -sS --fail --connect-timeout 5 --max-time "$t" \
      -H 'Content-Type: application/json' -d @"$payload" \
      "${endpoint}/api/chat" >"$response"; then
      got=1
      break
    fi
    attempt=$((attempt + 1))
    [ "$attempt" -gt "$retries" ] && break
    t=$((t * 2))
    echo "[ollama] retry ${attempt}/${retries} for $label (timeout ${t}s — exponential backoff)" >&2
  done
  rm -f "$payload"

  if [ "$got" -ne 1 ]; then
    rm -f "$response"
    die "ollama_chat_call: Ollama call failed for $label after ${attempt} attempt(s) (last timeout ${t}s)"
  fi

  # Persist raw JSON for audit before extracting content (optional).
  if [ -n "$audit_file" ]; then
    cp "$response" "$audit_file" 2>/dev/null ||
      echo "[ollama] WARN: could not write audit file: $audit_file" >&2
  fi

  local content
  content=$(jq -er '.message.content // empty' "$response") || {
    rm -f "$response"
    die "ollama_chat_call: empty/missing .message.content in Ollama response for $label"
  }
  rm -f "$response"
  printf '%s' "$content"
}

#!/bin/bash
# offline-query.sh — true-offline cited query answering (ADR-0019).
#
# The read-only counterpart to offline-draft.sh: run it from a plain shell with
# Claude Code stopped to ask the wiki a question through a gate-approved local
# model. Page selection is DETERMINISTIC (the lexical search engine — §5 NO-RAG);
# the local model only composes a cited answer from the selected pages, and the
# answer is shown ONLY after runtime answer verification:
#
#   - every [[citation]] must resolve to an existing wiki page, and
#   - every cited quote must be a verbatim (whitespace-normalized) substring of
#     that page.
#
# Any violation throws a WARNING and DENIES the answer (exit 1, nothing shown) —
# the per-answer quality rule of ADR-0019. The verification core is sourced from
# scripts/eval-query.sh, so the gate-time scorer and this runtime check can never
# diverge. The prompt + chat call are sourced from
# scripts/eval-produce-ollama-query.sh for the same reason.
#
# This script never writes the vault. Gating (fail-closed, in order):
#   1. localModel.enabled true; 2. tier "query" gate-approved (localModelErrors
#   empty); 3. Ollama preflight; 4. engine route says "local".
#
# Exit codes: 0 verified answer printed · 1 gate blocked or answer denied ·
#             2 usage / preflight / parse error.
#
# Usage:
#   scripts/offline-query.sh --question "<question>" [--target <vault>]
#       [--endpoint <url>] [--timeout <sec>] [--retries <n>] [--max-pages <n>]
#   scripts/offline-query.sh --help
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Sourcing order matters: eval-query.sh defines die/normalize_ws/parse_answer/
# verify_citations; eval-produce-ollama-query.sh defines the prompt builders and
# query_ollama_chat. Neither runs main() when sourced (BASH_SOURCE guards).
# shellcheck source=eval-query.sh
source "$ROOT/scripts/eval-query.sh"
# shellcheck source=eval-produce-ollama-query.sh
source "$ROOT/scripts/eval-produce-ollama-query.sh"
# shellcheck source=resolve-vault.sh
source "$ROOT/scripts/resolve-vault.sh"

usage() {
  sed -n '/^# Usage:/,/^set -uo/p' "${BASH_SOURCE[0]}" | sed '$d' | sed 's/^# \{0,1\}//'
}

main() {
  local question="" target="" endpoint_override="" max_pages=8
  # QTIMEOUT/QRETRIES/QNUM_CTX/QENDPOINT are consumed by query_ollama_chat,
  # sourced from eval-produce-ollama-query.sh — shellcheck cannot see across
  # the source boundary.
  # shellcheck disable=SC2034
  QTIMEOUT=300
  # shellcheck disable=SC2034
  QRETRIES=0
  # shellcheck disable=SC2034
  QNUM_CTX=8192
  while [ $# -gt 0 ]; do
    case "$1" in
      --question)
        question="${2:-}"
        shift 2
        ;;
      --target)
        target="${2:-}"
        shift 2
        ;;
      --endpoint)
        endpoint_override="${2:-}"
        shift 2
        ;;
      --timeout)
        # shellcheck disable=SC2034
        QTIMEOUT="${2:-}"
        shift 2
        ;;
      --retries)
        # shellcheck disable=SC2034
        QRETRIES="${2:-}"
        shift 2
        ;;
      --max-pages)
        max_pages="${2:-}"
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

  [ -n "$question" ] || {
    usage >&2
    die "--question is required"
  }
  command -v jq >/dev/null 2>&1 || die "jq is required"
  command -v bun >/dev/null 2>&1 || die "Bun is required (the deterministic engine reads config and searches)"

  local VAULT
  if [ -n "$target" ]; then VAULT="$target"; else VAULT=$(resolve_vault); fi
  [ -d "$VAULT/wiki" ] || die "vault has no wiki/: $VAULT"

  # ── Gate 1+2: enabled + tier "query" gate-approved (fail-closed) ─────────────
  local cfg enabled tier errs model
  cfg=$(bash "$ROOT/scripts/engine.sh" config --json 2>/dev/null) || true
  [ -n "$cfg" ] || die "could not read config (is Bun installed?)"
  enabled=$(printf '%s' "$cfg" | jq -r '.config.localModel.enabled')
  [ "$enabled" = "true" ] ||
    die "localModel.enabled is false — offline querying is opt-in (set localModel.enabled, tier \"query\", and an approved model)."
  tier=$(printf '%s' "$cfg" | jq -r '.config.localModel.tier // "draft"')
  if [ "$tier" != "query" ]; then
    echo "BLOCKED (local model): localModel.tier is \"$tier\", not \"query\" — offline querying runs only at the query tier (ADR-0019)." >&2
    exit 1
  fi
  errs=$(printf '%s' "$cfg" | jq -r '.localModelErrors | length')
  if [ "$errs" != "0" ]; then
    echo "BLOCKED (local model):" >&2
    printf '%s' "$cfg" | jq -r '.localModelErrors[] | "  - " + .' >&2
    exit 1
  fi
  model=$(printf '%s' "$cfg" | jq -r '.config.localModel.model')
  QENDPOINT=$(printf '%s' "$cfg" | jq -r '.config.localModel.endpoint')
  [ -n "$endpoint_override" ] && QENDPOINT="$endpoint_override"

  # ── Gate 3: Ollama preflight ─────────────────────────────────────────────────
  local tags
  tags=$(curl -sS --fail --connect-timeout 5 "$QENDPOINT/api/tags" 2>/dev/null) ||
    die "Ollama endpoint unreachable: $QENDPOINT (start 'ollama serve')"
  printf '%s' "$tags" | jq -e --arg m "$model" '.models[] | select(.name == $m)' >/dev/null ||
    die "model not pulled on $QENDPOINT: $model (ollama pull $model)"

  # ── Gate 4: deterministic routing decision must be "local" ──────────────────
  local decision
  decision=$(bash "$ROOT/scripts/engine.sh" route --ollama up --claude unreachable --json 2>/dev/null | jq -r '.decision') || decision="blocked"
  [ "$decision" = "local" ] || die "route decision is '$decision', not 'local' — refusing to query."

  # ── Deterministic page selection (lexical search; §5 NO-RAG) ─────────────────
  local pages_dir hits f n=0
  pages_dir=$(mktemp -d) || die "mktemp -d failed"
  # shellcheck disable=SC2064
  trap "rm -rf '$pages_dir'" EXIT
  mkdir -p "$pages_dir/vault/wiki"
  hits=$(bash "$ROOT/scripts/engine.sh" search "$question" --target "$VAULT" --json 2>/dev/null |
    jq -r '.hits[].file' 2>/dev/null | head -n "$max_pages") || hits=""
  if [ -n "$hits" ]; then
    while IFS= read -r f; do
      [ -r "$VAULT/$f" ] || continue
      mkdir -p "$pages_dir/vault/$(dirname "$f")"
      cp "$VAULT/$f" "$pages_dir/vault/$f"
      n=$((n + 1))
    done <<<"$hits"
  fi
  echo "[offline-query] $n page(s) selected by deterministic search" >&2

  # ── Ask the local model (shared prompt + chat) ───────────────────────────────
  local qfile sys usr content work
  qfile="$pages_dir/question.txt"
  printf '%s\n' "$question" >"$qfile"
  sys=$(build_query_system_prompt)
  usr=$(build_query_user_prompt "$qfile" "$pages_dir/vault")
  content=$(query_ollama_chat "$model" "$sys" "$usr") || die "model run failed"

  # ── Parse + runtime answer verification (the deny rule) ─────────────────────
  work="$pages_dir/parsed"
  mkdir -p "$work"
  if ! printf '%s\n' "$content" | parse_answer "$work"; then
    echo "WARNING: the model's answer did not follow the protocol — ANSWER DENIED." >&2
    exit 1
  fi
  local verify_out fabricated problems
  verify_out=$(verify_citations "$work/citations.tsv" "$VAULT")
  fabricated=$(printf '%s\n' "$verify_out" | tail -1)
  problems=$(printf '%s\n' "$verify_out" | sed '$d')
  if [ "$fabricated" -ne 0 ]; then
    echo "WARNING: answer verification failed (${fabricated} unverifiable citation(s)) — ANSWER DENIED (ADR-0019)." >&2
    [ -n "$problems" ] && printf '%s\n' "$problems" >&2
    echo "The local model did not sustain the quality level for this answer. Re-ask, rephrase, or use Claude when reachable." >&2
    exit 1
  fi

  # ── Verified — present the answer ────────────────────────────────────────────
  echo "ANSWER (local:$model, coverage: $(cat "$work/coverage"), verified):"
  echo
  cat "$work/answer.txt"
  echo
  if [ -s "$work/citations.tsv" ]; then
    echo "CITATIONS (verified verbatim):"
    while IFS=$'\t' read -r t q; do
      printf -- '- [[%s]] — "%s"\n' "$t" "$q"
    done <"$work/citations.tsv"
  else
    echo "CITATIONS: none (the wiki does not record this)."
  fi
}

if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  main "$@"
fi

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
# mirrors that script's curl pattern (the canonical produce step).
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
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Reuse the fail-closed FILE-protocol parser + prompt builders. Sourcing does not
# run its main() (guarded by a BASH_SOURCE check) and does not enable `set -e`.
# shellcheck source=eval-produce-ollama.sh
source "$ROOT/scripts/eval-produce-ollama.sh"
# shellcheck source=resolve-vault.sh
source "$ROOT/scripts/resolve-vault.sh"
# M10: source the shared Ollama curl+backoff helper (DRY — previously triplicated).
# shellcheck source=ollama-chat.sh
source "$ROOT/scripts/ollama-chat.sh"

usage() {
  sed -n '/^# Usage:/,/^set -uo/p' "${BASH_SOURCE[0]}" | sed '$d' | sed 's/^# \{0,1\}//'
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
ollama_chat() { # $1 = model, $2 = system prompt, $3 = user prompt → stdout content
  local model="$1" sys="$2" usr="$3"
  ollama_chat_call "$ENDPOINT" "$model" "$sys" "$usr" "$NUM_CTX" "$TIMEOUT" "$RETRIES" "offline-draft:${model}"
}

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
    content=$(ollama_chat "$model" "$sys" "$usr") || die "model run failed for $f"

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

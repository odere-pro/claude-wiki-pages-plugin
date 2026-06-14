#!/bin/bash
# eval-produce-baseline.sh — the BASELINE-ARM produce step for the scaffolding
# ablation (docs/adr/ADR-0020-scaffolding-ablation-eval.md).
#
# The ablation compares two arms of the SAME model on the SAME golden inputs:
#   plugin arm   — full scaffolding prompts (schema excerpt, provenance
#                  contract, verbatim source_quotes rule, anti-fabrication and
#                  grounding rules) via eval-produce-ollama.sh and
#                  eval-produce-ollama-query.sh.
#   baseline arm — THIS script: generic prompts a user would write without the
#                  plugin ("extract the knowledge into well-organized notes",
#                  "answer the question from these notes").
#
# Ablate the CONTRACT, keep the TRANSPORT: both arms keep the delimiter
# protocols (===FILE: blocks; ===ANSWER===/===COVERAGE===/===CITATIONS===/
# ===END===) because the scorers fail closed (rc 2 = unscorable) on transport
# violations — a baseline that can't be parsed measures nothing. Everything the
# plugin's scaffolding adds on top of the transport is dropped here.
#
# No duplicated plumbing: parse_response (fail-closed ===FILE: parser) is
# sourced from eval-produce-ollama.sh and query_ollama_chat (deterministic
# /api/chat call with exponential timeout backoff) from
# eval-produce-ollama-query.sh, so the two arms share parser and network path
# and differ ONLY in their prompts.
#
# Exit codes: 0 candidate(s)/answer(s) written · 2 usage / preflight / network /
# parse error — fatal, fail-closed.
#
# Usage:
#   scripts/eval-produce-baseline.sh --tier ingest-extract|query --model <m>
#       [--case <name>] [--out <dir>] [--endpoint <url>] [--num-ctx <n>]
#       [--timeout <sec>] [--retries <n>] [--dry-run-prompt]
#   scripts/eval-produce-baseline.sh --help
set -uo pipefail

BROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ICASES_DIR="$BROOT/tests/eval/ingest-extract/cases"
QCASES_DIR="$BROOT/tests/eval/query/cases"

# Shared plumbing (sourced, not copied): parse_response + query_ollama_chat.
# Both files guard their main() behind a BASH_SOURCE check.
# shellcheck source=eval-produce-ollama.sh
source "$BROOT/scripts/eval-produce-ollama.sh"
# shellcheck source=eval-produce-ollama-query.sh
source "$BROOT/scripts/eval-produce-ollama-query.sh"

die() {
  echo "ERROR: $*" >&2
  exit 2
}

usage() {
  sed -n '/^# Usage:/,/^set -uo/p' "${BASH_SOURCE[0]}" | sed '$d' | sed 's/^# \{0,1\}//'
}

# ── baseline prompts (transport only — the contract is the ablated variable) ──

baseline_ingest_system_prompt() {
  cat <<'EOF'
You convert ONE document into well-organized markdown notes. Output ONLY file
blocks in exactly this protocol — no other prose, no markdown fences around
the protocol:

===FILE: wiki/<relative path>.md===
<complete file content>
===END FILE===
EOF
}

baseline_ingest_user_prompt() { # $1 = case input file
  cat <<EOF
Extract the knowledge from the document below into well-organized markdown
notes under wiki/. Use as many files as you find natural.

DOCUMENT:

$(cat "$1")
EOF
}

baseline_query_system_prompt() {
  cat <<'EOF'
You answer ONE question from the notes provided. Output ONLY this exact
protocol — no other prose, no markdown fences around the protocol:

===ANSWER===
<your answer in plain prose>
===COVERAGE: full|partial|none===
===CITATIONS===
[[Page Title]] | "<a sentence from that page>"
===END===
EOF
}

baseline_query_user_prompt() { # $1 = question file, $2 = vault dir
  local f
  cat <<EOF
Answer the question from these notes.

QUESTION: $(cat "$1")

NOTES:
EOF
  while IFS= read -r f; do
    printf '\n--- PAGE: %s ---\n' "${f#"$2"/}"
    cat "$f"
  done < <(find "$2/wiki" -type f -name '*.md' | sort)
}

# ── produce one case per tier ─────────────────────────────────────────────────

produce_baseline_ingest() { # $1 = model, $2 = case
  local model="$1" case_name="$2" input sys usr slug case_out content
  input="$ICASES_DIR/$case_name/input.md"
  [ -r "$input" ] || die "unknown ingest-extract case (no input.md): $case_name"

  sys=$(baseline_ingest_system_prompt)
  usr=$(baseline_ingest_user_prompt "$input")

  if [ "$BDRY_RUN" -eq 1 ]; then
    printf '%s\n\n---8<--- user prompt ---8<---\n\n%s\n' "$sys" "$usr"
    return 0
  fi

  slug="$(printf '%s' "$model" | tr ':/' '--')-baseline"
  case_out="$BOUT_DIR/$slug/$case_name"
  rm -rf "$case_out"
  mkdir -p "$case_out"

  echo "[baseline-produce] $model × ingest-extract × $case_name → $case_out"
  content=$(query_ollama_chat "$model" "$sys" "$usr")
  printf '%s\n' "$content" >"$BOUT_DIR/$slug/$case_name.response.txt"

  # Same harness scaffold as the plugin arm (the vault root pre-exists in
  # production too) — the ablated variable is the prompts, not the scaffold.
  cat >"$case_out/CLAUDE.md" <<EOF
# Candidate Vault — Schema

\`schema_version: 2\`

BASELINE-ARM candidate (scaffolding ablation, ADR-0020) of
tests/eval/ingest-extract/cases/$case_name/input.md produced by $model via
scripts/eval-produce-baseline.sh — generic prompt, no schema/provenance
contract. The authoritative schema lives in skills/init/template/CLAUDE.md.
EOF

  printf '%s\n' "$content" | parse_response "$case_out" ||
    die "baseline response did not follow the FILE protocol for $model × $case_name (raw kept at $BOUT_DIR/$slug/$case_name.response.txt)"
  echo "[baseline-produce] candidate ready: $case_out"
}

produce_baseline_query() { # $1 = model, $2 = case
  local model="$1" case_name="$2" qfile vault sys usr slug out content
  qfile="$QCASES_DIR/$case_name/question.txt"
  vault="$QCASES_DIR/$case_name/vault"
  [ -r "$qfile" ] || die "unknown query case (no question.txt): $case_name"
  [ -d "$vault/wiki" ] || die "query case has no vault/wiki: $case_name"

  sys=$(baseline_query_system_prompt)
  usr=$(baseline_query_user_prompt "$qfile" "$vault")

  if [ "$BDRY_RUN" -eq 1 ]; then
    printf '%s\n\n---8<--- user prompt ---8<---\n\n%s\n' "$sys" "$usr"
    return 0
  fi

  slug="$(printf '%s' "$model" | tr ':/' '--')-baseline"
  out="$BOUT_DIR/$slug"
  mkdir -p "$out"
  echo "[baseline-produce] $model × query × $case_name"
  content=$(query_ollama_chat "$model" "$sys" "$usr")
  printf '%s\n' "$content" >"$out/$case_name.answer.txt"
  echo "[baseline-produce] answer ready: $out/$case_name.answer.txt"
}

# ── main ──────────────────────────────────────────────────────────────────────

baseline_main() {
  local TIER="" MODEL="" CASE=""
  BOUT_DIR=""
  BDRY_RUN=0
  # query_ollama_chat reads these globals (set by eval-produce-ollama-query.sh's
  # main when run standalone; set here when sourced).
  QENDPOINT="${OLLAMA_HOST:-http://localhost:11434}"
  QNUM_CTX=8192
  QTIMEOUT=600
  QRETRIES=0

  while [ $# -gt 0 ]; do
    case "$1" in
      --tier)
        TIER="${2:-}"
        shift 2
        ;;
      --model)
        MODEL="${2:-}"
        shift 2
        ;;
      --case)
        CASE="${2:-}"
        shift 2
        ;;
      --out)
        BOUT_DIR="${2:-}"
        shift 2
        ;;
      --endpoint)
        QENDPOINT="${2:-}"
        shift 2
        ;;
      --num-ctx)
        # shellcheck disable=SC2034  # consumed by the sourced query_ollama_chat
        QNUM_CTX="${2:-}"
        shift 2
        ;;
      --timeout)
        # shellcheck disable=SC2034  # consumed by the sourced query_ollama_chat
        QTIMEOUT="${2:-}"
        shift 2
        ;;
      --retries)
        # shellcheck disable=SC2034  # consumed by the sourced query_ollama_chat
        QRETRIES="${2:-}"
        shift 2
        ;;
      --dry-run-prompt)
        BDRY_RUN=1
        shift
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

  case "$TIER" in
    ingest-extract | query) : ;;
    *)
      usage >&2
      die "--tier must be ingest-extract or query (got: ${TIER:-<empty>})"
      ;;
  esac
  [ -n "$MODEL" ] || {
    usage >&2
    die "--model is required"
  }
  command -v jq >/dev/null 2>&1 || die "jq is required"

  if [ -z "$BOUT_DIR" ]; then
    case "$TIER" in
      ingest-extract) BOUT_DIR="$BROOT/tmp/eval-candidates" ;;
      query) BOUT_DIR="$BROOT/tmp/eval-query-answers" ;;
    esac
  fi

  local cases_dir probe
  case "$TIER" in
    ingest-extract)
      cases_dir="$ICASES_DIR"
      probe="input.md"
      ;;
    query)
      cases_dir="$QCASES_DIR"
      probe="question.txt"
      ;;
  esac

  declare -a case_list=()
  if [ -n "$CASE" ]; then
    [ -r "$cases_dir/$CASE/$probe" ] || die "unknown case (no $probe): $CASE"
    case_list=("$CASE")
  else
    local d
    for d in "$cases_dir"/*/; do
      [ -r "${d}${probe}" ] || continue
      case_list+=("$(basename "$d")")
    done
    [ "${#case_list[@]}" -gt 0 ] || die "no cases found under $cases_dir"
  fi

  if [ "$BDRY_RUN" -eq 0 ]; then
    local tags
    tags=$(curl -sS --fail --connect-timeout 5 "$QENDPOINT/api/tags" 2>/dev/null) ||
      die "Ollama endpoint unreachable: $QENDPOINT"
    printf '%s' "$tags" | jq -e --arg m "$MODEL" '.models[] | select(.name == $m)' >/dev/null ||
      die "model not pulled on $QENDPOINT: $MODEL (ollama pull $MODEL)"
    mkdir -p "$BOUT_DIR"
  fi

  local c
  for c in "${case_list[@]}"; do
    case "$TIER" in
      ingest-extract) produce_baseline_ingest "$MODEL" "$c" ;;
      query) produce_baseline_query "$MODEL" "$c" ;;
    esac
  done
}

if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  baseline_main "$@"
fi

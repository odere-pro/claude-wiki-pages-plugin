#!/bin/bash
# eval-compare-ollama.sh — matrix runner for the ingest-extract quality gate.
#
# Loops models × golden-set cases: produces each candidate with
# scripts/eval-produce-ollama.sh, scores it with the model-neutral apparatus
# scripts/eval-ingest-extract.sh --json, and prints one summary table. This is
# a REPORT, not a gate — the scorer remains the only verdict authority, and a
# tier unlock still requires a committed --stamp artifact per ADR-0011.
#
# Exit codes:
#   0  matrix completed (individual cells may be FAIL — read the table)
#   2  usage / internal error
#
# Scoring uses the ADR-0017 floor definition (each case's raw input is passed
# via --input, so verbatim extras report as over-citation, not fabrication).
#
# Usage:
#   scripts/eval-compare-ollama.sh --models "m1,m2,..." [--cases "c1,c2,..."]
#       [--out <dir>] [--timeout <sec>] [--retries <n>]
#   scripts/eval-compare-ollama.sh --help
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CASES_DIR="$ROOT/tests/eval/ingest-extract/cases"
PRODUCE="$ROOT/scripts/eval-produce-ollama.sh"
SCORER="$ROOT/scripts/eval-ingest-extract.sh"

die() {
  echo "ERROR: $*" >&2
  exit 2
}

usage() {
  sed -n '/^# Usage:/,/^set -uo/p' "${BASH_SOURCE[0]}" | sed '$d' | sed 's/^# \{0,1\}//'
}

MODELS=""
CASES=""
OUT_DIR="$ROOT/tmp/eval-candidates"
TIMEOUT=600
RETRIES=0

while [ $# -gt 0 ]; do
  case "$1" in
    --models)
      MODELS="${2:-}"
      shift 2
      ;;
    --cases)
      CASES="${2:-}"
      shift 2
      ;;
    --out)
      OUT_DIR="${2:-}"
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

[ -n "$MODELS" ] || {
  usage >&2
  die "--models is required (comma-separated)"
}
command -v jq >/dev/null 2>&1 || die "jq is required"
[ -x "$PRODUCE" ] || die "produce driver missing: $PRODUCE"
[ -x "$SCORER" ] || die "scorer missing: $SCORER"

declare -a case_list=()
if [ -n "$CASES" ]; then
  IFS=',' read -ra case_list <<<"$CASES"
else
  for d in "$CASES_DIR"/*/; do
    [ -r "${d}input.md" ] || continue
    case_list+=("$(basename "$d")")
  done
fi
[ "${#case_list[@]}" -gt 0 ] || die "no cases resolved"

IFS=',' read -ra model_list <<<"$MODELS"
[ "${#model_list[@]}" -gt 0 ] || die "no models resolved"

ROWS=""
for model in "${model_list[@]}"; do
  model=$(printf '%s' "$model" | sed 's/^ *//; s/ *$//')
  [ -n "$model" ] || continue
  slug=$(printf '%s' "$model" | tr ':/' '--')
  for c in "${case_list[@]}"; do
    c=$(printf '%s' "$c" | sed 's/^ *//; s/ *$//')
    echo "── $model × $c ──────────────────────────────────────────────"
    if ! bash "$PRODUCE" --model "$model" --case "$c" --out "$OUT_DIR" --timeout "$TIMEOUT" --retries "$RETRIES"; then
      ROWS="${ROWS}${model}|${c}|-|-|-|-|-|-|PRODUCE_ERR\n"
      continue
    fi
    cand="$OUT_DIR/$slug/$c"
    scores="$OUT_DIR/$slug/$c.scores.json"
    bash "$SCORER" --score "$cand" --gold "$CASES_DIR/$c/expected" \
      --input "$CASES_DIR/$c/input.md" --json >"$scores"
    rc=$?
    if [ "$rc" -ge 2 ] || [ ! -s "$scores" ]; then
      ROWS="${ROWS}${model}|${c}|-|-|-|-|-|-|SCORE_ERR\n"
      continue
    fi
    row=$(jq -r '[.schema_validity, .claim_source_fidelity, .frontmatter_field_accuracy,
                  .dedup_correctness, .fabricated_sourced_claims, .over_citation, .verdict] | join("|")' \
      "$scores" 2>/dev/null) || row="-|-|-|-|-|-|PARSE_ERR"
    ROWS="${ROWS}${model}|${c}|${row}\n"
  done
done

echo ""
echo "=== ingest-extract gate matrix (bar: schema>=0.98 fidelity>=0.97 fields>=0.90 dedup>=0.90 fabricated==0; over-cite reported, not floored — ADR-0017) ==="
# shellcheck disable=SC2059  # ROWS embeds literal \n separators by construction
printf "model|case|schema|fidelity|fields|dedup|fabricated|overcite|verdict\n${ROWS}" |
  column -t -s '|'

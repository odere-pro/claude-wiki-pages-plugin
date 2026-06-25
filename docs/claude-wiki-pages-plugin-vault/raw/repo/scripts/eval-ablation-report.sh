#!/bin/bash
# eval-ablation-report.sh — arms × tiers × cases matrix for the scaffolding
# ablation (docs/adr/ADR-0020-scaffolding-ablation-eval.md).
#
# Runs the SAME model through both arms — plugin (full scaffolding prompts via
# eval-produce-ollama.sh / eval-produce-ollama-query.sh) and baseline (generic
# prompts via eval-produce-baseline.sh) — over the golden-set cases of the
# requested tiers, scores every cell with the existing model-neutral scorers,
# and renders one side-by-side report (markdown table + a combined JSON).
#
# This is a REPORT, not a gate (the eval-compare-ollama.sh stance): scorer
# verdicts rc 0 (PASS) and rc 1 (FAIL) are both legitimate measurements — a
# baseline arm is EXPECTED to fail the bar; that gap is the result. Scorer
# rc >= 2 (unscorable: the answer/candidate violated the transport protocol)
# is recorded as an explicitly labeled UNSCORABLE cell carrying the scorer's
# reason — never silently dropped and never rendered as a number. In an
# ablation, baseline protocol drift to unscorable is itself a finding: the
# hard rules being ablated are what held the model on-protocol. A corrupt
# score file at render time stays FATAL (that is apparatus damage, not model
# behavior).
#
# Score files land under <out>/<tier>/<arm>/<case>.scores.json. --render-only
# re-renders from existing score files with NO produce and NO network — used
# by the bats suite (canned fixtures) and for re-printing a finished run.
#
# Exit codes: 0 report rendered (cells may be FAIL — read the table) ·
# 2 usage / produce error / scorer rc >= 2.
#
# Usage:
#   scripts/eval-ablation-report.sh --model <m> [--tiers ingest-extract,query]
#       [--cases <c1,c2,...>] [--out <dir>] [--timeout <sec>] [--retries <n>]
#       [--num-ctx <n>]
#   scripts/eval-ablation-report.sh --render-only [--out <dir>]
#   scripts/eval-ablation-report.sh --help
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ICASES_DIR="$ROOT/tests/eval/ingest-extract/cases"
QCASES_DIR="$ROOT/tests/eval/query/cases"
ISCORER="$ROOT/scripts/eval-ingest-extract.sh"
QSCORER="$ROOT/scripts/eval-query.sh"
IPRODUCE="$ROOT/scripts/eval-produce-ollama.sh"
QPRODUCE="$ROOT/scripts/eval-produce-ollama-query.sh"
BPRODUCE="$ROOT/scripts/eval-produce-baseline.sh"

die() {
  echo "ERROR: $*" >&2
  exit 2
}

usage() {
  sed -n '/^# Usage:/,/^set -uo/p' "${BASH_SOURCE[0]}" | sed '$d' | sed 's/^# \{0,1\}//'
}

MODEL=""
TIERS="ingest-extract,query"
CASES=""
OUT_DIR="$ROOT/tmp/eval-ablation"
TIMEOUT=600
RETRIES=0
NUM_CTX=8192
RENDER_ONLY=0

while [ $# -gt 0 ]; do
  case "$1" in
    --model)
      MODEL="${2:-}"
      shift 2
      ;;
    --tiers)
      TIERS="${2:-}"
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
    --num-ctx)
      NUM_CTX="${2:-}"
      shift 2
      ;;
    --render-only)
      RENDER_ONLY=1
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

command -v jq >/dev/null 2>&1 || die "jq is required"
if [ "$RENDER_ONLY" -eq 0 ]; then
  [ -n "$MODEL" ] || {
    usage >&2
    die "--model is required (or use --render-only on an existing --out dir)"
  }
  [ -x "$ISCORER" ] || die "scorer missing: $ISCORER"
  [ -x "$QSCORER" ] || die "scorer missing: $QSCORER"
fi

tier_cases() { # $1 = tier → echoes the case list, one per line
  local d probe cases_dir
  case "$1" in
    ingest-extract)
      cases_dir="$ICASES_DIR"
      probe="input.md"
      ;;
    query)
      cases_dir="$QCASES_DIR"
      probe="question.txt"
      ;;
    *) die "unknown tier: $1" ;;
  esac
  if [ -n "$CASES" ]; then
    printf '%s' "$CASES" | tr ',' '\n' | sed 's/^ *//; s/ *$//' | grep -v '^$'
    return 0
  fi
  for d in "$cases_dir"/*/; do
    [ -r "${d}${probe}" ] || continue
    basename "$d"
  done
}

# ── produce + score one cell ──────────────────────────────────────────────────
# A scorer exit of 0/1 is a measurement. rc >= 2 (transport/protocol violation)
# becomes an explicit unscorable cell with the scorer's reason — labeled, never
# silently dropped, never rendered as a number.
score_cell() { # $1 = tier, $2 = arm, $3 = case, $4 = candidate-or-answer path
  local tier="$1" arm="$2" c="$3" produced="$4" scores rc reason
  scores="$OUT_DIR/$tier/$arm/$c.scores.json"
  mkdir -p "$OUT_DIR/$tier/$arm"
  case "$tier" in
    ingest-extract)
      bash "$ISCORER" --score "$produced" --gold "$ICASES_DIR/$c/expected" \
        --input "$ICASES_DIR/$c/input.md" --json >"$scores" 2>"$scores.err"
      rc=$?
      ;;
    query)
      bash "$QSCORER" --answer "$produced" --gold "$QCASES_DIR/$c/gold.json" \
        --vault "$QCASES_DIR/$c/vault" --json >"$scores" 2>"$scores.err"
      rc=$?
      ;;
  esac
  if [ "$rc" -ge 2 ]; then
    reason=$(head -1 "$scores.err" 2>/dev/null | cut -c1-200)
    jq -n --arg reason "${reason:-scorer exit $rc with no message}" \
      '{verdict: "unscorable", scorer_rc: 2, reason: $reason}' >"$scores" ||
      die "failed to record unscorable cell for $tier × $arm × $c"
    echo "[ablation] UNSCORABLE: $tier × $arm × $c — ${reason:-scorer exit $rc}"
    rm -f "$scores.err"
    return 0
  fi
  rm -f "$scores.err"
  [ -s "$scores" ] || die "scorer emitted no JSON for $tier × $arm × $c"
  jq -e . "$scores" >/dev/null 2>&1 || die "invalid score JSON for $tier × $arm × $c: $scores"
}

run_cell() { # $1 = tier, $2 = arm, $3 = case
  local tier="$1" arm="$2" c="$3" work slug produced
  work="$OUT_DIR/$tier/$arm-work"
  slug=$(printf '%s' "$MODEL" | tr ':/' '--')
  [ "$arm" = "baseline" ] && slug="$slug-baseline"
  echo "── $MODEL × $tier × $arm × $c ──────────────────────────────"
  case "$tier:$arm" in
    ingest-extract:plugin)
      bash "$IPRODUCE" --model "$MODEL" --case "$c" --out "$work" \
        --timeout "$TIMEOUT" --retries "$RETRIES" --num-ctx "$NUM_CTX" ||
        die "plugin-arm produce failed for $tier × $c"
      produced="$work/$slug/$c"
      ;;
    ingest-extract:baseline)
      bash "$BPRODUCE" --tier ingest-extract --model "$MODEL" --case "$c" --out "$work" \
        --timeout "$TIMEOUT" --retries "$RETRIES" --num-ctx "$NUM_CTX" ||
        die "baseline-arm produce failed for $tier × $c"
      produced="$work/$slug/$c"
      ;;
    query:plugin)
      bash "$QPRODUCE" --model "$MODEL" --case "$c" --out "$work" \
        --timeout "$TIMEOUT" --retries "$RETRIES" --num-ctx "$NUM_CTX" ||
        die "plugin-arm produce failed for $tier × $c"
      produced="$work/$slug/$c.answer.txt"
      ;;
    query:baseline)
      bash "$BPRODUCE" --tier query --model "$MODEL" --case "$c" --out "$work" \
        --timeout "$TIMEOUT" --retries "$RETRIES" --num-ctx "$NUM_CTX" ||
        die "baseline-arm produce failed for $tier × $c"
      produced="$work/$slug/$c.answer.txt"
      ;;
  esac
  score_cell "$tier" "$arm" "$c" "$produced"
}

# ── render (pure: reads <out>/<tier>/<arm>/<case>.scores.json only) ──────────

render_tier() { # $1 = tier
  local tier="$1" arm c scores row had_any=0
  local header divider fields
  case "$tier" in
    ingest-extract)
      header="case|arm|schema|fidelity|fields|dedup|fabricated|overcite|verdict"
      fields='if .verdict == "unscorable" then ["-","-","-","-","-","-","unscorable"] else [.schema_validity, .claim_source_fidelity, .frontmatter_field_accuracy, .dedup_correctness, .fabricated_sourced_claims, (.over_citation // "-"), .verdict] end'
      ;;
    query)
      header="case|arm|coverage|recall|quotes|fabricated|verdict"
      fields='if .verdict == "unscorable" then ["-","-","-","-","unscorable"] else [(if .coverage_match then 1 else 0 end), .citation_recall, .quote_coverage, .fabricated_citations, .verdict] end'
      ;;
    *) die "unknown tier: $tier" ;;
  esac

  divider=$(printf '%s' "$header" | sed 's/[^|]\{1,\}/---/g')
  local rows=""
  for arm in plugin baseline; do
    for scores in "$OUT_DIR/$tier/$arm/"*.scores.json; do
      [ -r "$scores" ] || continue
      had_any=1
      c=$(basename "$scores" .scores.json)
      jq -e . "$scores" >/dev/null 2>&1 || die "invalid score JSON: $scores"
      row=$(jq -r "$fields | map(tostring) | join(\"|\")" "$scores") ||
        die "score JSON missing expected metrics: $scores"
      rows="${rows}${c}|${arm}|${row}\n"
    done
  done
  [ "$had_any" -eq 1 ] || return 1

  echo ""
  echo "### tier: $tier"
  echo ""
  # shellcheck disable=SC2059  # rows embeds literal \n separators by construction
  printf "${header}\n${divider}\n${rows}" | sed 's/|/ | /g; s/^/| /; s/$/ |/'
}

render_report() {
  local tier any=0
  echo ""
  echo "## Scaffolding ablation — plugin arm vs baseline arm (ADR-0020)"
  echo ""
  echo "Same model, same golden inputs; the prompts are the ablated variable."
  echo "A FAIL verdict on the baseline arm is a measurement, not an error."
  echo "An unscorable verdict means the arm's output violated the answer"
  echo "protocol itself — the strongest degradation signal, not a gap."
  echo "Note: the fabrication floor is vacuously clean for an arm that sources"
  echo "nothing — read baseline headline metrics as schema/fidelity, not floor."
  IFS=',' read -ra tier_list <<<"$TIERS"
  for tier in "${tier_list[@]}"; do
    tier=$(printf '%s' "$tier" | sed 's/^ *//; s/ *$//')
    [ -n "$tier" ] || continue
    render_tier "$tier" && any=1
  done
  [ "$any" -eq 1 ] || die "no score files found under $OUT_DIR — nothing to render"

  # Combined machine-readable summary next to the per-cell score files.
  local combined="$OUT_DIR/ablation-report.json"
  find "$OUT_DIR" -name '*.scores.json' -path "*/plugin/*" -o -name '*.scores.json' -path "*/baseline/*" |
    sort | while IFS= read -r f; do
    jq --arg tier "$(basename "$(dirname "$(dirname "$f")")")" \
      --arg arm "$(basename "$(dirname "$f")")" \
      --arg case "$(basename "$f" .scores.json)" \
      '{tier: $tier, arm: $arm, case: $case, scores: .}' "$f"
  done | jq -s . >"$combined" || die "failed to build $combined"
  echo ""
  echo "JSON: $combined"
}

# ── main ──────────────────────────────────────────────────────────────────────

if [ "$RENDER_ONLY" -eq 0 ]; then
  IFS=',' read -ra tier_list <<<"$TIERS"
  for tier in "${tier_list[@]}"; do
    tier=$(printf '%s' "$tier" | sed 's/^ *//; s/ *$//')
    [ -n "$tier" ] || continue
    while IFS= read -r c; do
      [ -n "$c" ] || continue
      run_cell "$tier" plugin "$c"
      run_cell "$tier" baseline "$c"
    done < <(tier_cases "$tier")
  done
fi

render_report

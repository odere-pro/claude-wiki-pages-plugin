#!/bin/bash
# eval-query.sh — the MODEL-NEUTRAL scorer for the `query` capability tier
# (docs/adr/ADR-0019-query-tier-and-answer-verification.md).
#
# Scores an already-emitted answer file against a case's gold.json by EXACT
# comparison — citation-title resolution and whitespace-normalized verbatim
# substring checks, never similarity (§5 NO-RAG). It makes no network call and
# never invokes a model; the produce step is scripts/eval-produce-ollama-query.sh.
#
# The verification core (parse_answer / resolve_citation_page / verify_citations)
# is SOURCEABLE and shared with scripts/offline-query.sh, so the gate-time scorer
# and the runtime answer-verification deny rule can never diverge.
#
# Answer protocol the model must emit (delimiter blocks, not JSON):
#   ===ANSWER===
#   <prose answer>
#   ===COVERAGE: full|partial|none===
#   ===CITATIONS===
#   [[Page Title]] | "<verbatim sentence from that page>"
#   ===END===
#
# Metrics (gold.json: expected_coverage, required_citations, required_quotes):
#   coverage_match        COVERAGE equals gold's expected_coverage (1/0)
#   citation_recall       required citations cited / required (1.0 when none required)
#   quote_coverage        required quotes present among citations / required (1.0 when none)
#   fabricated_citations  citations naming a nonexistent page OR quoting text not
#                         verbatim in that page — the zero floor (== 0, non-tunable)
#
# Verdict: PASS iff coverage_match==1 AND citation_recall>=0.90 AND
#          quote_coverage>=0.90 AND fabricated_citations==0.
#
# Exit codes: 0 PASS, 1 FAIL, 2 fatal (usage / parse / missing file) — fail-closed.
#
# Usage:
#   scripts/eval-query.sh --answer <answer.txt> --gold <gold.json> --vault <vault-dir> [--json]
#   scripts/eval-query.sh --self-test
set -euo pipefail

die() {
  echo "ERROR: $*" >&2
  exit 2
}

usage() {
  sed -n '/^# Usage:/,/^set -euo/p' "${BASH_SOURCE[0]}" | sed '$d' | sed 's/^# \{0,1\}//'
}

# M12: named constant for the 0.90 threshold so all three uses share one
# definition and a future calibration change is made in one place.
readonly THRESH_QUERY_RECALL="0.90"
readonly THRESH_QUERY_QUOTE="0.90"

# H13: source the single canonical normalize_ws implementation so this file
# and eval-ingest-extract.sh share one definition (DRY). The function
# collapses every whitespace run to one space (ADR-0017 normalization).
# shellcheck source=eval-normalize-ws.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/eval-normalize-ws.sh"

# ── verification core (pure; sourced by offline-query.sh) ────────────────────

# Parse the ANSWER protocol on stdin into $1/: answer.txt, coverage, citations.tsv
# (TITLE<TAB>QUOTE per line). Fail-closed: missing/duplicated markers die rc 2.
parse_answer() { # $1 = out dir
  local out="$1" state="pre" line cov="" n_ans=0 n_cit=0 n_end=0
  [ -d "$out" ] || die "parse_answer: output dir missing: $out"
  : >"$out/answer.txt"
  : >"$out/citations.tsv"
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      "===ANSWER===")
        [ "$state" = "pre" ] || die "parse_answer: unexpected ===ANSWER=== in state $state"
        state="answer"
        n_ans=$((n_ans + 1))
        ;;
      "===COVERAGE: "*"===")
        [ "$state" = "answer" ] || die "parse_answer: COVERAGE outside answer block"
        cov="${line#===COVERAGE: }"
        cov="${cov%===}"
        case "$cov" in
          full | partial | none) : ;;
          *) die "parse_answer: illegal coverage value: $cov" ;;
        esac
        state="postcov"
        ;;
      "===CITATIONS===")
        [ "$state" = "postcov" ] || die "parse_answer: CITATIONS before COVERAGE"
        state="citations"
        n_cit=$((n_cit + 1))
        ;;
      "===END===")
        [ "$state" = "citations" ] || die "parse_answer: END before CITATIONS"
        state="done"
        n_end=$((n_end + 1))
        ;;
      *)
        case "$state" in
          answer) printf '%s\n' "$line" >>"$out/answer.txt" ;;
          citations)
            # Citation row: [[Title]] | "quote"  (blank lines tolerated)
            [ -z "$line" ] && continue
            printf '%s' "$line" | grep -Eq '^\[\[.+\]\][[:space:]]*\|[[:space:]]*".*"[[:space:]]*$' ||
              die "parse_answer: malformed citation row: $line"
            local title quote
            title=$(printf '%s' "$line" | sed -E 's/^\[\[(.+)\]\][[:space:]]*\|.*$/\1/')
            quote=$(printf '%s' "$line" | sed -E 's/^[^|]*\|[[:space:]]*"(.*)"[[:space:]]*$/\1/')
            printf '%s\t%s\n' "$title" "$quote" >>"$out/citations.tsv"
            ;;
          pre | postcov | done) : ;; # chatter outside blocks is ignored
        esac
        ;;
    esac
  done
  [ "$n_ans" -eq 1 ] && [ "$n_cit" -eq 1 ] && [ "$n_end" -eq 1 ] && [ "$state" = "done" ] ||
    die "parse_answer: protocol incomplete (ANSWER=$n_ans CITATIONS=$n_cit END=$n_end state=$state)"
  [ -n "$cov" ] || die "parse_answer: missing COVERAGE"
  printf '%s\n' "$cov" >"$out/coverage"
}

# Resolve a citation title to a wiki page path by frontmatter title: or aliases.
# Echoes the path; returns 1 when no page matches.
resolve_citation_page() { # $1 = vault, $2 = title
  local vault="$1" title="$2" f
  while IFS= read -r f; do
    if grep -qF "title: \"$title\"" "$f" 2>/dev/null; then
      printf '%s\n' "$f"
      return 0
    fi
    if grep -E '^aliases:' "$f" 2>/dev/null | grep -qF "\"$title\""; then
      printf '%s\n' "$f"
      return 0
    fi
  done < <(find "$vault/wiki" -type f -name '*.md' 2>/dev/null | sort)
  return 1
}

# Verify every citation row: page resolves AND quote is a verbatim
# (whitespace-normalized) substring of the page. Prints one PROBLEM: line per
# violation; echoes the fabricated count last. Never exits — callers decide.
verify_citations() { # $1 = citations.tsv, $2 = vault
  local tsv="$1" vault="$2" fabricated=0 title quote page page_norm quote_norm
  while IFS=$'\t' read -r title quote; do
    [ -n "$title" ] || continue
    if ! page=$(resolve_citation_page "$vault" "$title"); then
      echo "PROBLEM: cited page does not exist: [[$title]]"
      fabricated=$((fabricated + 1))
      continue
    fi
    if [ -z "$quote" ]; then
      echo "PROBLEM: empty quote for [[$title]]"
      fabricated=$((fabricated + 1))
      continue
    fi
    page_norm=$(normalize_ws <"$page")
    quote_norm=$(printf '%s' "$quote" | normalize_ws)
    if ! printf '%s' "$page_norm" | grep -qF -- "$quote_norm"; then
      echo "PROBLEM: quote not verbatim in [[$title]]: \"$quote\""
      fabricated=$((fabricated + 1))
    fi
  done <"$tsv"
  echo "$fabricated"
}

# ── scoring ───────────────────────────────────────────────────────────────────

score_answer() { # $1 = answer file, $2 = gold.json, $3 = vault, $4 = json flag
  local answer="$1" gold="$2" vault="$3" json="$4"
  [ -r "$answer" ] || die "answer file not readable: $answer"
  [ -r "$gold" ] || die "gold file not readable: $gold"
  [ -d "$vault/wiki" ] || die "vault has no wiki/: $vault"

  local work
  work=$(mktemp -d) || die "mktemp failed"
  # shellcheck disable=SC2064
  trap "rm -rf '$work'" EXIT

  parse_answer "$work" <"$answer"

  local exp_cov got_cov coverage_match
  exp_cov=$(jq -er '.expected_coverage' "$gold") || die "gold.json missing expected_coverage"
  got_cov=$(cat "$work/coverage")
  [ "$got_cov" = "$exp_cov" ] && coverage_match=1 || coverage_match=0

  # citation_recall: required citations that appear among cited titles.
  local req_n cited_hits=0 recall="1.0000" rq
  req_n=$(jq -r '.required_citations | length' "$gold")
  if [ "$req_n" -gt 0 ]; then
    while IFS= read -r rq; do
      cut -f1 "$work/citations.tsv" | grep -qFx -- "$rq" && cited_hits=$((cited_hits + 1))
    done < <(jq -r '.required_citations[]' "$gold")
    recall=$(awk -v h="$cited_hits" -v n="$req_n" 'BEGIN{printf "%.4f", h/n}')
  fi

  # quote_coverage: required quotes present (normalized substring) among cited quotes.
  local quotes_n quote_hits=0 qcov="1.0000" needed cited_all
  quotes_n=$(jq -r '.required_quotes | length' "$gold")
  if [ "$quotes_n" -gt 0 ]; then
    cited_all=$(cut -f2 "$work/citations.tsv" | normalize_ws)
    while IFS= read -r needed; do
      needed=$(printf '%s' "$needed" | normalize_ws)
      printf '%s' "$cited_all" | grep -qF -- "$needed" && quote_hits=$((quote_hits + 1))
    done < <(jq -r '.required_quotes[]' "$gold")
    qcov=$(awk -v h="$quote_hits" -v n="$quotes_n" 'BEGIN{printf "%.4f", h/n}')
  fi

  # fabricated citations (the floor) via the shared verification core.
  local verify_out fabricated problems
  verify_out=$(verify_citations "$work/citations.tsv" "$vault")
  fabricated=$(printf '%s\n' "$verify_out" | tail -1)
  problems=$(printf '%s\n' "$verify_out" | sed '$d')

  local verdict="fail"
  if [ "$coverage_match" -eq 1 ] && [ "$fabricated" -eq 0 ] &&
    awk -v r="$recall" -v t="$THRESH_QUERY_RECALL" 'BEGIN{exit !(r>=t)}' &&
    awk -v q="$qcov" -v t="$THRESH_QUERY_QUOTE" 'BEGIN{exit !(q>=t)}'; then
    verdict="pass"
  fi

  if [ "$json" -eq 1 ]; then
    jq -n --arg v "$verdict" --arg ec "$exp_cov" --arg gc "$got_cov" \
      --argjson cm "$coverage_match" --argjson fab "$fabricated" \
      --arg cr "$recall" --arg qc "$qcov" \
      --arg tr "$THRESH_QUERY_RECALL" --arg tq "$THRESH_QUERY_QUOTE" \
      '{tier:"query", verdict:$v, coverage_match:($cm==1),
        expected_coverage:$ec, got_coverage:$gc,
        citation_recall:($cr|tonumber), quote_coverage:($qc|tonumber),
        fabricated_citations:$fab,
        thresholds:{citation_recall:($tr|tonumber), quote_coverage:($tq|tonumber),
                    coverage_match:true, fabricated_citations:0}}'
  else
    [ -n "$problems" ] && printf '%s\n' "$problems"
    echo "coverage: got=$got_cov expected=$exp_cov match=$coverage_match"
    echo "citation_recall: $recall  quote_coverage: $qcov  fabricated: $fabricated"
    echo "VERDICT: $verdict"
  fi
  [ "$verdict" = "pass" ]
}

# ── self-test (fail-closed proof) ─────────────────────────────────────────────

run_self_test() {
  local tmp ok=0
  tmp=$(mktemp -d)
  # shellcheck disable=SC2064
  trap "rm -rf '$tmp'" EXIT

  # Mini vault with one page.
  mkdir -p "$tmp/vault/wiki/tools"
  cat >"$tmp/vault/wiki/tools/widget.md" <<'EOF'
---
title: "Widget"
aliases: ["Widget", "widget"]
---
# Widget
The widget spins at nine thousand rpm.
EOF
  cat >"$tmp/gold.json" <<'EOF'
{"expected_coverage":"full","required_citations":["Widget"],
 "required_quotes":["The widget spins at nine thousand rpm."]}
EOF

  # Case 1: a good answer passes.
  cat >"$tmp/good.txt" <<'EOF'
===ANSWER===
The widget spins at nine thousand rpm.
===COVERAGE: full===
===CITATIONS===
[[Widget]] | "The widget spins at nine thousand rpm."
===END===
EOF
  if (score_answer "$tmp/good.txt" "$tmp/gold.json" "$tmp/vault" 0 >/dev/null 2>&1); then
    echo "SELF-TEST OK: good answer passes"
  else
    echo "SELF-TEST FAIL: good answer did not pass"
    ok=1
  fi

  # Case 2: a fabricated quote (not verbatim) is floored.
  cat >"$tmp/fabquote.txt" <<'EOF'
===ANSWER===
It spins very fast.
===COVERAGE: full===
===CITATIONS===
[[Widget]] | "The widget spins at ten thousand rpm."
===END===
EOF
  if (score_answer "$tmp/fabquote.txt" "$tmp/gold.json" "$tmp/vault" 0 >/dev/null 2>&1); then
    echo "SELF-TEST FAIL: fabricated quote was NOT floored"
    ok=1
  else
    echo "SELF-TEST OK: fabricated quote is floored"
  fi

  # Case 3: a nonexistent cited page is floored.
  cat >"$tmp/fabpage.txt" <<'EOF'
===ANSWER===
See the gizmo page.
===COVERAGE: full===
===CITATIONS===
[[Gizmo]] | "The widget spins at nine thousand rpm."
===END===
EOF
  if (score_answer "$tmp/fabpage.txt" "$tmp/gold.json" "$tmp/vault" 0 >/dev/null 2>&1); then
    echo "SELF-TEST FAIL: nonexistent cited page was NOT floored"
    ok=1
  else
    echo "SELF-TEST OK: nonexistent cited page is floored"
  fi

  # Case 4: a malformed protocol dies rc 2 (never a silent verdict).
  # The || true guard prevents -e from aborting the outer shell on the expected
  # non-zero exit; we capture the real rc and check it explicitly.
  printf 'no protocol at all\n' >"$tmp/malformed.txt"
  local _c4_rc=0
  (score_answer "$tmp/malformed.txt" "$tmp/gold.json" "$tmp/vault" 0) >/dev/null 2>&1 || _c4_rc=$?
  if [ "$_c4_rc" -eq 2 ]; then
    echo "SELF-TEST OK: malformed protocol dies rc 2"
  else
    echo "SELF-TEST FAIL: malformed protocol did not die rc 2 (got rc=$_c4_rc)"
    ok=1
  fi

  # Case 5: coverage dishonesty (gold expects none, model claims full) fails.
  cat >"$tmp/gold-none.json" <<'EOF'
{"expected_coverage":"none","required_citations":[],"required_quotes":[]}
EOF
  if (score_answer "$tmp/good.txt" "$tmp/gold-none.json" "$tmp/vault" 0 >/dev/null 2>&1); then
    echo "SELF-TEST FAIL: coverage mismatch was NOT failed"
    ok=1
  else
    echo "SELF-TEST OK: coverage mismatch fails"
  fi

  [ "$ok" -eq 0 ] && echo "OK: eval-query self-test passed (fail-closed verified)"
  return "$ok"
}

# ── main ──────────────────────────────────────────────────────────────────────

main() {
  local answer="" gold="" vault="" json=0
  while [ $# -gt 0 ]; do
    case "$1" in
      --answer)
        answer="${2:-}"
        shift 2
        ;;
      --gold)
        gold="${2:-}"
        shift 2
        ;;
      --vault)
        vault="${2:-}"
        shift 2
        ;;
      --json)
        json=1
        shift
        ;;
      --self-test)
        run_self_test
        exit $?
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
  [ -n "$answer" ] && [ -n "$gold" ] && [ -n "$vault" ] || {
    usage >&2
    die "--answer, --gold, and --vault are required"
  }
  score_answer "$answer" "$gold" "$vault" "$json"
}

if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  main "$@"
fi

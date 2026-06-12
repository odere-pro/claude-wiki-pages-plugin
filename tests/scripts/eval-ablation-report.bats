#!/usr/bin/env bats
# Tests for scripts/eval-ablation-report.sh — the arms × tiers × cases report
# of the scaffolding ablation (docs/adr/ADR-0020-scaffolding-ablation-eval.md).
#
# All offline: --render-only reads canned <tier>/<arm>/<case>.scores.json
# fixtures with no produce step and no network. The report tolerates scorer
# verdict FAIL (a baseline arm is expected to fail the bar — that gap is the
# result) but dies on anything unscorable (invalid JSON, nothing to render).

load '../test_helper/common'

setup() {
  _load_helpers
  REPORT="$REPO_ROOT/scripts/eval-ablation-report.sh"
  OUT="$BATS_TEST_TMPDIR/ablation"
  mkdir -p "$OUT/ingest-extract/plugin" "$OUT/ingest-extract/baseline" \
    "$OUT/query/plugin" "$OUT/query/baseline"
}

plant_ingest_scores() { # $1 = arm, $2 = verdict, $3 = schema
  cat >"$OUT/ingest-extract/$1/extract-basic.scores.json" <<EOF
{"schema_validity":$3,"claim_source_fidelity":0.5,"frontmatter_field_accuracy":0.5,
 "dedup_correctness":1.0,"fabricated_sourced_claims":0,"over_citation":0,"verdict":"$2"}
EOF
}

plant_query_scores() { # $1 = arm, $2 = verdict
  cat >"$OUT/query/$1/query-basic.scores.json" <<EOF
{"coverage_match":true,"citation_recall":1.0,"quote_coverage":1.0,
 "fabricated_citations":0,"verdict":"$2"}
EOF
}

@test "eval-ablation-report: renders both arms side by side from canned scores" {
  plant_ingest_scores plugin pass 1.0
  plant_ingest_scores baseline fail 0.0
  plant_query_scores plugin pass
  plant_query_scores baseline fail

  run bash "$REPORT" --render-only --out "$OUT"

  assert_success
  assert_output_contains "tier: ingest-extract"
  assert_output_contains "tier: query"
  assert_output_contains "plugin"
  assert_output_contains "baseline"
  [ -s "$OUT/ablation-report.json" ]
  run jq -r 'length' "$OUT/ablation-report.json"
  assert_output_contains "4"
}

@test "eval-ablation-report: a FAIL verdict is a measurement, not an error (rc 0)" {
  plant_ingest_scores plugin fail 0.5
  plant_ingest_scores baseline fail 0.0

  run bash "$REPORT" --render-only --out "$OUT" --tiers ingest-extract

  assert_success
  assert_output_contains "fail"
}

@test "eval-ablation-report: an unscorable cell renders labeled with dashes, not numbers" {
  plant_query_scores plugin pass
  cat >"$OUT/query/baseline/query-basic.scores.json" <<'EOF'
{"verdict":"unscorable","scorer_rc":2,"reason":"parse_answer: malformed citation row"}
EOF

  run bash "$REPORT" --render-only --out "$OUT" --tiers query

  assert_success
  assert_output_contains "unscorable"
  # The unscorable row must carry no metric numbers.
  run grep -E '\| query-basic \| baseline \|' <<<"$output"
  assert_output_contains "| - | - | - | - | unscorable |"
}

@test "eval-ablation-report: invalid score JSON is fatal (rc 2), never rendered" {
  plant_ingest_scores plugin pass 1.0
  printf 'not json\n' >"$OUT/ingest-extract/baseline/extract-basic.scores.json"

  run bash "$REPORT" --render-only --out "$OUT" --tiers ingest-extract

  assert_status 2
  assert_output_contains "invalid score JSON"
}

@test "eval-ablation-report: nothing to render is fatal (rc 2)" {
  run bash "$REPORT" --render-only --out "$OUT"
  assert_status 2
  assert_output_contains "no score files"
}

@test "eval-ablation-report: missing --model without --render-only is a usage error" {
  run bash "$REPORT" --out "$OUT"
  assert_status 2
}

#!/usr/bin/env bats
# Tests for scripts/eval-produce-baseline.sh — the baseline-arm produce step of
# the scaffolding ablation (docs/adr/ADR-0020-scaffolding-ablation-eval.md).
#
# Behavior under test (all offline — --dry-run-prompt makes no network call):
#   - The ablation contract: baseline prompts keep the TRANSPORT (the
#     ===FILE:/===END FILE=== and ===ANSWER===/.../===END=== delimiter
#     protocols) but drop the CONTRACT (schema excerpt, source_quotes verbatim
#     rule, anti-fabrication/grounding/attribution hard rules).
#   - Usage errors (missing/bad --tier, missing --model, unknown case) exit 2.

load '../test_helper/common'

setup() {
  _load_helpers
  PRODUCE="$REPO_ROOT/scripts/eval-produce-baseline.sh"
}

@test "eval-produce-baseline: ingest dry-run keeps the FILE transport" {
  run bash "$PRODUCE" --tier ingest-extract --model fake --case extract-basic --dry-run-prompt
  assert_success
  assert_output_contains "===FILE: wiki/"
  assert_output_contains "===END FILE==="
  assert_output_contains "Extract the knowledge"
}

@test "eval-produce-baseline: ingest dry-run drops the scaffolding contract" {
  run bash "$PRODUCE" --tier ingest-extract --model fake --case extract-basic --dry-run-prompt
  assert_success
  # The plugin-arm prompt embeds the schema table and the provenance contract;
  # the baseline arm must contain none of it.
  refute_output_contains "Required fields by type"
  refute_output_contains "source_quotes"
  refute_output_contains "NEVER state a fact"
  refute_output_contains "frontmatter"
}

@test "eval-produce-baseline: query dry-run keeps the ANSWER transport" {
  run bash "$PRODUCE" --tier query --model fake --case query-basic --dry-run-prompt
  assert_success
  assert_output_contains "===ANSWER==="
  assert_output_contains "===COVERAGE: full|partial|none==="
  assert_output_contains "===CITATIONS==="
  assert_output_contains "===END==="
  assert_output_contains "Answer the question from these notes."
}

@test "eval-produce-baseline: query dry-run drops the grounding hard rules" {
  run bash "$PRODUCE" --tier query --model fake --case query-basic --dry-run-prompt
  assert_success
  refute_output_contains "VERBATIM"
  refute_output_contains "ATTRIBUTION"
  refute_output_contains "literally present"
}

@test "eval-produce-baseline: usage errors exit 2 (no tier, bad tier, no model, unknown case)" {
  run bash "$PRODUCE" --model fake --dry-run-prompt
  assert_status 2
  run bash "$PRODUCE" --tier nope --model fake --dry-run-prompt
  assert_status 2
  run bash "$PRODUCE" --tier query --dry-run-prompt
  assert_status 2
  run bash "$PRODUCE" --tier ingest-extract --model fake --case no-such-case --dry-run-prompt
  assert_status 2
}

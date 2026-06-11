#!/usr/bin/env bats
# Tests for scripts/eval-compare-ollama.sh — arg validation only. The matrix
# itself needs a live model and is exercised manually (PM-run, per ADR-0011);
# the produce and score halves it composes are each covered by their own suites
# (eval-produce-ollama.bats, eval-ingest-extract.bats).

load '../test_helper/common'

setup() {
  _load_helpers
  RUNNER="$REPO_ROOT/scripts/eval-compare-ollama.sh"
}

@test "eval-compare-ollama: script exists and is executable" {
  [ -f "$RUNNER" ]
  [ -x "$RUNNER" ]
}

@test "eval-compare-ollama: --help exits 0 and prints usage" {
  run bash "$RUNNER" --help
  assert_success
  assert_output_contains "--models"
}

@test "eval-compare-ollama: missing --models fails closed (rc 2)" {
  run bash "$RUNNER"
  assert_status 2
  assert_output_contains "--models"
}

@test "eval-compare-ollama: unknown flag fails closed (rc 2)" {
  run bash "$RUNNER" --models m --bogus
  assert_status 2
}

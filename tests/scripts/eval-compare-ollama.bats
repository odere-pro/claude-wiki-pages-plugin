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

@test "Ollama comparison: the runner script is present on disk and executable" {
  [ -f "$RUNNER" ]
  [ -x "$RUNNER" ]
}

@test "Ollama comparison: --help prints usage mentioning --models and exits 0" {
  run bash "$RUNNER" --help
  assert_success
  assert_output_contains "--models"
}

@test "Ollama comparison: omitting the required --models flag fails closed with rc 2" {
  run bash "$RUNNER"
  assert_status 2
  assert_output_contains "--models"
}

@test "Ollama comparison: an unrecognized flag fails closed with rc 2" {
  run bash "$RUNNER" --models m --bogus
  assert_status 2
}

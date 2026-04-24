#!/usr/bin/env bats
# Tests for scripts/prompt-guard.sh
#
# Behavior under test:
#   - Advisory only — never blocks (always exit 0).
#   - Warns (stdout) on prompts that suggest editing raw files.
#   - Warns on prompts that suggest deleting wiki pages.
#   - Silent on benign prompts.

load '../test_helper/common'

setup() {
  _load_helpers
}

@test "prompt-guard: benign prompt exits 0 silent" {
  local json='{"prompt":"Summarize the Karpathy LLM Wiki pattern."}'
  run bash -c "printf '%s' '$json' | bash '$REPO_ROOT/scripts/prompt-guard.sh'"

  assert_success
  assert_output_empty
}

@test "prompt-guard: silent on raw/ keyword without an edit verb" {
  # The grep pattern requires BOTH an edit verb AND a raw-path keyword.
  # This prompt has the keyword but no verb — must stay silent.
  # Pins the conjunction against a mutation that drops the verb clause.
  local json='{"prompt":"Explain what the raw/ directory holds and why it matters."}'
  run bash -c "printf '%s' '$json' | bash '$REPO_ROOT/scripts/prompt-guard.sh'"

  assert_success
  assert_output_empty
}

@test "prompt-guard: warns on raw edit intent" {
  local json='{"prompt":"Please edit vault/raw/sample.md and fix the typo."}'
  run bash -c "printf '%s' '$json' | bash '$REPO_ROOT/scripts/prompt-guard.sh'"

  assert_success
  assert_output_contains "WARNING"
  assert_output_contains "immutable"
}

@test "prompt-guard: warns on wiki deletion intent" {
  local json='{"prompt":"Delete the old wiki page about deprecated-tool."}'
  run bash -c "printf '%s' '$json' | bash '$REPO_ROOT/scripts/prompt-guard.sh'"

  assert_success
  assert_output_contains "WARNING"
  assert_output_contains "superseded"
}

@test "prompt-guard: handles empty or whitespace-only prompt gracefully" {
  # Covers both the "" early-exit and a whitespace-only prompt (which bypasses
  # the `[ -z ]` guard but must still produce no warning).
  for payload in '{"prompt":""}' '{"prompt":"   \t  "}'; do
    run bash -c "printf '%s' '$payload' | bash '$REPO_ROOT/scripts/prompt-guard.sh'"
    assert_success
    assert_output_empty
  done
}

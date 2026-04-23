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

  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "prompt-guard: warns on raw edit intent" {
  local json='{"prompt":"Please edit vault/raw/sample.md and fix the typo."}'
  run bash -c "printf '%s' '$json' | bash '$REPO_ROOT/scripts/prompt-guard.sh'"

  [ "$status" -eq 0 ]
  [[ "$output" == *"WARNING"* ]]
  [[ "$output" == *"immutable"* ]]
}

@test "prompt-guard: warns on wiki deletion intent" {
  local json='{"prompt":"Delete the old wiki page about deprecated-tool."}'
  run bash -c "printf '%s' '$json' | bash '$REPO_ROOT/scripts/prompt-guard.sh'"

  [ "$status" -eq 0 ]
  [[ "$output" == *"WARNING"* ]]
  [[ "$output" == *"superseded"* ]]
}

@test "prompt-guard: handles empty prompt gracefully" {
  local json='{"prompt":""}'
  run bash -c "printf '%s' '$json' | bash '$REPO_ROOT/scripts/prompt-guard.sh'"

  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

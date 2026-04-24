#!/usr/bin/env bats
# Tests for scripts/subagent-lint-gate.sh
#
# Behavior under test:
#   - Only acts on agent_name == llm-wiki-lint-fix; silent otherwise.
#   - Emits a QUALITY GATE warning when the agent's stdout contains
#     unresolved-error markers.

load '../test_helper/common'

setup() {
  _load_helpers
}

@test "subagent-lint-gate: silent when agent_name is not llm-wiki-lint-fix" {
  local json='{"agent_name":"other-agent","stdout":"anything"}'
  run bash -c "printf '%s' '$json' | bash '$REPO_ROOT/scripts/subagent-lint-gate.sh'"

  assert_success
  assert_output_empty
}

@test "subagent-lint-gate: silent on clean llm-wiki-lint-fix stdout" {
  local json='{"agent_name":"llm-wiki-lint-fix","stdout":"OK: all clean"}'
  run bash -c "printf '%s' '$json' | bash '$REPO_ROOT/scripts/subagent-lint-gate.sh'"

  assert_success
  assert_output_empty
}

@test "subagent-lint-gate: warns on unresolved errors" {
  local json='{"agent_name":"llm-wiki-lint-fix","stdout":"ERROR: 3 unresolved errors remain"}'
  run bash -c "printf '%s' '$json' | bash '$REPO_ROOT/scripts/subagent-lint-gate.sh'"

  assert_success
  assert_output_contains "QUALITY GATE"
}

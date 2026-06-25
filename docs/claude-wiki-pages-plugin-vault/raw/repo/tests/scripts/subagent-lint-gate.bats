#!/usr/bin/env bats
# Tests for scripts/subagent-lint-gate.sh
#
# Behavior under test:
#   - Only acts on agent_name == claude-wiki-pages-curator-agent; silent otherwise.
#   - Emits a QUALITY GATE warning when the agent's stdout contains
#     unresolved-error markers.

load '../test_helper/common'

setup() {
  _load_helpers
}

@test "subagent-lint-gate: silent when agent_name is not claude-wiki-pages-curator-agent" {
  local json='{"agent_name":"other-agent","stdout":"anything"}'
  run bash -c "printf '%s' '$json' | bash '$REPO_ROOT/scripts/subagent-lint-gate.sh'"

  assert_success
  assert_output_empty
}

@test "subagent-lint-gate: silent on clean claude-wiki-pages-curator-agent stdout" {
  local json='{"agent_name":"claude-wiki-pages-curator-agent","stdout":"OK: all clean"}'
  run bash -c "printf '%s' '$json' | bash '$REPO_ROOT/scripts/subagent-lint-gate.sh'"

  assert_success
  assert_output_empty
}

@test "subagent-lint-gate: warns on unresolved errors" {
  local json='{"agent_name":"claude-wiki-pages-curator-agent","stdout":"ERROR: 3 unresolved errors remain"}'
  run bash -c "printf '%s' '$json' | bash '$REPO_ROOT/scripts/subagent-lint-gate.sh'"

  assert_success
  assert_output_contains "QUALITY GATE"
}

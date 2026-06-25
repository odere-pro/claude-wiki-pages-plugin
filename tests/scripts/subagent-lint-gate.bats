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

@test "Lint gate: stays silent when agent_name is not claude-wiki-pages-curator-agent" {
  local json='{"agent_name":"other-agent","stdout":"anything"}'
  run bash -c "printf '%s' '$json' | bash '$REPO_ROOT/scripts/subagent-lint-gate.sh'"

  assert_success
  assert_output_empty
}

@test "Lint gate: stays silent when the curator agent stdout is clean" {
  local json='{"agent_name":"claude-wiki-pages-curator-agent","stdout":"OK: all clean"}'
  run bash -c "printf '%s' '$json' | bash '$REPO_ROOT/scripts/subagent-lint-gate.sh'"

  assert_success
  assert_output_empty
}

@test "Lint gate: emits a QUALITY GATE warning when the curator stdout contains unresolved-error markers" {
  local json='{"agent_name":"claude-wiki-pages-curator-agent","stdout":"ERROR: 3 unresolved errors remain"}'
  run bash -c "printf '%s' '$json' | bash '$REPO_ROOT/scripts/subagent-lint-gate.sh'"

  assert_success
  assert_output_contains "QUALITY GATE"
}

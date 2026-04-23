#!/usr/bin/env bats
# Tests for scripts/subagent-ingest-gate.sh
#
# Behavior under test:
#   - Only acts on agent_name == llm-wiki-ingest-pipeline; silent otherwise.
#   - Exits 0 when the expected verify-ingest.sh or vault paths are missing
#     (graceful no-op).

load '../test_helper/common'

setup() {
  _load_helpers
}

@test "subagent-ingest-gate: silent when agent_name is not llm-wiki-ingest-pipeline" {
  local json='{"agent_name":"something-else"}'
  run bash -c "printf '%s' '$json' | bash '$REPO_ROOT/scripts/subagent-ingest-gate.sh'"

  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "subagent-ingest-gate: exits 0 when vault missing" {
  # CLAUDE_PROJECT_DIR points at a dir without vault/ — the script should
  # no-op rather than crash.
  local proj="$BATS_TEST_TMPDIR/proj"
  mkdir -p "$proj"

  local json='{"agent_name":"llm-wiki-ingest-pipeline"}'
  run bash -c "CLAUDE_PROJECT_DIR='$proj' printf '%s' '$json' | bash '$REPO_ROOT/scripts/subagent-ingest-gate.sh'"

  [ "$status" -eq 0 ]
}

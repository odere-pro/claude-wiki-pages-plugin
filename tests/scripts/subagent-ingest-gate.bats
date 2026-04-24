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

  assert_success
  assert_output_empty
}

@test "subagent-ingest-gate: exits 0 when vault missing" {
  # CLAUDE_PROJECT_DIR points at a dir without vault/ — the script should
  # no-op rather than crash.
  local proj="$BATS_TEST_TMPDIR/proj"
  mkdir -p "$proj"

  local json='{"agent_name":"llm-wiki-ingest-pipeline"}'
  run bash -c "CLAUDE_PROJECT_DIR='$proj' printf '%s' '$json' | bash '$REPO_ROOT/scripts/subagent-ingest-gate.sh'"

  assert_success
}

@test "subagent-ingest-gate: runs verify-ingest when vault and plugin scripts exist" {
  # Positive path: stub verify-ingest.sh to exit non-zero, and confirm the
  # gate emits QUALITY GATE. Pins the vault-exists branch so inverting the
  # `[ ! -d "$VAULT" ]` check is caught.
  local plugin="$BATS_TEST_TMPDIR/plugin"
  mkdir -p "$plugin/scripts"
  cat >"$plugin/scripts/verify-ingest.sh" <<'EOF'
#!/bin/bash
echo "ERROR: stub verify-ingest marker" >&2
exit 1
EOF
  chmod +x "$plugin/scripts/verify-ingest.sh"

  local vault="$BATS_TEST_TMPDIR/real-vault"
  mkdir -p "$vault"

  local json='{"agent_name":"llm-wiki-ingest-pipeline"}'
  run bash -c "
    export CLAUDE_PLUGIN_ROOT='$plugin'
    export LLM_WIKI_VAULT='$vault'
    printf '%s' '$json' | bash '$REPO_ROOT/scripts/subagent-ingest-gate.sh' 2>&1
  "

  assert_success
  assert_output_contains "QUALITY GATE"
  assert_output_contains "stub verify-ingest marker"
}

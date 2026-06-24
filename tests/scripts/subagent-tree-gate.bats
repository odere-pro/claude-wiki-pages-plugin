#!/usr/bin/env bats
# Tests for scripts/subagent-tree-gate.sh
#
# Behavior under test:
#   - Only acts on the agents that own the tree heal (polish, maintenance);
#     silent for every other agent_name.
#   - Emits a TREE GATE warning when a gated agent leaves strict-tree violations
#     (cross-tree edges / cycles / multi-parent) in the resolved vault.
#   - Silent when the resolved vault is a clean strict tree.
#   - Always exits 0 (a SubagentStop hook must never hard-fail).

load '../test_helper/common'

setup() {
  _load_helpers
}

@test "subagent-tree-gate: silent for a non-gated agent" {
  local json='{"agent_name":"claude-wiki-pages-ingest-agent"}'
  run bash -c "printf '%s' '$json' | bash '$REPO_ROOT/scripts/subagent-tree-gate.sh'"

  assert_success
  assert_output_empty
}

@test "subagent-tree-gate: silent for the curator agent (tree healed later by polish)" {
  local json='{"agent_name":"claude-wiki-pages-curator-agent"}'
  run bash -c "printf '%s' '$json' | bash '$REPO_ROOT/scripts/subagent-tree-gate.sh'"

  assert_success
  assert_output_empty
}

@test "subagent-tree-gate: warns when polish leaves cross-tree edges" {
  command -v bun >/dev/null 2>&1 || skip "bun not installed"
  local vault="$REPO_ROOT/tests/fixtures/tangled-vault"
  local json='{"agent_name":"claude-wiki-pages-polish-agent"}'
  run bash -c "printf '%s' '$json' | CLAUDE_WIKI_PAGES_VAULT='$vault' bash '$REPO_ROOT/scripts/subagent-tree-gate.sh'"

  assert_success
  assert_output_contains "TREE GATE"
  assert_output_contains "cross-tree="
}

@test "subagent-tree-gate: silent on a clean strict tree" {
  command -v bun >/dev/null 2>&1 || skip "bun not installed"
  local vault="$REPO_ROOT/tests/fixtures/minimal-vault"
  local json='{"agent_name":"claude-wiki-pages-polish-agent"}'
  run bash -c "printf '%s' '$json' | CLAUDE_WIKI_PAGES_VAULT='$vault' bash '$REPO_ROOT/scripts/subagent-tree-gate.sh'"

  assert_success
  assert_output_empty
}

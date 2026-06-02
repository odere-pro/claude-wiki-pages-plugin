#!/usr/bin/env bats
# Tests for scripts/firewall.sh
#
# Behavior under test:
#   - Allow (exit 0, no stdout) writes inside the resolved vault.
#   - Block (JSON stdout "decision":"block") writes outside the vault.
#   - Deny globs (e.g. **/.env) block even inside the vault.
#   - mode: off (project config) is a pass-through.
#
# Like the other PreToolUse hooks, blocks are signalled via stdout JSON; the hook
# exits 0 either way and Claude Code reads the JSON.

load '../test_helper/common'

setup() {
  _load_helpers
  VAULT_DIR="$BATS_TEST_TMPDIR/proj/vault"
  mkdir -p "$VAULT_DIR/wiki/topics"
}

run_fw() { # $1 = file_path ; runs the hook in hook mode with vault env set
  local json
  json=$(jq -n --arg p "$1" '{tool_name:"Write", tool_input:{file_path:$p, content:"x"}}')
  run bash -c "export CLAUDE_WIKI_PAGES_VAULT='$VAULT_DIR'; printf '%s' '$json' | bash '$REPO_ROOT/scripts/firewall.sh'"
}

@test "firewall: allows a write inside the vault" {
  run_fw "$VAULT_DIR/wiki/topics/page.md"
  assert_success
  assert_output_empty
}

@test "firewall: blocks a write outside the vault" {
  run_fw "$BATS_TEST_TMPDIR/elsewhere/secret.md"
  assert_success
  assert_output_contains '"decision":"block"'
  assert_output_contains "outside"
}

@test "firewall: deny glob blocks a dotfile inside the vault" {
  run_fw "$VAULT_DIR/.env"
  assert_success
  assert_output_contains '"decision":"block"'
  assert_output_contains "deny"
}

@test "firewall: mode off is a pass-through" {
  mkdir -p "$BATS_TEST_TMPDIR/proj/.claude"
  printf '{"firewall":{"mode":"off"}}\n' >"$BATS_TEST_TMPDIR/proj/.claude/claude-wiki-pages.json"
  local json
  json=$(jq -n --arg p "/etc/passwd" '{tool_name:"Write", tool_input:{file_path:$p, content:"x"}}')
  run bash -c "cd '$BATS_TEST_TMPDIR/proj'; export CLAUDE_WIKI_PAGES_VAULT='$VAULT_DIR'; printf '%s' '$json' | bash '$REPO_ROOT/scripts/firewall.sh'"
  assert_success
  assert_output_empty
}

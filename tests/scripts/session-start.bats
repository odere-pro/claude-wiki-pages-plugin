#!/usr/bin/env bats
# Tests for scripts/session-start.sh
#
# Behavior under test:
#   - Prints SETUP prompt when vault directory does not exist.
#   - Prints REMINDER when vault directory exists.
#   - Creates settings.json on first run (settings file absent before test).

load '../test_helper/common'

setup() {
  _load_helpers
  SETTINGS_TMP="$BATS_TEST_TMPDIR/llm-wiki-stack/settings.json"
  export LLM_WIKI_SETTINGS_FILE="$SETTINGS_TMP"
  unset LLM_WIKI_VAULT
}

teardown() {
  unset LLM_WIKI_SETTINGS_FILE
  unset LLM_WIKI_VAULT
}

@test "session-start: prints SETUP when vault dir does not exist" {
  run bash -c "
    export LLM_WIKI_SETTINGS_FILE='$SETTINGS_TMP'
    export LLM_WIKI_VAULT='/nonexistent/vault/does-not-exist'
    bash '$REPO_ROOT/scripts/session-start.sh'
  "

  assert_success
  assert_output_contains "SETUP:"
  assert_output_contains "/nonexistent/vault/does-not-exist"
}

@test "session-start: prints REMINDER when vault dir exists" {
  local vault_dir="$BATS_TEST_TMPDIR/my-vault"
  mkdir -p "$vault_dir"

  run bash -c "
    export LLM_WIKI_SETTINGS_FILE='$SETTINGS_TMP'
    export LLM_WIKI_VAULT='$vault_dir'
    bash '$REPO_ROOT/scripts/session-start.sh'
  "

  assert_success
  assert_output_contains "REMINDER:"
  assert_output_contains "$vault_dir"
}

@test "session-start: creates settings.json on first run" {
  run bash -c "
    export LLM_WIKI_SETTINGS_FILE='$SETTINGS_TMP'
    export LLM_WIKI_VAULT='/nonexistent/vault/does-not-exist'
    bash '$REPO_ROOT/scripts/session-start.sh'
  "

  assert_success
  [ -f "$SETTINGS_TMP" ]
  grep -q '"default_vault_path"' "$SETTINGS_TMP"
}

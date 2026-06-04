#!/usr/bin/env bats
# Tests for scripts/session-start.sh
#
# Behavior under test:
#   - Prints SETUP prompt when vault directory does not exist.
#   - Prints REMINDER when vault directory exists.
#   - Creates settings.json on first run (settings file absent before test).
#   - Prints MOC pointer (INDEX:) when wiki/index.md exists.
#   - Omits MOC pointer when wiki/index.md does not exist.
#   - Always prints a config-independent NEXT: line (vault populated vs empty).

load '../test_helper/common'

setup() {
  _load_helpers
  SETTINGS_TMP="$BATS_TEST_TMPDIR/claude-wiki-pages/settings.json"
  export CLAUDE_WIKI_PAGES_SETTINGS_FILE="$SETTINGS_TMP"
  unset CLAUDE_WIKI_PAGES_VAULT
}

teardown() {
  unset CLAUDE_WIKI_PAGES_SETTINGS_FILE
  unset CLAUDE_WIKI_PAGES_VAULT
}

@test "session-start: prints SETUP when vault dir does not exist" {
  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    export CLAUDE_WIKI_PAGES_VAULT='/nonexistent/vault/does-not-exist'
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
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    export CLAUDE_WIKI_PAGES_VAULT='$vault_dir'
    bash '$REPO_ROOT/scripts/session-start.sh'
  "

  assert_success
  assert_output_contains "REMINDER:"
  assert_output_contains "$vault_dir"
}

@test "session-start: creates settings.json on first run" {
  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    export CLAUDE_WIKI_PAGES_VAULT='/nonexistent/vault/does-not-exist'
    bash '$REPO_ROOT/scripts/session-start.sh'
  "

  assert_success
  [ -f "$SETTINGS_TMP" ]
  grep -q '"default_vault_path"' "$SETTINGS_TMP"
}

@test "session-start: prints INDEX pointer when wiki/index.md exists" {
  local vault_dir="$BATS_TEST_TMPDIR/moc-vault"
  mkdir -p "$vault_dir/wiki"
  printf '%s\n' '---' 'title: Index' '---' >"$vault_dir/wiki/index.md"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    export CLAUDE_WIKI_PAGES_VAULT='$vault_dir'
    bash '$REPO_ROOT/scripts/session-start.sh'
  "

  assert_success
  assert_output_contains "INDEX:"
  assert_output_contains "wiki/index.md"
}

@test "session-start: omits INDEX pointer when wiki/index.md does not exist" {
  local vault_dir="$BATS_TEST_TMPDIR/no-moc-vault"
  mkdir -p "$vault_dir/wiki"
  # wiki/ exists but index.md is absent

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    export CLAUDE_WIKI_PAGES_VAULT='$vault_dir'
    bash '$REPO_ROOT/scripts/session-start.sh'
  "

  assert_success
  refute_output_contains "INDEX:"
}

@test "session-start: always prints NEXT line when vault exists and is populated" {
  local vault_dir="$BATS_TEST_TMPDIR/next-vault-pop"
  mkdir -p "$vault_dir/raw" "$vault_dir/wiki"
  printf 'source content\n' >"$vault_dir/raw/doc.md"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    export CLAUDE_WIKI_PAGES_VAULT='$vault_dir'
    bash '$REPO_ROOT/scripts/session-start.sh'
  "

  assert_success
  assert_output_contains "NEXT:"
}

@test "session-start: always prints NEXT line when vault exists but raw is empty" {
  local vault_dir="$BATS_TEST_TMPDIR/next-vault-empty"
  mkdir -p "$vault_dir/wiki"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    export CLAUDE_WIKI_PAGES_VAULT='$vault_dir'
    bash '$REPO_ROOT/scripts/session-start.sh'
  "

  assert_success
  assert_output_contains "NEXT:"
}

@test "session-start: NEXT line references /claude-wiki-pages:wiki" {
  local vault_dir="$BATS_TEST_TMPDIR/next-verb-vault"
  mkdir -p "$vault_dir/wiki"

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$SETTINGS_TMP'
    export CLAUDE_WIKI_PAGES_VAULT='$vault_dir'
    bash '$REPO_ROOT/scripts/session-start.sh'
  "

  assert_success
  assert_output_contains "/claude-wiki-pages:wiki"
}

@test "session-start: NEXT line does not depend on settings.json being present" {
  local vault_dir="$BATS_TEST_TMPDIR/next-nosettings-vault"
  local absent_settings="$BATS_TEST_TMPDIR/no-such-dir/settings.json"
  mkdir -p "$vault_dir/wiki"
  # settings file path points to a non-existent directory — config-independence check

  run bash -c "
    export CLAUDE_WIKI_PAGES_SETTINGS_FILE='$absent_settings'
    export CLAUDE_WIKI_PAGES_VAULT='$vault_dir'
    bash '$REPO_ROOT/scripts/session-start.sh'
  "

  assert_success
  assert_output_contains "NEXT:"
  assert_output_contains "/claude-wiki-pages:wiki"
}

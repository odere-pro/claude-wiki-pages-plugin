#!/usr/bin/env bats
# Tests for scripts/protect-raw.sh
#
# Behavior under test:
#   - Block (JSON stdout with "decision":"block") any Edit to vault/raw/**.
#   - Block Write if target under vault/raw/** already exists.
#   - Pass through (exit 0, no stdout) for non-raw paths.
#
# The current script signals blocks via stdout JSON and exits 0 either way —
# Claude Code reads the JSON to decide. Tests check stdout, not exit code.

load '../test_helper/common'

setup() {
  _load_helpers
}

@test "protect-raw: blocks Edit to vault/raw/" {
  run_hook_with_json "scripts/protect-raw.sh" "$JSON_FIXTURES_DIR/write-to-raw.json"

  [ "$status" -eq 0 ]
  [[ "$output" == *'"decision":"block"'* ]]
  [[ "$output" == *"immutable"* ]]
}

@test "protect-raw: allows Write under vault/wiki/" {
  run_hook_with_json "scripts/protect-raw.sh" "$JSON_FIXTURES_DIR/write-good.json"

  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "protect-raw: ignores non-vault paths" {
  local json='{"tool_name":"Write","tool_input":{"file_path":"/tmp/unrelated/foo.md","content":"hi"}}'
  run bash -c "printf '%s' '$json' | bash '$REPO_ROOT/scripts/protect-raw.sh'"

  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "protect-raw: blocks Write to existing raw/ file" {
  # Create a real file under a vault/raw/ path so the "file exists" check trips.
  local vault_dir="$BATS_TEST_TMPDIR/proj/vault/raw"
  mkdir -p "$vault_dir"
  local existing="$vault_dir/already-there.md"
  printf 'pre-existing\n' >"$existing"

  local json
  json=$(cat <<EOF
{"tool_name":"Write","tool_input":{"file_path":"$existing","content":"overwrite"}}
EOF
)
  run bash -c "printf '%s' '$json' | bash '$REPO_ROOT/scripts/protect-raw.sh'"

  [ "$status" -eq 0 ]
  [[ "$output" == *'"decision":"block"'* ]]
  [[ "$output" == *"Cannot overwrite"* ]]
}

@test "protect-raw: allows Write to NEW raw/ file (new source)" {
  # Path looks like vault/raw/ but no file exists there — allowed so the user
  # can drop new sources in.
  local json='{"tool_name":"Write","tool_input":{"file_path":"/tmp/does-not-exist/vault/raw/new-src.md","content":"new"}}'
  run bash -c "printf '%s' '$json' | bash '$REPO_ROOT/scripts/protect-raw.sh'"

  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

#!/usr/bin/env bats
# Tests for scripts/enforce-must-rule.sh — PreToolUse warning for
# claude-md:must-rule-with-no-hook.
#
# Behaviors under test:
#   - Non-CLAUDE.md paths are ignored entirely (exit 0, no output).
#   - A CLAUDE.md write with no imperative rule words exits 0 silently.
#   - A CLAUDE.md write containing "must" emits a warning (exit 0).
#   - A CLAUDE.md write containing "never" emits a warning (exit 0).
#   - A CLAUDE.md write containing "always" emits a warning (exit 0).
#   - The warning counts the number of imperative hits.
#   - An Edit payload with a new_string containing must/never/always warns.
#   - A MultiEdit payload (no content/new_string) exits 0 silently.
#   - The hook always exits 0 — it is advisory only.

load '../test_helper/common'

SCRIPT="$REPO_ROOT/scripts/enforce-must-rule.sh"

# Build a Write tool-call JSON for a CLAUDE.md.
_write_claude_json() {
  local file_path="$1" content="$2"
  printf '{"tool_name":"Write","tool_input":{"file_path":"%s","content":"%s"}}' \
    "$file_path" "$content"
}

# Build an Edit tool-call JSON (new_string only).
_edit_claude_json() {
  local file_path="$1" new_string="$2"
  printf '{"tool_name":"Edit","tool_input":{"file_path":"%s","old_string":"old","new_string":"%s"}}' \
    "$file_path" "$new_string"
}

setup() {
  _load_helpers
}

# ---------------------------------------------------------------------------
# Non-CLAUDE.md paths — always silent
# ---------------------------------------------------------------------------

@test "enforce-must-rule: ignores non-CLAUDE.md file (exit 0, no output)" {
  local json
  json=$(_write_claude_json "/tmp/test-project/vault/wiki/topics/page.md" "You must read this.")
  run_hook_with_json_string "$SCRIPT" "$json"
  assert_success
  assert_output_empty
}

@test "enforce-must-rule: ignores README.md (exit 0, no output)" {
  local json
  json=$(_write_claude_json "/any/path/README.md" "Always use wikilinks.")
  run_hook_with_json_string "$SCRIPT" "$json"
  assert_success
  assert_output_empty
}

# ---------------------------------------------------------------------------
# CLAUDE.md with no imperative words — silent
# ---------------------------------------------------------------------------

@test "enforce-must-rule: CLAUDE.md with no must/never/always exits 0 silently" {
  local json
  json=$(_write_claude_json "/tmp/vault/CLAUDE.md" "schema_version: 1")
  run_hook_with_json_string "$SCRIPT" "$json"
  assert_success
  assert_output_empty
}

# ---------------------------------------------------------------------------
# CLAUDE.md with imperative words — warning emitted, still exits 0
# ---------------------------------------------------------------------------

@test "enforce-must-rule: CLAUDE.md write with 'must' emits warning" {
  local json
  json=$(_write_claude_json "/tmp/vault/CLAUDE.md" "You must validate frontmatter.")
  export json
  run bash -c "printf '%s' \"\$json\" | bash '$SCRIPT' 2>&1"
  assert_success
  assert_output_contains "enforce-must-rule"
  assert_output_contains "must"
}

@test "enforce-must-rule: CLAUDE.md write with 'never' emits warning" {
  local json
  json=$(_write_claude_json "/tmp/vault/CLAUDE.md" "Never skip validation.")
  export json
  run bash -c "printf '%s' \"\$json\" | bash '$SCRIPT' 2>&1"
  assert_success
  assert_output_contains "enforce-must-rule"
}

@test "enforce-must-rule: CLAUDE.md write with 'always' emits warning" {
  local json
  json=$(_write_claude_json "/tmp/vault/CLAUDE.md" "Always use wikilinks.")
  export json
  run bash -c "printf '%s' \"\$json\" | bash '$SCRIPT' 2>&1"
  assert_success
  assert_output_contains "enforce-must-rule"
}

@test "enforce-must-rule: warning counts multiple imperative hits" {
  local json
  # Three lines each with one imperative word → grep -c (line count) returns 3.
  json=$(_write_claude_json "/tmp/vault/CLAUDE.md" "Must validate.\\nNever skip.\\nAlways log.")
  export json
  run bash -c "printf '%s' \"\$json\" | bash '$SCRIPT' 2>&1"
  assert_success
  assert_output_contains "3"
}

# ---------------------------------------------------------------------------
# Edit payload — uses new_string
# ---------------------------------------------------------------------------

@test "enforce-must-rule: Edit payload with 'must' in new_string emits warning" {
  local json
  json=$(_edit_claude_json "/tmp/vault/CLAUDE.md" "You must validate frontmatter.")
  export json
  run bash -c "printf '%s' \"\$json\" | bash '$SCRIPT' 2>&1"
  assert_success
  assert_output_contains "enforce-must-rule"
}

@test "enforce-must-rule: Edit payload with clean new_string exits 0 silently" {
  local json
  json=$(_edit_claude_json "/tmp/vault/CLAUDE.md" "schema_version: 1")
  run_hook_with_json_string "$SCRIPT" "$json"
  assert_success
  assert_output_empty
}

# ---------------------------------------------------------------------------
# MultiEdit payload — no content / new_string → no-op
# ---------------------------------------------------------------------------

@test "enforce-must-rule: MultiEdit payload (no content/new_string) exits 0 silently" {
  local json
  json='{"tool_name":"MultiEdit","tool_input":{"file_path":"/tmp/vault/CLAUDE.md","edits":[]}}'
  run_hook_with_json_string "$SCRIPT" "$json"
  assert_success
  assert_output_empty
}

# ---------------------------------------------------------------------------
# Nested CLAUDE.md paths
# ---------------------------------------------------------------------------

@test "enforce-must-rule: nested vault/CLAUDE.md path is recognized" {
  local json
  json=$(_write_claude_json "/any/deep/path/vault/CLAUDE.md" "Must validate.")
  export json
  run bash -c "printf '%s' \"\$json\" | bash '$SCRIPT' 2>&1"
  assert_success
  assert_output_contains "enforce-must-rule"
}

# ---------------------------------------------------------------------------
# The hook always exits 0
# ---------------------------------------------------------------------------

@test "enforce-must-rule: hook exits 0 even when imperative words are present" {
  local json
  json=$(_write_claude_json "/tmp/vault/CLAUDE.md" "Must do this. Never do that.")
  export json
  run bash -c "printf '%s' \"\$json\" | bash '$SCRIPT' 2>&1"
  assert_success
}

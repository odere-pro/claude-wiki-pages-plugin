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

@test "Must-rule enforcement: ignores a non-CLAUDE.md file (exit 0, no output)" {
  local json
  json=$(_write_claude_json "/tmp/test-project/vault/wiki/topics/page.md" "You must read this.")
  run_hook_with_json_string "$SCRIPT" "$json"
  assert_success
  assert_output_empty
}

@test "Must-rule enforcement: ignores a README.md (exit 0, no output)" {
  local json
  json=$(_write_claude_json "/any/path/README.md" "Always use wikilinks.")
  run_hook_with_json_string "$SCRIPT" "$json"
  assert_success
  assert_output_empty
}

# ---------------------------------------------------------------------------
# CLAUDE.md with no imperative words — silent
# ---------------------------------------------------------------------------

@test "Must-rule enforcement: a CLAUDE.md with no must/never/always exits 0 silently" {
  local json
  json=$(_write_claude_json "/tmp/vault/CLAUDE.md" "schema_version: 1")
  run_hook_with_json_string "$SCRIPT" "$json"
  assert_success
  assert_output_empty
}

# ---------------------------------------------------------------------------
# CLAUDE.md with imperative words — warning emitted, still exits 0
# ---------------------------------------------------------------------------

@test "Must-rule enforcement: a CLAUDE.md write containing 'must' emits a warning" {
  local json
  json=$(_write_claude_json "/tmp/vault/CLAUDE.md" "You must validate frontmatter.")
  export json
  run bash -c "printf '%s' \"\$json\" | bash '$SCRIPT' 2>&1"
  assert_success
  assert_output_contains "enforce-must-rule"
  assert_output_contains "must"
}

@test "Must-rule enforcement: a CLAUDE.md write containing 'never' emits a warning" {
  local json
  json=$(_write_claude_json "/tmp/vault/CLAUDE.md" "Never skip validation.")
  export json
  run bash -c "printf '%s' \"\$json\" | bash '$SCRIPT' 2>&1"
  assert_success
  assert_output_contains "enforce-must-rule"
}

@test "Must-rule enforcement: a CLAUDE.md write containing 'always' emits a warning" {
  local json
  json=$(_write_claude_json "/tmp/vault/CLAUDE.md" "Always use wikilinks.")
  export json
  run bash -c "printf '%s' \"\$json\" | bash '$SCRIPT' 2>&1"
  assert_success
  assert_output_contains "enforce-must-rule"
}

@test "Must-rule enforcement: the warning counts the number of imperative hits" {
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

@test "Must-rule enforcement: an Edit payload with 'must' in new_string emits a warning" {
  local json
  json=$(_edit_claude_json "/tmp/vault/CLAUDE.md" "You must validate frontmatter.")
  export json
  run bash -c "printf '%s' \"\$json\" | bash '$SCRIPT' 2>&1"
  assert_success
  assert_output_contains "enforce-must-rule"
}

@test "Must-rule enforcement: an Edit payload with a clean new_string exits 0 silently" {
  local json
  json=$(_edit_claude_json "/tmp/vault/CLAUDE.md" "schema_version: 1")
  run_hook_with_json_string "$SCRIPT" "$json"
  assert_success
  assert_output_empty
}

# ---------------------------------------------------------------------------
# MultiEdit payload — no content / new_string → no-op
# ---------------------------------------------------------------------------

@test "Must-rule enforcement: a MultiEdit payload with no content or new_string exits 0 silently" {
  local json
  json='{"tool_name":"MultiEdit","tool_input":{"file_path":"/tmp/vault/CLAUDE.md","edits":[]}}'
  run_hook_with_json_string "$SCRIPT" "$json"
  assert_success
  assert_output_empty
}

# ---------------------------------------------------------------------------
# Nested CLAUDE.md paths
# ---------------------------------------------------------------------------

@test "Must-rule enforcement: a nested vault/CLAUDE.md path is recognized" {
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

@test "Must-rule enforcement: the hook exits 0 even when imperative words are present (advisory only)" {
  local json
  json=$(_write_claude_json "/tmp/vault/CLAUDE.md" "Must do this. Never do that.")
  export json
  run bash -c "printf '%s' \"\$json\" | bash '$SCRIPT' 2>&1"
  assert_success
}

# ── Phase 3: Bun-absent fail-OPEN (hook-gates) ────────────────────────────────
# enforce-must-rule is ADVISORY. When Bun is absent it skips the notice and exits
# 0 — never blocks, never errors.

_path_without_bun_mr() {
  local tooldir="$BATS_TEST_TMPDIR/nobun-bin"
  mkdir -p "$tooldir"
  local t src
  for t in bash jq cat grep sed dirname basename env awk tr head find pwd; do
    src=$(command -v "$t" 2>/dev/null || true)
    [ -n "$src" ] && ln -sf "$src" "$tooldir/$t"
  done
  printf '%s' "$tooldir"
}

@test "Must-rule enforcement: Bun absent exits 0 silently on a rule-bearing CLAUDE.md (fail-open advisory)" {
  local tooldir
  tooldir=$(_path_without_bun_mr)
  run bash -c "PATH='$tooldir' command -v bun"
  assert_status 1
  local json='{"tool_name":"Write","tool_input":{"file_path":"/p/proj/CLAUDE.md","content":"You must do X."}}'
  run bash -c "export PATH='$tooldir'; printf '%s' '$json' | '$tooldir/bash' '$REPO_ROOT/scripts/enforce-must-rule.sh'"
  assert_success
  assert_output_empty
}

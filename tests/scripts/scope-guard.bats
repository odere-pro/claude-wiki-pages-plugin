#!/usr/bin/env bats
# Tests for scripts/scope-guard.sh
#
# Behavior under test:
#   - Non-blocking (exit 0) for every tool type.
#   - Emits an advisory on stderr when a Read/Grep/Glob path is outside the vault.
#   - No output when the path is inside the vault.
#   - No output for tool types other than Read/Grep/Glob.

load '../test_helper/common'

setup() {
  _load_helpers
}

# ── Helper: build a minimal JSON payload for scope-guard ─────────────────────

_scope_json() {
  local tool="$1" path="$2"
  printf '{"tool_name":"%s","tool_input":{"file_path":"%s"}}' "$tool" "$path"
}

_scope_json_grep() {
  local path="$1"
  printf '{"tool_name":"Grep","tool_input":{"path":"%s","pattern":"foo"}}' "$path"
}

# ── Non-blocking guarantee ────────────────────────────────────────────────────

@test "Read-scope guard: always exits 0 and never blocks" {
  local json
  json=$(_scope_json "Read" "/tmp/outside-any-vault/file.md")
  run bash -c "printf '%s' '$json' | CLAUDE_WIKI_PAGES_VAULT=/tmp/vault bash '$REPO_ROOT/scripts/scope-guard.sh'"
  assert_success
}

@test "Read-scope guard: exits 0 with no output for a Write tool (non-Read/Grep/Glob is a no-op)" {
  local json
  json=$(_scope_json "Write" "/tmp/outside/file.md")
  run bash -c "printf '%s' '$json' | CLAUDE_WIKI_PAGES_VAULT=/tmp/vault bash '$REPO_ROOT/scripts/scope-guard.sh'"
  assert_success
  assert_output_empty
}

# ── Advisory emission ─────────────────────────────────────────────────────────

@test "Read-scope guard: emits an advisory on stderr for a Read path outside the vault" {
  local json vault tmpdir
  tmpdir="$BATS_TEST_TMPDIR"
  vault="$tmpdir/vault"
  mkdir -p "$vault"
  json=$(_scope_json "Read" "/tmp/some-other-dir/file.md")
  # scope-guard emits to stderr; capture with 2>&1.
  run bash -c "printf '%s' '$json' | CLAUDE_WIKI_PAGES_VAULT='$vault' bash '$REPO_ROOT/scripts/scope-guard.sh' 2>&1"
  assert_success
  assert_output_contains "ADVISORY"
}

@test "Read-scope guard: emits an advisory on stderr for a Grep path outside the vault" {
  local tmpdir vault
  tmpdir="$BATS_TEST_TMPDIR"
  vault="$tmpdir/vault"
  mkdir -p "$vault"
  local json
  json=$(_scope_json_grep "/etc/hosts")
  run bash -c "printf '%s' '$json' | CLAUDE_WIKI_PAGES_VAULT='$vault' bash '$REPO_ROOT/scripts/scope-guard.sh' 2>&1"
  assert_success
  assert_output_contains "ADVISORY"
}

# ── No-op when inside vault ───────────────────────────────────────────────────

@test "Read-scope guard: no advisory when the Read path is inside the vault" {
  local tmpdir vault
  tmpdir="$BATS_TEST_TMPDIR"
  vault="$tmpdir/vault"
  mkdir -p "$vault/wiki"
  local json
  json=$(_scope_json "Read" "$vault/wiki/index.md")
  run bash -c "printf '%s' '$json' | CLAUDE_WIKI_PAGES_VAULT='$vault' bash '$REPO_ROOT/scripts/scope-guard.sh' 2>&1"
  assert_success
  assert_output_empty
}

@test "Read-scope guard: no advisory when the Read path is the vault root itself" {
  local tmpdir vault
  tmpdir="$BATS_TEST_TMPDIR"
  vault="$tmpdir/vault"
  mkdir -p "$vault"
  local json
  json=$(_scope_json "Read" "$vault/CLAUDE.md")
  run bash -c "printf '%s' '$json' | CLAUDE_WIKI_PAGES_VAULT='$vault' bash '$REPO_ROOT/scripts/scope-guard.sh' 2>&1"
  assert_success
  assert_output_empty
}

# ── Non-matching tool types are no-ops ────────────────────────────────────────

@test "Read-scope guard: no output for an Edit tool (not Read/Grep/Glob)" {
  local json
  json=$(_scope_json "Edit" "/tmp/outside/file.md")
  run bash -c "printf '%s' '$json' | CLAUDE_WIKI_PAGES_VAULT=/tmp/vault bash '$REPO_ROOT/scripts/scope-guard.sh' 2>&1"
  assert_success
  assert_output_empty
}

@test "Read-scope guard: no output for a Bash tool (not Read/Grep/Glob)" {
  local json
  json='{"tool_name":"Bash","tool_input":{"command":"ls /tmp"}}'
  run bash -c "printf '%s' '$json' | CLAUDE_WIKI_PAGES_VAULT=/tmp/vault bash '$REPO_ROOT/scripts/scope-guard.sh' 2>&1"
  assert_success
  assert_output_empty
}

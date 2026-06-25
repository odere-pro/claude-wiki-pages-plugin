#!/usr/bin/env bats
# Tests for scripts/enforce-dmi.sh — PreToolUse enforcement for
# skill:side-effecting-no-dmi.
#
# Behaviors under test:
#   - Files outside skills/*/SKILL.md paths are ignored (exit 0, no output).
#   - A SKILL.md with no side-effecting verbs passes (exit 0).
#   - A SKILL.md with disable-model-invocation: true passes (exit 0).
#   - A SKILL.md with side-effecting verbs but NO dmi flag is blocked (exit 2).
#   - The block message names the offending file.
#   - An Edit payload with an empty content field reads the file from disk.

load '../test_helper/common'

SCRIPT="$REPO_ROOT/scripts/enforce-dmi.sh"

# Build a Write tool-call JSON for a given file path and content.
_write_json() {
  local file_path="$1" content="$2"
  printf '{"tool_name":"Write","tool_input":{"file_path":"%s","content":"%s"}}' \
    "$file_path" "$content"
}

setup() {
  _load_helpers
  TMPDIR_SKILL="$BATS_TEST_TMPDIR/skills/query"
  mkdir -p "$TMPDIR_SKILL"
}

teardown() {
  rm -rf "$BATS_TEST_TMPDIR/skills"
}

# ---------------------------------------------------------------------------
# Non-SKILL.md path — always pass
# ---------------------------------------------------------------------------

@test "enforce-dmi: ignores non-SKILL.md path (exit 0)" {
  local json
  json=$(_write_json "/tmp/test-project/vault/wiki/topics/page.md" "some content")
  run_hook_with_json_string "$SCRIPT" "$json"
  assert_success
}

@test "enforce-dmi: ignores README.md path (exit 0)" {
  local json
  json=$(_write_json "/any/path/README.md" "scaffold and commit verbs here")
  run_hook_with_json_string "$SCRIPT" "$json"
  assert_success
}

# ---------------------------------------------------------------------------
# SKILL.md with no side-effecting verbs — pass
# ---------------------------------------------------------------------------

@test "enforce-dmi: clean SKILL.md (no side effects) exits 0" {
  local skill_path="$TMPDIR_SKILL/SKILL.md"
  local content
  content=$(printf -- '---\ntitle: query\n---\n# Query\nReads the vault and returns results.')
  local json
  json=$(_write_json "$skill_path" "$content")
  run_hook_with_json_string "$SCRIPT" "$json"
  assert_success
}

# ---------------------------------------------------------------------------
# SKILL.md with disable-model-invocation: true — pass even with side effects
# ---------------------------------------------------------------------------

@test "enforce-dmi: SKILL.md with dmi=true passes despite side-effecting verbs" {
  local skill_path="$TMPDIR_SKILL/SKILL.md"
  local content
  content=$(printf -- '---\ntitle: query\ndisable-model-invocation: true\n---\n# Query\nScaffold and commit the vault.')
  local json
  json=$(_write_json "$skill_path" "$content")
  run_hook_with_json_string "$SCRIPT" "$json"
  assert_success
}

# ---------------------------------------------------------------------------
# SKILL.md with side-effecting verbs but no dmi — BLOCK (exit 2)
# ---------------------------------------------------------------------------

@test "enforce-dmi: SKILL.md with 'scaffold' verb and no dmi is blocked (exit 2)" {
  local skill_path="$TMPDIR_SKILL/SKILL.md"
  # Single-line content keeps the JSON payload valid (no unescaped newlines).
  local content="title: query --- Scaffold the wiki structure."
  local json
  json=$(_write_json "$skill_path" "$content")
  export json
  run bash -c "printf '%s' \"\$json\" | bash '$SCRIPT'"
  assert_status 2
}

@test "enforce-dmi: SKILL.md with 'commit' verb and no dmi is blocked (exit 2)" {
  local skill_path="$TMPDIR_SKILL/SKILL.md"
  # Single-line content keeps the JSON payload valid (no unescaped newlines).
  local content="title: ingest --- This will commit the result."
  local json
  json=$(_write_json "$skill_path" "$content")
  export json
  run bash -c "printf '%s' \"\$json\" | bash '$SCRIPT'"
  assert_status 2
}

@test "enforce-dmi: block message names the offending file" {
  local skill_path="$TMPDIR_SKILL/SKILL.md"
  # Single-line content keeps the JSON payload valid (no unescaped newlines).
  local content="title: ingest --- This will commit the result."
  local json
  json=$(_write_json "$skill_path" "$content")
  export json
  run bash -c "printf '%s' \"\$json\" | bash '$SCRIPT' 2>&1; true"
  assert_output_contains "enforce-dmi"
  assert_output_contains "BLOCKED"
}

# ---------------------------------------------------------------------------
# Edit payload — reads file from disk when content is empty
# ---------------------------------------------------------------------------

@test "enforce-dmi: Edit payload reads from disk and blocks when disk content has side effects" {
  local skill_path="$TMPDIR_SKILL/SKILL.md"
  # Write a SKILL.md with side-effecting verbs to disk.
  printf -- '---\ntitle: ingest\n---\n# Ingest\nDeploy the results.\n' >"$skill_path"
  # Send an Edit payload with empty content (simulating an old_string/new_string edit).
  local json
  json=$(printf '{"tool_name":"Edit","tool_input":{"file_path":"%s","old_string":"x","new_string":"y","content":""}}' \
    "$skill_path")
  export json
  run bash -c "printf '%s' \"\$json\" | bash '$SCRIPT' 2>&1; true"
  assert_output_contains "BLOCKED"
}

@test "enforce-dmi: Edit payload on clean disk file exits 0" {
  local skill_path="$TMPDIR_SKILL/SKILL.md"
  # Write a clean SKILL.md to disk (no side-effecting verbs).
  printf -- '---\ntitle: query\n---\n# Query\nReads the vault.\n' >"$skill_path"
  local json
  json=$(printf '{"tool_name":"Edit","tool_input":{"file_path":"%s","old_string":"x","new_string":"y","content":""}}' \
    "$skill_path")
  run_hook_with_json_string "$SCRIPT" "$json"
  assert_success
}

# ── Phase 3: Bun-absent fail-CLOSED, HARD exit 2 (hook-gates) ─────────────────
# enforce-dmi is the lone HARD-block gate. When Bun is absent it must HARD-block
# an in-scope SKILL.md write (exit 2 + install-Bun stderr) — never fail-open.
# Scoped: non-SKILL.md paths still exit 0.

_path_without_bun_dmi() {
  local tooldir="$BATS_TEST_TMPDIR/nobun-bin"
  mkdir -p "$tooldir"
  local t src
  for t in bash jq cat grep sed dirname basename env awk tr head find pwd; do
    src=$(command -v "$t" 2>/dev/null || true)
    [ -n "$src" ] && ln -sf "$src" "$tooldir/$t"
  done
  printf '%s' "$tooldir"
}

@test "enforce-dmi: FAIL-CLOSED — Bun absent HARD-blocks a SKILL.md write (exit 2)" {
  local tooldir
  tooldir=$(_path_without_bun_dmi)
  run bash -c "PATH='$tooldir' command -v bun"
  assert_status 1
  local json='{"tool_name":"Write","tool_input":{"file_path":"/p/skills/q/SKILL.md","content":"anything"}}'
  run bash -c "export PATH='$tooldir'; printf '%s' '$json' | '$tooldir/bash' '$REPO_ROOT/scripts/enforce-dmi.sh' 2>&1"
  assert_status 2
  assert_output_contains "Bun is required"
}

@test "enforce-dmi: FAIL-CLOSED — Bun absent passes through non-SKILL.md (exit 0)" {
  local tooldir
  tooldir=$(_path_without_bun_dmi)
  local json='{"tool_name":"Write","tool_input":{"file_path":"/p/vault/wiki/x.md","content":"scaffold and commit"}}'
  run bash -c "export PATH='$tooldir'; printf '%s' '$json' | '$tooldir/bash' '$REPO_ROOT/scripts/enforce-dmi.sh'"
  assert_success
}

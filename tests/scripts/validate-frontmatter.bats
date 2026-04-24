#!/usr/bin/env bats
# Tests for scripts/validate-frontmatter.sh
#
# Behavior under test:
#   - Allow valid writes (frontmatter complete per type).
#   - Block missing required fields (stdout JSON "decision":"block", exit 0).
#   - Block unknown type values (including legacy type: moc).
#   - Only validates vault/wiki/**; non-wiki paths pass through.

load '../test_helper/common'

setup() {
  _load_helpers
}

# --- happy path --------------------------------------------------------------

@test "validate-frontmatter: allows clean entity via write-good fixture" {
  run_hook_with_json "scripts/validate-frontmatter.sh" \
    "$JSON_FIXTURES_DIR/write-good.json"

  assert_success
  assert_output_empty
}

@test "validate-frontmatter: ignores non-wiki paths" {
  local json='{"tool_name":"Write","tool_input":{"file_path":"/tmp/not-a-wiki.md","content":"no frontmatter here"}}'
  run bash -c "printf '%s' '$json' | bash '$REPO_ROOT/scripts/validate-frontmatter.sh'"

  assert_success
  assert_output_empty
}

# --- block cases -------------------------------------------------------------

@test "validate-frontmatter: blocks write missing type field" {
  run_hook_with_json "scripts/validate-frontmatter.sh" \
    "$JSON_FIXTURES_DIR/write-invalid-no-type.json"

  assert_success
  assert_output_contains '"decision":"block"'
  assert_output_contains "Missing required field"
  assert_output_contains "type"
}

@test "validate-frontmatter: blocks legacy type: moc" {
  run_hook_with_json "scripts/validate-frontmatter.sh" \
    "$JSON_FIXTURES_DIR/write-invalid-moc-type.json"

  assert_success
  assert_output_contains '"decision":"block"'
  assert_output_contains "Unknown type: moc"
}

@test "validate-frontmatter: blocks entity missing entity_type" {
  local content
  content=$(cat <<'MD'
---
title: "Incomplete Entity"
type: entity
parent: "[[Topics — Index]]"
path: "topics"
sources: ["[[Sample]]"]
created: 2026-04-18
updated: 2026-04-18
status: active
confidence: 0.9
---

# Incomplete Entity

Missing the required entity_type field.
MD
  )
  local json_file="$BATS_TEST_TMPDIR/input.json"
  jq -n \
    --arg path "/tmp/test-project/vault/wiki/topics/incomplete.md" \
    --arg content "$content" \
    '{tool_name:"Write", tool_input:{file_path:$path, content:$content}}' >"$json_file"

  run_hook_with_json "scripts/validate-frontmatter.sh" "$json_file"

  assert_success
  assert_output_contains '"decision":"block"'
  assert_output_contains "entity_type"
}

@test "validate-frontmatter: blocks missing YAML frontmatter entirely" {
  local json='{"tool_name":"Write","tool_input":{"file_path":"/tmp/test-project/vault/wiki/topics/no-frontmatter.md","content":"# No frontmatter\n\nJust body text.\n"}}'
  run bash -c "export LLM_WIKI_VAULT=vault; printf '%s' '$json' | bash '$REPO_ROOT/scripts/validate-frontmatter.sh'"

  assert_success
  assert_output_contains '"decision":"block"'
  assert_output_contains "YAML frontmatter"
}

@test "validate-frontmatter: allows index with new-schema fields" {
  local content
  content=$(cat <<'MD'
---
title: "New Topic — Index"
type: index
aliases: ["New Topic — Index", "new-topic"]
parent: "[[Wiki Index]]"
path: "new-topic"
children: []
child_indexes: []
tags: []
created: 2026-04-18
updated: 2026-04-18
---

# New Topic — Index

Empty new topic folder index.
MD
  )
  local json_file="$BATS_TEST_TMPDIR/input.json"
  jq -n \
    --arg path "/tmp/test-project/vault/wiki/new-topic/_index.md" \
    --arg content "$content" \
    '{tool_name:"Write", tool_input:{file_path:$path, content:$content}}' >"$json_file"

  run_hook_with_json "scripts/validate-frontmatter.sh" "$json_file"

  assert_success
  assert_output_empty
}

@test "validate-frontmatter: blocks path mismatch on entity" {
  # Declared path is wrong-folder but actual file is under topics/
  local content
  content=$(cat <<'MD'
---
title: "Wrong Path"
type: entity
entity_type: tool
aliases: ["Wrong Path"]
parent: "[[Topics — Index]]"
path: "wrong-folder"
sources: ["[[Sample]]"]
created: 2026-04-18
updated: 2026-04-18
status: active
confidence: 0.9
---

# Wrong Path
MD
  )
  local json_file="$BATS_TEST_TMPDIR/input.json"
  jq -n \
    --arg path "/tmp/test-project/vault/wiki/topics/wrong-path.md" \
    --arg content "$content" \
    '{tool_name:"Write", tool_input:{file_path:$path, content:$content}}' >"$json_file"

  run_hook_with_json "scripts/validate-frontmatter.sh" "$json_file"

  assert_success
  assert_output_contains '"decision":"block"'
  assert_output_contains "path"
}

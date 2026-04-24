#!/usr/bin/env bats
# Tests for scripts/post-ingest-summary.sh
#
# Behavior under test:
#   - Silent on writes outside vault/wiki/_sources/.
#   - Emits a summary line with the title and source count after a
#     write to vault/wiki/_sources/*.md.
#   - Does not crash on empty content.

load '../test_helper/common'

setup() {
  _load_helpers
}

@test "post-ingest-summary: silent on non-sources paths" {
  local json='{"tool_name":"Write","tool_input":{"file_path":"/tmp/proj/vault/wiki/topics/page.md","content":"body"}}'
  run bash -c "printf '%s' '$json' | bash '$REPO_ROOT/scripts/post-ingest-summary.sh'"

  assert_success
  assert_output_empty
}

@test "post-ingest-summary: emits summary for a source write" {
  local proj="$BATS_TEST_TMPDIR/proj"
  mkdir -p "$proj/vault/wiki/_sources"
  # Create a neighboring source so count > 0.
  : >"$proj/vault/wiki/_sources/existing.md"

  local json_file="$BATS_TEST_TMPDIR/input.json"
  local content
  content=$(cat <<'MD'
---
title: "New Source"
type: source
---

# New Source
MD
  )
  jq -n \
    --arg path "$proj/vault/wiki/_sources/new-source.md" \
    --arg content "$content" \
    '{tool_name:"Write", tool_input:{file_path:$path, content:$content}}' >"$json_file"

  run_hook_with_json "scripts/post-ingest-summary.sh" "$json_file"

  assert_success
  assert_output_contains "Source ingested"
  assert_output_contains "New Source"
  assert_output_contains "Total sources"
}

@test "post-ingest-summary: emits summary even when content has no title" {
  # A _sources/ write with empty content must still produce the summary line
  # (title falls back to "unknown"). Catches mutations that silence the echo
  # on missing frontmatter.
  local proj="$BATS_TEST_TMPDIR/proj"
  mkdir -p "$proj/vault/wiki/_sources"

  local json
  json=$(jq -n \
    --arg path "$proj/vault/wiki/_sources/empty.md" \
    '{tool_name:"Write", tool_input:{file_path:$path, content:""}}')

  run bash -c "export LLM_WIKI_VAULT=vault; printf '%s' '$json' | bash '$REPO_ROOT/scripts/post-ingest-summary.sh'"

  assert_success
  assert_output_contains "Total sources"
  assert_output_contains "unknown"
}

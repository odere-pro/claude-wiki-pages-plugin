#!/usr/bin/env bats
# Tests for scripts/post-wiki-write.sh
#
# Behavior under test:
#   - On a Write/Edit to vault/wiki/<topic>/<page>.md, emit reminder strings
#     when the folder lacks _index.md or when the new title is missing from
#     wiki/index.md.
#   - Silent on writes to index.md / log.md / _index.md (bookkeeping).
#   - Silent on writes outside vault/wiki/.

load '../test_helper/common'

setup() {
  _load_helpers
}

@test "post-wiki-write: reminds when folder has no _index.md and title missing from index" {
  local proj="$BATS_TEST_TMPDIR/proj"
  mkdir -p "$proj/vault/wiki/topics"
  : >"$proj/vault/wiki/index.md"
  # Deliberately omit _index.md so the reminder fires.

  local json_file="$BATS_TEST_TMPDIR/input.json"
  local content
  content=$(cat <<'MD'
---
title: "New Page"
type: entity
---

# New Page
MD
  )
  jq -n \
    --arg path "$proj/vault/wiki/topics/new-page.md" \
    --arg content "$content" \
    '{tool_name:"Write", tool_input:{file_path:$path, content:$content}}' >"$json_file"

  run_hook_with_json "scripts/post-wiki-write.sh" "$json_file"

  [ "$status" -eq 0 ]
  # At least one reminder fires — either the missing _index.md or the
  # missing index.md entry.
  [[ "$output" == *"_index.md"* ]] || [[ "$output" == *"index.md"* ]]
}

@test "post-wiki-write: silent on non-wiki paths" {
  local json='{"tool_name":"Write","tool_input":{"file_path":"/tmp/elsewhere/note.md","content":"body"}}'
  run bash -c "printf '%s' '$json' | bash '$REPO_ROOT/scripts/post-wiki-write.sh'"

  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "post-wiki-write: silent on index.md / log.md bookkeeping files" {
  local json='{"tool_name":"Write","tool_input":{"file_path":"/tmp/proj/vault/wiki/index.md","content":"---\ntitle: Wiki Index\n---\n"}}'
  run bash -c "printf '%s' '$json' | bash '$REPO_ROOT/scripts/post-wiki-write.sh'"

  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

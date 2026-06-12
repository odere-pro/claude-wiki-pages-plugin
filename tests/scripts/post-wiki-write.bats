#!/usr/bin/env bats
# Tests for scripts/post-wiki-write.sh
#
# Behavior under test:
#   - On a Write/Edit to vault/wiki/<topic>/<page>.md, emit reminder strings
#     when the folder lacks an index file (folder note or legacy _index.md) or
#     when the new title is missing from wiki/index.md.
#   - Silent on writes to index.md / log.md / _index.md / folder notes
#     (bookkeeping).
#   - Silent on writes outside vault/wiki/.

load '../test_helper/common'

setup() {
  _load_helpers
}

@test "post-wiki-write: reminds when folder has no index file (but title IS in index.md)" {
  local proj="$BATS_TEST_TMPDIR/proj"
  mkdir -p "$proj/vault/wiki/topics"
  # index.md DOES contain the new title, so only the index-file-missing
  # reminder should fire. Pins that branch independently.
  printf '%s\n' '- [[Pinned Page]]' >"$proj/vault/wiki/index.md"

  local json_file="$BATS_TEST_TMPDIR/input.json"
  local content
  content=$(cat <<'MD'
---
title: "Pinned Page"
type: entity
---

# Pinned Page
MD
  )
  jq -n \
    --arg path "$proj/vault/wiki/topics/pinned-page.md" \
    --arg content "$content" \
    '{tool_name:"Write", tool_input:{file_path:$path, content:$content}}' >"$json_file"

  run_hook_with_json "scripts/post-wiki-write.sh" "$json_file"

  assert_success
  assert_output_contains "has no index file"
  assert_output_contains "topics/topics.md"
  refute_output_contains "Add [[Pinned Page]]"
}

@test "post-wiki-write: a folder note silences the index-file reminder" {
  local proj="$BATS_TEST_TMPDIR/proj"
  mkdir -p "$proj/vault/wiki/topics"
  printf '%s\n' '- [[Pinned Page]]' >"$proj/vault/wiki/index.md"
  # Folder note: stem == folder name + type: index.
  cat >"$proj/vault/wiki/topics/topics.md" <<'MD'
---
title: "Topics — Index"
type: index
---
MD

  local json_file="$BATS_TEST_TMPDIR/input.json"
  local content
  content=$(cat <<'MD'
---
title: "Pinned Page"
type: entity
---

# Pinned Page
MD
  )
  jq -n \
    --arg path "$proj/vault/wiki/topics/pinned-page.md" \
    --arg content "$content" \
    '{tool_name:"Write", tool_input:{file_path:$path, content:$content}}' >"$json_file"

  run_hook_with_json "scripts/post-wiki-write.sh" "$json_file"

  assert_success
  refute_output_contains "has no index file"
}

@test "post-wiki-write: silent on a folder-note write itself (bookkeeping)" {
  local proj="$BATS_TEST_TMPDIR/proj"
  mkdir -p "$proj/vault/wiki/topics"
  local content
  content=$(cat <<'MD'
---
title: "Topics — Index"
type: index
---
MD
  )
  local json_file="$BATS_TEST_TMPDIR/input.json"
  jq -n \
    --arg path "$proj/vault/wiki/topics/topics.md" \
    --arg content "$content" \
    '{tool_name:"Write", tool_input:{file_path:$path, content:$content}}' >"$json_file"

  run_hook_with_json "scripts/post-wiki-write.sh" "$json_file"

  assert_success
  assert_output_empty
}

@test "post-wiki-write: reminds when title missing from index.md (but folder has legacy _index.md)" {
  local proj="$BATS_TEST_TMPDIR/proj"
  mkdir -p "$proj/vault/wiki/topics"
  # Folder has a legacy _index.md (still accepted), index.md does NOT list the
  # new title — only the index.md-missing-title reminder should fire.
  : >"$proj/vault/wiki/topics/_index.md"
  printf '%s\n' '- [[Some Other Page]]' >"$proj/vault/wiki/index.md"

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

  assert_success
  assert_output_contains "Add [[New Page]]"
  refute_output_contains "has no index file"
}

@test "post-wiki-write: silent on non-wiki paths" {
  local json='{"tool_name":"Write","tool_input":{"file_path":"/tmp/elsewhere/note.md","content":"body"}}'
  run bash -c "printf '%s' '$json' | bash '$REPO_ROOT/scripts/post-wiki-write.sh'"

  assert_success
  assert_output_empty
}

@test "post-wiki-write: silent on index.md / log.md / dashboard.md / _index.md bookkeeping files" {
  # Exercise every name in the skip list so a mutation that drops any single
  # name from the `case` is caught.
  local name
  for name in index.md log.md dashboard.md _index.md; do
    local json="{\"tool_name\":\"Write\",\"tool_input\":{\"file_path\":\"/tmp/proj/vault/wiki/$name\",\"content\":\"---\\ntitle: Bookkeeping\\n---\\n\"}}"
    run bash -c "printf '%s' '$json' | bash '$REPO_ROOT/scripts/post-wiki-write.sh'"
    assert_success
    assert_output_empty
  done
}

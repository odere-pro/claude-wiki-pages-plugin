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

@test "Wiki-write reminder: reminds when the folder has no index file even though the title is already in index.md" {
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

@test "Wiki-write reminder: a folder note in the folder silences the index-file reminder" {
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

@test "Wiki-write reminder: stays silent on a folder-note write itself because it is bookkeeping" {
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

@test "Wiki-write reminder: reminds when the title is missing from index.md even though the folder has a legacy _index.md" {
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

@test "Wiki-write reminder: stays silent on writes to paths outside the wiki" {
  local json='{"tool_name":"Write","tool_input":{"file_path":"/tmp/elsewhere/note.md","content":"body"}}'
  run bash -c "printf '%s' '$json' | bash '$REPO_ROOT/scripts/post-wiki-write.sh'"

  assert_success
  assert_output_empty
}

# ---------------------------------------------------------------------------
# MultiEdit payloads (S13): post-wiki-write must fire for MultiEdit too.
# A MultiEdit payload has tool_input.file_path at the top level but no
# content field; the script reads the title from the file on disk instead.
# ---------------------------------------------------------------------------

@test "Wiki-write reminder: a MultiEdit on a wiki file reminds when the folder has no index file" {  # spec S13
  local proj="$BATS_TEST_TMPDIR/proj"
  mkdir -p "$proj/vault/wiki/topics"
  # Write the file to disk so the script can read the title from it.
  cat >"$proj/vault/wiki/topics/multi-page.md" <<'MD'
---
title: "Multi Page"
type: entity
---

# Multi Page
MD
  printf '%s\n' '- [[Multi Page]]' >"$proj/vault/wiki/index.md"

  local json_file="$BATS_TEST_TMPDIR/multi-input.json"
  jq -n \
    --arg path "$proj/vault/wiki/topics/multi-page.md" \
    '{tool_name:"MultiEdit", tool_input:{file_path:$path, edits:[]}}' >"$json_file"

  run_hook_with_json "scripts/post-wiki-write.sh" "$json_file"

  assert_success
  assert_output_contains "has no index file"
}

@test "Wiki-write reminder: a MultiEdit on a folder note stays silent because it is bookkeeping" {  # spec S13
  local proj="$BATS_TEST_TMPDIR/proj"
  mkdir -p "$proj/vault/wiki/topics"
  cat >"$proj/vault/wiki/topics/topics.md" <<'MD'
---
title: "Topics — Index"
type: index
---
MD

  local json_file="$BATS_TEST_TMPDIR/multi-fn-input.json"
  jq -n \
    --arg path "$proj/vault/wiki/topics/topics.md" \
    '{tool_name:"MultiEdit", tool_input:{file_path:$path, edits:[]}}' >"$json_file"

  run_hook_with_json "scripts/post-wiki-write.sh" "$json_file"

  assert_success
  assert_output_empty
}

@test "Wiki-write reminder: a MultiEdit on a path outside the wiki stays silent" {  # spec S13
  local json
  json='{"tool_name":"MultiEdit","tool_input":{"file_path":"/tmp/elsewhere/note.md","edits":[]}}'
  run bash -c "export CLAUDE_WIKI_PAGES_VAULT=vault; printf '%s' '$json' | bash '$REPO_ROOT/scripts/post-wiki-write.sh'"

  assert_success
  assert_output_empty
}

@test "Wiki-write reminder: stays silent on every bookkeeping file in the skip list — index.md, log.md, dashboard.md, _index.md" {
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

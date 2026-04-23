#!/usr/bin/env bats
# Tests for scripts/check-wikilinks.sh
#
# Behavior under test:
#   - Block Write to vault/wiki/** when body contains [text](file.md) links.
#   - Allow [[wikilinks]] and bare URL markdown links.
#   - Ignore non-wiki paths.

load '../test_helper/common'

setup() {
  _load_helpers
}

@test "check-wikilinks: allows [[wikilinks]] in wiki body" {
  run_hook_with_json "scripts/check-wikilinks.sh" \
    "$JSON_FIXTURES_DIR/write-good.json"

  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "check-wikilinks: blocks [text](file.md) in wiki body" {
  run_hook_with_json "scripts/check-wikilinks.sh" \
    "$JSON_FIXTURES_DIR/write-invalid-markdown-link.json"

  [ "$status" -eq 0 ]
  [[ "$output" == *'"decision":"block"'* ]]
  [[ "$output" == *"wikilinks"* ]]
}

@test "check-wikilinks: allows http links in wiki body" {
  local json_file="$BATS_TEST_TMPDIR/input.json"
  local content
  content=$(cat <<'MD'
---
title: "URL Link"
type: entity
entity_type: tool
aliases: ["URL Link"]
parent: "[[Topics — Index]]"
path: "topics"
sources: ["[[Sample]]"]
created: 2026-04-18
updated: 2026-04-18
status: active
confidence: 0.9
---

# URL Link

External link [example](https://example.invalid) is fine — it is not a .md reference.
MD
  )
  jq -n \
    --arg path "/tmp/test-project/vault/wiki/topics/url-link.md" \
    --arg content "$content" \
    '{tool_name:"Write", tool_input:{file_path:$path, content:$content}}' >"$json_file"

  run_hook_with_json "scripts/check-wikilinks.sh" "$json_file"

  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

@test "check-wikilinks: ignores non-wiki paths" {
  local json='{"tool_name":"Write","tool_input":{"file_path":"/tmp/elsewhere/readme.md","content":"See [docs](docs.md) please."}}'
  run bash -c "printf '%s' '$json' | bash '$REPO_ROOT/scripts/check-wikilinks.sh'"

  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

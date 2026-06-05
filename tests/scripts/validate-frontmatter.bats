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
  run bash -c "export CLAUDE_WIKI_PAGES_VAULT=vault; printf '%s' '$json' | bash '$REPO_ROOT/scripts/validate-frontmatter.sh'"

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

@test "validate-frontmatter: allows schema-v2 topic page" {
  local content
  content=$(cat <<'MD'
---
title: "Retrieval"
type: topic
aliases: ["Retrieval"]
parent: "[[Topics — Index]]"
path: "topics"
summary: "How agents fetch grounded context."
key_pages: []
sources: ["[[Sample]]"]
related: []
created: 2026-06-02
updated: 2026-06-02
status: active
confidence: 0.8
---

# Retrieval
MD
  )
  local json_file="$BATS_TEST_TMPDIR/input.json"
  jq -n \
    --arg path "/tmp/test-project/vault/wiki/topics/retrieval.md" \
    --arg content "$content" \
    '{tool_name:"Write", tool_input:{file_path:$path, content:$content}}' >"$json_file"

  run_hook_with_json "scripts/validate-frontmatter.sh" "$json_file"

  assert_success
  assert_output_empty
}

@test "validate-frontmatter: blocks topic missing summary" {
  local content
  content=$(cat <<'MD'
---
title: "No Summary"
type: topic
parent: "[[Topics — Index]]"
path: "topics"
sources: ["[[Sample]]"]
created: 2026-06-02
updated: 2026-06-02
status: active
confidence: 0.8
---

# No Summary
MD
  )
  local json_file="$BATS_TEST_TMPDIR/input.json"
  jq -n \
    --arg path "/tmp/test-project/vault/wiki/topics/no-summary.md" \
    --arg content "$content" \
    '{tool_name:"Write", tool_input:{file_path:$path, content:$content}}' >"$json_file"

  run_hook_with_json "scripts/validate-frontmatter.sh" "$json_file"

  assert_success
  assert_output_contains '"decision":"block"'
  assert_output_contains "summary"
}

@test "validate-frontmatter: allows schema-v2 project page" {
  local content
  content=$(cat <<'MD'
---
title: "Vault Rollout"
type: project
aliases: ["Vault Rollout"]
parent: "[[Topics — Index]]"
path: "topics"
objective: "Ship the v2 schema."
project_status: active
members: []
sources: ["[[Sample]]"]
created: 2026-06-02
updated: 2026-06-02
status: active
confidence: 0.8
---

# Vault Rollout
MD
  )
  local json_file="$BATS_TEST_TMPDIR/input.json"
  jq -n \
    --arg path "/tmp/test-project/vault/wiki/topics/vault-rollout.md" \
    --arg content "$content" \
    '{tool_name:"Write", tool_input:{file_path:$path, content:$content}}' >"$json_file"

  run_hook_with_json "scripts/validate-frontmatter.sh" "$json_file"

  assert_success
  assert_output_empty
}

@test "validate-frontmatter: allows schema-v2 manifest page" {
  local content
  content=$(cat <<'MD'
---
title: "Source Manifest"
type: manifest
created: 2026-06-02
updated: 2026-06-02
---

# Source Manifest
MD
  )
  local json_file="$BATS_TEST_TMPDIR/input.json"
  jq -n \
    --arg path "/tmp/test-project/vault/wiki/_sources/manifest.md" \
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

# --- U4 errors-that-teach ----------------------------------------------------

@test "validate-frontmatter: reports ALL missing fields in one message (U4)" {
  # A topic page missing sources, status, and confidence (3 required fields).
  # Before U4: the hook blocked on the FIRST missing field only.
  # After U4: all 3 appear in one reason string, plus the frontmatter block.
  local content
  content=$(cat <<'MD'
---
title: "Sparse Topic"
type: topic
summary: "A topic with several required fields omitted."
parent: "[[Topics — Index]]"
path: "topics"
created: 2026-06-04
updated: 2026-06-04
---

# Sparse Topic
MD
  )
  local json_file="$BATS_TEST_TMPDIR/input.json"
  jq -n \
    --arg path "/tmp/test-project/vault/wiki/topics/sparse-topic.md" \
    --arg content "$content" \
    '{tool_name:"Write", tool_input:{file_path:$path, content:$content}}' >"$json_file"

  run_hook_with_json "scripts/validate-frontmatter.sh" "$json_file"

  assert_success
  assert_output_contains '"decision":"block"'
  # All three missing fields must appear in the single reason string.
  assert_output_contains "sources"
  assert_output_contains "status"
  assert_output_contains "confidence"
  # The frontmatter block must be echoed so the user sees the context.
  assert_output_contains "Sparse Topic"
  assert_output_contains "type: topic"
}

@test "validate-frontmatter: reports multiple base missing fields in one message (U4)" {
  # A page missing both 'type' and 'title' (the two universal required fields).
  local content
  content=$(cat <<'MD'
---
summary: "No type or title here."
created: 2026-06-04
---

Body only.
MD
  )
  local json_file="$BATS_TEST_TMPDIR/input.json"
  jq -n \
    --arg path "/tmp/test-project/vault/wiki/topics/no-type-title.md" \
    --arg content "$content" \
    '{tool_name:"Write", tool_input:{file_path:$path, content:$content}}' >"$json_file"

  run_hook_with_json "scripts/validate-frontmatter.sh" "$json_file"

  assert_success
  assert_output_contains '"decision":"block"'
  assert_output_contains "type"
  assert_output_contains "title"
}

# --- source_type: agent-session (Wave-2 durable memory) ----------------------

@test "validate-frontmatter: allows source with source_type: agent-session" {
  # Decision #4: durable memory writes carry source_type: agent-session.
  # This value must NOT be rejected by the hook (it is in the enum).
  local content
  content=$(cat <<'MD'
---
title: "Session 2026-06-05"
type: source
source_type: agent-session
source_format: text
url: ""
author: "claude"
publisher: ""
date_published: 2026-06-05
date_ingested: 2026-06-05
tags: []
aliases: ["Session 2026-06-05"]
sources: []
created: 2026-06-05
updated: 2026-06-05
status: active
confidence: 0.9
---

# Session 2026-06-05

Agent session notes.
MD
  )
  local json_file="$BATS_TEST_TMPDIR/input.json"
  jq -n \
    --arg path "/tmp/test-project/vault/wiki/_sources/session-2026-06-05.md" \
    --arg content "$content" \
    '{tool_name:"Write", tool_input:{file_path:$path, content:$content}}' >"$json_file"

  run_hook_with_json "scripts/validate-frontmatter.sh" "$json_file"

  assert_success
  assert_output_empty
}

# --- source_format: pdf (Wave-2 I4 PDF ingest) --------------------------------

@test "validate-frontmatter: allows source with source_format: pdf and required fields" {
  # I4: PDF ingest path requires attachment_path and extracted_at when source_format != text.
  local content
  content=$(cat <<'MD'
---
title: "Architecture PDF"
type: source
source_type: paper
source_format: pdf
attachment_path: "raw/assets/architecture.pdf"
extracted_at: 2026-06-05
url: ""
author: "Author"
publisher: "Publisher"
date_published: 2026-06-01
date_ingested: 2026-06-05
tags: []
aliases: ["Architecture PDF"]
sources: []
created: 2026-06-05
updated: 2026-06-05
status: active
confidence: 1.0
---

# Architecture PDF

PDF source note.
MD
  )
  local json_file="$BATS_TEST_TMPDIR/input.json"
  jq -n \
    --arg path "/tmp/test-project/vault/wiki/_sources/architecture-pdf.md" \
    --arg content "$content" \
    '{tool_name:"Write", tool_input:{file_path:$path, content:$content}}' >"$json_file"

  run_hook_with_json "scripts/validate-frontmatter.sh" "$json_file"

  assert_success
  assert_output_empty
}

@test "validate-frontmatter: blocks source with source_format: pdf missing attachment_path" {
  # source_format != text → attachment_path + extracted_at required.
  local content
  content=$(cat <<'MD'
---
title: "PDF Missing Attachment"
type: source
source_type: paper
source_format: pdf
extracted_at: 2026-06-05
url: ""
author: "Author"
publisher: "Publisher"
date_published: 2026-06-01
date_ingested: 2026-06-05
tags: []
aliases: []
sources: []
created: 2026-06-05
updated: 2026-06-05
status: active
confidence: 1.0
---

# PDF Missing Attachment
MD
  )
  local json_file="$BATS_TEST_TMPDIR/input.json"
  jq -n \
    --arg path "/tmp/test-project/vault/wiki/_sources/pdf-missing-attachment.md" \
    --arg content "$content" \
    '{tool_name:"Write", tool_input:{file_path:$path, content:$content}}' >"$json_file"

  run_hook_with_json "scripts/validate-frontmatter.sh" "$json_file"

  assert_success
  assert_output_contains '"decision":"block"'
  assert_output_contains "attachment_path"
}

@test "validate-frontmatter: blocks source with source_format: image missing extracted_at" {
  # The non-text rule applies to all non-text formats, not just pdf.
  local content
  content=$(cat <<'MD'
---
title: "Image Missing Extracted At"
type: source
source_type: paper
source_format: image
attachment_path: "raw/assets/diagram.png"
url: ""
author: "Author"
publisher: "Publisher"
date_published: 2026-06-01
date_ingested: 2026-06-05
tags: []
aliases: []
sources: []
created: 2026-06-05
updated: 2026-06-05
status: active
confidence: 1.0
---

# Image Missing Extracted At
MD
  )
  local json_file="$BATS_TEST_TMPDIR/input.json"
  jq -n \
    --arg path "/tmp/test-project/vault/wiki/_sources/image-missing-extracted-at.md" \
    --arg content "$content" \
    '{tool_name:"Write", tool_input:{file_path:$path, content:$content}}' >"$json_file"

  run_hook_with_json "scripts/validate-frontmatter.sh" "$json_file"

  assert_success
  assert_output_contains '"decision":"block"'
  assert_output_contains "extracted_at"
}

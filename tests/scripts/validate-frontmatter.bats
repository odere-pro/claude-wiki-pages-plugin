#!/usr/bin/env bats
# Tests for scripts/validate-frontmatter.sh
#
# Behavior under test:
#   - Allow valid writes (frontmatter complete per type).
#   - Block missing required fields (stdout JSON "decision":"block", exit 0).
#   - Block unknown type values (including legacy type: moc).
#   - Only validates vault/wiki/**; non-wiki paths pass through.

load '../test_helper/common'

# setup_file runs once before any test in this file.
# Creates vault/CLAUDE.md at REPO_ROOT so scripts/validate-frontmatter.sh can read
# the Required fields table when CLAUDE_WIKI_PAGES_VAULT=vault (hardcoded by
# run_hook_with_json in common.bash). The vault/ directory is removed by teardown_file.
setup_file() {
  local vault_dir="$REPO_ROOT/vault"
  local schema_file="$vault_dir/CLAUDE.md"
  mkdir -p "$vault_dir"
  cat >"$schema_file" <<'SCHEMA'
# LLM Wiki — Schema (test stub)

`schema_version: 2`

> This file is created by the validate-frontmatter.bats setup_file for test runs.
> It provides the Required fields table that scripts/validate-frontmatter.sh reads
> at gate time (ADR-0014). Keep it in sync with docs/vault-example/CLAUDE.md.

## Frontmatter schema

### Required fields by type

The two universal required fields `type` and `title` apply to every typed page and are not repeated in the table below.

| Type | Required fields | Conditional |
| --- | --- | --- |
| `source` | `source_type sources created updated status confidence` | `source_format != text` requires `attachment_path extracted_at` |
| `entity` | `entity_type parent path sources created updated status confidence` | — |
| `concept` | `parent path sources created updated status confidence` | — |
| `topic` | `summary parent path sources created updated status confidence` | — |
| `project` | `objective project_status parent path sources created updated status confidence` | — |
| `synthesis` | `synthesis_type sources created updated status confidence` | — |
| `index` | `aliases created updated` | — |
| `manifest` | `created updated` | — |
| `log` | `created updated` | — |
SCHEMA
}

# teardown_file removes the test stub vault so it does not persist in the working tree.
teardown_file() {
  rm -rf "$REPO_ROOT/vault"
}

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

# --- P2.2: per-type required-field enforcement (schema-table-sourced) ---------
# Each test asserts the required fields declared in the schema table are enforced.
# The field list comes from the table parsed at gate time, not from a hardcoded
# case block in the script (ADR-0014 Part A).

@test "validate-frontmatter: P2.2 blocks concept missing parent" {
  # concept required: parent path sources created updated status confidence
  local content
  content=$(cat <<'MD'
---
title: "Some Concept"
type: concept
path: "topics"
sources: ["[[Sample]]"]
created: 2026-06-05
updated: 2026-06-05
status: active
confidence: 0.8
---

# Some Concept
MD
  )
  local json_file="$BATS_TEST_TMPDIR/input.json"
  jq -n \
    --arg path "/tmp/test-project/vault/wiki/topics/some-concept.md" \
    --arg content "$content" \
    '{tool_name:"Write", tool_input:{file_path:$path, content:$content}}' >"$json_file"

  run_hook_with_json "scripts/validate-frontmatter.sh" "$json_file"

  assert_success
  assert_output_contains '"decision":"block"'
  assert_output_contains "parent"
}

@test "validate-frontmatter: P2.2 allows complete concept page" {
  local content
  content=$(cat <<'MD'
---
title: "Complete Concept"
type: concept
parent: "[[Topics — Index]]"
path: "topics"
sources: ["[[Sample]]"]
created: 2026-06-05
updated: 2026-06-05
status: active
confidence: 0.8
---

# Complete Concept
MD
  )
  local json_file="$BATS_TEST_TMPDIR/input.json"
  jq -n \
    --arg path "/tmp/test-project/vault/wiki/topics/complete-concept.md" \
    --arg content "$content" \
    '{tool_name:"Write", tool_input:{file_path:$path, content:$content}}' >"$json_file"

  run_hook_with_json "scripts/validate-frontmatter.sh" "$json_file"

  assert_success
  assert_output_empty
}

@test "validate-frontmatter: P2.2 blocks synthesis missing synthesis_type" {
  # synthesis required: synthesis_type sources created updated status confidence
  local content
  content=$(cat <<'MD'
---
title: "Cross-topic Analysis"
type: synthesis
sources: ["[[Sample]]"]
created: 2026-06-05
updated: 2026-06-05
status: active
confidence: 0.7
---

# Cross-topic Analysis
MD
  )
  local json_file="$BATS_TEST_TMPDIR/input.json"
  jq -n \
    --arg path "/tmp/test-project/vault/wiki/_synthesis/cross-topic.md" \
    --arg content "$content" \
    '{tool_name:"Write", tool_input:{file_path:$path, content:$content}}' >"$json_file"

  run_hook_with_json "scripts/validate-frontmatter.sh" "$json_file"

  assert_success
  assert_output_contains '"decision":"block"'
  assert_output_contains "synthesis_type"
}

@test "validate-frontmatter: P2.2 allows complete synthesis page" {
  local content
  content=$(cat <<'MD'
---
title: "Complete Synthesis"
type: synthesis
synthesis_type: comparison
sources: ["[[Sample]]"]
created: 2026-06-05
updated: 2026-06-05
status: active
confidence: 0.7
---

# Complete Synthesis
MD
  )
  local json_file="$BATS_TEST_TMPDIR/input.json"
  jq -n \
    --arg path "/tmp/test-project/vault/wiki/_synthesis/complete-synthesis.md" \
    --arg content "$content" \
    '{tool_name:"Write", tool_input:{file_path:$path, content:$content}}' >"$json_file"

  run_hook_with_json "scripts/validate-frontmatter.sh" "$json_file"

  assert_success
  assert_output_empty
}

@test "validate-frontmatter: P2.2 blocks log missing created" {
  # log required: created updated
  local content
  content=$(cat <<'MD'
---
title: "Operations Log"
type: log
updated: 2026-06-05
---

# Operations Log
MD
  )
  local json_file="$BATS_TEST_TMPDIR/input.json"
  jq -n \
    --arg path "/tmp/test-project/vault/wiki/log.md" \
    --arg content "$content" \
    '{tool_name:"Write", tool_input:{file_path:$path, content:$content}}' >"$json_file"

  run_hook_with_json "scripts/validate-frontmatter.sh" "$json_file"

  assert_success
  assert_output_contains '"decision":"block"'
  assert_output_contains "created"
}

@test "validate-frontmatter: P2.2 allows complete log page" {
  local content
  content=$(cat <<'MD'
---
title: "Operations Log"
type: log
created: 2026-06-05
updated: 2026-06-05
---

# Operations Log
MD
  )
  local json_file="$BATS_TEST_TMPDIR/input.json"
  jq -n \
    --arg path "/tmp/test-project/vault/wiki/log.md" \
    --arg content "$content" \
    '{tool_name:"Write", tool_input:{file_path:$path, content:$content}}' >"$json_file"

  run_hook_with_json "scripts/validate-frontmatter.sh" "$json_file"

  assert_success
  assert_output_empty
}

@test "validate-frontmatter: P2.2 blocks project missing objective" {
  # project required: objective project_status parent path sources created updated status confidence
  local content
  content=$(cat <<'MD'
---
title: "Incomplete Project"
type: project
project_status: active
parent: "[[Topics — Index]]"
path: "topics"
sources: ["[[Sample]]"]
created: 2026-06-05
updated: 2026-06-05
status: active
confidence: 0.8
---

# Incomplete Project
MD
  )
  local json_file="$BATS_TEST_TMPDIR/input.json"
  jq -n \
    --arg path "/tmp/test-project/vault/wiki/topics/incomplete-project.md" \
    --arg content "$content" \
    '{tool_name:"Write", tool_input:{file_path:$path, content:$content}}' >"$json_file"

  run_hook_with_json "scripts/validate-frontmatter.sh" "$json_file"

  assert_success
  assert_output_contains '"decision":"block"'
  assert_output_contains "objective"
}

@test "validate-frontmatter: P2.2 blocks source missing source_type" {
  # source required: source_type sources created updated status confidence
  local content
  content=$(cat <<'MD'
---
title: "Sourceless Source"
type: source
sources: []
created: 2026-06-05
updated: 2026-06-05
status: active
confidence: 1.0
---

# Sourceless Source
MD
  )
  local json_file="$BATS_TEST_TMPDIR/input.json"
  jq -n \
    --arg path "/tmp/test-project/vault/wiki/_sources/sourceless-source.md" \
    --arg content "$content" \
    '{tool_name:"Write", tool_input:{file_path:$path, content:$content}}' >"$json_file"

  run_hook_with_json "scripts/validate-frontmatter.sh" "$json_file"

  assert_success
  assert_output_contains '"decision":"block"'
  assert_output_contains "source_type"
}

@test "validate-frontmatter: P2.2 blocks entity missing entity_type (schema-table path)" {
  # entity required: entity_type parent path sources created updated status confidence
  # This re-asserts entity enforcement via the schema-table path (same behavior as before).
  local content
  content=$(cat <<'MD'
---
title: "No Entity Type"
type: entity
parent: "[[Topics — Index]]"
path: "topics"
sources: ["[[Sample]]"]
created: 2026-06-05
updated: 2026-06-05
status: active
confidence: 0.9
---

# No Entity Type
MD
  )
  local json_file="$BATS_TEST_TMPDIR/input.json"
  jq -n \
    --arg path "/tmp/test-project/vault/wiki/topics/no-entity-type.md" \
    --arg content "$content" \
    '{tool_name:"Write", tool_input:{file_path:$path, content:$content}}' >"$json_file"

  run_hook_with_json "scripts/validate-frontmatter.sh" "$json_file"

  assert_success
  assert_output_contains '"decision":"block"'
  assert_output_contains "entity_type"
}

@test "validate-frontmatter: P2.2 blocks index missing aliases" {
  # index required: aliases created updated
  local content
  content=$(cat <<'MD'
---
title: "No Aliases Index"
type: index
created: 2026-06-05
updated: 2026-06-05
---

# No Aliases Index
MD
  )
  local json_file="$BATS_TEST_TMPDIR/input.json"
  jq -n \
    --arg path "/tmp/test-project/vault/wiki/topics/_index.md" \
    --arg content "$content" \
    '{tool_name:"Write", tool_input:{file_path:$path, content:$content}}' >"$json_file"

  run_hook_with_json "scripts/validate-frontmatter.sh" "$json_file"

  assert_success
  assert_output_contains '"decision":"block"'
  assert_output_contains "aliases"
}

# --- P2.2: drift test — schema-table change propagates to gate with no script edit ---

@test "validate-frontmatter: P2.2 drift — gate derives allowed-type set from schema table" {
  # This test verifies that the gate reads type keys from the schema table.
  # An unknown type that is NOT in the schema table must be rejected with a
  # message that names allowed types, derived from the table keys.
  # The allowed types are those in the Required-fields table: source, entity,
  # concept, topic, project, synthesis, index, manifest, log.
  local content
  content=$(cat <<'MD'
---
title: "Bad Type Page"
type: invalid_type_not_in_table
created: 2026-06-05
updated: 2026-06-05
---

# Bad Type Page
MD
  )
  local json_file="$BATS_TEST_TMPDIR/input.json"
  jq -n \
    --arg path "/tmp/test-project/vault/wiki/topics/bad-type.md" \
    --arg content "$content" \
    '{tool_name:"Write", tool_input:{file_path:$path, content:$content}}' >"$json_file"

  run_hook_with_json "scripts/validate-frontmatter.sh" "$json_file"

  assert_success
  assert_output_contains '"decision":"block"'
  assert_output_contains "Unknown type"
  # The error message must name the allowed types derived from the table.
  assert_output_contains "source"
  assert_output_contains "entity"
}

# --- P2.2: fallback + malformed-table tests (ADR-0014 amended) ----------------

@test "validate-frontmatter: P2.2 fallback — no table in vault CLAUDE.md validates against bundled table" {
  # ADR-0014 amended: a vault CLAUDE.md with NO "### Required fields by type" heading
  # triggers FALLBACK to the inline bundled table — does NOT fail closed.
  # A valid entity page must PASS when the vault has no table.
  local tmp_vault="$BATS_TEST_TMPDIR/no-table-vault"
  mkdir -p "$tmp_vault/wiki/topics"

  # CLAUDE.md exists but has no Required fields table heading.
  cat >"$tmp_vault/CLAUDE.md" <<'SCHEMA'
# LLM Wiki — Schema and Conventions

## Frontmatter schema

Nine allowed types: source, entity, concept, topic, project, synthesis, index, manifest, log.

(No ### Required fields by type table — bundled fallback must be used.)
SCHEMA

  local content
  content=$(cat <<'MD'
---
title: "Fallback Entity"
type: entity
entity_type: tool
parent: "[[Topics — Index]]"
path: "topics"
sources: ["[[Sample]]"]
created: 2026-06-05
updated: 2026-06-05
status: active
confidence: 0.9
---

# Fallback Entity
MD
  )
  local json_file="$BATS_TEST_TMPDIR/fallback-input.json"
  jq -n \
    --arg path "$tmp_vault/wiki/topics/fallback-entity.md" \
    --arg content "$content" \
    '{tool_name:"Write", tool_input:{file_path:$path, content:$content}}' >"$json_file"

  run bash -c "export CLAUDE_WIKI_PAGES_VAULT='$tmp_vault'; printf '%s' \"\$(cat '$json_file')\" | bash '$REPO_ROOT/scripts/validate-frontmatter.sh'"

  assert_success
  assert_output_empty
}

@test "validate-frontmatter: P2.2 fallback — missing field blocked by bundled table (no vault table)" {
  # Inverse of the above: a page MISSING a required field must be blocked
  # even when the vault has no Required fields table (bundled table is used).
  local tmp_vault="$BATS_TEST_TMPDIR/no-table-vault2"
  mkdir -p "$tmp_vault/wiki/topics"

  cat >"$tmp_vault/CLAUDE.md" <<'SCHEMA'
# LLM Wiki — Schema

## Frontmatter schema

(No ### Required fields by type table — bundled fallback must enforce fields.)
SCHEMA

  local content
  content=$(cat <<'MD'
---
title: "Missing Field Entity"
type: entity
parent: "[[Topics — Index]]"
path: "topics"
sources: ["[[Sample]]"]
created: 2026-06-05
updated: 2026-06-05
status: active
confidence: 0.9
---

# Missing Field Entity
MD
  )
  # entity_type is missing — bundled table requires it for entity type.
  local json_file="$BATS_TEST_TMPDIR/fallback-block-input.json"
  jq -n \
    --arg path "$tmp_vault/wiki/topics/missing-field-entity.md" \
    --arg content "$content" \
    '{tool_name:"Write", tool_input:{file_path:$path, content:$content}}' >"$json_file"

  run bash -c "export CLAUDE_WIKI_PAGES_VAULT='$tmp_vault'; printf '%s' \"\$(cat '$json_file')\" | bash '$REPO_ROOT/scripts/validate-frontmatter.sh'"

  assert_success
  assert_output_contains '"decision":"block"'
  assert_output_contains "entity_type"
}

@test "validate-frontmatter: P2.2 fail-closed — malformed table (heading present, zero data rows)" {
  # ADR-0014 amended: when the "### Required fields by type" heading IS present
  # but zero valid data rows parse, the gate must FAIL CLOSED (not use the
  # bundled fallback). This prevents a broken schema from silently allowing all writes.
  local tmp_vault="$BATS_TEST_TMPDIR/malformed-table-vault"
  mkdir -p "$tmp_vault/wiki/topics"

  # CLAUDE.md has the heading but no valid rows (only header + separator, no data).
  cat >"$tmp_vault/CLAUDE.md" <<'SCHEMA'
# LLM Wiki — Schema and Conventions

## Frontmatter schema

### Required fields by type

| Type | Required fields | Conditional |
| --- | --- | --- |
SCHEMA

  local content
  content=$(cat <<'MD'
---
title: "Some Entity"
type: entity
entity_type: tool
parent: "[[Topics — Index]]"
path: "topics"
sources: ["[[Sample]]"]
created: 2026-06-05
updated: 2026-06-05
status: active
confidence: 0.9
---

# Some Entity
MD
  )
  local json_file="$BATS_TEST_TMPDIR/malformed-input.json"
  jq -n \
    --arg path "$tmp_vault/wiki/topics/some-entity.md" \
    --arg content "$content" \
    '{tool_name:"Write", tool_input:{file_path:$path, content:$content}}' >"$json_file"

  run bash -c "export CLAUDE_WIKI_PAGES_VAULT='$tmp_vault'; printf '%s' \"\$(cat '$json_file')\" | bash '$REPO_ROOT/scripts/validate-frontmatter.sh'"

  assert_success
  assert_output_contains '"decision":"block"'
  assert_output_contains "required-field table"
}

# --- Phase 3: Bun-required fail-closed (the explicit safety upgrade) ----------
# When Bun is absent at hook time, the frontmatter SECURITY gate must BLOCK a
# wiki write with an install-Bun reason — NOT fail open (migration-plan.md
# Phase 3 + this unit's FAIL-CLOSED requirement). Bun is hidden by running with
# a PATH that contains only a curated tool dir without `bun`.

# _path_without_bun: build a PATH dir holding the tools the wrapper needs
# (bash, jq, cat, grep, sed, dirname, basename, printf via bash) but NOT bun,
# and echo it. Symlinks the resolved absolute path of each tool.
_path_without_bun() {
  local tooldir="$BATS_TEST_TMPDIR/nobun-bin"
  mkdir -p "$tooldir"
  local t src
  for t in bash jq cat grep sed dirname basename env awk tr head find; do
    src=$(command -v "$t" 2>/dev/null || true)
    [ -n "$src" ] && ln -sf "$src" "$tooldir/$t"
  done
  printf '%s' "$tooldir"
}

@test "validate-frontmatter: FAIL-CLOSED — Bun absent blocks a wiki write with install-Bun reason" {
  local json='{"tool_name":"Write","tool_input":{"file_path":"/tmp/test-project/vault/wiki/topics/x.md","content":"# no frontmatter\n"}}'
  local tooldir
  tooldir=$(_path_without_bun)
  # Sanity: bun must be unreachable on the curated PATH.
  run bash -c "PATH='$tooldir' command -v bun"
  assert_status 1

  run bash -c "export CLAUDE_WIKI_PAGES_VAULT=vault; export PATH='$tooldir'; printf '%s' '$json' | '$tooldir/bash' '$REPO_ROOT/scripts/validate-frontmatter.sh'"

  assert_success
  assert_output_contains '"decision":"block"'
  assert_output_contains "Bun is required"
}

@test "validate-frontmatter: FAIL-CLOSED — Bun absent still passes through non-wiki paths" {
  # Fail-closed must be SCOPED: a missing-Bun box should not block edits the
  # gate would never have validated (anything outside <vault>/wiki/*.md).
  local json='{"tool_name":"Write","tool_input":{"file_path":"/tmp/elsewhere/notes.md","content":"# anything"}}'
  local tooldir
  tooldir=$(_path_without_bun)

  run bash -c "export CLAUDE_WIKI_PAGES_VAULT=vault; export PATH='$tooldir'; printf '%s' '$json' | '$tooldir/bash' '$REPO_ROOT/scripts/validate-frontmatter.sh'"

  assert_success
  assert_output_empty
}

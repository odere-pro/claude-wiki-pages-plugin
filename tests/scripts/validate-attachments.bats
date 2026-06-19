#!/usr/bin/env bats
# Tests for scripts/validate-attachments.sh
#
# Behavior under test:
#   - Text sources (source_format omitted or = text) pass without inspection.
#   - Non-text sources (source_format = image, pdf, …) must declare
#     attachment_path pointing to an existing file under vault/raw/assets/.
#   - Missing attachment_path → block.
#   - attachment_path pointing to a non-existent file → block.

load '../test_helper/common'

setup() {
  _load_helpers
}

@test "validate-attachments: text source passes without attachment" {
  # The existing write-good fixture is a source-less entity, but the script
  # only acts on _sources/. We need a text-format source summary.
  local json_file="$BATS_TEST_TMPDIR/input.json"
  local content
  content=$(cat <<'MD'
---
title: "Text Source"
type: source
source_type: article
source_format: text
url: "https://example.invalid/text"
author: "Author"
publisher: "Publisher"
date_published: 2026-04-18
date_ingested: 2026-04-18
aliases: ["Text Source"]
sources: []
tags: []
created: 2026-04-18
updated: 2026-04-18
status: active
confidence: 1.0
---

# Text Source
MD
  )
  jq -n \
    --arg path "/tmp/test-project/vault/wiki/_sources/text-source.md" \
    --arg content "$content" \
    '{tool_name:"Write", tool_input:{file_path:$path, content:$content}}' >"$json_file"

  run_hook_with_json "scripts/validate-attachments.sh" "$json_file"

  assert_success
  assert_output_empty
}

@test "validate-attachments: blocks non-text source missing attachment_path" {
  local json_file="$BATS_TEST_TMPDIR/input.json"
  local content
  content=$(cat <<'MD'
---
title: "Image Source"
type: source
source_type: article
source_format: image
url: "https://example.invalid/image"
author: "Author"
publisher: "Publisher"
date_published: 2026-04-18
date_ingested: 2026-04-18
extracted_at: 2026-04-18
aliases: ["Image Source"]
sources: []
tags: []
created: 2026-04-18
updated: 2026-04-18
status: active
confidence: 1.0
---

# Image Source
MD
  )
  jq -n \
    --arg path "/tmp/test-project/vault/wiki/_sources/image-source.md" \
    --arg content "$content" \
    '{tool_name:"Write", tool_input:{file_path:$path, content:$content}}' >"$json_file"

  run_hook_with_json "scripts/validate-attachments.sh" "$json_file"

  assert_success
  assert_output_contains '"decision":"block"'
  assert_output_contains "no attachment_path"
}

@test "validate-attachments: blocks non-text source with missing file on disk" {
  # Use a real vault_root under the tmpdir so attachment existence check runs.
  local proj="$BATS_TEST_TMPDIR/proj"
  mkdir -p "$proj/vault/raw/assets"
  # Deliberately do NOT create the referenced attachment file.

  local json_file="$BATS_TEST_TMPDIR/input.json"
  local content
  content=$(cat <<'MD'
---
title: "Image Source"
type: source
source_type: article
source_format: image
attachment_path: "raw/assets/does-not-exist.png"
url: "https://example.invalid/image"
author: "Author"
publisher: "Publisher"
date_published: 2026-04-18
date_ingested: 2026-04-18
extracted_at: 2026-04-18
aliases: ["Image Source"]
sources: []
tags: []
created: 2026-04-18
updated: 2026-04-18
status: active
confidence: 1.0
---

# Image Source
MD
  )
  jq -n \
    --arg path "$proj/vault/wiki/_sources/image-source.md" \
    --arg content "$content" \
    '{tool_name:"Write", tool_input:{file_path:$path, content:$content}}' >"$json_file"

  run_hook_with_json "scripts/validate-attachments.sh" "$json_file"

  assert_success
  assert_output_contains '"decision":"block"'
  assert_output_contains "does not exist"
}

@test "validate-attachments: passes when attachment file exists" {
  local proj="$BATS_TEST_TMPDIR/proj"
  mkdir -p "$proj/vault/raw/assets"
  : >"$proj/vault/raw/assets/real.png"

  local json_file="$BATS_TEST_TMPDIR/input.json"
  local content
  content=$(cat <<'MD'
---
title: "Image Source"
type: source
source_type: article
source_format: image
attachment_path: "raw/assets/real.png"
url: "https://example.invalid/image"
author: "Author"
publisher: "Publisher"
date_published: 2026-04-18
date_ingested: 2026-04-18
extracted_at: 2026-04-18
aliases: ["Image Source"]
sources: []
tags: []
created: 2026-04-18
updated: 2026-04-18
status: active
confidence: 1.0
---

# Image Source
MD
  )
  jq -n \
    --arg path "$proj/vault/wiki/_sources/image-source.md" \
    --arg content "$content" \
    '{tool_name:"Write", tool_input:{file_path:$path, content:$content}}' >"$json_file"

  run_hook_with_json "scripts/validate-attachments.sh" "$json_file"

  assert_success
  assert_output_empty
}

# ── Phase 3: Bun-absent fail-CLOSED (hook-gates) ──────────────────────────────
# A non-text source with a missing/dangling attachment is a provenance-integrity
# failure, so this SECURITY gate BLOCKS when Bun is absent — scoped to in-scope
# source notes (<vault>/wiki/_sources/*.md). Other paths still pass.

_path_without_bun_va() {
  local tooldir="$BATS_TEST_TMPDIR/nobun-bin"
  mkdir -p "$tooldir"
  local t src
  for t in bash jq cat grep sed dirname basename env awk tr head find; do
    src=$(command -v "$t" 2>/dev/null || true)
    [ -n "$src" ] && ln -sf "$src" "$tooldir/$t"
  done
  printf '%s' "$tooldir"
}

@test "validate-attachments: FAIL-CLOSED — Bun absent blocks a source-note write" {
  local tooldir
  tooldir=$(_path_without_bun_va)
  run bash -c "PATH='$tooldir' command -v bun"
  assert_status 1
  local json='{"tool_name":"Write","tool_input":{"file_path":"/tmp/test-project/vault/wiki/_sources/img.md","content":"---\ntype: source\nsource_format: image\n---\n# I"}}'
  run bash -c "export CLAUDE_WIKI_PAGES_VAULT=vault; export PATH='$tooldir'; printf '%s' '$json' | '$tooldir/bash' '$REPO_ROOT/scripts/validate-attachments.sh'"
  assert_success
  assert_output_contains '"decision":"block"'
  assert_output_contains "Bun is required"
}

@test "validate-attachments: FAIL-CLOSED — Bun absent passes through non-source paths" {
  local tooldir
  tooldir=$(_path_without_bun_va)
  local json='{"tool_name":"Write","tool_input":{"file_path":"/tmp/test-project/vault/wiki/topics/x.md","content":"x"}}'
  run bash -c "export CLAUDE_WIKI_PAGES_VAULT=vault; export PATH='$tooldir'; printf '%s' '$json' | '$tooldir/bash' '$REPO_ROOT/scripts/validate-attachments.sh'"
  assert_success
  assert_output_empty
}

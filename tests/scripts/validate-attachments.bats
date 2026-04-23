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

  [ "$status" -eq 0 ]
  [ -z "$output" ]
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

  [ "$status" -eq 0 ]
  [[ "$output" == *'"decision":"block"'* ]]
  [[ "$output" == *"no attachment_path"* ]]
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

  [ "$status" -eq 0 ]
  [[ "$output" == *'"decision":"block"'* ]]
  [[ "$output" == *"does not exist"* ]]
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

  [ "$status" -eq 0 ]
  [ -z "$output" ]
}

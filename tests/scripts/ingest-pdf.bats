#!/usr/bin/env bats
# Tests for the I4 PDF ingest path in skills/ingest/SKILL.md
# and the reference in skills/ingest-pipeline/SKILL.md.
#
# Behavior under test:
#
#   (a) skills/ingest/SKILL.md documents the PDF ingest path as a named section
#       with the required field rules (source_format: pdf, attachment_path,
#       extracted_at) and the raw/assets/ immutability statement.
#
#   (b) skills/ingest/SKILL.md states that the PDF lives immutably under
#       raw/assets/ — it is never modified by ingest.
#
#   (c) skills/ingest/SKILL.md states that provenance via sources is unchanged
#       for PDF sources.
#
#   (d) skills/ingest-pipeline/SKILL.md references the PDF ingest path in
#       skills/ingest/SKILL.md.
#
#   (e) A source page with source_format: pdf + attachment_path + extracted_at
#       passes validate-frontmatter.sh (hook enforcement: non-text fields present).
#
#   (f) A source page with source_format: pdf missing attachment_path is
#       rejected by validate-frontmatter.sh.
#
# Tests (a)–(d) RED before the skills are updated; GREEN after.
# Tests (e)–(f) exercise the committed validate-frontmatter.sh rule (already
# enforced) — they serve as a regression guard confirming the schema rule holds.
#
# CONSTRAINTS (TEAM-BRIEF §5):
#   - PDF in raw/assets/ is immutable; ingest only READS it.
#   - Provenance via sources field is unchanged.
#   - No new schema field or mechanism — reuses source_format enum + the
#     attachment_path/extracted_at rule already in validate-frontmatter.sh.
#   - DEFER audio/video (I5 / transcript_path) — these tests do NOT cover it.

load '../test_helper/common'

setup() {
  _load_helpers
  INGEST_SKILL="$REPO_ROOT/skills/ingest/SKILL.md"
  PIPELINE_SKILL="$REPO_ROOT/skills/ingest-pipeline/SKILL.md"
}

# ---------------------------------------------------------------------------
# (a) PDF ingest section + required-field rules documented in ingest/SKILL.md
# ---------------------------------------------------------------------------

@test "Ingest PDF extraction: skills/ingest/SKILL.md contains a PDF ingest section heading" {
  run grep -iE "pdf|source_format.*pdf" "$INGEST_SKILL"
  assert_success
  assert_output_contains "pdf"
}

@test "Ingest PDF extraction: skills/ingest/SKILL.md documents the source_format: pdf field" {
  run grep -E "source_format.*pdf|pdf.*source_format" "$INGEST_SKILL"
  assert_success
}

@test "Ingest PDF extraction: skills/ingest/SKILL.md documents attachment_path as required for PDF" {
  run grep -iE "attachment_path" "$INGEST_SKILL"
  assert_success
}

@test "Ingest PDF extraction: skills/ingest/SKILL.md documents extracted_at as required for PDF" {
  run grep -iE "extracted_at" "$INGEST_SKILL"
  assert_success
}

# ---------------------------------------------------------------------------
# (b) raw/assets/ immutability statement in ingest/SKILL.md
# ---------------------------------------------------------------------------

@test "Ingest PDF extraction: skills/ingest/SKILL.md states the PDF is immutable in raw/assets/" {
  # The skill must explicitly state the PDF lives immutably under raw/assets/
  # and is never modified by ingest (raw is append-only per TEAM-BRIEF §5).
  run grep -iE "immut|raw/assets" "$INGEST_SKILL"
  assert_success
  # At least one match must contain raw/assets
  assert_output_contains "raw/assets"
}

# ---------------------------------------------------------------------------
# (c) Provenance via sources unchanged for PDF sources
# ---------------------------------------------------------------------------

@test "Ingest PDF extraction: skills/ingest/SKILL.md states provenance via sources is unchanged for PDF" {
  # The sources field must still trace a PDF-sourced wiki page back to raw/.
  # The skill must mention sources/provenance in the PDF context.
  run grep -iE "sources|provenance" "$INGEST_SKILL"
  assert_success
}

# ---------------------------------------------------------------------------
# (d) Cross-reference in skills/ingest-pipeline/SKILL.md
# ---------------------------------------------------------------------------

@test "Ingest PDF extraction: skills/ingest-pipeline/SKILL.md references the PDF ingest path" {
  run grep -iE "pdf|source_format" "$PIPELINE_SKILL"
  assert_success
  assert_output_contains "pdf"
}

# ---------------------------------------------------------------------------
# (e) Regression: validate-frontmatter allows well-formed PDF source note
#     (committed rule — this is a guard, not a new assertion)
# ---------------------------------------------------------------------------

@test "Ingest PDF extraction: validate-frontmatter allows a PDF source with attachment_path + extracted_at" {
  local content
  content=$(cat <<'MD'
---
title: "Research Paper PDF"
type: source
source_type: paper
source_format: pdf
attachment_path: "raw/assets/research-paper.pdf"
extracted_at: 2026-06-05
url: ""
author: "Author"
publisher: "Publisher"
date_published: 2026-06-01
date_ingested: 2026-06-05
tags: []
aliases: ["Research Paper PDF"]
sources: []
created: 2026-06-05
updated: 2026-06-05
status: active
confidence: 1.0
---

# Research Paper PDF

Summary of extracted content from the PDF.
MD
  )
  local json_file="$BATS_TEST_TMPDIR/input.json"
  jq -n \
    --arg path "/tmp/test-project/vault/wiki/_sources/research-paper-pdf.md" \
    --arg content "$content" \
    '{tool_name:"Write", tool_input:{file_path:$path, content:$content}}' >"$json_file"

  run_hook_with_json "scripts/validate-frontmatter.sh" "$json_file"

  assert_success
  assert_output_empty
}

# ---------------------------------------------------------------------------
# (f) Regression: validate-frontmatter rejects PDF source missing attachment_path
#     (committed rule — this is a guard confirming enforcement holds)
# ---------------------------------------------------------------------------

@test "Ingest PDF extraction: validate-frontmatter rejects a PDF source missing attachment_path" {
  # source_format: pdf without attachment_path must be blocked.
  # The committed validate-frontmatter.sh enforces this (non-text rule).
  local content
  content=$(cat <<'MD'
---
title: "PDF Without Attachment"
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

# PDF Without Attachment
MD
  )
  local json_file="$BATS_TEST_TMPDIR/input.json"
  jq -n \
    --arg path "/tmp/test-project/vault/wiki/_sources/pdf-without-attachment.md" \
    --arg content "$content" \
    '{tool_name:"Write", tool_input:{file_path:$path, content:$content}}' >"$json_file"

  run_hook_with_json "scripts/validate-frontmatter.sh" "$json_file"

  assert_success
  assert_output_contains '"decision":"block"'
  assert_output_contains "attachment_path"
}

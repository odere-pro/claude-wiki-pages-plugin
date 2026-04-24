#!/usr/bin/env bats
# Tests for scripts/verify-ingest.sh
#
# Behavior under test:
#   - Exit 0 on a vault that passes all checks.
#   - Exit 1 on:
#       * duplicate [[wikilinks]] in wiki/index.md
#       * plain-string sources: entries (not [[wikilinks]])
#       * topic folders missing _index.md
#   - Warn (but not error) on orphan source summaries — the script emits
#     "WARN: Orphan source:" but still exits 0 unless other errors fire.
#
# All tests run against a fresh copy of tests/fixtures/minimal-vault/.

load '../test_helper/common'

setup() {
  _load_helpers
  setup_fixture_vault
}

teardown() {
  teardown_fixture_vault
}

@test "verify-ingest: passes on minimal-vault fixture" {
  run bash "$SCRIPTS_DIR/verify-ingest.sh" --target "$FIXTURE_VAULT"

  assert_success
  # Pin each CHECK by its green success line, not just the final summary —
  # otherwise a mutation that silences an individual check still passes.
  assert_output_contains "schema_version"
  assert_output_contains "No duplicates in index.md"
  assert_output_contains "All sources fields use [[wikilinks]]"
  assert_output_contains "_index.md checked"
  assert_output_contains "All checks passed"
}

@test "verify-ingest: fails on duplicate index entries" {
  local index="$FIXTURE_VAULT/wiki/index.md"
  # Inject a duplicate [[Sample Entity]] link alongside the existing one.
  printf '\n\n- [[Sample Entity]] — duplicate entry that should trip the check.\n' >>"$index"

  run bash "$SCRIPTS_DIR/verify-ingest.sh" --target "$FIXTURE_VAULT"

  assert_status 1
  assert_output_contains "Duplicate"
  assert_output_contains "Sample Entity"
}

@test "verify-ingest: fails on plain-string source" {
  local entity="$FIXTURE_VAULT/wiki/topics/sample-entity.md"
  # Replace the [[wikilink]] sources list with a plain-string list.
  # BSD sed and GNU sed both accept this syntax.
  sed -i.bak 's|sources: \["\[\[Sample\]\]"\]|sources: ["Sample"]|' "$entity"
  rm -f "${entity}.bak"

  run bash "$SCRIPTS_DIR/verify-ingest.sh" --target "$FIXTURE_VAULT"

  assert_status 1
  assert_output_contains "Plain string in sources"
}

@test "verify-ingest: fails on missing _index.md in topic folder" {
  rm -f "$FIXTURE_VAULT/wiki/topics/_index.md"

  run bash "$SCRIPTS_DIR/verify-ingest.sh" --target "$FIXTURE_VAULT"

  assert_status 1
  assert_output_contains "no _index.md"
}

@test "verify-ingest: warns on orphan source summary" {
  # Add a second source summary that no wiki page cites.
  cat >"$FIXTURE_VAULT/wiki/_sources/orphan.md" <<'MD'
---
title: "Orphan Source"
type: source
source_type: article
source_format: text
url: "https://example.invalid/orphan"
author: "No One"
publisher: "Nowhere"
date_published: 2026-04-18
date_ingested: 2026-04-18
aliases: ["Orphan Source"]
sources: []
tags: []
created: 2026-04-18
updated: 2026-04-18
status: active
confidence: 1.0
---

# Orphan Source

Not referenced by any wiki page.
MD

  run bash "$SCRIPTS_DIR/verify-ingest.sh" --target "$FIXTURE_VAULT"

  # Script treats orphan sources as warnings, not errors — exit 0 is correct.
  assert_success
  assert_output_contains "Orphan source"
  assert_output_contains "Orphan Source"
}

@test "verify-ingest: fails when index.md missing" {
  rm -f "$FIXTURE_VAULT/wiki/index.md"

  run bash "$SCRIPTS_DIR/verify-ingest.sh" --target "$FIXTURE_VAULT"

  assert_status 1
  assert_output_contains "index.md not found"
}

@test "verify-ingest: fails when _index.md children refer to missing pages" {
  local index="$FIXTURE_VAULT/wiki/topics/_index.md"
  # Replace the "Sample Entity" child with a nonexistent title. Use awk since
  # the line contains quotes and brackets that sed -i handles unevenly
  # across BSD/GNU.
  awk '
    /^children:/ { print; in_children=1; next }
    in_children && /^  - "\[\[Sample Entity\]\]"/ { print "  - \"[[Missing Page]]\""; next }
    in_children && !/^  -/ { in_children=0 }
    { print }
  ' "$index" >"$index.new"
  mv "$index.new" "$index"

  run bash "$SCRIPTS_DIR/verify-ingest.sh" --target "$FIXTURE_VAULT"

  assert_status 1
  assert_output_contains "Index lists"
  assert_output_contains "Missing Page"
}

@test "verify-ingest: exits 1 with helpful message when vault dir missing" {
  run bash "$SCRIPTS_DIR/verify-ingest.sh" --target "/nonexistent/vault/does-not-exist"

  assert_status 1
  assert_output_contains "not found"
  assert_output_contains "/nonexistent/vault/does-not-exist"
}

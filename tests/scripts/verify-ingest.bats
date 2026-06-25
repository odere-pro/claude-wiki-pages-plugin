#!/usr/bin/env bats
# Tests for scripts/verify-ingest.sh
#
# Behavior under test:
#   - Exit 0 on a vault that passes all checks.
#   - Exit 1 on:
#       * duplicate [[wikilinks]] in wiki/index.md
#       * plain-string sources: entries (not [[wikilinks]])
#       * topic folders missing an index file (folder note or legacy _index.md)
#   - Warn (but not error) on orphan source summaries — the script emits
#     "WARN: Orphan source:" but still exits 0 unless other errors fire.
#   - Folder notes (schema v3): the fixture's per-folder index is the folder
#     note wiki/topics/topics.md; the legacy _index.md name is still accepted,
#     and at schema_version >= 3 it draws the legacy-index-filename WARN.
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

@test "Verify: passes on the minimal-vault fixture" {
  run bash "$SCRIPTS_DIR/verify-ingest.sh" --target "$FIXTURE_VAULT"

  assert_success
  # Pin each CHECK by its green success line, not just the final summary —
  # otherwise a mutation that silences an individual check still passes.
  assert_output_contains "schema_version"
  assert_output_contains "No duplicates in index.md"
  assert_output_contains "All sources fields use [[wikilinks]]"
  assert_output_contains "topics/topics.md checked"
  assert_output_contains "All checks passed"
}

@test "Verify: accepts a legacy _index.md name, warning at schema_version 3 but exiting 0" {
  # Rename the folder note back to the legacy name — still a valid index file.
  mv "$FIXTURE_VAULT/wiki/topics/topics.md" "$FIXTURE_VAULT/wiki/topics/_index.md"

  run bash "$SCRIPTS_DIR/verify-ingest.sh" --target "$FIXTURE_VAULT"

  # Still passes (warning severity, not error) and CHECK 3 still runs on it.
  assert_success
  assert_output_contains "topics/_index.md checked"
  assert_output_contains "legacy-index-filename"
  assert_output_contains "migrate --write"
}

@test "Verify: emits no legacy-index-filename WARN on a v2 vault, keeping back-compat clean" {
  mv "$FIXTURE_VAULT/wiki/topics/topics.md" "$FIXTURE_VAULT/wiki/topics/_index.md"
  sed -i.bak 's/`schema_version: 3`/`schema_version: 2`/' "$FIXTURE_VAULT/CLAUDE.md"
  rm -f "$FIXTURE_VAULT/CLAUDE.md.bak"

  run bash "$SCRIPTS_DIR/verify-ingest.sh" --target "$FIXTURE_VAULT"

  assert_success
  refute_output_contains "legacy-index-filename"
}

@test "Verify: fails on duplicate index entries" {
  local index="$FIXTURE_VAULT/wiki/index.md"
  # Inject a duplicate [[Sample Entity]] link alongside the existing one.
  printf '\n\n- [[Sample Entity]] — duplicate entry that should trip the check.\n' >>"$index"

  run bash "$SCRIPTS_DIR/verify-ingest.sh" --target "$FIXTURE_VAULT"

  assert_status 1
  assert_output_contains "Duplicate"
  assert_output_contains "Sample Entity"
}

@test "Verify: fails on a plain-string source" {
  local entity="$FIXTURE_VAULT/wiki/topics/sample-entity.md"
  # Replace the [[wikilink]] sources list with a plain-string list.
  # BSD sed and GNU sed both accept this syntax.
  sed -i.bak 's|sources: \["\[\[Sample\]\]"\]|sources: ["Sample"]|' "$entity"
  rm -f "${entity}.bak"

  run bash "$SCRIPTS_DIR/verify-ingest.sh" --target "$FIXTURE_VAULT"

  assert_status 1
  assert_output_contains "Plain string in sources"
}

@test "Verify: fails on a missing index file in a topic folder" {
  rm -f "$FIXTURE_VAULT/wiki/topics/topics.md"

  run bash "$SCRIPTS_DIR/verify-ingest.sh" --target "$FIXTURE_VAULT"

  assert_status 1
  assert_output_contains "no index file"
}

@test "Verify: warns on an orphan source summary" {
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

@test "Verify: fails when index.md is missing" {
  rm -f "$FIXTURE_VAULT/wiki/index.md"

  run bash "$SCRIPTS_DIR/verify-ingest.sh" --target "$FIXTURE_VAULT"

  assert_status 1
  assert_output_contains "index.md not found"
}

@test "Verify: fails when folder-note children refer to missing pages" {
  local index="$FIXTURE_VAULT/wiki/topics/topics.md"
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

@test "Verify: exits 1 with a helpful message when the vault dir is missing" {
  run bash "$SCRIPTS_DIR/verify-ingest.sh" --target "/nonexistent/vault/does-not-exist"

  assert_status 1
  assert_output_contains "not found"
  assert_output_contains "/nonexistent/vault/does-not-exist"
}

# ──────────────────────────────────────────────────────────────────────────────
# S4-derivation: staleness from updated vs newest cited-source date (CHECK 4)
# ──────────────────────────────────────────────────────────────────────────────

@test "Verify: warns when a wiki page predates a cited source" { # spec S4
  # Give the source a newer updated: date than the wiki page that cites it.
  # sample-entity.md has updated: 2026-04-18; set sample.md updated: 2026-05-01.
  local source_file="$FIXTURE_VAULT/wiki/_sources/sample.md"
  sed -i.bak 's/^updated: 2026-04-18/updated: 2026-05-01/' "$source_file"
  rm -f "${source_file}.bak"

  run bash "$SCRIPTS_DIR/verify-ingest.sh" --target "$FIXTURE_VAULT"

  # WARN-level: exit 0 (no errors), but warning text present.
  assert_success
  assert_output_contains "stale-source"
  assert_output_contains "Sample Entity"
}

@test "Verify: stays clean when a wiki page is newer than all cited sources" { # spec S4
  # sample-entity.md updated: 2026-04-18, sample.md updated: 2026-04-18 — same
  # date is not stale (not strictly newer). Set wiki page to be clearly newer.
  local entity_file="$FIXTURE_VAULT/wiki/topics/sample-entity.md"
  sed -i.bak 's/^updated: 2026-04-18/updated: 2026-06-01/' "$entity_file"
  rm -f "${entity_file}.bak"

  run bash "$SCRIPTS_DIR/verify-ingest.sh" --target "$FIXTURE_VAULT"

  assert_success
  refute_output_contains "stale-source"
}

@test "Verify: a dangling cited source is labelled rather than treated as fresh" { # spec S4
  # Replace the sources entry in sample-entity.md with a wikilink that does not
  # resolve to any file in _sources/.
  local entity_file="$FIXTURE_VAULT/wiki/topics/sample-entity.md"
  sed -i.bak 's|sources: \["\[\[Sample\]\]"\]|sources: ["[[Nonexistent Source]]"]|' "$entity_file"
  rm -f "${entity_file}.bak"

  run bash "$SCRIPTS_DIR/verify-ingest.sh" --target "$FIXTURE_VAULT"

  # Must not crash (exit 0 or exit 1 for other errors, but the dangling-source
  # condition itself is a WARN, not an error). The key requirement is that the
  # dangling case is labelled and does NOT suppress a "stale-source" warning
  # (i.e., it never silently counts as "fresh").
  assert_output_contains "dangling-source"
  assert_output_contains "Nonexistent Source"
  # No crash: must have printed at least the Summary header.
  assert_output_contains "Summary"
}

# ──────────────────────────────────────────────────────────────────────────────
# I3: provenance-completeness checks (CHECK 5)
# ──────────────────────────────────────────────────────────────────────────────

@test "Verify: an entity with no sources is an ERROR" { # spec I3
  local entity_file="$FIXTURE_VAULT/wiki/topics/sample-entity.md"
  # Remove all sources entries — replace the sources list with an empty array.
  sed -i.bak 's|sources: \["\[\[Sample\]\]"\]|sources: []|' "$entity_file"
  rm -f "${entity_file}.bak"

  run bash "$SCRIPTS_DIR/verify-ingest.sh" --target "$FIXTURE_VAULT"

  assert_status 1
  assert_output_contains "no-sources"
  assert_output_contains "Sample Entity"
}

@test "Verify: a malformed source entry counts as present so it is not double-flagged" { # spec I3
  # A plain-string source entry is already caught by CHECK 2 (sources-format).
  # The presence check (I3) must NOT also fire, because there IS 1 entry present.
  local entity_file="$FIXTURE_VAULT/wiki/topics/sample-entity.md"
  sed -i.bak 's|sources: \["\[\[Sample\]\]"\]|sources: ["not-a-link"]|' "$entity_file"
  rm -f "${entity_file}.bak"

  run bash "$SCRIPTS_DIR/verify-ingest.sh" --target "$FIXTURE_VAULT"

  # CHECK 2 fires for the malformed source — exit 1.
  assert_status 1
  assert_output_contains "Plain string in sources"
  # But provenance-completeness must NOT also fire for this page.
  refute_output_contains "no-sources"
}

@test "Verify: a derived:true entity with confidence >= 0.8 is a WARN" { # spec I3
  local entity_file="$FIXTURE_VAULT/wiki/topics/sample-entity.md"
  # Set derived: true and confidence: 0.85 on the page (keeping the source entry so
  # provenance-completeness does not fire — this test isolates the consistency check).
  sed -i.bak 's/^confidence: 0\.9/confidence: 0.85/' "$entity_file"
  rm -f "${entity_file}.bak"
  # Append derived: true to the frontmatter (before the closing ---).
  # Use awk to insert the field safely.
  awk '
    /^---$/ && count++ == 1 { print "derived: true"; print; next }
    { print }
  ' "$entity_file" >"${entity_file}.new"
  mv "${entity_file}.new" "$entity_file"

  run bash "$SCRIPTS_DIR/verify-ingest.sh" --target "$FIXTURE_VAULT"

  # WARN-level: script exits 0 (no errors), but warning text is present.
  assert_success
  assert_output_contains "derived-high-confidence"
  assert_output_contains "Sample Entity"
}

@test "Verify: a derived:true entity with confidence < 0.8 is clean" { # spec I3
  local entity_file="$FIXTURE_VAULT/wiki/topics/sample-entity.md"
  # Set derived: true and confidence: 0.7 — below the threshold, so no warning.
  sed -i.bak 's/^confidence: 0\.9/confidence: 0.7/' "$entity_file"
  rm -f "${entity_file}.bak"
  awk '
    /^---$/ && count++ == 1 { print "derived: true"; print; next }
    { print }
  ' "$entity_file" >"${entity_file}.new"
  mv "${entity_file}.new" "$entity_file"

  run bash "$SCRIPTS_DIR/verify-ingest.sh" --target "$FIXTURE_VAULT"

  assert_success
  refute_output_contains "derived-high-confidence"
}

# ──────────────────────────────────────────────────────────────────────────────
# FU1 (ADR-0028): dangling-wikilink WARN check
# ──────────────────────────────────────────────────────────────────────────────

@test "Verify: stays clean when all wikilinks resolve" { # spec FU1
  # The minimal-vault fixture has only resolvable [[wikilinks]] — no dangling.
  run bash "$SCRIPTS_DIR/verify-ingest.sh" --target "$FIXTURE_VAULT"

  assert_success
  refute_output_contains "dangling-wikilink"
  assert_output_contains "No dangling wikilinks found"
}

@test "Verify: warns on a dangling [[Ghost]] wikilink in a topic page" { # spec FU1
  local page="$FIXTURE_VAULT/wiki/topics/sample-entity.md"
  # Append a dangling wikilink to the body.
  printf '\n[[Ghost Page]] is referenced here.\n' >>"$page"

  run bash "$SCRIPTS_DIR/verify-ingest.sh" --target "$FIXTURE_VAULT"

  # WARN severity: exit 0 (no errors), but warning present.
  assert_success
  assert_output_contains "dangling-wikilink"
  assert_output_contains "Ghost Page"
}

@test "Verify: bookkeeping pages are not scanned as subjects" { # spec FU1
  # Add a dangling link to index.md — a bookkeeping page; must produce no finding.
  local idx="$FIXTURE_VAULT/wiki/index.md"
  printf '\n- [[Totally Missing Page]]\n' >>"$idx"

  run bash "$SCRIPTS_DIR/verify-ingest.sh" --target "$FIXTURE_VAULT"

  # The index.md addition makes the INDEX check emit a "page not found" warn,
  # but there must be NO dangling-wikilink warn from the bookkeeping page.
  refute_output_contains "dangling-wikilink: [[Totally Missing Page]]"
}

@test "Verify: reports one finding per page and distinct-normalized-target so a repeated link counts once" { # spec FU1
  local page="$FIXTURE_VAULT/wiki/topics/sample-entity.md"
  # Append the same dangling target three times — must produce ONE warning.
  printf '\n[[Repeating Ghost]] and [[Repeating Ghost]] and [[Repeating Ghost]].\n' >>"$page"

  run bash "$SCRIPTS_DIR/verify-ingest.sh" --target "$FIXTURE_VAULT"

  assert_success
  # Count lines containing "Repeating Ghost"
  local count
  count=$(printf '%s\n' "$output" | grep -c "Repeating Ghost" || true)
  assert_eq "$count" "1"
}

@test "Verify: an alias resolves the link so there is no false dangling warning" { # spec FU1
  local page="$FIXTURE_VAULT/wiki/topics/sample-entity.md"
  # "sample-entity" is an alias on sample-entity.md; linking it must not be flagged.
  printf '\nSee [[sample-entity]] for details.\n' >>"$page"

  run bash "$SCRIPTS_DIR/verify-ingest.sh" --target "$FIXTURE_VAULT"

  assert_success
  # The alias link must not appear in dangling output.
  refute_output_contains "dangling-wikilink: [[sample-entity]]"
}

@test "Verify: a multi-line flow sources array is parsed so there is no false no-sources flag" { # spec I3
  local page="$FIXTURE_VAULT/wiki/topics/sample-entity.md"
  # Rewrite the inline sources to the multi-line flow array shape the ingest
  # pipeline actually emits. The old grep/awk parser could not read this and
  # falsely flagged the page as having no sources.
  bun -e "
const fs = require('fs');
const p = process.argv[1];
const t = fs.readFileSync(p, 'utf8').replaceAll('sources: [\"[[Sample]]\"]', 'sources:\n  [\n    \"[[Sample]]\",\n  ]');
fs.writeFileSync(p, t);
" "$page"

  run bash "$SCRIPTS_DIR/verify-ingest.sh" --target "$FIXTURE_VAULT"

  assert_success
  refute_output_contains 'no-sources: "Sample Entity"'
}

@test "Verify: a wikilink inside an inline code span is not flagged dangling" { # spec FU1
  local page="$FIXTURE_VAULT/wiki/topics/sample-entity.md"
  # A `[[Target]]` written as a documentation example inside backticks is not a
  # real Obsidian link, so it must not be reported as dangling.
  printf '\nDocumentation example: write `[[Ghost In Code]]` to link a page.\n' >>"$page"

  run bash "$SCRIPTS_DIR/verify-ingest.sh" --target "$FIXTURE_VAULT"

  assert_success
  refute_output_contains "Ghost In Code"
}

@test "Verify: a wikilink inside a fenced code block is not flagged dangling" { # spec FU1
  local page="$FIXTURE_VAULT/wiki/topics/sample-entity.md"
  printf '\n```\n[[Ghost In Fence]]\n```\n' >>"$page"

  run bash "$SCRIPTS_DIR/verify-ingest.sh" --target "$FIXTURE_VAULT"

  assert_success
  refute_output_contains "Ghost In Fence"
}

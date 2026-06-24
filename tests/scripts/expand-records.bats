#!/usr/bin/env bats
# Tests for scripts/expand-records.sh — structured record fan-out (ADR-0036, #57).
#
# Behaviors under test:
#   - Declares strict mode (set -euo pipefail).
#   - Skips gracefully when wiki/ is absent, or required args are missing.
#   - Dry-run (default) writes nothing.
#   - --apply fans out one page per record + hub folder-notes under the topic.
#   - Per-record pages carry a parent spine (record → hub → topic) and nested
#     taxonomy tags (family/<x>, severity/<x>, principle/<x>) — no wikilinks.
#   - The output is born tree-shaped: strict-tree-reduce reports 0 changes.
#   - Idempotent: a second --apply creates 0 new pages.

load '../test_helper/common'

SCRIPT="$REPO_ROOT/scripts/expand-records.sh"

setup() {
  _load_helpers
  VAULT="$BATS_TEST_TMPDIR/vault"
  mkdir -p "$VAULT/wiki/concepts" "$VAULT/raw"
  # Minimal ROOT + topic folder note so the spine reaches index.md.
  cat >"$VAULT/wiki/index.md" <<'EOF'
---
title: Wiki Index
type: index
aliases: ["Wiki Index", "ROOT"]
parent: ""
path: ""
children: []
child_indexes: ["[[concepts|Concepts]]"]
created: 2026-06-24
updated: 2026-06-24
---
# Index
EOF
  cat >"$VAULT/wiki/concepts/concepts.md" <<'EOF'
---
title: Concepts
type: index
aliases: ["concepts"]
parent: "[[index|Wiki Index]]"
path: concepts
children: []
child_indexes: []
created: 2026-06-24
updated: 2026-06-24
---
# Concepts
EOF
  cp "$REPO_ROOT/tests/fixtures/records.json" "$VAULT/raw/records.json"
}

teardown() {
  rm -rf "$VAULT"
}

@test "expand-records: script declares set -euo pipefail (strict mode)" {
  run grep -qE '^set -euo pipefail' "$SCRIPT"
  assert_success
}

@test "expand-records: skips gracefully when wiki/ is absent" {
  local empty="$BATS_TEST_TMPDIR/empty"
  mkdir -p "$empty"
  run bash "$SCRIPT" --target "$empty" --source raw/records.json --topic concepts
  assert_success
  assert_output_contains "no wiki/"
}

@test "expand-records: errors when --source is missing" {
  run bash "$SCRIPT" --target "$VAULT" --topic concepts
  assert_success
  assert_output_contains "--source is required"
}

@test "expand-records: errors when --topic is missing" {
  run bash "$SCRIPT" --target "$VAULT" --source raw/records.json
  assert_success
  assert_output_contains "--topic is required"
}

@test "expand-records: dry-run writes nothing" {
  command -v bun >/dev/null 2>&1 || skip "bun not available"
  run bash "$SCRIPT" --target "$VAULT" --source raw/records.json --topic concepts
  assert_success
  refute [ -f "$VAULT/wiki/concepts/solid-principles/srp.md" ]
}

@test "expand-records: --apply fans out per-record pages + hub folder-notes" {
  command -v bun >/dev/null 2>&1 || skip "bun not available"
  run bash "$SCRIPT" --target "$VAULT" --source raw/records.json --topic concepts --apply
  assert_success
  # Hub folder-notes
  assert [ -f "$VAULT/wiki/concepts/solid-principles/solid-principles.md" ]
  assert [ -f "$VAULT/wiki/concepts/code-smells/code-smells.md" ]
  # Per-record pages
  assert [ -f "$VAULT/wiki/concepts/solid-principles/srp.md" ]
  assert [ -f "$VAULT/wiki/concepts/code-smells/god-object.md" ]
}

@test "expand-records: --apply creates the cited source note (provenance resolves)" {
  command -v bun >/dev/null 2>&1 || skip "bun not available"
  run bash "$SCRIPT" --target "$VAULT" --source raw/records.json --topic concepts --apply
  assert_success
  # The source summary the per-record pages cite in `sources:` must exist,
  # so the provenance links do not dangle.
  assert [ -f "$VAULT/wiki/_sources/records.md" ]
  run grep -E '^type: source' "$VAULT/wiki/_sources/records.md"
  assert_success
  run grep -F 'sources: ["[[records|Records]]"]' "$VAULT/wiki/concepts/solid-principles/srp.md"
  assert_success
}

@test "expand-records: per-record page carries the parent spine and nested tags" {
  command -v bun >/dev/null 2>&1 || skip "bun not available"
  run bash "$SCRIPT" --target "$VAULT" --source raw/records.json --topic concepts --apply
  assert_success
  # parent → hub folder note (spine)
  run grep -F 'parent: "[[solid-principles|Solid Principles]]"' "$VAULT/wiki/concepts/solid-principles/srp.md"
  assert_success
  # slash-nested taxonomy tags, not wikilinks
  run grep -E '^tags:.*family/oop' "$VAULT/wiki/concepts/solid-principles/srp.md"
  assert_success
  run grep -E '^tags:.*severity/high' "$VAULT/wiki/concepts/solid-principles/srp.md"
  assert_success
}

@test "expand-records: output is born tree-shaped (strict-tree-reduce changes 0 files)" {
  command -v bun >/dev/null 2>&1 || skip "bun not available"
  command -v jq >/dev/null 2>&1 || skip "jq not available"
  bash "$SCRIPT" --target "$VAULT" --source raw/records.json --topic concepts --apply >/dev/null
  run bash "$REPO_ROOT/scripts/strict-tree-reduce.sh" --target "$VAULT" --json
  assert_success
  assert_eq "$(printf '%s' "$output" | jq -r '.filesChanged')" "0"
}

@test "expand-records: deterministic — date stamp derives from source mtime, --date overrides" {
  command -v bun >/dev/null 2>&1 || skip "bun not available"
  # Pin the source file's mtime; the stamp must derive from it, not the clock.
  touch -t 202601151200 "$VAULT/raw/records.json"
  bash "$SCRIPT" --target "$VAULT" --source raw/records.json --topic concepts --apply >/dev/null
  run grep -E '^created: 2026-01-15' "$VAULT/wiki/concepts/solid-principles/srp.md"
  assert_success
  # --date wins over mtime.
  rm -rf "$VAULT/wiki/concepts/solid-principles" "$VAULT/wiki/concepts/code-smells" "$VAULT/wiki/_sources"
  bash "$SCRIPT" --target "$VAULT" --source raw/records.json --topic concepts --date 2030-03-03 --apply >/dev/null
  run grep -E '^created: 2030-03-03' "$VAULT/wiki/concepts/solid-principles/srp.md"
  assert_success
}

@test "expand-records: idempotent — a second --apply creates 0 new pages" {
  command -v bun >/dev/null 2>&1 || skip "bun not available"
  command -v jq >/dev/null 2>&1 || skip "jq not available"
  bash "$SCRIPT" --target "$VAULT" --source raw/records.json --topic concepts --apply >/dev/null
  run bash "$SCRIPT" --target "$VAULT" --source raw/records.json --topic concepts --apply --json
  assert_success
  assert_eq "$(printf '%s' "$output" | jq -r '.pagesNew')" "0"
}

@test "expand-records: output is born MOC-reachable (verify-ingest reports 0 warnings)" {
  command -v bun >/dev/null 2>&1 || skip "bun not available"
  bash "$SCRIPT" --target "$VAULT" --source raw/records.json --topic concepts --apply >/dev/null
  run bash "$REPO_ROOT/scripts/verify-ingest.sh" --target "$VAULT"
  # Hubs list their records and the topic folder note lists the hubs, so every
  # generated page is reachable from index.md — no MOC warnings (not just
  # strict-tree-clean, but born verify-clean).
  assert_output_contains "Warnings: 0"
  refute_output_contains "not reachable from index.md"
  refute_output_contains "empty children list"
}

@test "expand-records: hub note lists its records; topic note lists the hubs (MOC spine)" {
  command -v bun >/dev/null 2>&1 || skip "bun not available"
  bash "$SCRIPT" --target "$VAULT" --source raw/records.json --topic concepts --apply >/dev/null
  # Hub children: includes its records.
  run grep -F '[[srp|Single Responsibility Principle]]' "$VAULT/wiki/concepts/solid-principles/solid-principles.md"
  assert_success
  # Topic folder note child_indexes: gains the new hubs (append-only update).
  run grep -F '[[solid-principles|Solid Principles]]' "$VAULT/wiki/concepts/concepts.md"
  assert_success
}

@test "expand-records: each record carries the topic-slug tag (schema 3-6 tag policy)" {
  command -v bun >/dev/null 2>&1 || skip "bun not available"
  bash "$SCRIPT" --target "$VAULT" --source raw/records.json --topic concepts --apply >/dev/null
  run grep -E '^tags:.*"concepts"' "$VAULT/wiki/concepts/solid-principles/srp.md"
  assert_success
}

@test "expand-records: --relation-fields maps cross-record relations to nested tags" {
  command -v bun >/dev/null 2>&1 || skip "bun not available"
  cat >"$VAULT/raw/smells.json" <<'EOF'
[
  {"id":"god-object","name":"God Object","category":"code-smells","family":"oop","corrective_patterns":["facade","extract-class"]}
]
EOF
  bash "$SCRIPT" --target "$VAULT" --source raw/smells.json --topic concepts --relation-fields corrective_patterns --apply >/dev/null
  run grep -E '^tags:.*corrective_patterns/facade' "$VAULT/wiki/concepts/code-smells/god-object.md"
  assert_success
  run grep -E '^tags:.*corrective_patterns/extract-class' "$VAULT/wiki/concepts/code-smells/god-object.md"
  assert_success
}

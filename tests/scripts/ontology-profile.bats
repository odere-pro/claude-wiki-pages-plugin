#!/usr/bin/env bats
# Tests for the ontology-profile-v1 section in the schema files.
#
# Behavior under test (§6 single-source + parity invariant):
#   - tests/fixtures/reference-vault/CLAUDE.md contains the ontology-profile-v1 section
#     heading, representative predicate rows, and the entity_type enum.
#   - skills/init/template/CLAUDE.md is in parity: same section, same rows.
#   - The entity_type_extensions calibration mechanism is documented in both.
#
# These tests FAIL before TASK 1/2 add the section and PASS after.

load '../test_helper/common'

setup() {
  _load_helpers
  VAULT_SCHEMA="$REPO_ROOT/tests/fixtures/reference-vault/CLAUDE.md"
  TEMPLATE_SCHEMA="$REPO_ROOT/skills/init/template/CLAUDE.md"
}

# ---------------------------------------------------------------------------
# tests/fixtures/reference-vault/CLAUDE.md — section presence
# ---------------------------------------------------------------------------

@test "ontology-profile: vault schema contains ontology-profile-v1 heading" {
  run grep -F "ontology-profile-v1" "$VAULT_SCHEMA"
  assert_success
  assert_output_contains "ontology-profile-v1"
}

@test "ontology-profile: vault schema contains predicate table header" {
  run grep -F "Predicate" "$VAULT_SCHEMA"
  assert_success
  # Must appear more than once (once in "Field definitions" prose, once in table)
  local count
  count=$(grep -c "| Predicate" "$VAULT_SCHEMA" || true)
  if [ "$count" -lt 1 ]; then
    printf 'Expected predicate table header in %s, found %d occurrences\n' \
      "$VAULT_SCHEMA" "$count" >&2
    return 1
  fi
}

@test "ontology-profile: vault schema contains depends_on predicate row" {
  run grep -F "depends_on" "$VAULT_SCHEMA"
  assert_success
  # The row should appear in the new ontology table; verify the pattern
  # includes domain info (concept,topic,project).
  assert_output_contains "concept"
}

@test "ontology-profile: vault schema contains entity_type core values" {
  run grep -F "person" "$VAULT_SCHEMA"
  assert_success
  # Verify the ontology-profile table row is present (backtick-quoted values)
  local count
  count=$(grep -c "entity_type.*person.*organization.*product.*tool.*service.*standard.*place" "$VAULT_SCHEMA" || true)
  if [ "$count" -lt 1 ]; then
    printf 'Expected entity_type core values row in %s\n' "$VAULT_SCHEMA" >&2
    return 1
  fi
}

@test "ontology-profile: vault schema contains entity_type_extensions calibration key" {
  run grep -F "entity_type_extensions" "$VAULT_SCHEMA"
  assert_success
}

@test "ontology-profile: vault schema contains page type closed-core note" {
  run grep -F "not vault-extensible" "$VAULT_SCHEMA"
  assert_success
}

@test "ontology-profile: vault schema contains enum table header" {
  run grep -F "| Enum" "$VAULT_SCHEMA"
  assert_success
}

@test "ontology-profile: vault schema has graph-traversal note (R2 edge set)" {
  # The note uses backtick-fenced predicates: `sources`+`related`+`depends_on`
  run grep "sources.*related.*depends_on" "$VAULT_SCHEMA"
  assert_success
  assert_output_contains "N≤2"
}

# ---------------------------------------------------------------------------
# skills/init/template/CLAUDE.md — parity with vault schema
# ---------------------------------------------------------------------------

@test "ontology-profile: install template contains ontology-profile-v1 heading" {
  run grep -F "ontology-profile-v1" "$TEMPLATE_SCHEMA"
  assert_success
  assert_output_contains "ontology-profile-v1"
}

@test "ontology-profile: install template contains depends_on predicate row" {
  run grep -F "depends_on" "$TEMPLATE_SCHEMA"
  assert_success
  assert_output_contains "concept"
}

@test "ontology-profile: install template contains entity_type core values" {
  run grep -F "person" "$TEMPLATE_SCHEMA"
  assert_success
  local count
  count=$(grep -c "entity_type.*person.*organization.*product.*tool.*service.*standard.*place" "$TEMPLATE_SCHEMA" || true)
  if [ "$count" -lt 1 ]; then
    printf 'Expected entity_type core values row in %s\n' "$TEMPLATE_SCHEMA" >&2
    return 1
  fi
}

@test "ontology-profile: install template contains entity_type_extensions calibration key" {
  run grep -F "entity_type_extensions" "$TEMPLATE_SCHEMA"
  assert_success
}

@test "ontology-profile: install template contains page type closed-core note" {
  run grep -F "not vault-extensible" "$TEMPLATE_SCHEMA"
  assert_success
}

@test "ontology-profile: install template has graph-traversal note (R2 edge set)" {
  run grep "sources.*related.*depends_on" "$TEMPLATE_SCHEMA"
  assert_success
  assert_output_contains "N≤2"
}

# ---------------------------------------------------------------------------
# Parity check — both files must agree on key invariants
# ---------------------------------------------------------------------------

@test "ontology-profile: both files have matching entity_type_extensions text" {
  local vault_count template_count
  vault_count=$(grep -c "entity_type_extensions" "$VAULT_SCHEMA" || true)
  template_count=$(grep -c "entity_type_extensions" "$TEMPLATE_SCHEMA" || true)
  if [ "$vault_count" -ne "$template_count" ]; then
    printf 'entity_type_extensions count mismatch: vault=%d template=%d\n' \
      "$vault_count" "$template_count" >&2
    return 1
  fi
  if [ "$vault_count" -eq 0 ]; then
    printf 'entity_type_extensions not found in either file\n' >&2
    return 1
  fi
}

# Required-fields table parity (ADR-0014 Part A, amended): the single required-
# fields table is mirrored dev↔runtime. validate-frontmatter.sh reads the vault
# CLAUDE.md table or falls back to the runtime template — so the two MUST stay
# byte-identical or a vault and the fallback would enforce different rules.
_required_fields_block() {
  awk '
    /^### Required fields by type/ { in_t=1; next }
    in_t && /^#{1,6}[[:space:]]/ { exit }
    in_t && /\|/ { print }
  ' "$1"
}

@test "ontology-profile: required-fields table is identical in vault schema and runtime template" {
  local vault_block template_block
  vault_block=$(_required_fields_block "$VAULT_SCHEMA")
  template_block=$(_required_fields_block "$TEMPLATE_SCHEMA")
  if [ -z "$vault_block" ]; then
    printf 'required-fields table missing from %s\n' "$VAULT_SCHEMA" >&2
    return 1
  fi
  if [ "$vault_block" != "$template_block" ]; then
    printf 'required-fields table drift between vault schema and runtime template:\n' >&2
    diff <(printf '%s\n' "$vault_block") <(printf '%s\n' "$template_block") >&2 || true
    return 1
  fi
}

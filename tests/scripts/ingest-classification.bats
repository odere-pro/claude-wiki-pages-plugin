#!/usr/bin/env bats
# Tests for the I1 classification checklist in skills/ingest/SKILL.md
# and its cross-reference in skills/ingest-pipeline/SKILL.md.
#
# Behavior under test (§6 single-enum invariant):
#
#   (a) skills/ingest/SKILL.md contains the classification checklist and
#       references "ontology-profile-v1" and "vault/CLAUDE.md" as the
#       authoritative enum source.
#
#   (b) The checklist in skills/ingest/SKILL.md does NOT inline a duplicate
#       page-type / entity_type enum list (guard against a second copy that
#       would drift from the single source in docs/vault-example/CLAUDE.md).
#
#   (c) skills/ingest-pipeline/SKILL.md cross-references the classification
#       checklist in skills/ingest/SKILL.md.
#
# These tests FAIL before I1 adds the checklist and PASS after.

load '../test_helper/common'

setup() {
  _load_helpers
  INGEST_SKILL="$REPO_ROOT/skills/ingest/SKILL.md"
  PIPELINE_SKILL="$REPO_ROOT/skills/ingest-pipeline/SKILL.md"
}

# ---------------------------------------------------------------------------
# (a) Checklist presence + enum-source pointer
# ---------------------------------------------------------------------------

@test "Ingest classification: skills/ingest/SKILL.md contains the classification checklist heading" {
  run grep -iF "classification checklist" "$INGEST_SKILL"
  assert_success
  assert_output_contains "Classification"
}

@test "Ingest classification: skills/ingest/SKILL.md references ontology-profile-v1 as the enum source" {
  run grep -F "ontology-profile-v1" "$INGEST_SKILL"
  assert_success
  assert_output_contains "ontology-profile-v1"
}

@test "Ingest classification: skills/ingest/SKILL.md references vault/CLAUDE.md as the enum authority" {
  run grep -F "vault/CLAUDE.md" "$INGEST_SKILL"
  assert_success
  assert_output_contains "vault/CLAUDE.md"
}

@test "Ingest classification: skills/ingest/SKILL.md addresses out-of-enum handling so the classifier never invents a value" {
  # The checklist must instruct the classifier to direct an out-of-enum item to
  # the closest legal type or flag it — never invent an out-of-enum value.
  run grep -iE "out.of.enum|closest legal|never invent|flag" "$INGEST_SKILL"
  assert_success
}

@test "Ingest classification: skills/ingest/SKILL.md preserves provenance by requiring sources on classified pages" {
  # The checklist must state that classified pages still require sources.
  run grep -iE "sources|provenance" "$INGEST_SKILL"
  assert_success
}

# ---------------------------------------------------------------------------
# (b) No-duplicate-enum guard — the checklist must NOT inline a second copy
# ---------------------------------------------------------------------------

@test "Ingest classification: skills/ingest/SKILL.md does NOT inline a duplicate page-type enum list" {
  # The §6 invariant: the enum lives ONLY in ontology-profile-v1 in
  # vault/CLAUDE.md. A second copy here would drift.
  # We guard against a table or list that restates ALL core page types
  # together: source,entity,concept,topic,project,synthesis,index
  # Strategy: no single line should contain 5+ of the closed page types.
  local ingest_skill="$INGEST_SKILL"
  local bad_line
  bad_line=$(grep -E "(source|entity|concept|topic|project|synthesis|index)" "$ingest_skill" \
    | grep -vE "^---$|^name:|^description:|^allowed-tools:|^disable-model-invocation:" \
    | awk '{
        count = 0
        if ($0 ~ /\bsource\b/)    count++
        if ($0 ~ /\bentity\b/)    count++
        if ($0 ~ /\bconcept\b/)   count++
        if ($0 ~ /\btopic\b/)     count++
        if ($0 ~ /\bproject\b/)   count++
        if ($0 ~ /\bsynthesis\b/) count++
        if ($0 ~ /\bindex\b/)     count++
        if (count >= 5) print
      }' || true)
  if [ -n "$bad_line" ]; then
    printf 'FAIL: Found a line that appears to inline the page-type enum (5+ type names):\n%s\n' \
      "$bad_line" >&2
    return 1
  fi
}

@test "Ingest classification: skills/ingest/SKILL.md does NOT inline a duplicate entity_type enum list" {
  # Guard against restating the entity_type core values inline.
  # A line that contains 5+ of: person,organization,product,tool,service,standard,place
  # is a red flag for an inlined duplicate.
  local ingest_skill="$INGEST_SKILL"
  local bad_line
  bad_line=$(grep -E "(person|organization|product|tool|service|standard|place)" "$ingest_skill" \
    | awk '{
        count = 0
        if ($0 ~ /\bperson\b/)       count++
        if ($0 ~ /\borganization\b/) count++
        if ($0 ~ /\bproduct\b/)      count++
        if ($0 ~ /\btool\b/)         count++
        if ($0 ~ /\bservice\b/)      count++
        if ($0 ~ /\bstandard\b/)     count++
        if ($0 ~ /\bplace\b/)        count++
        if (count >= 5) print
      }' || true)
  if [ -n "$bad_line" ]; then
    printf 'FAIL: Found a line that appears to inline the entity_type enum (5+ type names):\n%s\n' \
      "$bad_line" >&2
    return 1
  fi
}

# ---------------------------------------------------------------------------
# (c) Cross-reference in skills/ingest-pipeline/SKILL.md
# ---------------------------------------------------------------------------

@test "Ingest classification: skills/ingest-pipeline/SKILL.md cross-references the classification checklist" {
  run grep -iE "classification|ingest.*SKILL|skills/ingest" "$PIPELINE_SKILL"
  assert_success
  assert_output_contains "classification"
}

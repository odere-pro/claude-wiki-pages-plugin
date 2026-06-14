#!/usr/bin/env bats
# Tests for scripts/lint-vocabulary.sh — S3-vocabulary opt-in controlled-vocabulary freshness checker.
#
# Behavior under test:
#   1. Orphaned-entry: a _vocabulary.md group whose canonical/variants appear in
#      NO wiki page → status 1, "WARN", names the orphaned form.
#   2. Tag usage-floor (N=2 default): singleton tag → status 1, names it;
#      re-run with --min-tag-usage 1 → singleton NOT flagged (named constant, not magic number).
#   3. Fully-unreferenced group: ALL forms absent from the wiki → status 1,
#      names the group ONCE by its canonical form (not one line per variant).
#   4. Clean/no-false-positive: reference vault docs/vault-example verbatim →
#      assert_success, no WARN.
#      Absent-_vocabulary.md case → assert_success + info line.
#   5. Determinism: same injected vault run twice → byte-identical output.
#
# All tests run against a fresh temp vault derived from tests/fixtures/minimal-vault/.
# Each test that needs a violation injects it into the copy.

load '../test_helper/common'

setup() {
  _load_helpers
  setup_fixture_vault
}

teardown() {
  teardown_fixture_vault
}

# ---------------------------------------------------------------------------
# Helper: write a vocabulary file into the fixture vault.
# Usage: _write_vocab "canonical1" "var1,var2" "canonical2" "var3"
# Each pair of args = canonical and comma-separated variants for one group.
# ---------------------------------------------------------------------------
_write_vocab_file() {
  local vocab_path="$FIXTURE_VAULT/_vocabulary.md"
  printf -- '---\ntitle: "Fixture Vocabulary"\ngroups:\n' >"$vocab_path"
  while [ $# -ge 2 ]; do
    local canonical="$1"
    local variants_csv="$2"
    shift 2
    printf '  - canonical: "%s"\n    variants: [' "$canonical" >>"$vocab_path"
    local first=1
    IFS=',' read -ra vars <<<"$variants_csv"
    for v in "${vars[@]}"; do
      if [ "$first" -eq 1 ]; then
        printf '"%s"' "$v" >>"$vocab_path"
        first=0
      else
        printf ', "%s"' "$v" >>"$vocab_path"
      fi
    done
    printf ']\n' >>"$vocab_path"
  done
  printf -- '---\n' >>"$vocab_path"
}

# ---------------------------------------------------------------------------
# Helper: write a minimal wiki page into the fixture vault wiki/topics/.
# ---------------------------------------------------------------------------
_write_wiki_page() {
  local stem="$1"
  local title="$2"
  local tags="$3"
  local aliases="$4"
  local body="$5"
  mkdir -p "$FIXTURE_VAULT/wiki/topics"
  cat >"$FIXTURE_VAULT/wiki/topics/${stem}.md" <<EOF
---
title: "${title}"
type: concept
aliases: ${aliases}
parent: "[[Topics -- Index]]"
path: "topics"
sources: ["[[Sample]]"]
related: []
tags: ${tags}
created: 2026-04-18
updated: 2026-04-18
update_count: 1
status: active
confidence: 0.7
---

# ${title}

${body}
EOF
}

# ---------------------------------------------------------------------------
# Case 1: Orphaned vocabulary entry — canonical/variants appear in NO wiki page.
# The "orphaned" group has a canonical form that matches no page at all.
# ---------------------------------------------------------------------------

@test "lint-vocabulary: WARN when vocabulary form appears in no wiki page (orphaned entry)" {
  # Vocabulary: one group totally absent, one group present in the wiki.
  _write_vocab_file \
    "totally-absent-term" "also-absent,never-used" \
    "sample entity" "sample-entity"

  # Ensure "sample entity" appears in a wiki page so that group is NOT flagged.
  _write_wiki_page "page-with-sample" "Sample Entity Page" '["concept"]' \
    '["Sample Entity Page"]' "This page mentions sample entity in its body."

  run bash "$SCRIPTS_DIR/lint-vocabulary.sh" --target "$FIXTURE_VAULT"

  assert_status 1
  assert_output_contains "WARN"
  assert_output_contains "totally-absent-term"
  # The referenced group must NOT be flagged.
  refute_output_contains "sample-entity"
}

# ---------------------------------------------------------------------------
# Case 2: Tag usage-floor — singleton tag flagged at N=2 default; NOT flagged
# at --min-tag-usage 1.
# ---------------------------------------------------------------------------

@test "lint-vocabulary: WARN for singleton tag at default floor (N=2), cleared at --min-tag-usage 1" {
  # Vocabulary: two groups, each with a single canonical form that also appears
  # as a tag on wiki pages. No variants are used — keeping forms = tags avoids
  # false orphan-form WARNs.
  _write_vocab_file \
    "shared-tag" "" \
    "singleton-tag" ""

  # Write two pages: shared-tag appears on both (>=2); singleton-tag on only one.
  _write_wiki_page "page-a" "Page A" '["shared-tag", "singleton-tag"]' \
    '["Page A"]' "Body of page A."
  _write_wiki_page "page-b" "Page B" '["shared-tag"]' \
    '["Page B"]' "Body of page B."

  # Default floor (N=2): singleton-tag used by 1 page -> should WARN.
  run bash "$SCRIPTS_DIR/lint-vocabulary.sh" --target "$FIXTURE_VAULT"
  assert_status 1
  assert_output_contains "WARN"
  assert_output_contains "singleton-tag"
  # shared-tag appears on 2 pages -> must NOT be flagged.
  refute_output_contains "shared-tag"

  # Explicit floor N=1: even a singleton is acceptable -> must NOT flag singleton-tag.
  run bash "$SCRIPTS_DIR/lint-vocabulary.sh" --target "$FIXTURE_VAULT" --min-tag-usage 1
  assert_success
  refute_output_contains "singleton-tag"
}

# ---------------------------------------------------------------------------
# Case 3: Fully-unreferenced group — ALL forms absent from wiki.
# The group is reported ONCE by its canonical form, not once per variant.
# ---------------------------------------------------------------------------

@test "lint-vocabulary: fully-unreferenced group reported once by canonical, not once per variant" {
  # Vocabulary: a group with several variants (none in wiki) + a referenced group.
  _write_vocab_file \
    "ghost-concept" "ghost-variant-one,ghost-variant-two,ghost-variant-three" \
    "sample entity" "sample-entity"

  # Ensure "sample entity" appears so it's not flagged.
  _write_wiki_page "page-present" "Sample Entity Page" '["concept"]' \
    '["Sample Entity Page"]' "This page mentions sample entity in its body."

  run bash "$SCRIPTS_DIR/lint-vocabulary.sh" --target "$FIXTURE_VAULT"

  assert_status 1
  assert_output_contains "WARN"
  assert_output_contains "ghost-concept"

  # Must NOT emit one line per variant — the group is reported by canonical only.
  local warn_count
  warn_count=$(printf '%s\n' "$output" | grep -c "ghost-concept" || true)
  if [ "$warn_count" -gt 1 ]; then
    printf 'Expected 1 WARN for "ghost-concept", got %d\n' "$warn_count" >&2
    printf 'output:\n%s\n' "$output" >&2
    return 1
  fi

  # Variants must NOT appear as separate WARN lines.
  refute_output_contains "ghost-variant-one"
  refute_output_contains "ghost-variant-two"
  refute_output_contains "ghost-variant-three"
}

# ---------------------------------------------------------------------------
# Case 4a: Clean — reference vault docs/vault-example passes with no WARNs.
# The vocabulary in docs/vault-example/_vocabulary.md has all groups
# referenced in the wiki (ensured by the curated vocabulary file there).
# ---------------------------------------------------------------------------

@test "lint-vocabulary: reference vault docs/vault-example passes with no WARNs" {
  run bash "$SCRIPTS_DIR/lint-vocabulary.sh" --target "$REPO_ROOT/docs/vault-example"

  assert_success
  refute_output_contains "WARN"
}

# ---------------------------------------------------------------------------
# Case 4b: Absent _vocabulary.md -> exit 0 + info line (EMPTY_LEXICON no-throw path).
# ---------------------------------------------------------------------------

@test "lint-vocabulary: absent _vocabulary.md exits 0 with info line" {
  # No vocabulary file in the fixture (setup does not create one).
  rm -f "$FIXTURE_VAULT/_vocabulary.md"

  run bash "$SCRIPTS_DIR/lint-vocabulary.sh" --target "$FIXTURE_VAULT"

  assert_success
  # Must emit some informational output, not silently succeed.
  assert_output_contains "INFO"
}

# ---------------------------------------------------------------------------
# Case 5: Determinism — same injected vault run twice -> byte-identical output.
# ---------------------------------------------------------------------------

@test "lint-vocabulary: deterministic output across two runs" {
  # Vocabulary with one orphaned group to produce non-trivial output.
  _write_vocab_file \
    "absent-term" "absent-variant" \
    "sample entity" "sample-entity"

  _write_wiki_page "page-ref" "Sample Entity Page" '["concept"]' \
    '["Sample Entity Page"]' "This page mentions sample entity."

  run bash "$SCRIPTS_DIR/lint-vocabulary.sh" --target "$FIXTURE_VAULT"
  local first_output="$output"
  local first_status="$status"

  run bash "$SCRIPTS_DIR/lint-vocabulary.sh" --target "$FIXTURE_VAULT"
  local second_output="$output"
  local second_status="$status"

  assert_eq "$first_status" "$second_status"
  assert_eq "$first_output" "$second_output"
}

# ---------------------------------------------------------------------------
# Case 6: Injection resistance — vault path passed via argv, not JS interpolation.
# A vault path containing shell-special characters must NOT break the script
# or leak code into the Bun JS string. The vault is copied into a subdir whose
# name contains a single-quote, backslash, and dollar sign to exercise the
# argv-passing boundary.
# ---------------------------------------------------------------------------

@test "lint-vocabulary: vault path with shell-special chars does not break or inject" {
  # Create a subdirectory with shell-special chars in its name.
  # (The path is passed via argv, so no quoting in the JS string is needed.)
  local special_vault
  special_vault="$BATS_TEST_TMPDIR/vault-special'\$test"
  cp -r "$FIXTURE_VAULT" "$special_vault"

  # Absent _vocabulary.md -> exit 0 + INFO line (no injection, no crash).
  rm -f "$special_vault/_vocabulary.md"

  run bash "$SCRIPTS_DIR/lint-vocabulary.sh" --target "$special_vault"

  assert_success
  assert_output_contains "INFO"
  # Must not produce any JS error output indicating code execution.
  refute_output_contains "SyntaxError"
  refute_output_contains "process.exit"
}

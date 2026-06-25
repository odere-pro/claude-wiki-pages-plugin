#!/usr/bin/env bats
# Tests for the I2 alias-aware two-pass dedup procedure documented in
# skills/ingest/SKILL.md (dedup step) and cross-referenced from
# skills/ingest-pipeline/SKILL.md.
#
# Behavior under test:
#
#   (a) PROCEDURE PRESENCE — skills/ingest/SKILL.md documents both dedup passes:
#       pass 1 = exact title match; pass 2 = alias-aware match.
#
#   (b) EXTEND-NOT-DUPLICATE — the skill states that an alias match EXTENDS the
#       existing page (adds the new source, increments update_count, advances
#       updated) rather than creating a duplicate.
#
#   (c) ADDITIVE MERGE / SOURCES PRESERVED — the skill explicitly states the
#       merge is additive: existing sources are never dropped or overwritten.
#
#   (d) DETERMINISTIC ONLY — no fuzzy/embedding similarity; only
#       exact title or alias string match is used (§5 non-negotiable).
#
#   (e) SINGLE SOURCE OF TRUTH — the dedup step states "one page per concept"
#       (the DRY invariant from TEAM-BRIEF.md §5).
#
#   (f) PIPELINE CROSS-REFERENCE — skills/ingest-pipeline/SKILL.md references
#       the two-pass dedup from skills/ingest/SKILL.md.
#
# These tests FAIL before I2 documents the procedure and PASS after.

load '../test_helper/common'

setup() {
  _load_helpers
  INGEST_SKILL="$REPO_ROOT/skills/ingest/SKILL.md"
  PIPELINE_SKILL="$REPO_ROOT/skills/ingest-pipeline/SKILL.md"
}

# ---------------------------------------------------------------------------
# (a) Procedure presence — both passes must be documented
# ---------------------------------------------------------------------------

@test "ingest-dedup: skills/ingest/SKILL.md documents a two-pass existence check" {
  # The dedup section must name both passes explicitly (pass 1 and pass 2, or
  # "first pass" / "second pass", or equivalent ordered language).
  run grep -iE "pass 1|pass 2|first.pass|second.pass|two.pass" "$INGEST_SKILL"
  assert_success
}

@test "ingest-dedup: skills/ingest/SKILL.md documents pass 1 as exact title match" {
  # Pass 1 checks the extracted concept against existing page titles.
  run grep -iE "pass 1|first.pass" "$INGEST_SKILL"
  assert_success
  # The text around pass 1 must mention title (exact match anchor).
  run grep -iE "(exact|title).*(pass 1|first.pass)|(pass 1|first.pass).*(exact|title)" "$INGEST_SKILL"
  assert_success
}

@test "ingest-dedup: skills/ingest/SKILL.md documents pass 2 as alias-aware match" {
  # Pass 2 checks the extracted concept against existing pages' aliases fields.
  run grep -iE "(alias|aliases).*(pass 2|second.pass)|(pass 2|second.pass).*(alias|aliases)" "$INGEST_SKILL"
  assert_success
}

@test "ingest-dedup: skills/ingest/SKILL.md references the aliases field as the synonym store" {
  # The procedure must explicitly name the frontmatter aliases field as the
  # source of synonyms checked in pass 2.
  run grep -iE "\baliases\b" "$INGEST_SKILL"
  assert_success
  assert_output_contains "aliases"
}

# ---------------------------------------------------------------------------
# (b) Extend-not-duplicate: alias match → EXTEND, never create new page
# ---------------------------------------------------------------------------

@test "ingest-dedup: skills/ingest/SKILL.md states alias match extends the existing page" {
  # When pass 2 finds an alias match the skill must say to extend/update the
  # existing page, not create a new one.
  run grep -iE "(alias.*match|match.*alias).*(extend|update)" "$INGEST_SKILL"
  assert_success
}

@test "ingest-dedup: skills/ingest/SKILL.md explicitly forbids creating a duplicate on alias match" {
  # The procedure must state "never create a duplicate" (or equivalent) when
  # an alias match is found — the DRY invariant made alias-aware.
  run grep -iE "never.*(creat|duplicat)|not.*(creat|duplicat)" "$INGEST_SKILL"
  assert_success
}

@test "ingest-dedup: skills/ingest/SKILL.md requires adding the new source to sources on extension" {
  # When extending via alias match, the new source must be added to the page's
  # sources field — the merge must touch sources explicitly.
  run grep -iE "(alias|extend).*(add.*source|source.*add)" "$INGEST_SKILL"
  assert_success
}

@test "ingest-dedup: skills/ingest/SKILL.md requires incrementing update_count on extension" {
  # The alias-match extension must increment update_count (same as any ingest
  # extension — ingest rules step 8 in vault/CLAUDE.md).
  run grep -iF "update_count" "$INGEST_SKILL"
  assert_success
}

# ---------------------------------------------------------------------------
# (c) Additive merge — existing sources are preserved, never dropped
# ---------------------------------------------------------------------------

@test "ingest-dedup: skills/ingest/SKILL.md states the merge is additive" {
  # The procedure must use the word "additive" (or "never drop", "preserves
  # existing", "append") to make the non-destructive merge intent explicit.
  run grep -iE "additive|never.*(drop|lose|overwrite|remove).*sources?|preserves?.*(existing.*sources?|sources?.*existing)" "$INGEST_SKILL"
  assert_success
}

@test "ingest-dedup: skills/ingest/SKILL.md forbids dropping or losing existing sources" {
  # Cross-check: the word "sources" must appear near the merge/additive language.
  run grep -iE "(merge|additive|extend).*(sources?|provenance)" "$INGEST_SKILL"
  assert_success
}

# ---------------------------------------------------------------------------
# (d) Deterministic only — no fuzzy/embedding similarity
# ---------------------------------------------------------------------------

@test "ingest-dedup: skills/ingest/SKILL.md restricts dedup to deterministic match only" {
  # The procedure must state it uses only exact string matching (title or alias)
  # — no fuzzy match, no embedding similarity.
  run grep -iE "deterministic|exact.*(title|alias|string)|(title|alias|string).*exact" "$INGEST_SKILL"
  assert_success
}

@test "ingest-dedup: skills/ingest/SKILL.md does NOT mention fuzzy or embedding similarity" {
  # Guard against introducing a fuzzy/vector approach that violates §5.
  run grep -iE "fuzzy|embed(ding)?|vector|similarity.score|cosine" "$INGEST_SKILL"
  # This grep should find NOTHING — the test passes when exit code is non-zero.
  if [ "${status:-0}" -eq 0 ]; then
    printf 'FAIL: Found fuzzy/embedding language in skills/ingest/SKILL.md (violates §5):\n%s\n' \
      "$output" >&2
    return 1
  fi
  return 0
}

# ---------------------------------------------------------------------------
# (e) DRY / single-source-of-truth statement
# ---------------------------------------------------------------------------

@test "ingest-dedup: skills/ingest/SKILL.md states one page per concept (DRY)" {
  # The dedup section (or the skill overall) must state the DRY invariant:
  # one page per concept / entity.
  run grep -iE "one.*(page|entry).*(concept|entity)|DRY|single.sourc" "$INGEST_SKILL"
  assert_success
}

# ---------------------------------------------------------------------------
# (f) Cross-reference in skills/ingest-pipeline/SKILL.md
# ---------------------------------------------------------------------------

@test "ingest-dedup: skills/ingest-pipeline/SKILL.md references the two-pass dedup" {
  # The pipeline skill must mention dedup and point to skills/ingest/SKILL.md
  # (or 'ingest skill') so agents reading the pipeline know where the procedure
  # is defined.
  run grep -iE "two.pass|alias.aware|dedup" "$PIPELINE_SKILL"
  assert_success
}

@test "ingest-dedup: skills/ingest-pipeline/SKILL.md links back to skills/ingest/SKILL.md for dedup" {
  # The reference must name the source skill file, not just describe dedup
  # inline — keeping the procedure DRY (one authoritative location).
  run grep -iE "skills/ingest|ingest/SKILL" "$PIPELINE_SKILL"
  assert_success
}

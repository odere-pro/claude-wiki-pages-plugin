#!/usr/bin/env bats
# Tests for the Pc local-ingest-stub documented in skills/draft/SKILL.md.
#
# Behavior under test (decision #7 — draft-only now; quality-gated progression):
#
#   (a) skills/draft/SKILL.md documents the `ingest-extract` capability tier.
#
#   (b) skills/draft/SKILL.md states that local-ingest-stub output is routed
#       ONLY to `_proposed/` — never directly to `wiki/`.
#
#   (c) skills/draft/SKILL.md documents the `proposed_by` provenance field
#       (e.g. `proposed_by: "ollama:llama3"`) that records the local model.
#
#   (d) skills/draft/SKILL.md documents that promotion uses the existing
#       `/claude-wiki-pages:review` gate (`propose approve`) and does NOT
#       introduce a second write path.
#
#   (e) skills/draft/SKILL.md cross-references skills/review/SKILL.md's
#       `_proposed/` contract.
#
#   (f) skills/draft/SKILL.md states that the stub is scoped to the
#       `ingest-extract` tier only — local-model scope is NOT widened
#       beyond `ingest-extract` (decision #7 tier-scoping).
#
# These tests FAIL before the `local-ingest-stub` / `ingest-extract` section
# is added to skills/draft/SKILL.md and PASS after (TDD RED→GREEN).

load '../test_helper/common'

setup() {
  _load_helpers
  DRAFT_SKILL="$REPO_ROOT/skills/draft/SKILL.md"
  REVIEW_SKILL="$REPO_ROOT/skills/review/SKILL.md"
}

# ---------------------------------------------------------------------------
# (a) ingest-extract capability tier documented
# ---------------------------------------------------------------------------

@test "local-ingest-stub: skills/draft/SKILL.md documents the ingest-extract capability tier" {
  run grep -iF "ingest-extract" "$DRAFT_SKILL"
  assert_success
  assert_output_contains "ingest-extract"
}

@test "local-ingest-stub: skills/draft/SKILL.md mentions capability tier" {
  run grep -iE "capability.tier|tier.*ingest" "$DRAFT_SKILL"
  assert_success
}

# ---------------------------------------------------------------------------
# (b) _proposed/-only routing — never wiki/ directly
# ---------------------------------------------------------------------------

@test "local-ingest-stub: skills/draft/SKILL.md states output goes to _proposed/ only" {
  run grep -F "_proposed/" "$DRAFT_SKILL"
  assert_success
  assert_output_contains "_proposed/"
}

@test "local-ingest-stub: skills/draft/SKILL.md states the stub never writes wiki/ directly" {
  # The doc must contain a negative statement: "never" or "not" near "wiki/"
  run grep -iE "never.*wiki/|not.*wiki/|wiki/.*never|wiki/.*not.*(directly|write)" "$DRAFT_SKILL"
  assert_success
}

# ---------------------------------------------------------------------------
# (c) proposed_by provenance
# ---------------------------------------------------------------------------

@test "local-ingest-stub: skills/draft/SKILL.md documents proposed_by frontmatter field" {
  run grep -F "proposed_by" "$DRAFT_SKILL"
  assert_success
  assert_output_contains "proposed_by"
}

@test "local-ingest-stub: skills/draft/SKILL.md shows a proposed_by example with a local model (e.g. ollama:*)" {
  run grep -E 'proposed_by.*ollama|ollama.*proposed_by|proposed_by.*"[a-z]+:[a-z]' "$DRAFT_SKILL"
  assert_success
}

# ---------------------------------------------------------------------------
# (d) Promotion via the existing review gate — no second write path
# ---------------------------------------------------------------------------

@test "local-ingest-stub: skills/draft/SKILL.md references the review gate for promotion" {
  run grep -iE "propose.approve|review.*gate|/claude-wiki-pages:review" "$DRAFT_SKILL"
  assert_success
}

@test "local-ingest-stub: skills/draft/SKILL.md states propose approve is the promotion path" {
  run grep -iE "propose.*approve|approve.*propose" "$DRAFT_SKILL"
  assert_success
}

@test "local-ingest-stub: skills/draft/SKILL.md does NOT introduce a second write channel" {
  # Guard: the doc must not say local-ingest writes directly to wiki/.
  # Strategy: ensure "write" near "wiki/" appears only in a negative context.
  # We check there is no unconditional "writes to wiki/" (without "not" or "never").
  local bad_line
  bad_line=$(grep -iE "writes.*(directly to|to).*wiki/" "$DRAFT_SKILL" \
    | grep -viE "never|not|only.*_proposed|_proposed.*only" || true)
  if [ -n "$bad_line" ]; then
    printf 'FAIL: Found a line that may document a direct wiki/ write path:\n%s\n' "$bad_line" >&2
    return 1
  fi
}

# ---------------------------------------------------------------------------
# (e) Cross-reference to skills/review/SKILL.md
# ---------------------------------------------------------------------------

@test "local-ingest-stub: skills/draft/SKILL.md cross-references skills/review/SKILL.md" {
  run grep -iE "skills/review/SKILL\.md|review/SKILL|skills/review" "$DRAFT_SKILL"
  assert_success
}

# ---------------------------------------------------------------------------
# (f) Tier-scoped to ingest-extract only — scope not widened beyond it
# ---------------------------------------------------------------------------

@test "local-ingest-stub: skills/draft/SKILL.md states local-model scope is limited to ingest-extract" {
  # The doc must contain language that scopes the local model to ingest-extract.
  run grep -iE "scoped.*ingest.extract|ingest.extract.*only|only.*ingest.extract|limited.*ingest.extract|ingest.extract.*scope" "$DRAFT_SKILL"
  assert_success
}

@test "local-ingest-stub: skills/draft/SKILL.md does not widen local-model scope to full ingest or wiki write" {
  # Guard: the section must not say the local model is authorized to write wiki/ at any point
  # in the ingest-extract tier. Check there is no uncaveated "local model" + "writes to wiki/".
  local bad_line
  bad_line=$(grep -iE "local.model.*write.*wiki/|local.model.*wiki/.*write" "$DRAFT_SKILL" \
    | grep -viE "never|not|proposed|_proposed" || true)
  if [ -n "$bad_line" ]; then
    printf 'FAIL: local model appears to be authorized to write wiki/ directly:\n%s\n' "$bad_line" >&2
    return 1
  fi
}

# ---------------------------------------------------------------------------
# Consistency: skills/review/SKILL.md still documents local-ingest-stub
# in its "Who uses this channel" section (existing cross-reference check)
# ---------------------------------------------------------------------------

@test "local-ingest-stub: skills/review/SKILL.md mentions local-ingest-stub in the _proposed/ channel consumers" {
  run grep -iE "local.ingest.stub|local-ingest-stub" "$REVIEW_SKILL"
  assert_success
  assert_output_contains "local-ingest-stub"
}

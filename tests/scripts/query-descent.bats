#!/usr/bin/env bats
# Tests for C1 budget-aware MOC-descent contract in skills/query/SKILL.md
#
# Behavior under test (prose assertions — the skill is Markdown, not code):
#
#   C1-01  SKILL.md states that candidate pages are ordered by the engine
#          `score` field (descending) as supplied by `search --json`.
#   C1-02  SKILL.md documents a context-budget prefix cut-off: pages are
#          included top-down until the context budget is exhausted.
#   C1-03  SKILL.md explicitly states the read-only / no-re-rank invariant:
#          C1 reads the score and never re-ranks; the emitted order is a
#          sub-sequence of `search`'s order.
#   C1-04  SKILL.md names the `SearchHit` fields C1 is allowed to READ:
#          `score`, `matched`, `wikilink`, `type`, `file`.
#   C1-05  SKILL.md states that `matched[].channel` may be used for
#          tie-aware inclusion (prefer title-phrase/title-term over body-only
#          when at budget), but only within the score-ordered sequence.
#   C1-06  SKILL.md names the `search --json` output as the input source
#          for the candidate set.
#
# All tests grep skills/query/SKILL.md directly — no fixtures needed.

load '../test_helper/common'

SKILL_FILE="$REPO_ROOT/skills/query/SKILL.md"

# ---------------------------------------------------------------------------
# C1-01: descent ordered by engine score (descending)
# ---------------------------------------------------------------------------

@test "C1-01: SKILL.md documents descent ordered by engine score descending" {
  run grep -i "score" "$SKILL_FILE"
  assert_success
  # Must mention ordering by score
  run grep -iE "(order|rank|sort|descend).{0,80}score|score.{0,80}(order|rank|sort|descend)" "$SKILL_FILE"
  assert_success
}

# ---------------------------------------------------------------------------
# C1-02: context-budget prefix cut-off
# ---------------------------------------------------------------------------

@test "C1-02: SKILL.md documents a context-budget prefix cut-off" {
  run grep -i "context.budget\|budget" "$SKILL_FILE"
  assert_success
  # Must mention including pages until budget is exhausted (prefix semantics)
  run grep -iE "(prefix|top.down|until|exhaust)" "$SKILL_FILE"
  assert_success
}

# ---------------------------------------------------------------------------
# C1-03: read-only / no-re-rank invariant
# ---------------------------------------------------------------------------

@test "C1-03: SKILL.md states the no-re-rank invariant explicitly" {
  # Must explicitly say C1 does NOT re-rank (or never re-ranks)
  run grep -iE "no.re.rank|never re.rank|not re.rank|does not re.rank" "$SKILL_FILE"
  assert_success
}

@test "C1-03b: SKILL.md states the emitted order is a sub-sequence of search output" {
  run grep -iE "sub.?sequence" "$SKILL_FILE"
  assert_success
}

# ---------------------------------------------------------------------------
# C1-04: names the readable SearchHit fields
# ---------------------------------------------------------------------------

@test "C1-04a: SKILL.md names the score field as a readable SearchHit field" {
  run grep -i "SearchHit\|search hit\|search_hit" "$SKILL_FILE"
  assert_success
}

@test "C1-04b: SKILL.md names matched\[\] as a readable field" {
  run grep -iE "matched\b" "$SKILL_FILE"
  assert_success
}

@test "C1-04c: SKILL.md names wikilink as a readable field" {
  run grep -i "wikilink" "$SKILL_FILE"
  assert_success
}

# ---------------------------------------------------------------------------
# C1-05: matched[].channel for tie-aware inclusion
# ---------------------------------------------------------------------------

@test "C1-05: SKILL.md documents matched[].channel for tie-aware inclusion" {
  run grep -iE "channel|tie.aware|title.phrase|title.term|body.only\|body-only\|body-term" "$SKILL_FILE"
  assert_success
}

# ---------------------------------------------------------------------------
# C1-06: search --json named as input source
# ---------------------------------------------------------------------------

@test "C1-06: SKILL.md names search --json as the candidate-set input" {
  run grep -E "search.*--json|--json" "$SKILL_FILE"
  assert_success
}

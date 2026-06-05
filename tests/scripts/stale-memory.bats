#!/usr/bin/env bats
# C3 — stale-memory flagging (documentation contract test)
#
# Asserts that the two skills that govern wiki-page lifecycle document the
# stale-memory rule correctly, with no new field or parallel staleness
# mechanism introduced.
#
# What "correct" means (decision #4 follow-on, §6 reuse-not-fork):
#   1. skills/lint/SKILL.md states that agent-session pages are flagged via
#      the EXISTING status: stale + confidence + S4 staleness machinery, and
#      that no new field or parallel staleness system is used.
#   2. skills/curator-fixes/SKILL.md states that the curator handles stale
#      agent-session memories using status: stale + confidence, the same as
#      any stale page, and never via memory-specific auto-deletion.
#
# These are documentation tests — they grep the skill files for the required
# prose and fail if any required phrase is absent.

load '../test_helper/common'

setup() {
  _load_helpers
}

# ---------------------------------------------------------------------------
# skills/lint/SKILL.md — stale-memory rule
# ---------------------------------------------------------------------------

LINT_SKILL="$REPO_ROOT/skills/lint/SKILL.md"
CURATOR_SKILL="$REPO_ROOT/skills/curator-fixes/SKILL.md"

@test "lint SKILL.md: documents stale-memory uses status: stale for agent-session pages" {
  run grep -q "status: stale" "$LINT_SKILL"
  assert_success
}

@test "lint SKILL.md: documents stale-memory uses confidence for agent-session pages" {
  run grep -q "confidence" "$LINT_SKILL"
  assert_success
}

@test "lint SKILL.md: documents stale-memory uses S4 staleness machinery for agent-session pages" {
  run grep -q "S4" "$LINT_SKILL"
  assert_success
}

@test "lint SKILL.md: documents agent-session pages go through the existing staleness path" {
  run grep -q "agent-session" "$LINT_SKILL"
  assert_success
}

@test "lint SKILL.md: documents no new field or parallel staleness system is used" {
  run grep -q "no new field" "$LINT_SKILL"
  assert_success
}

# ---------------------------------------------------------------------------
# skills/curator-fixes/SKILL.md — stale-memory curator handling
# ---------------------------------------------------------------------------

@test "curator-fixes SKILL.md: documents curator uses status: stale for agent-session memories" {
  run grep -q "status: stale" "$CURATOR_SKILL"
  assert_success
}

@test "curator-fixes SKILL.md: documents curator uses confidence for agent-session memories" {
  run grep -q "confidence" "$CURATOR_SKILL"
  assert_success
}

@test "curator-fixes SKILL.md: documents agent-session memories treated like any stale page" {
  run grep -q "agent-session" "$CURATOR_SKILL"
  assert_success
}

@test "curator-fixes SKILL.md: documents no memory-specific auto-deletion" {
  run grep -q "no memory-specific" "$CURATOR_SKILL"
  assert_success
}

---
title: "Mutation-Resistant Testing"
type: concept
aliases: ["Mutation-Resistant Testing", "mutation resistance", "test discipline"]
parent: "[[tests|Tests]]"
path: "tests"
sources: ["[[tests-readme|tests/README.md]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["tests", "testing-strategy", "quality"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Mutation-Resistant Testing

A discipline for writing tests that fail when the subject under test breaks, not just when the test itself has a bug.

## Definition

A test is mutation-resistant when a single-line change to the subject script that breaks the claimed behavior causes the test to fail. Tests that pass even when the implementation is broken provide false confidence and are worse than no tests.

## Key Principles

**Block cases must trigger the rule.** A "blocks on X" test whose fixture does not contain X passes even if the blocking logic is deleted. Block cases must use content that genuinely triggers the rule, not just the early-exit guard.

**Pin the specific branch.** Prefer `assert_output_contains "entity_type"` over `assert_output_contains "block"`. The former pins the reason for the block; the latter passes even if the block fires for the wrong reason.

**Apply the mutation test.** When writing a new test, mentally apply a one-line mutation to the script that would break the behavior. If the test still passes after that mutation, the assertion is too loose. The fastest verification: apply the mutation to the script, run the test, confirm it fails, revert.

**The Bats `set -e` trap.** Bats enables `set -e` inside tests, but a mid-body `[[ … ]]` that returns 1 is silently ignored — only the last command drives the test result. A test shaped as three separate `[[ ]]` assertions passes even if the middle one is false. The shared assertion helpers use explicit `return 1` with readable diagnostics so a failing assertion always surfaces.

**Copy-then-mutate.** Fixtures are immutable. Any test that needs to change a vault, settings file, or tree copies it into `$BATS_TEST_TMPDIR` first. `setup_fixture_vault` enforces this for the minimal-vault fixture.

**Determinism.** No network calls, no time-dependent assertions, no wait-loops. All mutation happens inside `$BATS_TEST_TMPDIR` and is cleaned up in `teardown`.

## Examples

A loose test that would pass with a broken script:

```bash
# BAD: passes even if the block reason is wrong
assert_output_contains "block"
```

A mutation-resistant test that pins the specific branch:

```bash
# GOOD: fails if the block fires for a different reason
assert_output_contains '"decision":"block"'
assert_output_contains "outside"   # pins the "outside vault" branch specifically
```

## Related Concepts

The mutation-resistant discipline is applied throughout the Bats Unit Tests suite and is especially important for the PreToolUse hook tests, where a loose assertion might pass even when the hook silently misroutes a write.

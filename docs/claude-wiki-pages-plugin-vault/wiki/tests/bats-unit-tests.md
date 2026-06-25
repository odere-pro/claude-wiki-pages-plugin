---
title: "Bats Unit Tests"
type: concept
aliases: ["Bats Unit Tests", "bats", "Tier 1 tests", "bats-core"]
parent: "[[tests|Tests]]"
path: "tests"
sources: ["[[tests-readme|tests/README.md]]", "[[tests-verify-ingest-bats|tests/scripts/verify-ingest.bats]]", "[[tests-validate-frontmatter-bats|tests/scripts/validate-frontmatter.bats]]", "[[tests-firewall-bats|tests/scripts/firewall.bats]]", "[[tests-protect-raw-bats|tests/scripts/protect-raw.bats]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["tests", "bats", "unit-testing"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Bats Unit Tests

The Tier 1 unit test suite for the claude-wiki-pages plugin, implemented with Bats (Bash Automated Testing System).

## Definition

A set of `.bats` files in `tests/scripts/`, each covering one `scripts/*.sh` hook or utility. Every file pins the allow path, the block path, and the no-op pass-through of a single script.

## Key Principles

**Hook JSON on stdin.** The plugin's hooks read a Claude Code tool-call payload from stdin. Tests feed them with `run_hook_with_json <script> <json-file>` or `run_hook_with_json_string <script> <json-string>`. Both pin `CLAUDE_WIKI_PAGES_VAULT=vault` and populate Bats's `$status` and `$output`.

**PreToolUse blocks via stdout JSON.** Hooks signal a block with `"decision":"block"` on stdout; Claude Code reads the JSON. So `assert_success` plus `assert_output_contains '"decision":"block"'` is the standard block assertion — not a non-zero exit.

**Shared helpers in `test_helper/common.bash`.** Every `.bats` file loads common helpers via `load '../test_helper/common'` and calls `_load_helpers` inside `setup`. The helpers provide:

- Assertion helpers: `assert_success`, `assert_status`, `assert_output_empty`, `assert_output_contains`, `refute_output_contains`
- Fixture helpers: `setup_fixture_vault` / `teardown_fixture_vault` (copy minimal-vault to `$BATS_TEST_TMPDIR`)
- Hook helpers: `run_hook_with_json`, `run_hook_with_json_string`

**Why custom helpers?** Bats enables `set -e` inside tests, but a mid-body `[[ … ]]` that returns `1` is silently ignored — only the last command drives the test result. The helpers use a `case` statement plus explicit `return 1`, so a failing assertion surfaces with a readable diagnostic.

## Examples

Naming convention: `@test "<script>: <behavior>"`. Example:

```bash
@test "firewall: blocks a write outside the vault" {
  run_fw "$BATS_TEST_TMPDIR/elsewhere/secret.md"
  assert_success
  assert_output_contains '"decision":"block"'
  assert_output_contains "outside"
}
```

Bats assertion helpers file under `tests/test_helper/` are NOT checked into git — they are cloned by `install-deps.sh` and CI via `git clone --depth 1`. `common.bash` degrades gracefully when they are absent, falling back to self-contained helpers.

## Related Concepts

The `.bats` files under `tests/scripts/` are the Tier 1 suite; the engine-level contract tests under `tests/engine/` are separate and run under `gate-01-engine-tests.sh`. Every `.bats` file follows the copy-then-mutate rule: never mutate files under `tests/fixtures/` in place.

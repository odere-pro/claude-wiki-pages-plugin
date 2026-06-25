---
title: "tests/README.md — Test Harness Documentation"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["tests", "documentation"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

## Metadata

- File: `tests/README.md`
- Role: Authoritative long-form reference for the shell test harness

## Summary

Defines the four-tier test model (Tier 0 static gates, Tier 1 Bats unit tests, Tier 2 smoke, eval opt-in), the fixture layout (`minimal-vault/`, `json/`), the shared helpers contract in `test_helper/common.bash`, and the mutation-resistant test-writing discipline.

## Key Claims

Covers: Four-Tier Test Structure, Bats Unit Tests, Fixture Helpers, Hook JSON Protocol, Mutation-Resistant Testing
- Two entry scripts drive every local workflow: `install-deps.sh` and `run-tests.sh`.
- Fixtures are immutable; every mutation happens in `$BATS_TEST_TMPDIR`.
- Tests must be deterministic: no network calls, no time-dependent assertions.
- Bats `set -e` silently ignores mid-body `[[ … ]]` failures — use the helper functions instead.
- Block verdicts from PreToolUse hooks are signalled by stdout JSON `"decision":"block"`, not non-zero exit.

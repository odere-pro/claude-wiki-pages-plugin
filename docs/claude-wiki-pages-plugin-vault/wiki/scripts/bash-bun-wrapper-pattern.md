---
title: "Bash-to-Bun Wrapper Pattern"
type: concept
aliases: ["Bash-Bun Wrapper", "Thin Bash Wrapper", "Engine Wrapper Pattern"]
parent: "[[scripts|Scripts]]"
path: "scripts"
sources: ["[[scripts-engine-sh|scripts/engine.sh]]", "[[scripts-validate-docs-sh|scripts/validate-docs.sh]]", "[[scripts-lint-structural-sh|scripts/lint-structural.sh]]", "[[scripts-check-duplicate-claims-sh|scripts/check-duplicate-claims.sh]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["scripts", "architecture", "bun-runtime", "migration"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 0.9
---

# Bash-to-Bun Wrapper Pattern

A thin bash script that preserves the existing caller contract while delegating all logic to the Bun TypeScript engine.

## Definition

The Bash-to-Bun Wrapper Pattern describes the migration strategy used across the scripts directory. Each bash script is progressively replaced by a thin wrapper that sources `resolve-vault.sh` for vault resolution, handles a small set of CLI arguments, and then delegates to the Bun engine via `engine.sh`. The original caller contract (exit codes, stdout/stderr format, argument signatures) is preserved verbatim.

## Key Principles

Three principles govern each wrapper:

1. **Contract preservation:** the existing callers (CI scripts, bats tests, hook runners) should see no behavioral difference. Exit codes, output formats, and argument signatures are preserved exactly, with explicit mapping notes when the engine's contract differs (for example, lint-structural.sh remaps exit 0 on warn-only to exit 1 for backward compatibility).

2. **Single decision authority:** the logic that makes the policy decision lives in exactly one place — the Bun engine module. The bash wrapper is a thin transport layer that formats inputs for the engine and formats outputs for callers.

3. **Graceful degradation:** each wrapper specifies whether it is fail-closed (security gate) or fail-open (advisory) on Bun absence. The wrapper itself never re-implements the decision logic.

## Examples

`validate-docs.sh` delegates to `engine lint --check docs`. `lint-structural.sh` delegates to `engine lint --check structural` and remaps the exit code. `check-duplicate-claims.sh` delegates to `engine lint --check dup-claims` and maps `--proposed` to `--file`. `check-wikilinks.sh` uses `engine lint --check md-links` for CLI mode and `engine hook --gate check-wikilinks` for hook mode.

## Related Concepts

The phase 3 migration plan documents which scripts were migrated and which bash behaviours were preserved. The engine-twin parity gate (gate-05) verifies byte-identical output between bash and Bun for the verify command.

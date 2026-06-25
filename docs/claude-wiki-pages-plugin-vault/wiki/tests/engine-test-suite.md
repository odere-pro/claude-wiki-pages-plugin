---
title: "Engine Test Suite"
type: concept
aliases: ["Engine Test Suite", "bun test", "engine tests", "contract tests"]
parent: "[[tests|Tests]]"
path: "tests"
sources: ["[[tests-gate-01-engine-tests-sh|tests/gates/gate-01-engine-tests.sh]]", "[[tests-capabilities-contract-test-ts|tests/engine/capabilities-contract.test.ts]]", "[[tests-ontology-p3-3-test-ts|tests/engine/ontology-p3-3.test.ts]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["tests", "engine", "bun"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Engine Test Suite

The TypeScript/Bun test suite covering the deterministic engine (`src/`) and engine-level behavioral contracts.

## Definition

Two test locations run under `gate-01-engine-tests.sh` via `bun test src/ tests/engine/`: colocated tests adjacent to each source module (`src/**/*.test.ts`) and engine-level contract tests in `tests/engine/` that exercise behavioral invariants across the full CLI dispatch.

## Key Principles

**Verb-drift contract (capabilities-contract.test.ts).** Pins the expected CLI verb set to a hardcoded golden fixture and asserts three invariants: every implemented verb exits != 2 (has a live dispatch branch), every planned verb exits 0 with `.status === 'not-implemented'`, and `capabilities --json` verb names set-equal the golden list. The golden list is hardcoded — it must not be derived from running code. Deliberate friction: updating the golden requires a one-line hand edit.

**Ontology profile acceptance (ontology-p3-3.test.ts).** Tests the ontology command against the live schema file. Verifies page-type enum order (9 values), entity_type core values (7), per-vault extension composition, predicate count (11), and graceful error handling on malformed/missing tables. NO-RAG: pure markdown-table parse, no embeddings.

**Coverage thresholds.** Enforced via `bunfig.toml` — gate-01 fails if coverage drops below threshold. This catches untested new code paths before they merge.

**Bun.spawnSync.** Engine contract tests invoke the real CLI via `Bun.spawnSync` so dispatch fallthrough is genuinely exercised, not mocked. A verb with no dispatch branch falls through to exit 2.

## Examples

Running the engine test suite locally:

```bash
bun test src/ tests/engine/          # full suite
bun test src/core/report.test.ts     # one file
bun test --coverage                  # with coverage report
```

## Related Concepts

The engine test suite is the TypeScript counterpart to the Bats unit tests. The Bats tests cover the bash hook scripts; the engine tests cover the TypeScript engine. Both feed into the CI gates job.

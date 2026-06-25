---
title: "Four-Tier Test Structure"
type: concept
aliases: ["Four-Tier Test Structure", "test tiers", "tier model"]
parent: "[[tests|Tests]]"
path: "tests"
sources: ["[[tests-readme|tests/README.md]]", "[[tests-run-tests-sh|tests/run-tests.sh]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["tests", "testing-strategy", "ci"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Four-Tier Test Structure

The test suite is organized into four execution tiers, each with a distinct cost and dependency footprint.

## Definition

A graduated test architecture that separates static analysis, unit tests, end-to-end flows, and model-quality gates into independently runnable tiers. The default local run covers Tier 0 and Tier 1 only; heavier tiers are opt-in.

## Key Principles

The tier model solves two competing pressures: contributors need a fast, dependency-free local run, while CI needs comprehensive coverage including Bun engine tests, shellcheck, markdownlint, and smoke flows.

| Tier | What it covers | Runner |
|------|---------------|--------|
| Tier 0 | Static gates: shellcheck, shfmt, markdownlint, lychee, gitleaks, validate-docs | `tier0` |
| Tier 1 | Bats unit tests: one `.bats` per `scripts/*.sh` | `tier1` |
| Tier 2 | Smoke: end-to-end flows that self-skip without the `claude` CLI | `tier2` |
| Tier 3 | Permanently dropped (local-embedding re-ranker, §5/§11.1) | `tier3` |
| gates | Engine gates: bun test, typecheck, eslint, parity checks | `gates` |
| eval | Local-model quality gate, opt-in via `CLAUDE_WIKI_PAGES_EVAL_MODEL` | `eval` |

The default merge-gating run is Tier 0 + Tier 1. The engine gates (`tests/gates/`) run as a separate CI job after the Bats suite.

Tier 3 is a permanently empty stub — the local-embedding re-ranker was dropped per §5/§11.1 (NO-RAG decision). Its target self-skips to keep the suite green.

## Examples

Running locally:

```bash
bash tests/install-deps.sh       # install all dependencies
bash tests/run-tests.sh          # Tier 0 + Tier 1 (default)
bash tests/run-tests.sh all      # all tiers
bash tests/run-tests.sh gates    # engine gates only
```

GNU parallel is used for cross-file Bats parallelism when available; each file's tests run serially within the file (`--no-parallelize-within-files`) because some test files mutate shared resources within a single file.

## Related Concepts

The tier structure feeds into the CI workflow defined in `.github/workflows/ci.yml`. Each tier's tooling is installed by `install-deps.sh`. The engine gates in `tests/gates/` consume the Bun-compiled engine from `dist/`.

---
title: "Test Gates"
type: concept
aliases: ["Test Gates", "CI gates", "engine gates", "gate runner"]
parent: "[[tests|Tests]]"
path: "tests"
sources: ["[[tests-gates-claude-md|tests/gates/CLAUDE.md]]", "[[tests-gate-01-engine-tests-sh|tests/gates/gate-01-engine-tests.sh]]", "[[tests-gate-05-verify-parity-sh|tests/gates/gate-05-verify-parity.sh]]", "[[tests-gate-11-firewall-parity-sh|tests/gates/gate-11-firewall-parity.sh]]", "[[tests-gate-13-no-rag-sh|tests/gates/gate-13-no-rag.sh]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["tests", "ci", "engine-gates"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Test Gates

Focused CI checks in `tests/gates/` that cover the Bun engine surface and cross-language invariants the shell Bats tiers cannot.

## Definition

A set of numbered `gate-NN-*.sh` scripts run by `tests/gates/run-all.sh` in filename order after the Bats suite. Each gate self-skips (prints "SKIP", exits 0) when its dependency (usually Bun) is absent. The engine gates require a compiled `dist/cli.js`, so CI runs `bun run build` before the gate runner.

## Key Principles

**Self-skip pattern.** Every gate checks `command -v bun >/dev/null 2>&1 || exit 0` at the top. This keeps the suite runnable on a bare shell box (no Bun installed) — the gate reports SKIP rather than failing.

**Golden-snapshot testing.** Two gates use the golden-snapshot pattern instead of comparing two implementations: gate-05 (verify parity) pins `errors,warnings` counts for both fixture vaults to `0,0`; gate-11 (firewall parity) pins each fixture path's verdict to a hardcoded string. A deliberate change to engine logic updates the golden values in the same commit.

**The gate table:**

| Gate | Enforces |
|------|---------|
| `gate-01` | `bun test` passes with coverage thresholds |
| `gate-02` | Engine typechecks clean (`bun run typecheck`) |
| `gate-03` | shellcheck at warning severity on `scripts/*.sh` and `tests/gates/*.sh` |
| `gate-04` | validate-docs glossary gate (no retired identifiers) |
| `gate-05` | Engine verify agrees with bash verify-ingest.sh + golden-snapshot |
| `gate-06` | No absolute `/Users/<name>` or `/home/<name>` leaks in shipped artifacts |
| `gate-07` | `templates/default.config.json` conforms to `schemas/config.schema.json` |
| `gate-08` | Engine source and JSON config are prettier-clean |
| `gate-09` | npm tarball ships only runtime surface, excludes dev surface |
| `gate-10` | markdownlint clean (mirrors CI Tier 0) |
| `gate-11-eslint` | Engine source passes eslint |
| `gate-11-firewall-parity` | Firewall verdicts match checked-in golden table |
| `gate-12` | `dist/cli.js` is at least as new as every `src/**/*.ts` |
| `gate-13` | NO-RAG: retrieval path has no embedding/vector/HTTP tokens |

Note: there are intentionally two `gate-11` files — both run; the duplicate number is not an error.

## Examples

Running gates locally:

```bash
bun run build                    # required first
bash tests/gates/run-all.sh      # all gates
bash tests/gates/gate-05-verify-parity.sh  # one gate directly
```

## Related Concepts

The engine gates complement rather than replace the Bats Tier 1 suite. The NO-RAG gate (gate-13) is the only gate that runs without Bun — it is pure grep, which is why it can enforce the NO-RAG invariant even on a bare shell box.

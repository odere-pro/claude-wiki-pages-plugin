---
title: "Golden-Snapshot Testing"
type: concept
aliases: ["Golden-Snapshot Testing", "golden table", "snapshot testing", "anti-drift check"]
parent: "[[tests|Tests]]"
path: "tests"
sources: ["[[tests-gate-05-verify-parity-sh|tests/gates/gate-05-verify-parity.sh]]", "[[tests-gate-11-firewall-parity-sh|tests/gates/gate-11-firewall-parity.sh]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["tests", "ci", "testing-strategy"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Golden-Snapshot Testing

A testing pattern where expected outputs are pinned to a hardcoded "golden" table rather than computed from a second live implementation.

## Definition

When a second implementation (bash twin) is retired, the gate that compared the two implementations flips to comparing the surviving single implementation against a checked-in table of expected values. Any change to the implementation that moves a verdict turns the gate red, preserving anti-drift protection without maintaining two code paths.

## Key Principles

**When to use.** Golden-snapshot replaces implementation-parity testing when only one implementation remains. It is also used for behavioral contracts (verb lists, enum values) where deriving the golden from the implementation would make the test circular.

**Gate-05 application.** Compares `verify-ingest.sh` (bash) output against the Bun engine's `verify --json` count on the reference vault (Row 1), then pins both fixture vaults' verify counts to `0,0` (Row 2). Since both fixtures are maintained clean, any new engine check that breaks a clean vault turns the gate red.

**Gate-11-firewall-parity application.** After `scripts/firewall.sh` was reduced to a thin stdin→engine wrapper, the gate flipped from bash==engine to engine==golden-verdict-table. Each fixture path's expected verdict is a hardcoded string; mode suffix `(mode=…)` is stripped before comparison.

**Deliberate update path.** Updating golden values requires a deliberate one-line edit in the same commit as the check change. This friction is the point: changing the golden without a corresponding implementation change is a regression.

**Hardcoded, not derived.** The golden must be authored by hand, not derived from the implementation at test time. A golden derived at runtime is effectively `assert(result == result)` — it cannot catch regressions.

## Examples

The capabilities-contract.test.ts engine test applies the same principle: the golden verb list is a hardcoded constant in the test file, not queried from the live `capabilities --json` command.

Gate-05 golden values:

```bash
golden_for() {
  case "$1" in
    "tests/fixtures/reference-vault") echo "0,0" ;;
    "tests/fixtures/minimal-vault")   echo "0,0" ;;
  esac
}
```

## Related Concepts

Golden-snapshot testing in this codebase evolved from the twin-retirement migrations (firewall-twin-retire, validate-frontmatter-twin-retire). The pattern preserves the anti-drift contract without requiring two maintained implementations.

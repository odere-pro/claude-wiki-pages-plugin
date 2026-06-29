---
title: "ADR Conventions"
type: concept
aliases: ["adr-conventions", "ADR conventions", "architecture decision record conventions"]
parent: "[[decisions|Decisions]]"
path: "decisions"
sources: ["[[docs-adr-readme|ADR README — Architecture Decision Records Index]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["docs", "adrs", "conventions"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# ADR Conventions

The set of rules governing how Architecture Decision Records are authored, amended, and referenced in the claude-wiki-pages project.

## Definition

An Architecture Decision Record (ADR) captures one design decision: the context that motivated it, the options considered, the chosen option, its consequences, and a test/verification plan. ADRs are append-only and immutable once Accepted.

## Key Principles

**Status lifecycle.** Each ADR moves through: Proposed → Accepted → (optionally) Superseded or Deprecated. Status is never retroactively changed; a new ADR supersedes an old one.

**Append-only amendment.** If a decision needs revision, a new ADR is written that explicitly supersedes (or amends) the old one. The old ADR is never edited after acceptance. Immutable history is the design goal.

**Structure.** Each ADR contains: Status, Date, SPEC anchor (the section of the architecture doc the decision is grounded in), Context, Decision, Consequences, and (optionally) a Test/Verification plan.

**Numbering.** ADRs are numbered sequentially starting from ADR-0001. Gaps indicate reserved or withdrawn decisions.

## Examples

The current ADR log (ADR-0001 through ADR-0036) spans: four-layer architecture, naming conventions, graph topology, local-model gating, schema conventions, Obsidian integration, and graph quality.

## Related Concepts

The vocabulary gate (`validate-docs.sh`) enforces that ADR references in prose use the canonical term form. The design-drift gate (ADR-0013) checks that ADR cross-references resolve to real files.

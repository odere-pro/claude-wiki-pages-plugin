---
title: "Tests"
type: index
aliases: ["tests", "Tests", "test harness", "test suite"]
parent: "[[index|Wiki Index]]"
path: "tests"
children:
  - "[[four-tier-test-structure|Four-Tier Test Structure]]"
  - "[[bats-unit-tests|Bats Unit Tests]]"
  - "[[test-gates|Test Gates]]"
  - "[[adversarial-testing|Adversarial Testing]]"
  - "[[mutation-resistant-testing|Mutation-Resistant Testing]]"
  - "[[no-rag-invariant|NO-RAG Invariant]]"
  - "[[hook-json-protocol|Hook JSON Protocol]]"
  - "[[engine-test-suite|Engine Test Suite]]"
  - "[[smoke-tests|Smoke Tests]]"
  - "[[golden-snapshot-testing|Golden-Snapshot Testing]]"
  - "[[subagent-quality-gate-pattern|Subagent Quality Gate Pattern]]"
child_indexes: []
tags: ["tests"]
created: 2026-06-25
updated: 2026-06-25
---

# Tests

The shell-based test harness for the claude-wiki-pages plugin, organized into four tiers from static analysis to end-to-end smoke flows.

## Test Strategy

- [[four-tier-test-structure|Four-Tier Test Structure]] — tier model (Tier 0 static, Tier 1 Bats, Tier 2 smoke, gates, eval)
- [[mutation-resistant-testing|Mutation-Resistant Testing]] — discipline for writing tests that catch real regressions
- [[hook-json-protocol|Hook JSON Protocol]] — the stdin/stdout contract for PreToolUse hook tests

## Unit Tests (Tier 1)

- [[bats-unit-tests|Bats Unit Tests]] — Bats framework, shared helpers, naming conventions, fixture discipline

## CI Gates

- [[test-gates|Test Gates]] — the 14 engine gates in `tests/gates/` covering Bun engine surface
- [[golden-snapshot-testing|Golden-Snapshot Testing]] — anti-drift pattern used by gate-05 and gate-11
- [[no-rag-invariant|NO-RAG Invariant]] — static enforcement that the retrieval path has no embeddings

## End-to-End and Adversarial

- [[smoke-tests|Smoke Tests]] — Tier 2 self-skipping end-to-end flows
- [[adversarial-testing|Adversarial Testing]] — corpus replay and fail-closed gate self-tests

## Agent Testing

- [[subagent-quality-gate-pattern|Subagent Quality Gate Pattern]] — SubagentStop verification hooks and tool-restriction gates

## Engine Tests

- [[engine-test-suite|Engine Test Suite]] — Bun/TypeScript tests covering CLI dispatch and ontology contracts

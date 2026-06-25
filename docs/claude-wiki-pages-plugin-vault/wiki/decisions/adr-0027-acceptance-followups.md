---
title: "ADR-0027 Acceptance Followups"
type: concept
aliases: ["adr-0027-acceptance-followups", "ADR-0027 acceptance", "fill-gaps acceptance criteria"]
parent: "[[decisions|Decisions]]"
path: "decisions"
sources: ["[[docs-adr-0027-followups|ADR-0027 Acceptance Followups]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["docs", "adrs", "acceptance", "graph"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# ADR-0027 Acceptance Followups

The post-acceptance work items for the fill-gaps and graph-quality features, tracked and verified independently of the delivering PR's self-report.

## Definition

The ADR-0027 acceptance followup document specifies the remaining acceptance criteria after the initial fill-gaps ADR was approved — three items that were tracked to verified completion rather than trusted on self-report.

## Key Principles

**Item 1 — `lint-structural.sh` 157→0 findings.** The structural lint (`lint-structural.sh`) reported 157 `missing-section` findings before the PR. The acceptance criterion: all 157 resolved to 0. Delivered in PR #35.

**Item 2 — Dangling-wikilink verify parity.** The bash twin of the dangling-wikilink check (`scripts/check-wikilinks.sh`) must match the TypeScript engine check exactly. Delivered as ADR-0028 + gate-05.

**Item 3 — Graph connectivity target.** All 7 topic clusters must achieve Cn=Ce=1.0 (fully connected, no isolated components). Achieved after fill-gaps + curator heal.

**Independent verification.** Each criterion was verified independently of the PR self-report. The memory note for this session explicitly flags: "KEY LESSON: workflow QA self-reported green but hid an eslint-preset regression (H21) — always independently verify workflow self-reports."

## Examples

Before: graph had 90 dangling wikilinks, multiple orphan pages, Cn>1. After: 0 dangling wikilinks, 7-topic clusters, Cn=Ce=1.0.

## Related Concepts

The fill-gaps skill and graph-quality.sh are the implementation artifacts. ADR-0031 formalizes the Cn/Ce metric definitions these criteria use.

---
title: "ADR-0017 Fabrication Floor"
type: concept
aliases: ["ADR-0017 Fabrication Floor", "ADR-0017", "fabrication floor ADR", "verbatim partition ADR"]
parent: "[[ADRs]]"
path: "adrs"
sources: ["[[ADR-0017-fabrication-floor-verbatim-partition]]"]
related: ["[[ADR-0011 Local Model Quality Gate]]", "[[Approved Local Models]]", "[[ADR-0018 Offline Policy and Degraded Mode]]"]
tags: [adr, local-models, quality-gate, fabrication]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 1.0
---

# ADR-0017: Fabrication Floor — Verbatim Partition of Extra Claim Pairs

**Status:** Accepted | **Date:** 2026-06-11 | **Amends:** ADR-0011

## Problem

ADR-0011's zero-fabrication floor was implemented as a strict set difference: every candidate `(source, quote)` pair **not present in the gold reference** counted as a fabricated sourced claim, and a single one failed the tier.

The first measured run (2026-06-11) exposed a conflation in this definition. `qwen3-coder:30b` cleared every ratio bar (schema 1.0, fidelity 1.0, fields 0.93, dedup 1.0) and **invented nothing** — including on the `provenance-trap` case, which it correctly declined to fill in. It still failed the floor: it cited 2/1 **extra** quotes that are verbatim sentences of the raw input which the gold's editorial selection simply did not include. These are not fabrications — they are real citations to real text that the gold reference happened to omit.

## Decision

**The verbatim partition:** Split the "not in gold" set into two subsets:

- **Over-citation** — a candidate pair absent from the gold **and** verbatim (whitespace-normalized) in the raw input. Extra real citation, not invention. Reported by the eval scorecard, tracked separately, but **does not trip the zero-fabrication floor**.
- **Fabrication** — a candidate pair absent from the gold **and** absent from the raw input. Genuine invention. **Trips the zero-fabrication floor.**

The floor remains: zero fabricated sourced claims. Only the definition changes — what counts as fabrication is now correctly scoped to pairs that cannot be traced to the raw source.

This amendment was verified airtight: a `provenance-trap` golden-set case with a deliberately-omitted fact remains uncleaned by the verbatim-in-raw check (the fabricated fact is not in the raw input, so it still trips the floor).

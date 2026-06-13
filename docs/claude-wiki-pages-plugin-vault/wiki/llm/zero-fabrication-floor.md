---
title: "Zero-Fabrication Floor"
type: concept
aliases: ["Zero-Fabrication Floor", "zero-fabrication floor", "fabrication floor", "zero fabrication", "anti-fabrication"]
parent: "[[LLM]]"
path: "llm"
sources: ["[[ADR-0011: Local-Model Quality Gate]]", "[[ADR-0017: Fabrication Floor — Verbatim Partition]]", "[[Local Models]]"]
related: ["[[Local Model Quality Gate]]", "[[Golden Set]]", "[[Approved Local Model]]", "[[Capability Tier]]", "[[Verbatim Partition]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["concept", "local-model", "provenance", "quality-gate"]
created: 2026-06-13
updated: 2026-06-13
update_count: 3
status: active
confidence: 1.0
---

# Zero-Fabrication Floor

> [!summary]
> The zero-fabrication floor is a hard, non-calibratable requirement of the [[Local Model Quality Gate]]: a single invented sourced claim disqualifies a model from any capability tier, regardless of all other scores. Fabrication is defined precisely by ADR-0017's verbatim partition — a `source_quotes` entry whose quote is NOT a verbatim substring of the raw input. Over-citation (quoting something real but not in the gold set) is explicitly not fabrication.

## Definition

The zero-fabrication floor (ADR-0011, §3) is not a threshold but an absolute floor. Unlike the four calibrated thresholds (schema-validity ≥ 0.98, fidelity ≥ 0.97, field accuracy ≥ 0.90, dedup ≥ 0.90) which are percentage requirements over the full golden set, the zero-fabrication floor fires on a single instance. One fabricated sourced claim ends the evaluation for that model at that tier, regardless of how well it scored on everything else.

**Why a floor rather than a threshold?** The plugin's value proposition rests on provenance discipline: every claim in the wiki links back to a real source. A model that can fabricate even one sourced claim undermines the entire trust model. There is no "mostly trustworthy" position — either provenance is maintained or it is not.

## Fabrication vs. Over-Citation (ADR-0017)

ADR-0017 refined the fabrication definition by introducing the verbatim partition test. This distinction matters because early testing showed that good models would sometimes cite real source content that happened not to be in the gold set.

| Category | Definition | Verdict |
| --- | --- | --- |
| **Fabrication** | A `source_quotes` entry whose `quote` is NOT a verbatim (whitespace-normalized) substring of the raw input | FAILS the floor |
| **Over-citation** | A `source_quotes` entry absent from the gold set, but whose `quote` IS a verbatim substring of the raw input | Acceptable — real citation, not invention |

The verbatim test is exact string containment after whitespace normalization — never similarity or embedding distance. This keeps the test deterministic and auditable.

## The Provenance Trap

The [[Golden Set]] includes a deliberate provenance trap: a fixture whose correct answer requires acknowledging that a certain claim cannot be sourced from the input. A fabricating model, faced with missing evidence, invents a claim rather than abstaining. The trap is the most direct test of the zero-fabrication floor because it forces the floor to fire (or not) on a specific case, rather than relying on it never being triggered.

`gpt-oss:20b` is the only model in the test cohort to have tripped the provenance trap. All other rejected models failed on structural metrics (dedup, schema-validity), not on fabrication.

## Implementation

The evaluation driver checks the zero-fabrication floor after computing the four calibrated metrics. The driver is self-tested fail-closed: its `--self-test` flag passes a known-good fixture (floor not triggered) and a fabricating fixture (floor triggered), confirming the driver detects both conditions. Internal errors in the driver are fatal, never swallowed.

## Related Concepts

- [[Local Model Quality Gate]] — the overall evaluation methodology that enforces the floor
- [[Golden Set]] — the fixtures corpus, including the provenance trap
- [[Approved Local Model]] — the allow-list that records models that have passed the floor
- [[Capability Tier]] — the tier for which the floor is evaluated
- [[Verbatim Partition]] — the ADR-0017 refinement that distinguishes fabrication from over-citation

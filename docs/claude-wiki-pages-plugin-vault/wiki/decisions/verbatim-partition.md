---
title: "Verbatim Partition"
type: concept
aliases: ["Verbatim Partition", "verbatim partition", "verbatim test", "over-citation vs fabrication", "substring test"]
parent: "[[Decisions]]"
path: "decisions"
sources: ["[[ADR-0017: Fabrication Floor — Verbatim Partition]]"]
related: ["[[Zero-Fabrication Floor]]", "[[Local Model Quality Gate]]", "[[Golden Set]]", "[[Approved Local Model]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["concept", "local-model", "provenance", "fabrication"]
created: 2026-06-13
updated: 2026-06-13
update_count: 1
status: active
confidence: 1.0
---

# Verbatim Partition

> [!summary]
> The verbatim partition is the ADR-0017 refinement of the [[Zero-Fabrication Floor]] that distinguishes fabrication from over-citation using a verbatim substring test. A `source_quotes` entry whose `quote` is a whitespace-normalized verbatim substring of the raw input is over-citation (acceptable). A `source_quotes` entry whose `quote` is not a substring of the raw input is fabrication (disqualifying).

## Definition

ADR-0011 established the zero-fabrication floor: a single invented sourced claim disqualifies a model. ADR-0017 refined the definition of "invented" by introducing the verbatim partition.

The problem ADR-0017 solved: early testing of `qwen3-coder:30b` produced `source_quotes` entries that were real sentences from the raw input but did not appear in the gold set (the gold set was not exhaustive). Under a strict gold-set-comparison definition, these would count as fabrications. But they were real quotes — the model found and cited something true that the evaluator had not included.

**The partition test:**

```
Given: a source_quotes entry { source: "[[ADR-0017: Fabrication Floor — Verbatim Partition]]", quote: "some text" }
Given: the raw input document I

IF quote ∈ verbatim_substrings(whitespace_normalize(I)):
  → OVER-CITATION: real text from the input, not in gold set. Acceptable.
ELSE:
  → FABRICATION: text not in the input. Disqualifying.
```

"Verbatim substring" means exact string containment after normalizing all whitespace sequences to single spaces. This test is deterministic and requires no semantic similarity — it is a `string.includes()` call on normalized text.

## Why the Distinction Matters

Without the verbatim partition, good models that find real supporting evidence not in the gold set are penalized the same as models that invent claims. This creates a perverse incentive: a model that cites less is safer from penalization than one that cites more real evidence.

The verbatim partition resolves this by measuring the right thing: the real question is "did the model invent text that was not in the input?" not "did the model cite exactly what the gold set cited?"

## What Each Category Means for Trust

**Over-citation** (verbatim substring, not in gold set): the model is extracting real content that the evaluator missed. This is a false negative in the gold set, not an error by the model. The model is trustworthy.

**Fabrication** (not a verbatim substring): the model produced text that does not exist in the input. It invented a claim and attributed it to a source. The provenance chain is broken. This is the only category the zero-fabrication floor applies to.

## Measured Results

`qwen3-coder:30b` produces no fabrications and some over-citations (real quotes not in the gold set). The over-citations are acceptable. The model passes the verbatim partition test on all golden-set fixtures including the provenance trap.

## Related Concepts

- [[Zero-Fabrication Floor]] — the hard floor that the verbatim partition refines; applies only to fabrication, not over-citation
- [[Local Model Quality Gate]] — the overall gate that uses the verbatim partition as part of its scoring
- [[Golden Set]] — the fixtures corpus; over-citations are gold-set misses, not model errors
- [[Approved Local Model]] — `qwen3-coder:30b`, the first model to pass under the verbatim partition refinement

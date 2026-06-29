---
title: "ADR-0017: Fabrication Floor and Verbatim Partition"
type: entity
entity_type: standard
aliases: ["ADR-0017", "adr-0017", "fabrication floor ADR", "verbatim partition"]
parent: "[[decisions|Decisions]]"
path: "decisions"
sources: ["[[docs-adr-0017|ADR-0017: Fabrication Floor and Verbatim Partition]]"]
related: []
tags: ["docs", "adrs", "local-models", "quality-gate"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# ADR-0017: Fabrication Floor and Verbatim Partition

Amends ADR-0011 by splitting "extra claim pairs" in the golden-set eval into two categories: invented claims (fabrication — floored at 0) vs over-cited claims (correct content, wrong/extra citation — reported as WARN).

## Overview

ADR-0017 adds precision to the local-model eval. The original ADR-0011 eval scored all extra claims uniformly. This ADR recognizes that "I made up content" and "I cited the right thing to an extra source" are meaningfully different failure modes deserving different scores and signals.

## Key Facts

**Status:** Accepted (amends ADR-0011)

**Partition:**
- **Invented (fabricated):** Content not present in any source — scored at 0 (fabrication floor). A model that invents content fails the eval.
- **Over-cited:** Correct content cited to an additional or wrong source — reported as a WARN metric, not a floor. A model that is accurate-but-sloppy-on-citations can still pass if it does not fabricate.

**Rationale:** A model that consistently over-cites may just need prompt tuning. A model that fabricates is a correctness risk and must fail. Treating them identically would either pass fabricators (too lenient) or fail over-citers (too strict).

**Eval machinery:** `tests/adversarial/replay-corpus.sh` and its fixtures. The comparator now partitions the extra-claim set before scoring.

**Consequences:**
- Over-citation becomes a separate, trackable quality dimension.
- The fabrication floor is a hard gate; the over-citation rate is a soft signal for model improvement.
- ADR-0019 carries the same partition logic to the query tier.

## Related

ADR-0011 is the base. ADR-0019 applies the fabrication/over-citation distinction to the query tier's runtime verbatim-citation check.

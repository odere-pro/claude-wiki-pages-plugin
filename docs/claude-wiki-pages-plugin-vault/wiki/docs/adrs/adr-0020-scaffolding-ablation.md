---
title: "ADR-0020: Scaffolding Ablation Eval"
type: entity
entity_type: standard
aliases: ["ADR-0020", "adr-0020", "scaffolding ablation ADR", "ablation study"]
parent: "[[adrs|ADRs]]"
path: "docs/adrs"
sources: ["[[docs-adr-0020|ADR-0020: Scaffolding Ablation Eval]]"]
related: []
tags: ["docs", "adrs", "quality-gate", "evaluation"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# ADR-0020: Scaffolding Ablation Eval

Documents the measured ablation study comparing the plugin arm (with scaffolding) against a baseline arm (without): plugin arm scores 1.00 on schema_validity, claim_source_fidelity, and dedup_correctness; baseline scores 0.00 on all three.

## Overview

ADR-0020 provides the empirical justification for the plugin's scaffolding investment. Without a measured comparison, the value of the schema, provenance gates, and dedup logic could be questioned. The ablation makes the value concrete and regression-testable.

## Key Facts

**Status:** Accepted

**Three measured metrics:**
- `schema_validity` — are frontmatter fields correct and complete?
- `claim_source_fidelity` — are claims traceable to source files?
- `dedup_correctness` — are duplicate page candidates correctly detected and merged?

**Results:**
- Plugin arm (with scaffolding): 1.00 / 1.00 / 1.00
- Baseline arm (without scaffolding): 0.00 / 0.00 / 0.00

**Methodology:** Described in `docs/scaffolding-ablation.md`. The adversarial test tier (`tests/adversarial/`) runs the ablation as a regression test on every CI run.

**Consequences:**
- The ablation is a living regression test, not a one-time experiment.
- Any change that causes a drop below 1.00 on any metric is a CI failure.
- The 1.00/0.00 contrast is intentional: the baseline is genuinely absent of all scaffolding, not just partially reduced.

## Related

The ablation fixtures live in `tests/adversarial/`. The scaffolding-ablation concept page summarizes the methodology for wiki readers. ADR-0011 uses the same adversarial test tier for local-model quality gating.

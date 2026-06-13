---
title: "ADR-0013: Design-Drift Gate"
type: source
source_type: manual
source_format: text
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["adr", "ci", "gates", "design"]
aliases: ["ADR-0013: Design-Drift Gate"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# ADR-0013: Design-Drift Gate

## Summary

Adds `validate-docs.sh` Check 5 (the design-drift gate) scanning `docs/design/*.md` and `SOFTWARE-3-0.md` for five categories of drift: (a) mermaid nodes naming non-existent paths, (b) dead relative links, (c) hook/script name mismatches, (d) count assertion drift, (e) missing Authority links.

## Key Claims

- Five drift categories: mermaid node grounding, link resolution, hook coverage, count verification, authority presence.
- Parity gate: every row of the dual-entry router must have a non-empty human cell and a non-empty agent cell with resolving links.
- Uses grep/awk/bash only (Tier-0); no mermaid parser.
- `[speculative]` marker exempts unresolved mermaid nodes from the grounding check.
- Software 3.0 posture: every project surface must be equally usable by humans and agents.

## Entities Mentioned

- [[Deterministic Engine]]

## Concepts Covered

- [[Design-Drift Gate]]
- [[Node Grounding]]
- [[Software 3.0]]
- [[Parity Gate]]

---
title: "ADR-0020: Scaffolding Ablation Eval"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-12
date_ingested: 2026-06-25
tags: ["docs", "adrs", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# ADR-0020: Scaffolding Ablation Eval

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages
- **Published:** 2026-06-12
- **URL:** —

## Summary

ADR-0020 documents the measured ablation study comparing the plugin arm (with scaffolding) against the baseline arm (without). Key metrics: schema_validity, claim_source_fidelity, dedup_correctness. Plugin arm scored 1.00 on all three; baseline arm scored 0.00. The ablation provides empirical justification for the plugin's scaffolding investment.

## Key Claims

Status: Accepted. The ablation measures three metrics: schema_validity (are frontmatter fields correct?), claim_source_fidelity (are claims traceable to sources?), dedup_correctness (are duplicate pages correctly merged?). Plugin arm: 1.00 / 1.00 / 1.00. Baseline arm: 0.00 / 0.00 / 0.00. The `docs/scaffolding-ablation.md` document provides the full methodology. This ADR establishes the ablation as an ongoing regression test in the adversarial test tier.

Covers: Scaffolding Ablation, Ablation Study, Schema Validity, Claim Source Fidelity, Dedup Correctness

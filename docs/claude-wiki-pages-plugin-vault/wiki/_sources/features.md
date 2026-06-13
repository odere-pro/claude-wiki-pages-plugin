---
title: "Features"
type: source
source_type: manual
source_format: text
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["reference", "features", "ablation"]
aliases: ["Features"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# Features

## Summary

Plugin features summary including the scaffolding ablation measured results and competitor comparison. The plugin arm (full scaffolding) significantly outperforms the baseline arm on all four metrics.

## Key Claims

- Scaffolding ablation results (ADR-0020): plugin arm vs baseline arm on the same model and inputs.
- Plugin arm scores: schema-validity 1.0, claim-source-fidelity 1.0, frontmatter-field-accuracy 0.93, dedup-correctness 1.0.
- Baseline arm scores are substantially lower on every dimension.
- Key differentiators: provenance chain, typed wikilink graph, deterministic engine, git-checkpointed operations, NO-RAG retrieval.

## Entities Mentioned

- [[claude-wiki-pages Plugin]]
- [[Deterministic Engine]]

## Concepts Covered

- [[Scaffolding Ablation]]
- [[Plugin Arm]]
- [[Baseline Arm]]

## Grounded Pages

Wiki pages that cite this source:

- [[Scaffolding Ablation]] — ablation measurements
- [[claude-wiki-pages Plugin]] — what the plugin ships
- [[Git Checkpoint]] — hook-enforced features
- [[Auto-Heal]] — repair capabilities
- [[Installation]] — prerequisites and install paths
- [[Plugin Architecture Synthesis]] — measured value

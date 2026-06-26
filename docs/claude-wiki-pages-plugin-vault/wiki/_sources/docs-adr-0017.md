---
title: "ADR-0017: Fabrication Floor and Verbatim Partition"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-13
date_ingested: 2026-06-25
tags: ["docs", "adrs", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# ADR-0017: Fabrication Floor and Verbatim Partition

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages
- **Published:** 2026-06-13
- **URL:** —

## Summary

ADR-0017 amends ADR-0011 by partitioning extra claim pairs in the golden-set eval into two categories: invented (fabricated claims not in the source — floored at 0) vs over-citation (correct claims cited to an excess source — reported as a warning). This distinction gives the eval a more precise signal for what kind of failure a local model is making.

## Key Claims

Status: Accepted. The eval scores "invented" extra claims at zero (fabrication floor) — these are hallucinations. "Over-citation" extra claims (correct content, wrong/extra source citation) are reported as a separate WARN metric. The distinction lets a model that is accurate-but-sloppy-on-citations pass the fabrication floor while still being flagged for over-citation. The eval machinery lives in `tests/adversarial/replay-corpus.sh` and its fixtures.

Covers: Fabrication Floor, Verbatim Partition, Over-Citation Warning, Local Model Eval

---
title: "ADR-0017: Fabrication Floor — Verbatim Partition"
type: source
source_type: manual
source_format: text
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["adr", "local-model", "provenance", "fabrication"]
aliases: ["ADR-0017: Fabrication Floor — Verbatim Partition"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# ADR-0017: Fabrication Floor — Verbatim Partition

## Summary

Amends ADR-0011 by refining the fabrication definition. A verbatim substring test distinguishes over-citation (a real quote not in the gold set) from fabrication (an invented claim). `qwen3-coder:30b` passes the verbatim partition test.

## Key Claims

- Over-citation: a `source_quotes` pair absent from the gold reference but whose quote IS a verbatim (whitespace-normalized) sentence of the raw input — extra real citation, not invention.
- Fabrication: a claimed quote that is NOT a verbatim substring of the raw input — genuinely invented.
- The zero-fabrication floor in ADR-0011 applies only to fabrication, not over-citation.
- `qwen3-coder:30b` produces no fabrications; its over-citations are acceptable.

## Entities Mentioned

- [[Deterministic Engine]]

## Concepts Covered

- [[Zero-Fabrication Floor]]
- Over-Citation (a real quote from the input not in the gold set; acceptable under verbatim partition)
- [[Local Model Quality Gate]]
- [[Verbatim Partition]]

## Grounded Pages

Wiki pages that cite this source:

- [[Local Model Quality Gate]] — verbatim partition, fabrication vs over-citation
- [[Approved Local Model]] — zero-fabrication floor enforcement

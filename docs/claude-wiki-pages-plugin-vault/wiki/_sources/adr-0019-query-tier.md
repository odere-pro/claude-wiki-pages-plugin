---
title: "ADR-0019: Query Tier and Answer Verification"
type: source
source_type: manual
source_format: text
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["adr", "query", "local-model", "verification"]
aliases: ["ADR-0019: Query Tier and Answer Verification"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# ADR-0019: Query Tier and Answer Verification

## Summary

Defines the `query` capability tier for local models: deterministic search selects pages, local model composes cited answers, runtime verification checks every citation and quote. `qwen3-coder:30b` passes. Any unverified answer is denied, never shown.

## Key Claims

- `query` tier: local model composes cited answers from pages selected by deterministic search engine. Read-only.
- Runtime answer verification: (1) each citation must name an existing wiki page; (2) each cited quote must be a verbatim (whitespace-normalized) substring of that page. Exact string containment, never similarity.
- Any verification failure: warning emitted, answer denied, never shown.
- `qwen3-coder:30b` passes both golden-set cases (recall 1.0, quote coverage 1.0, honest on trap, zero fabrications).
- `scripts/offline-query.sh` implements true-offline query with runtime verification.

## Entities Mentioned

- [[Deterministic Engine]]

## Concepts Covered

- [[Capability Tier]]
- Answer Verification (runtime check: citation names real page, quote is verbatim substring)
- [[Offline Policy]]
- [[NO-RAG Principle]]

## Grounded Pages

Wiki pages that cite this source:

- [[NO-RAG Principle]] — query tier and answer verification
- [[Approved Local Model]] — query tier approval
- [[Offline Policy]] — query tier routing

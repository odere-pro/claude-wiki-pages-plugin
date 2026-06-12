---
title: "ADR-0014 Single Source Required Fields"
type: concept
aliases: ["ADR-0014 Single Source Required Fields", "ADR-0014", "single source required fields ADR"]
parent: "[[ADRs]]"
path: "adrs"
sources: ["[[ADR-0014-single-source-required-fields-and-duplicate-claim-warning]]"]
related: ["[[ADR-0004 Ontology Profile v1]]", "[[Canonical Terms]]", "[[Hook System]]"]
tags: [adr, schema, validation, single-sourcing]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 1.0
---

# ADR-0014: Single-Source Required Fields and Duplicate-Claim Warning in Review

**Status:** Accepted | **Date:** 2026-06-05

## Problem

Two Phase-2 items touched the same shared-mechanism question:

**P2.2:** Required-field rules were hardcoded as a bash `case` in `validate-frontmatter.sh:54-68`, while the schema expressed the same information separately as illustrative YAML fences per type, and templates carried a third copy. Three places that can drift — the schema "wins" but the gate does not read it.

**P2.4:** Duplicate-claim detection in the review gate needed a mechanism. The risk: vector similarity would "smuggle the forbidden mechanism" (NO-RAG, Brief §5). Exact string matching avoids this but needs a scope definition.

## Decision

**P2.2 — Single-source required fields from the schema:** Replace the bash `case` with a new machine-readable `### Required fields by type` table inside `docs/vault-example/CLAUDE.md` that `scripts/validate-frontmatter.sh` parses at gate time using grep/awk only (Tier-0; no Bun). The table is the single source of truth; the per-type YAML examples and templates are illustrations only.

**P2.4 — Duplicate-claim WARN in review (exact/normalized only):** The review gate checks for duplicate claims between a proposed draft and existing wiki pages using exact string containment (whitespace-normalized). A match is a WARN (never a block) — the human decides whether to deduplicate or accept. No embeddings, no similarity, no ML.

## Why Exact-Only

Exact string containment is the only duplicate-detection mechanism compatible with the NO-RAG absolute. Vector similarity is the obvious wrong answer. The WARN severity is correct because a verbatim quote from a source legitimately appears in multiple pages — over-blocking would hide provenance evidence, not prevent duplication.

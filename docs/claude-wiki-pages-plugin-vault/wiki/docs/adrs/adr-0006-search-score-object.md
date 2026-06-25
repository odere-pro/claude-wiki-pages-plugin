---
title: "ADR-0006: Search Score Object"
type: entity
entity_type: standard
aliases: ["ADR-0006", "adr-0006", "search score object ADR", "matched object"]
parent: "[[adrs|ADRs]]"
path: "docs/adrs"
sources: ["[[docs-adr-0006|ADR-0006: Search Score Object]]"]
related: []
tags: ["docs", "adrs", "retrieval", "search"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# ADR-0006: Search Score Object

Defines the `matched{}` score object — the single shared data structure returned by every search operation, carrying the hit page, matched terms, a relevance score, and an optional graph-walk continuation field.

## Overview

ADR-0006 establishes the "one score object" shared mechanism (Brief §6). Every consumer of search results — skills, agents, the analyst — receives and processes the same typed envelope. This prevents a proliferation of bespoke result formats and makes the retrieval contract testable.

## Key Facts

**Status:** Accepted

**Decision:** All search operations return a `matched{}` object with these fields:
- `page` — wiki-relative path to the matched page
- `terms` — list of matched tokens (lexical)
- `score` — relevance float
- `next?` — optional JSON-only field for R2 graph-walk continuation (N≤2 hops)

**Implementation:** `src/core/report` produces the object; the query skill and analyst agent consume it. The object appears in `--json` output for programmatic use.

**Constraints:**
- No embeddings in or alongside the object — it is a lexical/structural artifact.
- The `next?` field is optional and JSON-only; it is not rendered in human-readable output.

**Consequences:**
- The retrieval contract is typed and testable: CI checks that `matched{}` has the required fields.
- The R2 graph-walk primitive (ADR-0008) reads `next?` to continue traversal.

## Related

The graph-traversal primitive (ADR-0008) extends the `matched{}` envelope with the R2 `--graph` walk. The query protocol in `docs/CLAUDE.md` requires a Sources section built from `matched{}` results.

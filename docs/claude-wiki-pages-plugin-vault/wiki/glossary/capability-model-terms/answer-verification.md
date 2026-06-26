---
title: "answer verification"
type: concept
aliases: []
parent: "[[capability-model-terms|Capability and model terms]]"
path: "glossary/capability-model-terms"
sources: ["[[docs-glossary|Canonical Glossary]]"]
related: []
tags: ["glossary", "capability-model-terms", "terminology"]
created: 2026-06-26
updated: 2026-06-26
update_count: 1
status: active
confidence: 0.9
---

# answer verification

## Definition

The deterministic, per-answer runtime check applied to every local-model query answer: each citation must name an existing wiki page and each cited quote must be a verbatim (whitespace-normalized) substring of that page. Any violation throws a warning and denies the answer — it is never shown. Exact string containment, never similarity (§5 NO-RAG). See ADR-0019.

## Key Principles

- The deterministic, per-answer runtime check applied to every local-model query answer: each citation must name an existing wiki page and each cited quote must be a verbatim (whitespace-normalized) substring of that page.
- Canonical term in the claude-wiki-pages **Capability and model terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- Defined in `docs/GLOSSARY.md`; see the Canonical Glossary overview for usage in context.

## Related Concepts

Part of the **Capability and model terms** group: capability tier, capability progression, degraded mode, model-agnostic, quality gate, golden set, over-citation, approved local model, offline policy, reachability probe, degraded-mode routing, offline draft.

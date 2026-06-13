---
title: "Patterns"
type: index
aliases: ["Patterns", "patterns", "pattern"]
parent: "[[Wiki Index]]"
path: "patterns"
children:
  - "[[LLM Wiki Pattern]]"
  - "[[Hook-Enforced Guarantees]]"
  - "[[Entity Distribution Model]]"
  - "[[Provenance-Tracked Wiki]]"
  - "[[Vault Scaffolding]]"
child_indexes: []
tags: []
created: 2026-06-13
updated: 2026-06-13
---

# Patterns

The design principles, structural conventions, and enforcement mechanisms that make the wiki trustworthy and maintainable over time.

## Foundational ideas

- [[LLM Wiki Pattern]] — Karpathy's original pattern: human curates sources, LLM maintains the wiki.
- [[Provenance-Tracked Wiki]] — the property that every claim in the wiki traces back to a source in `vault/raw/`.

## Structural conventions

- [[Entity Distribution Model]] — one source rewrites many existing pages rather than creating one summary page.
- [[Vault Scaffolding]] — the structure and bookkeeping files created by `/claude-wiki-pages:init`.

## Enforcement mechanisms

- [[Hook-Enforced Guarantees]] — the set of invariants enforced at every tool-call boundary by hook scripts.

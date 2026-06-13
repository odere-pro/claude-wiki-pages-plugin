---
title: "Glossary"
type: source
source_type: manual
source_format: text
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["reference", "glossary", "terminology"]
aliases: ["Glossary"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# Glossary

## Summary

Canonical term list for `claude-wiki-pages`. All docs, skills, and user-visible strings conform to it. `validate-docs.sh` enforces it. Organized into Technical, Ontology, Architecture, Skill/Agent naming, Layer 2 skills, User-facing verbs, Operator, Software 3.0, Retrieval, Vault management, Ingest/memory, Capability/model, UX/DX, and Authoritative files sections. Also lists banned strings and discoverability terms.

## Key Claims

- Glossary is "input weight": using established community terms (MOC, vault, wiki, frontmatter) activates LLM priors and lowers drift.
- Two registers: Technical (inside the product) and Discoverability (SEO surfaces only — README, plugin.json).
- Banned strings (retired as of schema v1): `second-brain`, `second brain`, `vault-synthesize`, `vault-index`.
- Banned since 1.0.0 rebrand: all `llm-wiki-stack-*` and `/llm-wiki-stack:` forms.
- `validate-docs.sh` enforces banned strings: exit 0 (clean) or exit 1 (violation with path:line:column).
- Glossary is semver: additions = minor bump; renames/meaning changes = major bump.

## Entities Mentioned

- [[claude-wiki-pages Plugin]]
- [[Deterministic Engine]]
- [[Firewall]]

## Concepts Covered

- [[Glossary Gate]]
- [[Schema Authority]]
- [[Banned Strings]]
- [[Technical Register]]
- [[Discoverability Register]]

## Grounded Pages

Wiki pages that cite this source:

- [[Glossary Terms]] — canonical terminology and banned strings
- [[Schema Authority]] — enum lists and term governance
- [[Folder Note]] — MOC and folder note terminology
- [[Four-Layer Stack]] — architecture term definitions
- [[Git Checkpoint]] — snapshot and commit backstop terms
- [[Firewall]] — vault management term definitions
- [[Deterministic Engine]] — engine term definition
- [[Wiki-Native Recall]] — retrieval term definitions
- [[NO-RAG Principle]] — NO-RAG terminology
- [[Ontology Profile v1]] — ontology terminology
- [[Entity Distribution Model]] — ingest terminology
- [[Wiki-Only Graph]] — graph config cache terminology
- [[Plugin Architecture Synthesis]] — cross-theme terminology

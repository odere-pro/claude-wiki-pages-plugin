---
title: "Glossary"
type: source
source_type: manual
source_format: text
author: ""
publisher: "claude-wiki-pages"
date_published: 2026-06-11
date_ingested: 2026-06-11
tags: [glossary, terminology, schema]
aliases: ["Glossary"]
sources: []
created: 2026-06-11
updated: 2026-06-11
status: active
confidence: 1.0
---

# Glossary

## Summary

Canonical term list for `claude-wiki-pages` enforced by `scripts/validate-docs.sh`. Organized into Technical and Discoverability registers. Covers schema terms, ontology terms, architecture terms, skill/agent naming conventions, retrieval terms, vault management terms, ingest and memory terms, capability and model terms, UX/DX terms, and banned strings. Includes a table of renamed entities from the `1.0.0` rebrand.

## Key Claims

- Glossary is "input weight" — using established PKM terms (MOC, vault, frontmatter, provenance, ingest) activates LLM priors and reduces drift.
- Technical and Discoverability registers must not mix.
- `validate-docs.sh` enforces banned strings, discoverability leaks, with exemptions for fenced code blocks.
- Banned strings: `second-brain`, `second brain`, `vault-synthesize`, `vault-index`, and all `llm-wiki-stack-*` / `/llm-wiki-stack:` pre-1.0.0 names.
- `ontology-profile-v1` is the single source of truth for predicate domain→range table and entity_type enum.
- `entity_type_extensions` is the only owner-extensible axis; all other enums are fully closed.
- Skill naming: bare short verbs (`ingest`, `lint`); agent naming: `{plugin-name}-{role}-agent`; command naming: short verbs (`wiki`, `doctor`).
- `GraphRAG`: documented direction for future `search --graph`; traversal over the existing wikilink graph, not a new index.
- `Software 3.0`: posture where docs, tools, design, context, and memory are equally accessible to humans and agents.
- `dual entry point`: `SOFTWARE-3-0.md` — link-only dev-time router, not copied into user vaults.
- `parity gate`: CI assertion that every row in the dual-entry router has non-empty human and agent cells.

## Entities Mentioned

- [[claude-wiki-pages]]
- [[Obsidian]]
- [[Karpathy LLM Wiki Pattern]]

## Concepts Covered

- [[Ontology Profile v1]]
- [[Schema]]
- [[Provenance]]
- [[MOC]]
- [[Four-Layer Stack]]
- [[GraphRAG]]
- [[Software 3.0]]
- [[Dual Entry Point]]
- [[Parity Gate]]
- [[Controlled Vocabulary]]
- [[Confidence Decay]]
- [[Staleness Signal]]
- [[Capability Tier]]

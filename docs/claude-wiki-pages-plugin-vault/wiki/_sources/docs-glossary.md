---
title: "Glossary"
type: source
source_type: manual
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["docs", "glossary"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# Glossary

## Metadata

- File: `raw/repo/docs/GLOSSARY.md`
- Type: canonical term list

## Summary

The single-source canonical glossary for claude-wiki-pages. Every doc, skill description, and user-visible string conforms to this file. validate-docs.sh enforces it in CI. Covers schema terms, ontology terms, architecture terms, skill/agent naming, retrieval terms, graph connectivity terms, vault management terms, ingest/memory terms, capability/model terms, UX/DX terms, and banned strings.

## Key Claims

Glossary is input weight not a lexicon — naming artifacts with established community terms (MOC, vault, wiki, frontmatter, provenance, ingest) activates LLM priors and lowers drift. Two registers: Technical (inside the product) and Discoverability (SEO surfaces only). The file is under semver; additions are a minor bump, renames a major bump. validate-docs.sh flags banned strings, discoverability-in-technical leaks, and enforces exemptions in code blocks. Key banned strings: second-brain, vault-synthesize, vault-index, llm-wiki-stack.

Covers: Glossary, Schema Terms, Ontology Terms, Architecture Terms, Retrieval Terms, Graph Connectivity, Naming Conventions

---
title: "ADR Index"
type: source
source_type: manual
source_format: text
url: ""
author: ""
publisher: "claude-wiki-pages project"
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["adr", "decisions"]
aliases: ["ADR Index"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# ADR Index

## Summary

The ADR README indexes all 23 Architecture Decision Records for the `claude-wiki-pages` plugin. Each ADR captures the rationale behind a system-design decision: what was decided, alternatives weighed, and revisit conditions. The contracts themselves live in `architecture.md` and `vault/CLAUDE.md`; ADRs explain _why_ a path was taken.

## Key Claims

- ADRs follow the format: Status → Date → Context → Decision → Alternatives → Consequences → Revisit When.
- Status values: Proposed, Accepted, Superseded, Deprecated.
- ADRs are immutable once accepted; changes arrive as new ADRs superseding the prior one.
- 23 ADRs cover: orchestrator design (0001), naming (0002), polish agent (0003), ontology (0004), git (0005), search scoring (0006), wiki-native recall (0007), graph traversal (0008), multi-vault (0009), durable memory (0010), local model quality gate (0011), vault merge (0012), design-drift gate (0013), required fields (0014), engine self-description (0015), multi-vault registry (0016), fabrication floor (0017), offline policy (0018), query tier (0019), scaffolding ablation (0020), folder notes (0022), wiki-only graph (0023).

## Entities Mentioned

- [[claude-wiki-pages Plugin]]

## Concepts Covered

- [[Architecture Decision Record]]
- ADR Convention (format: Status → Date → Context → Decision → Alternatives → Consequences → Revisit When)

## Grounded Pages

Wiki pages that cite this source:

- [[Architecture Decision Record]] — ADR format, conventions, all 23 ADRs

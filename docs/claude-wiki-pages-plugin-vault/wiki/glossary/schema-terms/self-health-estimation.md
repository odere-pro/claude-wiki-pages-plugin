---
title: "self-health estimation"
type: concept
aliases: []
parent: "[[schema-terms|Schema terms]]"
path: "glossary/schema-terms"
sources: ["[[docs-glossary|Canonical Glossary]]"]
related: []
tags: ["glossary", "schema-terms", "terminology"]
created: 2026-06-26
updated: 2026-06-26
update_count: 1
status: active
confidence: 0.9
---

# self-health estimation

## Definition

A deterministic 0–100 score (with an A–F grade) aggregating signals the engine already emits — dangling count, connectivity, cluster shape (`Cn`/`Ce`), structural `verify` errors, catalog coverage — plus read-only `--check` drift probes for stale `.obsidian` config and ghost links. Emitted by `scripts/health-score.sh` with a `needsHeal` flag and concrete `issues[]`; the orchestrator probes it to decide whether `/claude-wiki-pages:wiki` should run a self-heal pass. No new measurement; NO-RAG, read-only.

## Key Principles

- A deterministic 0–100 score (with an A–F grade) aggregating signals the engine already emits — dangling count, connectivity, cluster shape (`Cn`/`Ce`), structural `verify` errors, catalog coverage — plus read-only `--check` drift probes for stale `.obsidian` config and ghost links.
- Canonical term in the claude-wiki-pages **Schema terms** vocabulary; conforms to the project glossary and is enforced by `validate-docs.sh`.

## Examples

- `Cn`
- `Ce`
- `verify`
- `--check`
- `.obsidian`

## Related Concepts

Part of the **Schema terms** group: schema, schema version, migrate, frontmatter, type, sources, topic page, project page, source manifest, claim-level provenance, derived claim, vault.

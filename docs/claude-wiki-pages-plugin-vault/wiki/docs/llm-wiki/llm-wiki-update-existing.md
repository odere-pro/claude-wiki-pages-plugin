---
title: "LLM Wiki — Update an Existing Knowledge Base"
type: concept
aliases: ["llm-wiki-update-existing", "LLM Wiki Update Existing", "raw drop workflow"]
parent: "[[llm-wiki|LLM Wiki Guides]]"
path: "docs/llm-wiki"
sources: ["[[docs-llm-wiki-03|LLM Wiki Guide 03 — Update an Existing Knowledge Base]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["docs", "llm-wiki", "user-guides", "ingest"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# LLM Wiki — Update an Existing Knowledge Base

Adding new sources to a vault and triggering the ingest pipeline — via the raw drop workflow, the entity-update model, or `wire-source.sh` for the host project's own documentation.

## Definition

"Updating the knowledge base" means dropping a new raw source file into `vault/raw/` and calling `/claude-wiki-pages:wiki`, which dispatches the ingest pipeline to extract entities and concepts and update the wiki pages they inform.

## Key Principles

**Raw drop workflow.** Copy a markdown, PDF, or plain-text file into `vault/raw/`. Call `/claude-wiki-pages:wiki` (or let the maintenance loop pick it up). The orchestrator probes the backlog via `engine.sh backlog --json` and dispatches the ingest-agent for unprocessed sources.

**Entity-update model.** One source produces changes across multiple existing wiki pages rather than creating a single summary page. Ingesting a new article about Topic X rewrites/extends every page that Topic X informs — this is the "entity distribution" model.

**Ingest pipeline.** classify → extract → write source summary → create/update wiki pages → heal (curator) → polish → snapshot.

**Wire-source for host project docs.** For a project's own README and `docs/`, use `bash wire-source.sh add --vault <vault>` (ADR-0024). This pulls a docs-only, immutable snapshot into `raw/wired/<name>/`. The ingest pipeline picks up the wired sources through its recursive `raw/` enumeration.

**Git checkpoint.** Every ingest run takes a `snapshot pre` checkpoint before writing and a `snapshot post` commit after. Both the ingest writes and the heal fixes land as separate, individually revertible commits.

## Examples

Dropping an ADR PDF into `vault/raw/` and calling `/claude-wiki-pages:wiki` will extract the decision, status, drivers, and consequences, then update the architecture, graph topology, and local-model pages that the ADR informs.

## Related Concepts

The ingest pipeline contract is documented in `vault/CLAUDE.md` (13-step ingest rules). ADR-0024 defines the wire-source mechanism. ADR-0026 defines the parallel-extract fan-out when `maxParallelExtract > 1`.

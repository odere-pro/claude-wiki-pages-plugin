---
title: "Ingest Pipeline"
type: concept
aliases: ["Ingest Pipeline", "ingest pipeline", "ingest workflow", "13-step ingest"]
parent: "[[Guides]]"
path: "guides"
sources: ["[[Architecture Documentation]]", "[[User Guide 02: Create a New Vault]]", "[[User Guide 03: Update Existing Vault]]", "[[ADR-0001: Four-Layer Orchestrator]]"]
related: ["[[Ingest Agent]]", "[[Entity Distribution Model]]", "[[Git Checkpoint]]", "[[Folder Note]]", "[[Auto-Heal]]"]
tags: ["concept", "ingest", "workflow"]
created: 2026-06-13
updated: 2026-06-13
update_count: 4
status: active
confidence: 1.0
---

# Ingest Pipeline

## Definition

The ingest pipeline is the 13-step process that transforms raw source files from `vault/raw/` into structured, provenance-tracked wiki pages in `vault/wiki/`. It is owned by the [[Ingest Agent]] and governed by the ingest rules in `vault/CLAUDE.md`.

## Key Principles

The 13 steps (from `vault/CLAUDE.md`):

1. Create a source summary in `wiki/_sources/` with correct frontmatter.
2. Extract entities and concepts from the source.
3. Determine which topic folder each belongs to. Create the folder and its folder note if it does not exist.
4. Search the wiki for existing pages on each entity/concept.
5. **Update existing pages rather than creating duplicates** (entity distribution model).
6. Place new pages in the correct topic folder. Set `parent` and `path`. Author from `_templates/<type>.md` skeleton.
7. Add the new source to the `sources` field of every page touched (as `[[wikilinks]]`).
8. Increment `update_count` on every page touched.
9. Update `updated` date on every page touched.
10. Update `confidence` (reinforce if confirming, weaken if contradicting).
11. Update relevant folder notes (`children`, `child_indexes` as quoted `"[[wikilink]]"` values).
12. Update `wiki/index.md`.
13. Append to `wiki/log.md`: `## [YYYY-MM-DD] ingest | Source Title`.

## Examples

- A source about the Karpathy LLM Wiki pattern is dropped in `raw/`. The pipeline creates a source summary, extracts the concept [[LLM Wiki Pattern]], and places it in `wiki/architecture/`. If `wiki/architecture/architecture.md` already exists, it updates rather than creating a new folder.
- `subagent-ingest-gate.sh` automatically runs `verify-ingest.sh` when the ingest agent returns — any half-written state aborts the completion.

## Related Concepts

- [[Ingest Agent]] — the agent that executes this pipeline
- [[Entity Distribution Model]] — the DRY update-not-duplicate rule (step 5)
- [[Git Checkpoint]] — snapshot pre/post wraps the pipeline
- [[Folder Note]] — created for every new topic folder (step 3)
- [[Auto-Heal]] — the curator's follow-on pass that fixes structural issues

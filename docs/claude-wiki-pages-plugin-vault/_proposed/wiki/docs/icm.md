---
title: "ICM"
type: concept
aliases: ["ICM", "Incremental Context Model", "L0-L4 context decomposition", "context layers"]
parent: "[[docs|Docs]]"
path: "docs"
sources: ["[[docs-glossary|Canonical Glossary]]", "[[docs-research-foundations|Research Foundations and Prior Art]]", "[[docs-architecture|Four-Layer Architecture]]"]
related: []
tags: ["docs", "retrieval", "architecture"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: draft
confidence: 0.9
derived: false
proposed_by: "claude"
---

# ICM

The L0–L4 decomposition of the file set available to a skill or agent turn, ordering content from the most compact and always-present (schema and vocabulary) to the most detailed and selectively loaded (raw sources).

## Definition

ICM stands for Incremental Context Model. It is a five-layer decomposition of the file context that a skill turn may draw on, defined so that retrieval budget decisions are made mechanically rather than ad hoc. The engine `context` verb resolves each layer for a named skill and reports file lists plus a token estimate, letting an orchestrator or analyst choose how deep to descend before a context-budget limit is reached.

The five layers are:

- **L0** — vault schema and vocabulary: `CLAUDE.md` plus the controlled vocabulary file. Always loaded; smallest footprint.
- **L1** — MOC hierarchy: `wiki/index.md` plus every folder note in the relevant topic branch. Loaded to orient navigation.
- **L2** — topic pages: entity, concept, topic, and project pages in the retrieved working set. The main knowledge payload.
- **L3** — source summaries: the `_sources/` notes for the pages in the working set. Provenance context.
- **L4** — raw sources: the immutable files under `raw/` that the source summaries were built from. The deepest, most expensive layer; loaded only when a claim needs verification against primary material.

## Key Principles

**Budget-aware descent.** A caller descends from L0 through L4 only as far as the context budget allows. L0 and L1 are almost always affordable; L4 is loaded only for high-stakes fact-checking. MOC descent (the C1 retrieval path) navigates L1→L2 within the budget, collecting the working set without loading the entire wiki.

**Engine-resolved, not hand-wired.** The `engine context --skill <name>` verb resolves which files belong to each layer for the skill in question and reports a per-layer token estimate. Skills and agents do not hard-code file paths; they read the resolution result.

**Implements research-foundation precedent.** The L0–L4 decomposition is drawn from the ICM prior art documented in `docs/research-foundations.md`. The plugin's implementation exposes it through the engine's `context` command rather than as a standalone library.

**OKF interop.** The OKF export verb renders L2 content (wiki pages) as a portable markdown bundle; OKF import snapshots an external bundle into `raw/` (L4), ready for normal ingest.

## Examples

An analyst running a query on "orchestrator" descends L0 (schema orientation), then L1 (finds the agents folder note and vault index), then L2 (loads the orchestrator entity page and its sibling concept pages), then optionally L3 (loads the source summaries those pages cite). It stops at L3 if the context budget is consumed before L4 is needed.

The `engine context --skill ingest` command outputs a JSON report listing which files belong to each layer for the ingest skill and their estimated token counts, letting an operator see in advance how much context budget an ingest run will consume.

## Related Concepts

ICM is implemented by the engine `context` verb and consumed by the analyst agent's MOC descent (C1). It relates to OKF (the export/import pair spans L2 and L4), to the context budget and working set concepts (L2 is the working set), and to the vault schema (L0 is always the schema file).
---

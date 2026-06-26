---
title: "Dangling and Ghost Wikilinks"
type: concept
aliases: ["dangling wikilink", "ghost wikilink", "dangling link", "ghost link", "ghost node"]
parent: "[[docs|Docs]]"
path: "docs"
sources: ["[[docs-glossary|Canonical Glossary]]", "[[docs-adr-0032|ADR-0032]]"]
related: []
tags: ["docs", "graph", "lint"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: draft
confidence: 0.95
derived: false
proposed_by: "claude"
---

# Dangling and Ghost Wikilinks

Two distinct categories of broken wikilinks: a dangling link has no matching page anywhere in the vault, while a ghost link matches a page by its `title:` or `aliases:` but not by its filename basename, causing Obsidian to render a floating gray node rather than resolving to the intended page.

## Definition

**Dangling wikilink** — A `[[link]]` whose normalised target (after stripping the display alias, heading anchor, and block anchor, then lowercasing) matches no page's filename stem, `title:`, or `aliases:` entry anywhere in the vault. Obsidian renders an empty grey node in the graph view. Detected by `verify` as a WARN-severity finding `wikilink-dangling` (one finding per page/distinct-target pair) and by `scripts/graph-quality.sh`.

**Ghost wikilink** — A `[[link]]` the plugin's index resolves (matching a page's `title:` or `aliases:`) but Obsidian does not: Obsidian resolves a written link by exact vault path or filename basename only, never by title or alias. The link renders in Obsidian as a grey ghost node floating beside the real page node — the intended page is not opened, and the two nodes (real page and ghost) are not the same node in the graph. Detected by `lint --check ghost-links` as a WARN-severity `wikilink-ghost` finding and fixed by the curator agent.

The distinction matters for diagnosis and remediation:

- A **dangling** link means the target page does not exist. Fix: create the page or correct the link target.
- A **ghost** link means the link uses the page's title or alias as the target instead of its filename basename. Fix: rewrite to piped basename form `[[filename-basename|Display Text]]`.

## Key Principles

**Obsidian resolves by basename or vault path, never by title or alias.** This is the root cause of ghost links. An author who writes `[[Orchestrator Agent]]` expecting it to resolve to `wiki/agents/orchestrator-agent.md` (whose `title:` is "Orchestrator Agent") will find Obsidian creates a new, disconnected ghost node named "Orchestrator Agent" instead. The correct link is `[[orchestrator-agent|Orchestrator Agent]]`.

**The #1 ghost-source pattern in `sources:`.** Citing a source by its full title (e.g. `"[[Source: ADR 0006 — Defend with four behavioral/brand layers …]]"`) rather than its file basename produces a ghost node. The source note exists and `verify` may report clean because the plugin's resolver finds the match, but Obsidian renders a ghost. Always cite by file basename: `"[[docs-adr-0006|ADR-0006]]"`.

**Piped basename form is the remedy.** Rewriting any `[[Title Case]]` or `[[alias-match]]` link to `[[file-basename|Display Text]]` resolves both ghost and alias-collision issues. The `scripts/heal-ghost-links.sh` script automates this rewrite for links that slipped through authoring.

**Wikilink collision is a related hazard.** When a basename resolves to more than one page (one page's filename equals another's alias), Obsidian silently routes to the basename winner, shadowing the alias page. Detected by `verify` as `wikilink-collision`. The fix is path-qualification: `[[_sources/doc-name|Display]]` when the bare basename collides.

**Path-qualify only on genuine collision.** Path-qualifying a unique basename with a guessed folder creates a dangling link. Never path-qualify unless the basename actually occurs in two or more files in the vault; verify the target path exists before writing the qualified form.

## Examples

An author writes `[[Ingest Pipeline]]` intending to link to `wiki/docs/ingest-pipeline.md`. Obsidian creates a ghost node "Ingest Pipeline" beside the real page. The correct form is `[[ingest-pipeline|Ingest Pipeline]]`.

A `sources:` field entry `"[[Architecture|Architecture]]"` where the source note is named `docs-architecture.md` creates a ghost — the bare `[[Architecture]]` does not match the filename `docs-architecture`. The correct entry is `"[[docs-architecture|Architecture]]"`.

A link `[[concept.md]]` where no `concept.md` exists in the vault is a dangling wikilink — it produces an empty grey node with no target page at all.

## Related Concepts

Dangling and ghost wikilinks are caught by the `verify` engine verb (`wikilink-dangling`) and the `lint` verb (`wikilink-ghost`). They are fixed by the curator agent (`heal-ghost-links.sh`) and prevented by authoring all cross-page links in piped basename form. The piped wikilink convention and path-qualified wikilink rules define the correct authoring practice.
---

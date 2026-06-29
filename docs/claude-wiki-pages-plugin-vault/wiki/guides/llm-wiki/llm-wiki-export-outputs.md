---
title: "LLM Wiki — Export Outputs"
type: concept
aliases: ["llm-wiki-export-outputs", "LLM Wiki Export Outputs", "vault output directory"]
parent: "[[llm-wiki|LLM Wiki Guides]]"
path: "guides/llm-wiki"
sources: ["[[docs-llm-wiki-05|LLM Wiki Guide 05 — Export Outputs]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["docs", "llm-wiki", "user-guides", "output"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# LLM Wiki — Export Outputs

Exporting wiki content to deliverables — using the `vault/output/` scratch space, the OKF round-trip, or the polish agent's markdown export.

## Definition

"Export outputs" covers everything that moves wiki knowledge out of the structured wiki/ directory and into a deliverable format: reports, ADR drafts, memos, or machine-readable structured data.

## Key Principles

**vault/output/ scratch space.** User-owned directory for compiled deliverables. Plain markdown — no frontmatter schema, no validation, not tracked by the wiki's lint rules. Git-ignored by default. Write reports, ADR drafts, memos, and exports here. May use `[[wikilinks]]` in body text for Obsidian to resolve; Claude does not lint or repair these files.

**OKF round-trip.** `engine.sh okf export` produces an Open Knowledge Format snapshot of the wiki; `engine.sh okf import` reads one back. The OKF round-trip enables interoperability with other knowledge tools. The export lives in `output/` by convention.

**Polish agent markdown export.** The polish agent can compile a clean markdown export of the wiki suitable for static site publishing. This is the path for the GitHub Pages site.

**What output/ is not.** Output files are not wiki pages — they have no type, no frontmatter, no provenance tracking. They are deliverables compiled from the wiki, not part of the wiki. Do not drop them into `wiki/`.

## Examples

After an ingest run, a user might ask the analyst agent to "compile a design memo on the graph topology decisions" — the analyst produces a markdown deliverable in `output/` that synthesizes multiple ADR pages.

## Related Concepts

The `vault/output/` directory is defined in `vault/CLAUDE.md` as out-of-schema scratch space. The OKF round-trip is described in `docs/architecture.md` (engine interop). The polish agent's export path feeds the GitHub Pages site.

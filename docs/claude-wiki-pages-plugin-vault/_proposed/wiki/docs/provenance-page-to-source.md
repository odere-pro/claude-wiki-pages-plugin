---
title: "Provenance: Page to Source"
type: concept
aliases: ["provenance", "page-to-source provenance", "sources field", "provenance chain", "one-directional provenance"]
parent: "[[docs|Docs]]"
path: "docs"
sources: ["[[docs-glossary|Canonical Glossary]]", "[[docs-architecture|Four-Layer Architecture]]"]
related: []
tags: ["docs", "provenance", "architecture"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: draft
confidence: 0.95
derived: false
proposed_by: "claude"
---

# Provenance: Page to Source

The rule that every wiki page must carry at least one `sources:` wikilink pointing into `_sources/`, and that provenance flows from page to source — never in the reverse direction.

## Definition

Provenance in this plugin is the traceable chain from a wiki page's claims back to the raw material the claims were drawn from. The chain has two hops:

1. **Wiki page → source note.** Every typed wiki page (`entity`, `concept`, `topic`, `project`, `synthesis`) carries a `sources:` frontmatter field listing one or more piped wikilinks into `wiki/_sources/`. This is the primary provenance link.
2. **Source note → raw file.** Each source note in `wiki/_sources/` records the path of its origin file under `raw/` in the source note body. The raw file is the immutable primary material.

The direction is one-way: page → source, not source → page. A source note does not carry outbound wikilinks to the pages it informs. Instead, every page that draws on a source adds that source to its own `sources:` list. The source is reachable through the inbound citations on the pages that cite it, which clusters the source note with its topic rather than fusing all topics into a hairball through shared source nodes.

## Key Principles

**`sources:` is non-negotiable.** Every non-source, non-index, non-log wiki page must have at least one resolvable source citation in `sources:`. The `verify` engine verb reports a missing or unresolvable `sources:` wikilink as an ERROR-severity finding that blocks writes.

**Source notes carry no outbound wikilinks.** A source note's body contains only Metadata, Summary, and Key Claims in prose. It does not have an `## Entities Mentioned` section, a `## Concepts Covered` section, or any other mechanism for out-linking to wiki pages. This rule prevents the source from bridging all topics it covers and collapsing the topic islands.

**Every source must earn at least one inbound citation.** Because a source does not out-link, its only graph connectivity comes from the pages that cite it. A source note with no inbound citations from any wiki page is an orphan source — a lint finding. The ingest agent ensures each source note is cited by at least one page before the ingest run ends.

**Piped wikilink form only.** A `sources:` entry must be a piped wikilink `"[[source-basename|Display Text]]"` targeting the source note's file basename. A plain title string is a lint error because it produces no graph edge; a bare `[[Title]]` is a ghost node because Obsidian resolves by basename, not by title.

**Claim-level provenance via `source_quotes`.** For high-stakes claims, the optional `source_quotes` field pins the claim to a verbatim sentence: `{ source: "[[source-note]]", quote: "exact sentence" }`. The answer-verification gate uses exact substring matching, never similarity.

## Examples

A concept page on "orchestrator" carries `sources: ["[[docs-architecture|Four-Layer Architecture]]"]`. The source note `wiki/_sources/docs-architecture.md` records `raw/repo/docs/architecture.md` as its origin. A human tracing the claim "orchestrator probes vault state" reads the concept page, follows the source note link, and finds the sentence in the raw file.

An ingest run that creates a new source note for `raw/topic/new-source.md` also adds `"[[new-source|New Source]]"` to `sources:` on every wiki page the ingest agent creates or updates from that source.

## Related Concepts

Page-to-source provenance is enforced by the `verify` engine verb (ERROR on missing sources), the `sources:` field definition, the source note format (body only, no outbound links), and the provenance-completeness lint rule. It is grounded in the W3C PROV prior art (see the PROV concept page) and measured by `scripts/verify-ingest.sh`.
---

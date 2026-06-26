---
title: "PROV"
type: concept
aliases: ["PROV", "W3C PROV", "provenance chain", "provenance"]
parent: "[[docs|Docs]]"
path: "docs"
sources: ["[[docs-glossary|Canonical Glossary]]", "[[docs-research-foundations|Research Foundations and Prior Art]]", "[[docs-architecture|Four-Layer Architecture]]"]
related: []
tags: ["docs", "provenance", "architecture"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: draft
confidence: 0.9
derived: true
proposed_by: "claude"
---

# PROV

The traceable chain from a wiki page's `sources` field through the `_sources/` summary to the immutable raw content, implementing the W3C PROV model's intent without using RDF or a triplestore.

## Definition

PROV is the plugin's structural provenance model, inspired by but not implementing the W3C PROV standard in its full RDF form. In PROV terms, a wiki page is an entity derived from one or more source entities (the `_sources/` summaries), which are themselves derived from the raw source files. The two-hop chain — wiki page → source note → raw file — is the complete provenance trace for any claim in the wiki.

The plugin implements provenance through two schema mechanisms:

1. **`sources:` field** on every typed wiki page — a required list of piped wikilinks pointing into `wiki/_sources/`. No wiki page is written without at least one source citation; the `verify` command enforces this as an ERROR-severity finding.
2. **`source_quotes:` field** (schema v2, optional) — claim-level provenance that pins a specific claim to a verbatim sentence from the source, expressed as `{ source: "[[source-note]]", quote: "verbatim sentence" }` objects.

## Key Principles

**Structural, not inferential.** Provenance in this plugin is a hard structural link: a page without a resolvable `sources:` wikilink fails `verify`. There is no probabilistic assessment of whether a page's claims are grounded — the wikilink is the ground.

**One-directional.** Provenance flows from page to source, never in reverse. A source note does not carry outbound wikilinks to the pages it informs. Instead, each wiki page that draws on a source lists it in its own `sources:` field. The source is reached through the inbound citations, which cluster it with its topic rather than fusing all topics into a hairball through the source.

**Two-hop chain.** The full provenance trace is wiki page → `_sources/<source>.md` → `raw/<original-file>`. The engine's `verify` command checks the first hop (does the `sources:` wikilink resolve?); the source note's body records the `raw/` path for the second hop.

**Claim-level provenance via `source_quotes`.** For high-stakes or contested claims, the optional `source_quotes` field pins a claim to a specific verbatim sentence. The answer-verification gate for local models uses this mechanism: a cited quote must be an exact substring of the cited page, not a paraphrase.

**`derived: true` marks inference.** When a claim is LLM synthesis across sources rather than stated in any single source, the page carries `derived: true` and `confidence` below 0.8. This makes the inferential step explicit for reviewers.

## Examples

A concept page on "orchestrator" in the agents topic carries `sources: ["[[docs-architecture|Four-Layer Architecture]]"]`. The `docs-architecture` source note records `raw/repo/docs/architecture.md` as its origin file. A human or agent tracing the claim "orchestrator probes vault state" can read the concept page, follow the source note link, and find the exact sentence in the raw file.

A synthesis note comparing two ADRs might carry `derived: true` and `confidence: 0.7` because the comparison is an inference across two sources, not a statement in either.

## Related Concepts

PROV relates to the `sources:` field (the primary provenance mechanism), to the source notes in `_sources/` (the intermediate provenance tier), to the `verify` engine verb (which enforces provenance completeness), to `source_quotes` (claim-level provenance), and to the `derived` field (which marks inferential claims).
---

---
title: "OKF"
type: concept
aliases: ["OKF", "Open Knowledge Format", "OKF bundle", "OKF interop"]
parent: "[[docs|Docs]]"
path: "docs"
sources: ["[[docs-glossary|Canonical Glossary]]", "[[docs-research-foundations|Research Foundations and Prior Art]]"]
related: []
tags: ["docs", "interop", "retrieval"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: draft
confidence: 0.9
derived: false
proposed_by: "claude"
---

# OKF

A portable markdown bundle convention (Open Knowledge Format, originally Google) that the plugin uses as its primary interoperability surface for exporting wiki content and importing external knowledge collections.

## Definition

OKF stands for Open Knowledge Format. It is a portable, plain-markdown bundle convention that defines how structured knowledge is represented in a directory of markdown files with a flat index catalog. The plugin's vault schema is a superset of OKF's model: the `type`, `title`, `description`, `tags`, `sources`, and `url` frontmatter fields map onto OKF's model, so the conversion is lossless in the schema dimensions OKF covers.

Two engine verbs implement the round-trip:

- **`engine okf export`** — renders the `wiki/` content as an OKF bundle: plain-markdown files (frontmatter stripped, `[[wikilinks]]` rewritten as relative links) plus a flat machine `index.md` catalog listing path, type, title, description, and link targets for every exported page.
- **`engine okf import`** — snapshots an external OKF bundle into `vault/raw/okf/<bundle>/` as immutable source material, ready for normal ingest. The snapshot is treated as untrusted data, not as instructions.

## Key Principles

**Superset relationship.** The vault schema covers all OKF fields and adds provenance-specific fields (`sources`, `confidence`, `derived`) and structural fields (`parent`, `path`, `entity_type`). Export strips the vault-specific fields and rewrites links; import treats the bundle as raw content from which ingest extracts structure.

**Round-trip fidelity.** Export → import cycles preserve the content that OKF models. Fields not in OKF's model (provenance, `confidence`, graph structure) are reconstituted by ingest from the bundle's content during re-ingestion.

**Immutable snapshots.** An imported bundle lands in `raw/okf/<bundle>/` under the raw directory's immutability guarantee. The `protect-raw.sh` hook prevents agent writes there; `sync` is the controlled update path if a bundle is versioned.

**ICM layer mapping.** An OKF export corresponds to L2 (topic pages) of the ICM hierarchy; an imported bundle enters at L4 (raw sources) and rises through ingest to L2.

## Examples

A team maintaining a shared OKF knowledge base of technical standards can export their bundle and import it into the plugin vault. The ingest pipeline reads the bundle's markdown files from `raw/okf/standards/`, extracts entities and concepts, and writes typed wiki pages that cite the bundle's source notes.

An operator wanting a portable snapshot of the wiki for use in another tool runs `engine okf export --target <vault> --out /tmp/wiki-export`. The resulting directory contains plain markdown with relative links, readable by any markdown tool.

## Related Concepts

OKF relates to the ICM context layers (import at L4, export at L2), to the ingest pipeline (imported bundles are processed by ingest), to the raw content immutability guarantee (imports are write-protected), and to the source manifest (imported pages appear as processed entries).
---

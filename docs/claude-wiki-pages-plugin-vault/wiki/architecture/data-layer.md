---
title: "Data Layer"
type: concept
aliases: ["Data Layer", "Layer 1", "Layer 1 — Data"]
parent: "[[Architecture]]"
path: "architecture"
sources: ["[[architecture]]"]
related: ["[[Four-Layer Stack]]", "[[Skills Layer]]", "[[Orchestration Layer]]"]
tags: [architecture, data, provenance]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 1.0
---

# Data Layer

Layer 1 — Data is the passive foundation of the four-layer stack. It holds immutable source material and the wiki schema. Everything else in the system either reads from or writes to it.

## What Lives Here

- **`raw/`** — Immutable source material. Sources dropped here are never modified. The `protect-raw.sh` hook enforces immutability by blocking any `Edit` to existing files or `Write` that would overwrite them.
- **`wiki/`** — LLM-maintained typed pages. All knowledge pages live here. Every page carries YAML frontmatter (the schema) and links back to at least one raw source.
- **`CLAUDE.md`** — The vault schema. This is the authority that skills and agents defer to. It defines the frontmatter schema, page types, required fields, and ingest rules.

## Provenance by Construction

Every claim in every wiki page carries a `sources` field back to at least one `raw/` item. This makes provenance structural, not cultural — the system enforces it rather than relying on convention. Plain strings in `sources` are a lint error; the field must use `[[wikilinks]]` to `_sources/` entries.

## The Two-Directory Pattern

The vault splits content into `raw/` (immutable, human-curated) and `wiki/` (LLM-maintained). This separation is the core contract: the LLM reads from `raw/`, writes to `wiki/`, and never rewrites sources. A source that becomes outdated is marked `superseded_by` in its `_sources/` entry — the original file stays intact.

## Optional Directories

- **`_proposed/`** — Staging area for drafted pages awaiting review. Sits outside wiki-scoped checks until a draft is promoted.
- **`output/`** — User-owned scratch space for deliverables. Git-ignored, no schema, not validated.

See [[Four-Layer Stack]] for the full picture.

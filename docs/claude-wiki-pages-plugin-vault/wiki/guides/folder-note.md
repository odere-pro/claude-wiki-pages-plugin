---
title: "Folder Note"
type: concept
aliases: ["Folder Note", "folder note", "per-folder index", "MOC"]
parent: "[[Guides]]"
path: "guides"
sources: ["[[ADR-0022: Folder Notes and Graph Quality]]", "[[Architecture Documentation]]", "[[Glossary]]"]
related: ["[[Ingest Pipeline]]", "[[Polish Agent]]", "[[Wiki-Only Graph]]", "[[Schema Authority]]"]
tags: ["concept", "schema", "moc"]
created: 2026-06-13
updated: 2026-06-13
update_count: 3
status: active
confidence: 1.0
---

# Folder Note

## Definition

A folder note is the per-folder index file, named exactly after its folder — `wiki/<topic>/<topic>.md`, `type: index` (schema v3). It serves as the navigable Map of Content (MOC) for that branch of the wiki topic tree. The root index is always `wiki/index.md`.

## Key Principles

- **Naming:** filename stem == folder name. `wiki/architecture/architecture.md` is the folder note for `wiki/architecture/`.
- **`type: index`:** folder notes keep `type: index`, never `type: topic`.
- **Hierarchy fields must be `"[[wikilink]]"` values:** `parent`, `children`, and `child_indexes` must be quoted wikilink strings — plain title strings produce no graph edge and are a lint finding.
- **`aliases` required:** must include topic name in common variations (slug, title case, abbreviations) so wikilinks resolve from any name variant.
- **Legacy `_index.md`:** accepted but flagged `legacy-index-filename` in schema_version 3. Remediation: `bash scripts/engine.sh migrate --write`.
- **Ghost-node prevention:** the folder note's `title` must appear as the first entry in `aliases`.

## Examples

```yaml
---
title: "Architecture"
type: index
aliases: ["Architecture", "architecture", "plugin architecture"]
parent: "[[Wiki Index]]"
path: "architecture"
children: ["[[Four-Layer Stack]]", "[[Deterministic Engine]]"]
child_indexes: []
```

## Related Concepts

- [[Ingest Pipeline]] — creates folder notes (step 3) and updates them (step 11)
- [[Polish Agent]] — reconciles folder note children against filesystem siblings
- [[Wiki-Only Graph]] — graph color groups use `path:wiki/<topic>` to match folder notes
- [[Schema Authority]] — `CLAUDE.md` that defines the folder note schema

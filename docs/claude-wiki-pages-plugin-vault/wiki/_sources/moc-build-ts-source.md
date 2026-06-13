---
title: "moc-build.ts Source"
type: source
source_type: manual
source_format: text
url: ""
author: ""
publisher: "claude-wiki-pages project"
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["engine", "typescript", "moc", "repair"]
aliases: ["moc-build.ts Source"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# moc-build.ts Source

## Summary

`src/core/moc-build.ts` provides the deterministic builders for the safe subset of MOC repairs the `fix` verb applies. All operations are idempotent — running on an already-correct file produces byte-identical output. Body prose is never touched; only structural frontmatter lists and duplicate index bullets (which have one correct value) are modified. Three public functions: `replaceYamlListField()`, `syncChildren()`, `dedupeIndexLinks()`, and `buildIndexStub()`.

## Key Claims

- `replaceYamlListField()` handles both inline (`field: [...]`) and block (`field:\n  - …`) YAML list forms.
- `syncChildren()` sets the `children:` frontmatter list of an index file to the given titles as quoted wikilinks.
- `dedupeIndexLinks()` removes duplicate single-wikilink bullet lines from an index body, keeping the first.
- `buildIndexStub()` creates a minimal schema-shaped folder note (`<folder>/<folder>.md`) with folder-note naming.
- The stub uses `titleCase` (split on `[-_]`, capitalize each word) to form the folder note title `"FolderName — Index"`.
- Only single-wikilink bullet lines are subject to deduplication; multi-link lines are kept.

## Entities Mentioned

- [[Deterministic Engine]]

## Concepts Covered

- [[MOC Repair Primitives]]
- [[Engine Verb Surface]]

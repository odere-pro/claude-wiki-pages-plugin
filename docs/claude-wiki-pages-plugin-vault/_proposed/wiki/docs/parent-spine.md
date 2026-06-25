---
title: "Parent Spine"
type: concept
aliases: ["parent spine", "spine", "spine edge", "parent hierarchy", "topic path"]
parent: "[[docs|Docs]]"
path: "docs"
sources: ["[[docs-glossary|Canonical Glossary]]", "[[docs-adr-0036|ADR-0036]]"]
related: []
tags: ["docs", "graph", "architecture"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: draft
confidence: 0.95
derived: false
proposed_by: "claude"
---

# Parent Spine

The `parent:`/`children:`/`child_indexes:` chain that runs from the vault root MOC down through folder notes to leaf pages, forming the only permitted wikilink edges in a strict-tree vault.

## Definition

The parent spine is the hierarchical backbone of the wiki graph. It is the set of wikilink edges formed by:

- Each non-root page's `parent:` field, pointing to the folder note of its containing folder.
- Each folder note's `children:` field, listing its direct page children.
- Each folder note's `child_indexes:` field, listing its direct child folder notes.
- The vault MOC's (`wiki/index.md`) `child_indexes:` entries, one per top-level topic folder note.

Together these form a directed tree rooted at `wiki/index.md`. In ADR-0036's strict-tree topology, these spine edges are the only wikilinks that produce visible edges in Obsidian's topic graph view. All other wikilinks are either excluded from the topic graph view (provenance `sources:` pointing to `_sources/`) or demoted to plain prose and tags by `strict-tree-reduce.sh`.

A spine edge is distinct from an associative edge (a `related:`, `depends_on:`, or similar link between pages that are not in a direct parent-child relationship). In strict-tree mode only spine edges draw.

## Key Principles

**`parent:` is mandatory on every non-root page.** The field value must be a piped wikilink in the form `"[[folder-note-basename|Folder Title]]"` targeting the containing folder note's file basename. A plain title string or a bare `[[Title]]` produces no graph edge and is a lint error.

**`children:` and `child_indexes:` are the downward mirror.** When a page is added to a folder, the folder note's `children:` list gains a piped wikilink entry for that page. When a subfolder is created, the folder note's `child_indexes:` list gains a piped wikilink to the new subfolder's folder note.

**Topic path is depth.** The topic path is the chain of ancestors from a page up to ROOT, following `parent:` links. Its length is the page's depth (ROOT is depth 0, top-level folder notes are depth 1). The engine's `deriveSpine` function in `src/core/spine.ts` computes topic paths and uses them to detect transitive-redundant edges (A→C where C is on A's topic path) and pages that never reach ROOT.

**`parent:` targets the folder note, not the folder.** The folder note is the file named exactly after its folder (`wiki/<topic>/<topic>.md`). The `parent:` field targets this file's basename, not the folder path. In piped form: `"[[agents|Agents]]"` targeting `wiki/agents/agents.md`.

**Depth cap at four levels.** The topic tree must not exceed four levels of nesting. Deeper nesting signals a need to split into a sibling topic; lint reports excessive nesting as an Info finding.

## Examples

A concept page at `wiki/agents/orchestrator.md` carries `parent: "[[agents|Agents]]"`. The agents folder note at `wiki/agents/agents.md` carries `children: ["[[orchestrator|Orchestrator]]"]`. The vault MOC at `wiki/index.md` carries `child_indexes: ["[[agents|Agents]]"]`. These three links form the complete spine segment for this page: ROOT → agents folder note → orchestrator concept.

A subtopic page at `wiki/agents/routing/routing.md` (a folder note itself) carries `parent: "[[agents|Agents]]"` and appears in the agents folder note's `child_indexes:`. Its own pages carry `parent: "[[routing|Routing]]"`.

## Related Concepts

The parent spine is the structural foundation of the folder note convention, the strict-tree topology rule, and MOC descent. It is validated by `verify` (missing `parent:` is an ERROR) and measured by `graph-quality.sh`. The `deriveSpine` function in `src/core/spine.ts` is the canonical implementation.
---

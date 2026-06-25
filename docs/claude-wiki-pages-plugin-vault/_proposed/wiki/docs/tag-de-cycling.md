---
title: "Tag De-Cycling"
type: concept
aliases: ["tag de-cycling", "tag de-cycle", "cross-tree tagging", "topic tag", "demoted edge tag"]
parent: "[[docs|Docs]]"
path: "docs"
sources: ["[[docs-glossary|Canonical Glossary]]", "[[docs-adr-0036|ADR-0036]]"]
related: []
tags: ["docs", "graph", "architecture"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: draft
confidence: 0.9
derived: false
proposed_by: "claude"
---

# Tag De-Cycling

The mechanism by which a cross-tree wikilink `A`→`B` (where A and B live in different topic trees) is replaced by the nested tag `topic/<B-tree>` on page A, preserving the associative relationship in the tag layer while removing the cycle-closing edge from the graph.

## Definition

Tag de-cycling is the transformation applied by `scripts/strict-tree-reduce.sh --apply` when it encounters a non-spine wikilink that crosses two different topic trees. The name reflects the purpose: a cross-tree edge creates a cycle in the topic-island topology (tree X → tree Y forms a bridge that merges the two islands), so the edge is "de-cycled" by removing it and recording the relationship as a tag instead.

The transformation is:
1. Remove the `[[wikilink]]` A→B from page A's body or frontmatter association field.
2. Add the tag `topic/<B-tree>` to page A's `tags:` frontmatter list.
3. Optionally write the relationship as plain prose in page A's body (e.g. "Related topic: B's topic name").
4. Commit the change as a reviewable diff.

The `topic/<B-tree>` tag is a nested tag using the slash taxonomy (e.g. `topic/architecture`, `topic/retrieval`). In Obsidian's tag pane, these appear under a collapsible `topic/` group, so a reader browsing page A can see which other topic trees it relates to without needing a graph edge to find them.

## Key Principles

**Relationship is preserved, edge is removed.** Tag de-cycling does not destroy information — it moves it from the graph layer (a wikilink edge that appears in Obsidian's graph view) to the tag layer (a `topic/<tree>` tag that appears in the tag pane and color groups). A reader can still discover the relationship; the graph just does not draw an edge for it.

**`topic/` tags are author-only via the strict-tree reducer.** The schema convention says: do not write `topic/<tree>` tags by hand. `strict-tree-reduce.sh --apply` is the authoritative writer of these tags. Manual additions are fine for bootstrap, but the tool is the authoritative source. This keeps the tag set consistent with the actual demoted-edge set.

**Tag de-cycling does not apply within a topic.** The de-cycling transformation applies only to cross-tree edges (A in tree X → B in tree Y). Within a single topic tree, non-spine edges are demoted to plain prose without a `topic/<tree>` tag (because the tag would be `topic/<X>` on a page already in tree X, which is redundant).

**Transitive-redundant edges are demoted without tagging.** An edge A→C where C is already on A's topic path (a transitive-redundant edge) is removed without adding a `topic/<tree>` tag — the spine already expresses the reachability, so no tag is needed.

**Color groups use `topic/<tree>` as a cross-topic dimension.** In Obsidian's graph filter and color configuration, pages tagged `topic/architecture` (meaning "this page in another tree relates to the architecture topic") can be highlighted to show cross-topic bridges in the tag layer without creating edges in the graph layer.

## Examples

A concept page in `wiki/retrieval/` carries `related: ["[[strict-tree-reduce|Strict-Tree-Reduce]]"]` linking to a page in `wiki/architecture/`. After `strict-tree-reduce.sh --apply`, the `related:` entry is removed and `topic/architecture` is added to the retrieval page's `tags:` list. The association is preserved in the tag pane; the graph no longer draws an edge between the retrieval island and the architecture island.

A concept page in `wiki/docs/` previously linked via `depends_on: ["[[deriveSpine|deriveSpine]]"]` to a page in `wiki/agents/`. After reduction, the `depends_on:` entry is removed and `topic/agents` is added to the docs page's tags. The relationship remains discoverable by filtering on the `topic/agents` tag.

## Related Concepts

Tag de-cycling is performed by `scripts/strict-tree-reduce.sh`. It is part of the strict-tree topology enforcement (ADR-0036). The nested tag taxonomy (`topic/<tree>`, `family/<x>`, `severity/<x>`, `principle/<x>`) is defined in the vault schema. The tag pane in Obsidian is the primary discovery surface for de-cycled relationships. The connected-component metric in `graph-quality.sh` verifies that de-cycling has removed the cross-tree edges.
---

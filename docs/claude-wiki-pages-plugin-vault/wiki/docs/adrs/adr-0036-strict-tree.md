---
title: "ADR-0036: Strict-Tree Topology"
type: entity
entity_type: standard
aliases: ["ADR-0036", "adr-0036", "strict tree ADR", "strict-tree topology ADR"]
parent: "[[adrs|ADRs]]"
path: "docs/adrs"
sources: ["[[docs-adr-0036|ADR-0036: Strict-Tree Topology]]"]
related: []
tags: ["docs", "adrs", "graph"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# ADR-0036: Strict-Tree Topology

The decision to keep ONLY spine edges (`parent`/`children`/`child_indexes`) among visible topic pages, demoting all other associations (including same-topic `related`) to nested tags.

## Overview

ADR-0036 is the strictest graph-shaping rule. It supersedes the linking rule of ADR-0033 (topic-local linking) while retaining ADR-0033's three-layer infrastructure. Among visible topic pages, the graph is now a pure tree — folder notes linked to their children, and `wiki/index.md` linked to the top-level folder notes, and nothing else.

## Key Facts

**Status:** Accepted

**Problem being solved:** Even after ADR-0033 restricted cross-topic links, four mechanisms inside each topic re-produced a dense blob: (1) intra-topic non-spine sibling edges; (2) transitive-redundant edges (A→C where C is already on A's spine path); (3) oversaturated nodes accreting tens of outbound links; (4) `related:`/associative frontmatter fields carrying intra-topic edges. The topic-local rule did not go far enough.

**Decision rule:** Keep a link iff it is a `parent↔child` spine edge or the ROOT→folder-note connector. Demote everything else.

**Exempt from demotion:** `parent`/`children`/`child_indexes` (spine) and `sources:` → `wiki/_sources/**` (provenance, always exempt).

**What becomes a tag:** Association fields (`related`, `depends_on`, `key_pages`, `members`, `scope`, `contradicts`, `supersedes`) carry NO graph edges among visible pages. A cross-tree reference `A (tree X) → B (tree Y)` becomes the nested tag `topic/<Y>` on A.

**Implementation:** `scripts/strict-tree-reduce.sh` (dry-run by default, `--apply` to execute): demotes non-spine body wikilinks to plain text, prunes non-spine entries from association frontmatter fields, records a `topic/<tree>` tag for each demoted cross-tree edge. Never creates dangling links.

**Metrics:** `scripts/graph-quality.sh` measures Cn (connected components), Ce (edge count), transitive-redundant count, oversaturated nodes. Target: one connected component per top-level topic, zero cross-topic edges.

**Spine computation:** `src/core/spine.ts:deriveSpine` computes the authoritative spine by reading `parent:`/`children:`/`child_indexes:` frontmatter. `scripts/tree-lint.sh` checks the graph against the computed spine.

**Doctor check D12:** Verifies that no visible page has a non-spine outbound wikilink. Reports violations with paths and remediation command.

**Tag de-cycling:** A demoted cross-tree edge becomes `topic/<tree>` tag on the source node. The relationship stays discoverable in the tag pane without an edge.

## Related

ADR-0033 (Topic-Local Linking) remains in force for its three-layer infrastructure. The strict tree topology concept page describes the topology in end-user terms. The `strict-tree-reduce.sh` remediation script is the authoritative implementation.

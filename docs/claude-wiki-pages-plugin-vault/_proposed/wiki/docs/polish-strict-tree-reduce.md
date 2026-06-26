---
title: "Polish and Strict-Tree-Reduce"
type: concept
aliases: ["polish step", "polish agent", "strict-tree-reduce", "strict-tree-reduce.sh", "tail-of-write"]
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

# Polish and Strict-Tree-Reduce

The tail-of-write step, owned by the `claude-wiki-pages-polish-agent`, that keeps the Obsidian-side graph, vault MOC, and folder-note consistency in sync after every ingest or curator pass — including running `strict-tree-reduce` to enforce the strict-tree topology.

## Definition

Polish is Step 1.7 of the ingest pipeline (a marker step — all work is delegated to the polish agent). The orchestrator runs the `claude-wiki-pages-polish-agent` after the ingest agent and curator agent return successfully. Polish owns three idempotent operations:

1. **Graph colors** — for any new top-level topic folder created by ingest, add a color group to `.obsidian/graph.json` (`path:wiki/<topic>` query with a unique color).
2. **Vault MOC regeneration** — rebuild `wiki/index.md` from the per-folder folder notes with current page counts.
3. **Folder note consistency** — reconcile every folder note's `children:` and `child_indexes:` against the actual filesystem siblings (append-only; never deletes existing entries so hand-curated groupings survive).

The `strict-tree-reduce.sh` script is a separate tool that the curator agent or polish step may invoke when non-spine wikilinks are present. It is the primary remediation path for ADR-0036 strict-tree violations.

## Key Principles

**Polish is append-only.** When the polish agent reconciles folder notes, it adds missing children entries but never deletes entries that already exist. A human who hand-groups children under themed section headings will not have that work overwritten by the next ingest run.

**`strict-tree-reduce.sh` runs before `disentangle-links.sh`.** In the ADR-0036 remediation order, `strict-tree-reduce.sh` runs first (it demotes non-spine body wikilinks and prunes non-spine frontmatter entries), then any remaining cross-domain links can be addressed. The `disentangle-links.sh` script (the ADR-0033-era reducer) is retired; `strict-tree-reduce.sh` is its sole successor.

**Dry-run by default.** `strict-tree-reduce.sh` reports what it would demote without making changes unless `--apply` is passed. This allows an operator to inspect the demotion list before committing it. Each demoted cross-tree edge is recorded as a `topic/<tree>` tag so the relationship remains discoverable.

**Graph config is regenerable cache.** The `.obsidian/graph.json` and the polish agent's output are fully regenerable from the topic tree. If graph config is lost or corrupted, delete it and re-run the polish agent (or `/claude-wiki-pages:obsidian-graph-colors`) to rebuild deterministically.

**Not user-invocable directly.** The polish agent is dispatched by the orchestrator after ingest or curator, not called directly by users. Individual skills (`/claude-wiki-pages:obsidian-graph-colors`, `/claude-wiki-pages:index`) cover specific sub-tasks for power users.

## Examples

After an ingest run adds pages to a new topic folder `wiki/security/`, the polish agent adds a color group `{ "query": "path:wiki/security", "color": {"r": 255, "g": 150, "b": 80} }` to `.obsidian/graph.json` and updates `wiki/index.md` to list `[[security|Security]]` under `child_indexes:`.

Running `bash scripts/strict-tree-reduce.sh --target docs/vault` (dry-run) reports: "3 non-spine body wikilinks to demote, 1 cross-tree edge to tag as topic/architecture." Running with `--apply` makes the changes and commits them.

A folder note for the agents topic has a hand-curated `## Orchestration Agents` section grouping certain children. After the next ingest adds a new agent page, the polish agent appends `- [[new-agent|New Agent]] — one-line summary` to the `## Other Agents` section (or the most relevant section) without disturbing the hand-curated groupings.

## Related Concepts

Polish is the tail-of-write step owned by the `claude-wiki-pages-polish-agent`. It depends on the strict-tree topology rule (ADR-0036), the folder note convention, and the graph color configuration. `strict-tree-reduce.sh` implements the strict-tree reducer. The `graph-quality.sh` and `tree-lint.sh` scripts measure whether the strict-tree target has been reached.
---

# ADR-0033: Topic-local linking and the topic-island graph view

> [!important] Superseded by [ADR-0036](./ADR-0036-strict-tree-topology.md)
> The topic-local linking *rule* below is superseded by strict-tree (ADR-0036),
> and its remediation script `scripts/disentangle-links.sh` has been **retired** —
> `scripts/strict-tree-reduce.sh` (whose keep predicate is a strict subset) is now
> the sole link reducer. ADR-0033's connectivity metric, island view filter, and
> ROOT-hub remain in force. This ADR is kept as the historical record.

- **Status:** Superseded by ADR-0036
- **Date:** 2026-06-15
- **Builds on:** [ADR-0022](./ADR-0022-folder-notes-and-graph-quality.md) (folder notes + cluster metric), [ADR-0023](./ADR-0023-wiki-only-graph.md) (wiki-only graph, `userIgnoreFilters`), [ADR-0030](./ADR-0030-obsidian-accurate-resolution-and-collision.md) (Obsidian-accurate resolution), [ADR-0031](./ADR-0031-graph-connectivity-orphans-shadows.md) (connectivity metric)
- **Anchor:** §4 (Layer 1 — Data), the schema authority (`skills/init/template/CLAUDE.md`), the `obsidian-graph-colors` skill, `scripts/graph-quality.sh`
- **Owner:** Lane B (schema) + Lane D (UX/graph) — `CLAUDE.md` linking conventions, `skills/obsidian-graph-colors`, `scripts/disentangle-links.sh`

## Context

The schema already names the desired graph shape — **topic islands** — and already
forbids one hairball source: a `_sources/` summary carries no outbound `[[wikilinks]]`
because "out-linking from a source would fan across every topic the source touches and
collapse the graph's topic islands into a hairball." That rule was necessary but not
sufficient. Two further mechanisms re-fused every topic into a single dense component
(empirically: one connected blob of 191 of 217 nodes, ~1000 cross-topic edges, every
top-level topic folder richly linked to every other — the classic force-graph hairball):

1. **Cross-topic association links.** `related:`/`depends_on:`/`key_pages:`/`members:`/
   `scope:` frontmatter and inline body `[[wikilinks]]` freely pointed from a page in one
   top-level topic folder to a page in another. The ontology's `related` row places no
   topic constraint on its range, so "see also" links sprawled across the whole tree.
2. **Multi-cited provenance + cross-cutting hubs as graph nodes.** A `_source` cited by
   pages in four different topics becomes a four-way bridge; `index.md`, `log.md`, and the
   `_synthesis/` notes each link into every topic. Shown as graph nodes, they stitch all
   islands back together even with zero cross-topic *topic* links.

The objective end-state the user converged on (reference screenshots: 6 and 7 are the
hairball, 8 is the target) is **per-topic islands**: edges stay within a topic; cross-topic references
survive as readable prose, not graph edges; the provenance/MOC scaffolding is present in
the vault but not drawn in the topic graph. Some orphan/leaf pages are acceptable.

This does **not** contradict ADR-0031. That connectivity metric measures the *full* node
universe (including `_sources`/`_synthesis`/`index`/`log`), where the vault remains one
provenance-connected component — provenance is untouched. This ADR governs (a) what links
authors write and (b) what the *graph view* draws. Two different universes, one healthy.

## Decision

### 1. Topic-local linking is the authoring rule

A `[[wikilink]]` between two **visible topic pages** (pages under a top-level topic folder,
excluding the hidden scaffolding of §3) MUST stay within the **same top-level topic
folder**. A cross-topic reference is written as **plain prose** (the page's title as text),
not a wikilink. The spine and provenance are explicitly exempt and unchanged:

- `parent:` (up to the folder note, then to `index.md`) — the navigation spine.
- `sources:` → `wiki/_sources/**` — provenance citation, never demoted (page → source).
- `children:`/`child_indexes:` on a folder note → its own pages (same topic by construction).

The association fields `related`/`depends_on`/`key_pages`/`members`/`scope`/`contradicts`/
`supersedes` are pruned to same-topic targets. The ontology `related` range gains a
topic-locality note. Rule of thumb: **cut a link iff both endpoints are visible topic
pages in different top-level folders; keep everything else.**

### 2. `scripts/disentangle-links.sh` applies the rule to an existing vault

A read-only-by-default bash + python3 pass (mirrors `graph-quality.sh`'s ADR-0030
resolver) that, with `--apply`, demotes cross-topic body links to their display text and
prunes cross-topic entries from the association frontmatter fields. It never touches
`parent`/`sources`/`children`/`child_indexes`, never creates dangling links (it demotes to
text, it does not delete targets), and is git-checkpointed. It is the remediation twin of
the authoring rule, the same way `fix`/`heal` remediate verify findings.

### 3. The topic graph view excludes the connective scaffolding

`.obsidian/graph.json`'s graph **search filter** excludes `wiki/_sources/`,
`wiki/_synthesis/`, `wiki/index.md`, and `wiki/log.md` from the topic graph, alongside the
existing `raw/ _templates/ _proposed/ _inbox/ output/` exclusions. These nodes remain real
pages in the vault (provenance, MOC, activity log); they are simply not drawn in the topic
graph, so the islands render cleanly. This reverses the prior `obsidian-graph-colors`
default of `search: ""` + `_sources`/`_synthesis` color groups. `graph.json` is regenerable
cache (ADR-0023): the skill rebuilds the exclusions deterministically, so the policy lives
in the skill, not only in the local file.

### 4. Measurability

`scripts/graph-quality.sh` keeps the full-universe connectivity metric (ADR-0031). The
rendered-island structure is verified by resolving the same link set over the filtered node
set: a healthy topic graph has one component **per top-level topic** and zero cross-topic
edges among visible pages. (The dogfood vault: 7 islands of sizes 28/24/23/18/16/8/7, 0
cross-topic edges, down from a single 191-node blob.)

## Alternatives considered

- **Keep cross-topic `related` links, hide nothing.** Rejected: that is the hairball — the
  state this ADR exists to fix.
- **Delete cross-topic links entirely (no prose fallback).** Rejected: the reference is
  often genuinely useful to a reader; demoting to text preserves the information and only
  drops the graph edge.
- **Show `_sources` in the graph as a leaf ring.** Rejected: multi-cited sources bridge
  topics and re-fuse the islands; a cited source is not a graph orphan. Provenance is kept
  in the data, not drawn in the topic graph.
- **Strip `sources:` citations to force `_sources` orphans.** Rejected: provenance is
  load-bearing, non-negotiable data (schema §`sources`). Hiding from the *view* preserves
  it; deleting it does not.

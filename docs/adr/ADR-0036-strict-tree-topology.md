# ADR-0036: Strict-tree topology — spine edges, tag de-cycling, transitive reduction

- **Status:** Proposed
- **Date:** 2026-06-24
- **Builds on:** [ADR-0022](./ADR-0022-folder-notes-and-graph-quality.md) (folder notes + cluster metric), [ADR-0031](./ADR-0031-graph-connectivity-orphans-shadows.md) (connectivity metric), [ADR-0032](./ADR-0032-piped-path-qualified-wikilinks.md) (piped/path-qualified wikilinks), [ADR-0033](./ADR-0033-topic-local-linking-and-island-graph.md) (topic-local linking + island graph)
- **Anchor:** §4 (Layer 1 — Data), the schema authority (`skills/init/template/CLAUDE.md`), `src/core/spine.ts`, `scripts/graph-quality.sh`, `scripts/tree-lint.sh`, `scripts/strict-tree-reduce.sh`, the `obsidian-graph-colors` skill
- **Owner:** Lane B (schema) + Lane D (UX/graph) — `CLAUDE.md` linking conventions, the strict-tree scripts, `agents/claude-wiki-pages-polish-agent.md`
- **Supersedes the linking rule of:** [ADR-0033](./ADR-0033-topic-local-linking-and-island-graph.md) §1 (topic-local) — strict-tree is the stricter successor; ADR-0033's remediation, view filter, and metric stay in force.

## Context

ADR-0033 made the authoring rule *topic-local*: a `[[wikilink]]` between two visible
topic pages must stay within the same top-level topic folder; cross-topic references
demote to prose. It collapsed the cross-topic hairball into per-topic islands. But a
consumer vault (observed live in a downstream project) still rendered as a dense blob
*within* each topic, because topic-local permits every **intra-topic** edge — sibling
"see also" links, a leaf linking back up to its folder note, a page linking to its
grandparent. With dozens of pages per topic each carrying a handful of such links, the
island itself becomes a hairball. Four mechanisms re-fuse it:

1. **Intra-topic non-spine edges.** Siblings link to siblings; a page links to an
   ancestor it already reaches through `parent:`. These add no navigational value the
   spine does not already carry, but each is a drawn edge.
2. **Transitive-redundant edges.** A direct `A → C` link where the spine path
   `A → … → C` already exists (C is an ancestor of A). Pure visual noise.
3. **Oversaturated nodes.** A single page accreting tens of outbound links becomes a
   hub that visually dominates and re-connects an otherwise sparse tree.
4. **`related:` and associative fields** within a topic — kept by ADR-0033 — still draw
   edges that cut across the spine.

The schema *already* names `parent:` "the navigation spine" and `tags:` "the
cross-cutting metadata layer … so the graph's tag view can pivot between islands." The
intended topology is a **strict tree**: the only edges are the spine, and every
associative relationship is a shared tag, not an edge. This ADR enforces that and makes
the relationship discoverable without an edge.

This does **not** contradict ADR-0031. That connectivity metric measures the *full* node
universe (including `_sources`/`_synthesis`/`index`/`log`), where the vault remains one
provenance-connected component. This ADR governs (a) what links authors write and (b)
what the *graph view* draws — the same two-universes-one-healthy split ADR-0033 set out.

## Decision

### 1. Strict-tree linking is the authoring rule

Among **visible topic pages** (pages under a top-level topic folder, excluding the
hidden scaffolding of ADR-0033 §3), the ONLY `[[wikilink]]` edges allowed are:

- **Spine edges** — a parent↔child pair: a page's `parent:` link to its folder note, and
  a folder note's `children:`/`child_indexes:` links to its own pages.
- **The ROOT spine** — `wiki/index.md` (the ROOT hub, ADR-0033) → each top-level folder
  note. This is the single allowed cross-tree connector, so the islands hang off one
  findable root rather than floating free.

Every other reference among visible topic pages — a sibling "see also", a cross-tree
mention, a link to a non-adjacent ancestor — is written as **plain prose** (the page's
title as text) or carried as a **tag**, never as a wikilink. Provenance is unchanged and
exempt: `sources:` → `wiki/_sources/**` is never demoted.

Rule of thumb, stricter than ADR-0033's: **keep a link iff it is a parent↔child spine
edge or the ROOT→folder-note spine; demote everything else.**

### 2. The cross-cutting layer is a nested tag taxonomy

Associative and cross-tree relationships live in `tags:`, not in edges. Tags are
**nested** with a `/` separator and carry no leading `#` (keeping the existing "no inline
body `#hashtags`" rule): `family/oop`, `severity/high`, `principle/srp`, `topic/<group>`.
The slash expresses a shallow hierarchy Obsidian's tag pane and the graph's tag view both
understand, so a reader can pivot between islands by a shared theme without any page-to-
page edge. The 3–6-tags-per-page policy and the "reuse before you invent" floor
(`vocabulary-tag-floor`) still apply; nested tags count the same as flat ones.

### 3. Tag de-cycling replaces a demoted cross-tree edge

When a cross-tree edge `A` (in tree *X*) → `B` (in tree *Y*) is demoted, the reducer adds
the nested tag `topic/<Y>` to `A`'s `tags:` (deduped, within the 3–6 policy). The
relationship that the edge used to carry survives as a tag the tag-view and color groups
can pivot on — the graph stays acyclic between trees while the cross-reference stays
discoverable. This is **tag de-cycling**: trading a cycle-closing edge for a shared tag.

### 4. Transitive reduction and the oversaturation policy (#58)

- **Transitive-redundant edges** — a non-spine edge `A → C` where `C` is already on
  `A`'s `pathToRoot` (an ancestor reached through the spine) — are provably redundant and
  auto-demoted.
- **Oversaturated nodes** — a node whose out-degree exceeds a configurable threshold
  (sane default ~20) — are **reported**, not bulk-cut. Only the provably transitive-
  redundant subset is auto-demoted; the rest is report-only with a suggestion to
  introduce an intermediate hub (a new interior tree node), because cutting a genuine
  spine fan-out would orphan children.

### 5. One spine primitive, one demote core

- `src/core/spine.ts`'s `deriveSpine(wiki)` is the single source of truth for the
  tree shape: per page `{ parent, depth, pathToRoot, children, tree }`, plus `orphans`,
  `multiParent`, and `cycles`. It reuses `buildLinkIndex`/`resolveLink` (ADR-0030/0031)
  and `deriveTopics` — no second spine derivation can drift, the same way `deriveTopics`
  is the one topic derivation.
- `src/core/link-demote.ts` is the single demote-not-delete implementation (extracted
  from `scripts/disentangle-links.ts`): the fence- and inline-span-aware text surgery
  that turns a rejected `[[wikilink]]` into its display text and prunes rejected
  association-array entries, **never** deleting a target (so no dangling link is created).
  Both `disentangle-links` (topic-local, ADR-0033) and `strict-tree-reduce` (strict-tree,
  this ADR) import it, parameterised by their own keep predicate.

### 6. Detector, reducer, view, and self-heal

- **Detector** — `scripts/graph-quality.ts` gains, alongside its existing JSON,
  `nonSpineEdgeCount`, `crossTreeEdgeCount` (ROOT spine excluded), `transitiveRedundantEdgeCount`,
  `cycleCount`, `multiParentCount`, `maxSaturation`, and `treeConformance` (0–1, the
  fraction of visible-page edges that are spine edges). `scripts/tree-lint.ts` (read-only)
  reports the same per page.
- **Reducer** — `scripts/strict-tree-reduce.ts` applies §1–§4: dry-run by default,
  `--apply` rewrites in place (git-checkpointed), never touches
  `parent`/`sources`/`children`/`child_indexes`, never creates a dangling link, and is
  idempotent (zero diff on a tree-shaped vault).
- **View** — `scripts/apply-obsidian-config.ts` gains a configurable cross-cutting-folder
  exclude set (default includes `wiki/principles`) appended to the island filter, so a
  cross-cutting interior folder does not re-stitch the trees. ROOT behavior is unchanged.
- **Self-heal** — `treeConformance` and the new counts feed `scripts/health-score.ts`'s
  `needsHeal`/`issues[]`, the polish agent runs `strict-tree-reduce --apply` in its Step 0
  self-heal sequence, and `/claude-wiki-pages:doctor` reports the tree metric (D12). The
  `/claude-wiki-pages:fill-gaps` and `/claude-wiki-pages:fix` skills expose the detector
  and reducer as the power-user direct path.

### 7. Ingest born tree-shaped (deferred to a follow-up)

Making ingest emit per-record pages, family/category hub interior nodes, the `parent:`
spine, and nested taxonomy tags natively — so fresh vaults need no remediation — is a
separable follow-up. It depends only on §1–§6 being in place and is tracked as the ingest
slice of the epic.

## Alternatives considered

- **Stay at topic-local (ADR-0033).** Rejected: it permits every intra-topic edge, which
  is the within-island hairball this ADR exists to fix.
- **Allow `related:` as same-tree edges.** Rejected: an associative edge is exactly the
  cross-spine noise; demoting it to a tag keeps the relationship discoverable without the
  edge.
- **Delete cross-tree links outright.** Rejected (as in ADR-0033): demote-to-text plus a
  `topic/<Y>` tag preserves the information and the discoverability; only the edge is
  dropped.
- **Auto-cut oversaturated fan-outs to the threshold.** Rejected: a folder note legitimately
  fans out to all its children (the spine); cutting it would orphan pages. Only the
  provably transitive-redundant subset is auto-demoted; the rest is report-only.
- **Flat tags only (no nesting).** Rejected: a flat `oop` tag cannot express the
  family/severity/principle facets a record-oriented source carries; the nested taxonomy
  is what lets the tag view pivot meaningfully.

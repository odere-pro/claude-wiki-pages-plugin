# ADR-0022: Folder notes and graph quality — schema v3, wikilink hierarchy, color groups, grounded answers

- **Status:** Accepted
- **Date:** 2026-06-12
- **Builds on:** [ADR-0003](./ADR-0003-polish-agent-and-obsidian-side.md) (the Obsidian-side experience and graph-color ownership), [ADR-0004](./ADR-0004-ontology-profile-v1.md) (the predicate domain→range table the hierarchy fields live in)
- **Amends:** [ADR-0003](./ADR-0003-polish-agent-and-obsidian-side.md) — the graph-colors step gains a headless `.obsidian/graph.json` fallback when `obsidian eval` is unavailable
- **Amended by:** [ADR-0023](./ADR-0023-wiki-only-graph.md) (the layer-pass dropped; canonical group order becomes topics → specials) and **Superseded-by (delivery):** [ADR-0023](./ADR-0023-wiki-only-graph.md) — the tracked `.obsidian/graph.json` delivery is replaced by regenerable-cache / gitignored `.obsidian/`
- **Anchor:** §4 (Layer 1 — Data), §7 (provenance, non-negotiable)

## Context

Every per-folder wiki index file is named `_index.md`. The filesystem does not
care, but Obsidian renders nodes by filename stem, so a vault with eight topic
folders shows eight identical, meaningless `_index` nodes in the graph view —
the navigational backbone of the wiki is invisible exactly where the user goes
to *see* structure. Three adjacent quality gaps compound it:

1. **Hierarchy edges are convention, not contract.** `parent:`, `children:`,
   and `child_indexes:` are emitted as quoted `"[[wikilink]]"` values in
   practice, but the schema never said MUST. A plain title string in any of
   them parses fine, produces **no graph edge**, and fails silently.
2. **The graph color groups paper over the naming problem.** The white
   `file:_index` catch-all exists only because index nodes were
   indistinguishable by path; it flattens every topic's index into one
   undifferentiated cluster.
3. **Query answers cite inline but never present their evidence.** A reader
   auditing an analyst answer has to chase every inline `[[wikilink]]` by
   hand; there is no single place that lists what the answer stands on.

## Decision

### 1. Folder notes: the per-folder index is named after its folder

The per-folder index becomes a **folder note** — the established Obsidian
community convention where a note named exactly after its containing folder
acts as that folder's landing page:

- `wiki/<topic>/<topic>.md` (filename stem == parent directory name),
  frontmatter `type: index`. Nested: `wiki/<topic>/<sub>/<sub>.md`.
- The root MOC stays `wiki/index.md` — it has no parent folder to be named
  after, and every existing `[[index]]` link keeps resolving.

Each index node now renders under its topic's name, Obsidian's folder-note
plugins (and its native "folder note" affordances) light up for free, and
`path:`-scoped color groups can finally tell index nodes apart.

### 2. Schema v3 with an indefinite deprecation window

- `schema_version` bumps 2 → 3. v3 is otherwise a strict superset of v2; the
  only change is the index-filename convention plus the normative hierarchy
  rule below.
- **The engine accepts both names indefinitely.** A `_index.md` in a v3 vault
  is valid input everywhere — verify, lint, search, MOC descent — but verify
  flags it with a new WARN `legacy-index-filename`, remediation: "run
  `engine.sh migrate --write`". Never an ERROR; never blocks.
- The engine `migrate` command gains a v2→v3 **`rename-index`** action: rename
  each `_index.md` to its folder-note name and rewrite every
  `[[…/_index]]`-style wikilink that pointed at it. A name conflict (the
  folder already contains a page with the folder's name) is **report + skip**
  — the legacy file stays, the WARN persists, a human resolves it. Like every
  migrate action it is idempotent and git-checkpointed.

### 3. Hierarchy frontmatter is codified as wikilink-valued

What was de-facto emitted format becomes normative schema: `parent:`,
`children:`, and `child_indexes:` are REQUIRED to hold quoted `"[[wikilink]]"`
values. Plain title strings produce no graph edge and are a lint finding, the
same class as plain-string `sources`. Root `wiki/index.md` `child_indexes`
entries become filename links to the folder notes — `"[[agents]]"`, not a
prose title — so the root MOC's edges land on the real nodes.

### 4. Graph color groups: topics → specials → layers; headless fallback

The `file:_index` white catch-all is **dropped** — folder notes made it
meaningless (each index node now matches its topic's `path:` group). The
canonical group order becomes:

1. **Topics** — one `path:wiki/<topic>` group per top-level topic folder,
   distinct palette colors.
2. **Specials** — `_sources` gray, `_synthesis` yellow.
3. **Layers** — the layer pass: `path:raw` green, `path:wiki` blue,
   `path:_templates` orange.

First match wins top-down, so specific topic groups must precede the broad
layer queries — the ordering is part of the contract, not a styling choice.

The `obsidian-graph-colors` skill gains a documented headless fallback:
when `obsidian eval` is unavailable (no CLI, no running Obsidian, CI), write
`.obsidian/graph.json` directly, touching only the `colorGroups` and
`collapse-color-groups` keys and preserving everything else byte-for-byte.
Trade-off accepted: a **running** Obsidian holds graph settings in memory and
can clobber a direct file write when it persists its own state — after a
headless write, Obsidian must be restarted to pick the groups up. The `eval`
path therefore stays primary (it goes through the live plugin API and needs no
restart); the file write is the degraded mode, not a peer.

### 5. The `## Sources` grounding contract

Every analyst/query answer ends with a **Sources section**: a `## Sources`
heading followed by a numbered, research-paper-style list citing each wiki
page the answer drew on as a `[[wikilink]]`, plus the raw source file path(s)
from that page's `sources:` frontmatter. Inline citations remain; the Sources
section is the audit surface — one place that says what the answer stands on
and where each page's evidence bottoms out in `raw/`. An answer with no
consulted pages says so explicitly rather than omitting the section.

## Alternatives considered

- **Keep `_index.md` and hide index nodes from the graph (filter them out).**
  Rejected. The index nodes *are* the topic tree — hiding them removes the
  hierarchy from the one view built to show it.
- **Keep `_index.md` and rely on the `file:_index` color group.** Rejected.
  Status quo. One white blob of identically-named nodes is the problem
  statement, not a solution.
- **Hard-cut rename (v3 rejects `_index.md`).** Rejected. Existing vaults
  upgrade on their own schedule; a WARN with a one-command remediation
  converts them without ever breaking them.
- **`folder.md` or `00-index.md` as the new name.** Rejected. Both re-create
  the identical-stem problem (`folder` everywhere) or invent a novel
  convention; naming the note after its folder is the established
  folder-note pattern Obsidian tooling already understands.
- **A separate `bibliography` page instead of a per-answer `## Sources`
  section.** Rejected. The grounding must travel with the answer — a detached
  page goes stale the moment the next answer is composed.

## Consequences

**Positive.**

- The graph view finally shows the topic tree: each index node carries its
  topic's name and its topic's color; the white catch-all and its eight
  identical `_index` nodes disappear.
- Hierarchy edges become checkable. A plain-string `parent:` is now a lint
  finding instead of a silently missing edge.
- Query answers are auditable at a glance — the Sources section is the
  research-paper convention readers already know how to use.
- Headless environments (CI, fixtures, no-Obsidian users) get real color
  groups instead of a permanent `[skip]`.

**Negative.**

- **Two accepted index filenames, indefinitely.** Every consumer that
  enumerates indexes must match both the folder-note name and `_index.md`.
  Mitigated: the engine owns enumeration; the WARN steers vaults toward one
  name in practice.
- **Rename churn on migration.** `rename-index` rewrites wikilinks across the
  vault in one commit. Mitigated: git-checkpointed, idempotent, and
  conflict ⇒ report+skip — never a destructive overwrite.
- **The headless fallback can silently lose to a running Obsidian.** Accepted
  and documented (restart required); the `eval` path remains primary.

## Revisit when

- Obsidian ships first-class folder notes with a different canonical naming
  rule. Outcome: align the folder-note name with the platform default.
- The `legacy-index-filename` WARN has been absent from every known vault for
  two minor releases. Outcome: consider retiring the dual-name acceptance.
- The Sources section proves too heavy for one-line answers. Outcome: define
  a minimum answer size below which the section may collapse to a single
  citation line.

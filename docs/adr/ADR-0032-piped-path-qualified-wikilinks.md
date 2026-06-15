# ADR-0032: Piped, path-qualified wikilinks — author every link by basename, not by alias or title

- **Status:** Proposed
- **Date:** 2026-06-15
- **Builds on:** [ADR-0028](./ADR-0028-dangling-wikilink-verify-check.md) (dangling-wikilink check), [ADR-0030](./ADR-0030-obsidian-accurate-resolution-and-collision.md) (Obsidian-accurate resolver + collision check), [ADR-0031](./ADR-0031-graph-connectivity-orphans-shadows.md) (connectivity, orphans, shadows)
- **Anchor:** §4 (Layer 1 — Data), the schema authority [`skills/init/template/CLAUDE.md`](../../skills/init/template/CLAUDE.md) ("Linking conventions"), the ingest writer contract
- **Owner:** Lane C (eng-ingest) for the authoring convention; Lane A (eng-retrieval) for the resolver tooling (ADR-0030/0031)

## Context

The wiki authored roughly 2900 cross-page links as bare `[[Title Case]]`, relying on each target's `aliases:` (with the page title as the first alias) to make the link resolve. The working assumption — recorded in prior memory and in the schema's `aliases` field definition as "the title must be the first alias to avoid ghost nodes" — was that **Obsidian resolves a written `[[X]]` by filename, alias, or title**.

That assumption is wrong. Verified empirically against a live Obsidian and its documentation (`getFirstLinkpathDest` over `app.metadataCache.resolvedLinks`, cross-checked with the Obsidian help on linking): **Obsidian resolves a written `[[target]]` by exact vault path or filename basename only.** It does **not** resolve by a note's `aliases:` or `title:`. When a user picks an alias from autocomplete, Obsidian inserts a **piped** link `[[file-basename|Alias]]` — the target is the real filename and the alias is only display text. A hand-written or tool-written bare `[[Alias]]` does not resolve to the note carrying that alias.

The consequence on the dogfood vault: 103 pages were orphaned in Obsidian's graph while the tooling — which treated `{ basename } ∪ { alias } ∪ { title }` as a flat resolvable set (ADR-0028) — reported a clean graph. The links "resolved" against the flat set but produced no edge in Obsidian, so the pages floated.

A second hazard compounds it. Obsidian indexes `raw/` as well as `wiki/`, and many `wiki/_sources/<slug>.md` summaries share a basename with their `raw/.../<Slug>.md` original (e.g. a summary of `ADR-0001` named `adr-0001-x.md` beside `raw/docs/adr/ADR-0001-x.md`). A bare-basename link then resolves to whichever file wins the tie-break — often the `raw/` original — so the source summary is uncited and `raw/` files are pulled into the graph. This is the basename-collision class ADR-0030's `wikilink-collision` check surfaces, seen here from the authoring side.

## Decision

### 1. The normative authoring convention

Every cross-page link — in body text **and** in every frontmatter link field (`parent`, `sources`, `related`, `children`, `child_indexes`, `key_pages`, `members`, `scope`, `depends_on`, …) — is written as a **piped wikilink targeting the destination's file basename**, with the Title-Case page title as display text:

```
[[entity-name|Entity Name]]
```

The bare `[[Entity Name]]` form is retired: it relies on alias resolution Obsidian does not perform.

### 2. Path-qualify when the basename is not unique vault-wide

When a target's basename is not unique across the **whole vault** — including `raw/` originals — the link targets the **wiki-relative path** (no extension) instead of the bare basename:

```
[[_sources/adr-0001-four-layer-orchestrator|ADR-0001: Four-Layer Orchestrator]]
```

This is the only form Obsidian resolves unambiguously to the wiki page when a same-named `raw/` original exists.

### 3. `aliases` is discovery, not resolution

`aliases:` stays in frontmatter — it aids search and Obsidian's autocomplete, both of which read it. It is harmless and useful, so it is kept. But it is **not** a link-resolution mechanism, and the schema no longer presents it as one. The prior "the title must be the first alias to avoid ghost nodes" rule is **obsolete**: ghost nodes came from relying on alias resolution, not from a missing alias. The fix is the piped basename form, not alias bookkeeping.

### 4. The tooling resolves Obsidian-accurately (separate change)

The detection side is owned by ADR-0030 (the `link-resolver.ts` priority ladder and the `wikilink-collision` WARN check, with its `verify-ingest.sh` twin) and ADR-0031 (`graph-quality.sh` connectivity, orphans, shadows). Those resolve each link to the exact page Obsidian would open and measure whether the graph is one connected piece. This ADR records the **authoring** convention; the resolver and gate work is cross-referenced, not re-specified here. The resolver keeps a fourth, lowest-priority `title` tier for the dangling membership set only (ADR-0030 §3) — it never participates in collision or connectivity, and pure-Obsidian fidelity (dropping `title`) remains a recorded future option.

### 5. One-time migration

Three idempotent, dry-run-by-default Bun scripts migrate the existing corpus and are kept for re-runs:

- `scripts/migrate-piped-links.ts` — rewrites every link that currently resolves **only** by alias or title into `[[<basename>|<Title Case>]]`, preserving display text. Links already resolving by path/basename are untouched; genuinely dangling links are left untouched (never fabricated). `wiki/` only.
- `scripts/disambiguate-collisions.ts` — rewrites any link whose target basename is not globally unique (collides with another file anywhere under the vault, `wiki/` or `raw/`) into the path-qualified form `[[<dir>/<stem>|Display]]`. `wiki/` only.
- `scripts/declutter-source-outlinks.ts` — strips the cross-cutting out-link sections from source summaries that already have ≥1 inbound citation, so sources become leaf provenance nodes and cluster with the pages that cite them instead of bridging every topic. Never orphans an uncited source. `wiki/_sources/` only.

All operate on `wiki/` (and `_sources/`), never `raw/`, and resolve through the same `link-resolver.ts` so the migration and the gate agree on what "resolves" means.

## Refinements (from re-ingest probe)

A bounded re-ingest test on the migrated corpus surfaced two authoring gaps that re-introduce graph noise. Both are now closed in the authoring surface (schema, ingest skill, ingest agent):

- **Source summaries carry no outbound wikilinks — provenance is page → source.** The `## Entities Mentioned` / `## Concepts Mentioned` / `## Grounded Pages` out-link sections on source summaries were a workaround for the alias-resolution bug: under bare-alias citations a source had no inbound links, so it was made to link out. Now that citations are piped basename links that DO resolve, every source is reached by the pages that cite it (their `sources:` frontmatter, page→source). The source out-links are redundant and harmful — they fan across every topic a source touches and collapse the topic islands into a hairball. A source summary's body is now Metadata, Summary, Key Claims (prose) only; coverage may be recorded as a single plain-text `Covers:` line (no `[[ ]]`). The ingest steps still guarantee each source earns ≥1 inbound citation so it is never an orphan.
- **Path-qualify only on a genuine vault-wide basename collision, with the verified path.** The probe over-qualified unique basenames and guessed a wrong folder (`[[how-it-works/ingest-pipeline]]` for a page living in `wiki-pages/`), producing a dangling link. The convention is tightened: default to the bare `[[basename|Display]]`; path-qualify to `[[topic/basename|Display]]` ONLY when that basename occurs in 2+ files anywhere in the vault. When qualifying, never guess the folder — use the target's actual wiki-relative path and verify the page exists there.

## Alternatives considered

- **Keep authoring bare `[[Title Case]]` and force the title into `aliases`.** Rejected — it is exactly the broken assumption that produced 103 orphans. Obsidian does not resolve a written link by alias, so no amount of alias bookkeeping makes a bare title link form a graph edge.
- **Author by bare basename without the piped display.** Rejected — it resolves but reads as kebab-case slugs in the rendered page and in Reading view, losing the Title-Case legibility the house voice requires. The pipe costs nothing and keeps both correctness and readability.
- **Always path-qualify every link.** Rejected — verbose and brittle to folder moves for the common case where the basename is unique. Path-qualification is reserved for the collision case where it is actually needed.
- **Drop `aliases` entirely now that it does not resolve links.** Rejected — autocomplete and search genuinely read it; it earns its weight for discovery. Only its mischaracterisation as a resolver is removed.

## Consequences

- The schema authority (`skills/init/template/CLAUDE.md`) and the project vault schema state one rule: links target the basename (or wiki-relative path) in piped form; aliases are discovery only. The frontmatter examples and the per-type `_templates/` show the piped form.
- The ingest skill and ingest agent emit piped, basename-targeted, path-qualified links for `parent`, `sources`, `related`, `children`, body links, and folder-note entries.
- The corpus is migrated once by the three scripts; re-runs are safe (idempotent, dry-run default).
- Prior memory and any doc that said "resolution by filename + aliases" is corrected: aliases never resolve a written link.
- Detection stays Obsidian-accurate via ADR-0030/0031; authoring and detection now agree on the same resolution model.

## Revisit when

- Obsidian changes its resolution priority such that aliases or titles begin to resolve written links (it would make the bare form viable again).
- The team adopts pure-Obsidian fidelity in the resolver (drop the `title` tier, ADR-0030 *Revisit when*) — at which point the dangling membership set and this convention align exactly with no superset.

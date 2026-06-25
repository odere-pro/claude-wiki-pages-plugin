# ADR-0035: Deterministic `.obsidian` config + deterministic ghost-link heal

- **Status:** Proposed
- **Date:** 2026-06-22
- **Builds on:** [ADR-0023](./ADR-0023-wiki-only-graph.md) (wiki-only graph, `userIgnoreFilters`, `.obsidian/` is regenerable cache), [ADR-0031](./ADR-0031-graph-connectivity-orphans-shadows.md) (Obsidian-accurate resolution), [ADR-0033](./ADR-0033-topic-local-linking-and-island-graph.md) (topic-island graph + `search` filter)
- **Anchor:** `scripts/apply-obsidian-config.{ts,sh}`, `scripts/heal-ghost-links.{ts,sh}`, the `claude-wiki-pages-polish-agent` and `claude-wiki-pages-curator-agent` contracts, the schema authority (`skills/init/template/CLAUDE.md`)
- **Owner:** Lane D (UX/graph) + Lane B (schema)

## Context

A real end-user ingest (the `brainstorming-playground` vault, 70 wiki pages across
7 correctly-named topic islands) reproduced three symptoms the plugin claims to
prevent. Each traced to the same underlying failure mode: **a step that the
plugin only describes in agent prose, and that the LLM either skipped or
half-performed, while the run's own log reported success.**

1. **`.obsidian/` graph config never landed.** The output `graph.json` carried
   Obsidian's raw defaults — `search:""`, `hideUnresolved:false`, `showTags:true`
   — and `app.json` had no `userIgnoreFilters`, so all 26 `raw/` files plus the
   `_sources/` mirrors were drawn as a large disconnected gray sprawl, tag nodes
   doubled every page, and dangling links rendered as ghost nodes. The
   `colorGroups` *were* present, which is the tell: the polish agent's prose
   wrote the island/search FILTER scaffold **only when `graph.json` was absent**,
   then on every later run took the "file exists → patch `colorGroups` only"
   branch. But Obsidian writes `graph.json` with its defaults the moment a user
   opens the graph, so the filters never survived. `wiki/log.md` nonetheless
   recorded "7 colour groups applied".

2. **100+ ghost wikilinks survived.** `verify`/`structural` reported **0**
   dangling links, yet `lint --check ghost-links` found **102** across 35 files —
   all source citations written in `sources:` as `[[Source: ADR 0006 — <full
   title>]]` instead of piped basename `[[0006-defensibility-moat|ADR 0006]]`.
   These resolve via the plugin's title-aware resolver (ADR-0031) so `verify` is
   blind to them, but Obsidian resolves only by path/basename, so each renders as
   a ghost node. The curator documented healing these by hand (§3.7); in practice
   the LLM did not, and nothing gated the run on their absence. `log.md` recorded
   "dangling island links closed".

3. **No tagging policy.** Templates ship `tags: []`, the schema had no `tags`
   field definition, and ingest had no guidance, so tags were ad-hoc page-unique
   singletons (`co-pilot`, `499-sek`) that connect nothing.

The common root cause: **prose-driven, LLM-executed steps with no deterministic
backstop and no end-of-run gate.** A self-reported "success" hid all three.

## Decision

### 1. Make `.obsidian/` config deterministic (`apply-obsidian-config`)

A new Bun script + bash wrapper writes `graph.json` and `app.json` idempotently
and **merge-only**, asserting the filter keys (`search` island filter,
`hideUnresolved:true`, `showTags:false`, `showAttachments:false`,
`showOrphans:true`), `app.json` `userIgnoreFilters` + the new-file keys, and one
`path:wiki/<topic>` color group per topic folder that lacks one — on **every**
run, not just when the file is absent. All other keys (force params, `scale`,
existing color groups) are preserved. The polish agent (Step 1) now calls this
script as the authority instead of describing the writes in prose. The `search`
filter string is kept byte-identical to the `obsidian-graph-colors` skill scaffold.

### 2. Make ghost-link heal deterministic (`heal-ghost-links`)

A new Bun script + wrapper reuses the engine's own ghost resolver
(`src/core/ghost-link-check.ts` primitives) to rewrite every title/alias-only
ghost link to piped basename form `[[file-basename|Display]]`, preserving display
text and any `#heading`/`^block` anchor. Idempotent. The curator's Phase 3 (3.7)
now runs this script instead of hand-rewriting; Phase 5 runs it in `--check` mode.

### 3. End-of-run gate (curator Phase 5)

`verify` is structural and is deliberately blind to ghost links and to
`.obsidian/` config. The curator's final step now also runs
`heal-ghost-links.sh --check` and `apply-obsidian-config.sh --check` (each exits
3 on drift). **A run cannot report success while either reports drift.** This is
the backstop that stops a pipeline from logging "closed" while 100+ ghosts remain.

### 4. Tagging policy (schema authority)

The schema CLAUDE.md gains a `tags` field definition: tags are the cross-cutting
metadata layer (the folder captures the vertical, tags the horizontal); 3–6 per
page; reuse-before-invent with a 2+-page floor (the existing `vocabulary-tag-floor`
lint enforces it once a tag is registered in `_vocabulary.md`); topic slug + theme
tags from a controlled set; bookkeeping tags do not count as semantic tags.

### 5. Authoring backstop (R3, defense-in-depth)

The schema's "Linking conventions" gains an explicit `sources:` anti-pattern
callout naming the `[[Source: <title>]]` / bare-`[[Title Case]]` form as the #1
ghost source, so correct authoring reduces the heal's workload.

## Consequences

- The graph renders as intended topic islands regardless of what Obsidian wrote,
  on first run and every re-run. `.obsidian/` remains regenerable cache (ADR-0023).
- Ghost links cannot ship: they are healed deterministically and gated at end of
  run. Verified on the `brainstorming-playground` vault — `heal-ghost-links`
  reproduced the by-hand fix exactly (102 → 0), and connectivity went to a single
  component, 0 orphans.
- New tests: `tests/scripts/apply-obsidian-config.bats` (7) and
  `tests/scripts/heal-ghost-links.bats` (7).
- **Known follow-up (not in this ADR):** `scripts/graph-quality.ts` still
  hardcodes the 7 dogfood-vault cluster names in `CLUSTERS`, so the `Cn`/`Ce`
  concentration metric reads `other=N` on any other vault. The connectivity
  metric (components/orphans) is already vault-agnostic and unaffected. Deriving
  `CLUSTERS` from the actual top-level wiki folders is deferred to a focused
  follow-up to keep this change's blast radius small.

# ADR-0004: `ontology-profile-v1` — one predicate domain→range table and one enum list in the schema

- **Status:** Accepted
- **Date:** 2026-06-04
- **SPEC anchor:** §4/§6 (Data layer + schema), §10 (ontology), §11 (structured authoring); Brief §6 (the one-X contract)

## Context

The roadmap's structure/graph/ingest items each need to know two things about the vault's ontology: **which typed relationship may connect which kind of page** (so a graph walk does not follow a meaningless edge), and **what the legal page types and entity types are** (so a classifier and a `--type` filter agree on the same vocabulary). Three downstream items consume exactly this knowledge:

1. **R2 graph traversal** (`src/commands/search/*`, Brief §6 "one graph-traversal primitive") walks typed wikilinks over `sources`/`related`/`depends_on`. It must walk only edges that are defined, in the direction they are defined.
2. **C1 budget-aware MOC descent** (Lane C) descends the topic tree along `parent`/`child_indexes`. It must know that `parent` points from a page to an index, not the reverse.
3. **I1 classification** (Lane C) decides whether an extracted thing is an `entity` (and which `entity_type`) or a `concept`/`topic`/`project`. It must pick from a fixed set, and R1's `--type` filter (`src/commands/search/search.ts`, where `SearchOptions` today carries no `--type`) must filter against that *same* set.

Today the underlying material for all three already lives in one place — `docs/vault-example/CLAUDE.md` — but only as **prose**: the typed predicates are described one-by-one (`docs/vault-example/CLAUDE.md` "Frontmatter schema", field notes for `contradicts`/`supersedes`/`depends_on`, `parent`, `sources`, `related`), and the enums are inlined per page type (`type:` nine-value list; `entity_type: person | organization | …`; `source_type`; `synthesis_type`; `project_status`). The lint twin (`scripts/validate-frontmatter.sh:48-56`) re-encodes the *required-fields* half of this as a `case` statement, but no artifact states the **edge set** (which predicate is allowed between which page classes) and no single artifact is *named* as the shared contract the three consumers bind to.

The failure this prevents is divergence. If R2 hard-codes its own edge list, C1 hard-codes its own descent rule, and I1's classifier ships its own copy of the type/entity_type enums while R1's `--type` ships another, the four drift the first time someone adds a page type or a predicate. That is precisely the "second source of truth" the Brief forbids (§5 DRY / single-sourcing; §6 "one enum list, single-sourced in the ontology profile"). Decision #6 (Brief §11) fixes `entity_type` as a **fixed core enum, vault-owner-calibratable**; without one named home, "calibratable" invites a forked second list.

The constraint is hard: the ontology **lives in schema + frontmatter + wikilinks — never a triplestore, RDF database, or vector store** (Brief §5). So the profile cannot be a new store or a new engine surface; it must be additive content inside the existing schema file, readable by humans and parseable by the engine, and it must not break a vault that declares `schema_version: 1` (the v2 superset rule in `docs/vault-example/CLAUDE.md` "Schema version 2"; `SUPPORTED_SCHEMA_VERSIONS = [1, 2]` in `src/core/schema.ts`).

## Decision

Add one named, additive section — **`ontology-profile-v1`** — to `docs/vault-example/CLAUDE.md` (and the install template `skills/init/template/CLAUDE.md`, kept in parity). It contains exactly two tables and nothing else, and it is declared the single source the engine and agents read for the edge set and the enums. It introduces **no new frontmatter field and no new page type**, so it is additive under both `schema_version: 1` and `2`: it only *names and tabulates relationships and values the schema already defines*.

The profile has two parts.

**(1) The single predicate domain→range table.** For each typed predicate the schema already uses, its allowed **domain** (the page class the link may originate from) and **range** (the page class it may point to), plus its direction and cardinality. This is the one edge set R2's graph primitive, C1's descent, and I1's link-emission all consume. "Page class" values are drawn from the page-type enum in part (2); `*` means "any wiki page class". Grounded one-for-one against `docs/vault-example/CLAUDE.md`:

| Predicate     | Domain (source class)                                  | Range (target class)                          | Direction / cardinality | Schema ground (`docs/vault-example/CLAUDE.md`)        |
| ------------- | ------------------------------------------------------ | --------------------------------------------- | ----------------------- | ----------------------------------------------------- |
| `parent`      | any non-root page (`entity`,`concept`,`topic`,`project`,`synthesis`,`index`) | `index`                                       | directed, single        | "Field definitions → `parent`"; "Folder hierarchy rules" |
| `sources`     | `entity`,`concept`,`topic`,`project`,`synthesis`        | `source`                                      | directed, 1..N (≥1)     | "`sources` is non-negotiable"; per-type frontmatter    |
| `related`     | `entity`,`concept`,`topic`,`project`                    | `entity`,`concept`,`topic`,`project`          | undirected, 0..N        | per-type `related: [...]` examples                     |
| `contradicts` | `concept`                                              | `concept`                                     | undirected, 0..N        | concept frontmatter; "`contradicts`/`supersedes`/`depends_on`" |
| `supersedes`  | `concept`,`topic`,`project`,`synthesis`                 | same class as domain                          | directed, 0..N          | concept frontmatter; `status: superseded` lifecycle    |
| `depends_on`  | `concept`,`topic`,`project`                             | `concept`,`entity`                            | directed, 0..N          | concept frontmatter `depends_on: []`                   |
| `key_pages`   | `topic`                                                | `entity`,`concept`                            | directed, 0..N          | topic frontmatter `key_pages: [...]` (v2)             |
| `members`     | `project`                                              | `entity`,`concept`                            | directed, 0..N          | project frontmatter `members: [...]` (v2)             |
| `scope`       | `synthesis`                                            | `entity`,`concept`,`topic`,`project`          | directed, 1..N          | synthesis frontmatter `scope: [...]`                  |
| `children`    | `index`                                                | any non-root page                             | directed, 0..N          | index frontmatter `children: []`                      |
| `child_indexes` | `index`                                              | `index`                                       | directed, 0..N          | index frontmatter `child_indexes: []`                 |

> The graph-traversal primitive (Brief §6) takes its edge set from the **directed and undirected** rows above. R2 `--graph` walks the provenance/association core — `sources` + `related` + `depends_on` — to N≤2; the remaining rows (`key_pages`, `members`, `scope`, `children`, `child_indexes`) are the MOC/descent edges C1 uses. `contradicts`/`supersedes` are available to R3/synthesis. No edge outside this table is legal; an edge whose endpoints violate domain/range is a lint finding (S1-check, Lane B), not a traversal the engine follows.

**(2) The single enum list.** The canonical page-type enum and the fixed-core `entity_type` enum, single-sourced here. I1's classifier and R1's `--type` filter both read the page-type enum; I1's entity sub-classifier reads `entity_type`. The companion field-level enums already in the schema (`source_type`, `synthesis_type`, `project_status`, `source_format`, `status`) are listed for completeness so there is exactly one home for every closed value set.

| Enum                | Canonical values                                                                                  | Closed? | Calibration | Schema ground                                  |
| ------------------- | ------------------------------------------------------------------------------------------------- | ------- | ----------- | ---------------------------------------------- |
| **page type** (`type`) | `source`,`entity`,`concept`,`topic`,`project`,`synthesis`,`index`,`manifest`,`log`            | closed (core) | not vault-extensible — adding a page type is a schema change (new ADR + new templates + lint case) | "Nine allowed types"; `validate-frontmatter.sh:48-56` |
| **`entity_type`** (fixed core, calibratable) | `person`,`organization`,`product`,`tool`,`service`,`standard`,`place` | closed (core) + owner extension | a vault owner MAY add values under an explicit `entity_type_extensions:` allow-list in the **vault's own** `CLAUDE.md` (decision #6); the classifier treats core ∪ extensions as legal, never forking a second enum | entity frontmatter; `validate-frontmatter.sh` |
| `source_type`       | `article`,`paper`,`policy`,`transcript`,`book`,`video`,`podcast`,`manual`                          | closed (core) | not owner-extensible (gated by ingest support) | source frontmatter                              |
| `synthesis_type`    | `comparison`,`theme`,`contradiction`,`gap`,`timeline`                                              | closed (core) | not owner-extensible | synthesis frontmatter                           |
| `project_status`    | `planned`,`active`,`paused`,`done`,`abandoned`                                                     | closed (core) | not owner-extensible | project frontmatter (v2)                        |
| `source_format`     | `text`,`image` (PDF/audio/video deferred — extend the enum when those paths ship)                   | closed (core) | not owner-extensible | source frontmatter; I4 PDF item                 |
| `status`            | `active`,`stale`,`superseded`,`draft`                                                              | closed (core) | not owner-extensible | "Field definitions → `status`"                  |

**Calibration mechanism (the one that keeps it single-sourced).** Decision #6 lets a vault owner *steer intent* by widening `entity_type`. They do it by adding an `entity_type_extensions:` list to **their own vault's `CLAUDE.md`** (the schema file that already wins all conflicts), e.g. `entity_type_extensions: [dataset, model]`. The legal set is then *core ∪ extensions*, computed at read time. There is no parallel enum file and no second list: the core list lives in the reference profile, the per-vault widening lives in that vault's authoritative `CLAUDE.md`, and a consumer reads both from the one schema document it already loads. Page type stays fully closed — widening it is a schema change, by design.

**Naming.** The section is titled `ontology-profile-v1`. The trailing `v1` is the *profile* version (the shape of these two tables), independent of `schema_version`; a future widening that the schema can express adds `ontology-profile-v2` and supersedes this ADR, exactly as the ADR convention prescribes (`docs/adr/README.md`).

**New glossary terms** (Brief §5 glossary-first; these are on the Brief §13 debt list — Lane D lands the rows in Phase 0 *before* the profile prose merges): `ontology`, `ontology profile`/`ontology-profile-v1`, `class`, `property`, `predicate`, `domain`, `range`, `controlled vocabulary`. This ADR introduces no term beyond that set.

This ADR records the decision only. Lane B (eng-schema) implements the two tables verbatim into `docs/vault-example/CLAUDE.md` + the install template under the S1 item, TDD-first, with the S1-check lint extension enforcing the table.

## Alternatives considered

- **Leave the ontology as scattered prose; let each consumer read what it needs from the schema.** Rejected. It is the status quo and it has no *named* edge set at all — domain/range is implied, never stated. R2, C1, and I1 would each reconstruct the edge rules independently and drift on the first predicate or page-type change. That is the second-source-of-truth failure the Brief exists to prevent (§5, §6).
- **A machine-readable ontology file (`schemas/ontology.json` / `.yml` / SHACL / OWL).** Rejected. It puts the ontology *outside* schema + frontmatter + wikilinks, which Brief §5 forbids ("never a triplestore, RDF database, or vector store"). It also splits truth: the schema prose and the JSON would both describe the same types and could disagree. Keeping the tables *inside* `CLAUDE.md` — the file the engine and every agent already read — means one document, parseable by the lint twin, with no new artifact to keep in sync.
- **A triplestore / RDF graph / property graph as the ontology home.** Rejected outright — a hard non-negotiable (Brief §5, §11; decision context). It is also a new layer and a new store the engine would have to own, violating KISS/YAGNI when typed frontmatter + wikilinks already carry every edge.
- **Make `entity_type` free-text so owners never need a calibration mechanism.** Rejected. Free-text defeats I1's classifier (nothing to classify *into*) and R1's `--type`/`--entity-type` precision (no closed set to filter on), and silently re-opens the "is it a `tool` or a `Tool` or a `software-tool`" drift. Decision #6 is explicit: *fixed core, calibratable* — a bounded allow-list, not open text.
- **Let owners fork the whole enum block into their vault `CLAUDE.md`.** Rejected. Two full lists (reference + fork) is two sources of truth; they rot apart. The `entity_type_extensions:` allow-list adds *only the delta*, so the core stays single-sourced and the consumer composes core ∪ extensions at read time.
- **Version the profile with `schema_version` instead of its own `v1`.** Rejected. The two version on different axes: `schema_version` gates *fields the engine validates* (`src/core/schema.ts`); the ontology profile gates *the shape of the edge/enum tables*. Coupling them would force a `schema_version` bump (and a `migrate` run) for an ontology-table change that adds no field. An independent `ontology-profile-vN` label keeps each migration honest.

## Consequences

**Positive.**

- One named contract. R2's graph primitive, C1's descent, and I1's classifier + R1's `--type` all cite `ontology-profile-v1` and read the same two tables. When a predicate or page type changes, it changes in one table and every consumer follows.
- It stays inside the file everything already reads. No new store, no new engine surface, no new frontmatter field — additive under `schema_version` 1 and 2, so no `migrate` is forced and no v1 vault breaks (`src/core/schema.ts`; the v2-superset rule).
- The edge set is now *stated*, which makes S1-check (Lane B) possible: a wikilink whose endpoints violate a row's domain/range is a lint finding, and the graph walk provably follows only legal edges (Brief §6 "one graph-traversal primitive").
- `entity_type` calibration has exactly one sanctioned shape (`entity_type_extensions:` in the vault's own `CLAUDE.md`), satisfying decision #6 without ever creating a forked second list.
- The lint twin (`scripts/validate-frontmatter.sh`) and the engine read the *same* enums the profile names, closing the prose↔code asymmetry that ADR-0002 flagged for vocabulary.

**Negative.**

- **The profile is now load-bearing.** R2/C1/I1 depend on the table shape; an edit that drops a row or mistypes a domain misroutes a consumer. Mitigated by the S1-check lint extension (Lane B) asserting the table parses and by Tier-0 `validate-docs.sh` keeping the new terms glossary-clean. This is the same "now load-bearing" tradeoff ADR-0001 accepted for the wizard's `NEXT_STEP:` line.
- **Two version axes to teach** (`schema_version` vs `ontology-profile-vN`). A contributor could bump the wrong one. Mitigated: this ADR fixes the rule (field change → `schema_version`; table shape change → new `ontology-profile` + superseding ADR), and the profile section names its own version inline.
- **Calibration is per-vault and invisible to the reference vault's tests.** A `dataset`/`model` extension a user adds is exercised only in their vault. Mitigated: the *mechanism* (core ∪ `entity_type_extensions`) is tested once against the reference vault; owner deltas ride the owner's own `verify`/lint.
- **Closed page-type enum means adding a type is heavyweight** (new ADR + templates + lint case). Accepted deliberately: page type is the primary filter (`docs/vault-example/CLAUDE.md` "type is the primary filter") and the riskiest thing to let drift; the friction is the feature.

## Revisit when

- A consumer needs an edge the table does not express (e.g. a typed `cites`/`refutes` predicate distinct from `related`). Outcome: add the row, and if it implies a new frontmatter field, ship `ontology-profile-v2` plus a superseding ADR and the matching `schema_version` bump.
- Vault owners report `entity_type` calibration is too coarse (they want to widen `synthesis_type` or `project_status` too). Outcome: re-evaluate which enums become owner-calibratable, extending the `*_extensions:` mechanism rather than forking lists.
- The S1-check lint finds the domain→range rules are too strict for real vaults (legitimate edges flagged as violations). Outcome: relax the offending row's domain/range here first, then the lint follows — never the reverse, so the profile stays the source of truth.
- A second vault profile is needed for a non-research domain whose ontology differs. Outcome: generalise to named profiles (`ontology-profile-research-v1`, …) selected per vault, keeping the "one profile *per vault*, single-sourced" invariant intact.

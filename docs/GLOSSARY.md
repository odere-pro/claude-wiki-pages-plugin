# Glossary

Canonical term list for `claude-wiki-pages`. Every doc, every skill description, every user-visible string conforms to this file. `scripts/validate-docs.sh` enforces it on commit and in CI.

## Why this file exists

Glossary is **input weight**, not a lexicon. An LLM reading this project already carries strong priors for established community terms — MOC, vault, wiki, frontmatter, provenance, ingest. Naming our artifacts with those terms activates those priors and lowers drift. Novel compounds ("folder map", "root catalog", bare path strings like `raw/`) waste weight: the model has to learn them from scratch every conversation, and prose drifts as it forgets.

Rules:

- **Terms are concepts; descriptions map them to artifacts.** `raw content` is the term — its description says "lives in `raw/`".
- **One term, one row. No alternates inside a row.** Every concept has a single canonical form.
- **Prefer established community terms.** Align with PKM, Obsidian, and Karpathy-LLM-Wiki glossary where it exists. Invent only when nothing off-the-shelf fits.
- **Glossary is living.** Terminology that fails to carry its weight gets renamed; terminology earning its weight stays. Every change bumps the schema and is logged.

Two registers:

- **Technical** — terms used inside the product. Docs, skills, agents, scripts, schema.
- **Discoverability** — terms used on SEO surfaces only. README tagline, GitHub About, `plugin.json` description.

The registers do not mix. `vault` is the technical term for the directory; `LLM Wiki` is the discoverability term for the audience. Use each in its own surface.

## How `validate-docs.sh` enforces this

The script treats this file as input:

1. **Banned-string leaks** — flags `second-brain`, `second brain`, `vault-synthesize`, and `vault-index` outside the explicit allowlist (this file and `CHANGELOG.md` historical entries only). These strings are retired from the glossary as of schema version 1 and must not appear in new prose.
2. **Discoverability-in-technical-surface leaks** — flags `LLM Wiki Stack` (Title Case drift) and `agent harness` outside the SEO allowlist.
3. **Exemptions** — content inside fenced code blocks (` ``` ` and `~~~`) and inline code spans is not scanned. Heading text is scanned; the canonical form must win.
4. **Exit codes** — `0` clean; `1` any violation, with `path:line:column rule-id description` output.

Run locally:

```bash
scripts/validate-docs.sh
```

Wired as a `PostToolUse` hook on markdown edits and as a `pre-commit` hook.

## Updating the glossary

This file is under semver along with the schema. Additions are a minor bump; renames or changes in meaning are a major bump. Every change is logged in `CHANGELOG.md` under a "Glossary changes" subsection so downstream users can update their local prose deliberately.

## Technical glossary

### Schema terms

Formal contracts. Defined in `docs/vault-example/CLAUDE.md`; enforced by `validate-frontmatter.sh` and `verify-ingest.sh`.

| Term           | Description                                                                                                                                                                                              |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| schema         | The rules that define a valid vault. Lives in `vault/CLAUDE.md`. Skill defaults defer to it.                                                                                                             |
| schema version | Integer version of the schema. Frontmatter field `schema_version`. Current: 2 (v1 still supported). Mismatch blocks `verify-ingest.sh`. Upgrade in place with `migrate`.                                  |
| migrate        | The engine command that upgrades a vault's `schema_version` in place (v1 → v2). Additive, idempotent, git-checkpointed. `bash scripts/engine.sh migrate [--write]`. See `docs/migration-2.0.md`.         |
| frontmatter    | YAML block between `---` fences at the top of every wiki page.                                                                                                                                           |
| type           | Frontmatter field naming a page's category. One of `source`, `entity`, `concept`, `synthesis`, `index`, `log` (v1); v2 adds `topic`, `project`, `manifest`. The primary filter.                          |
| sources        | Frontmatter field listing a page's citations. Required on every non-source page. List of `[[wikilinks]]` into the sources folder (`_sources/`). Plain strings are a lint error.                          |
| topic page     | A page with `type: topic` (schema v2): a narrative landing page for a topic, distinct from the folder's `_index.md` Map of Content.                                                                       |
| project page   | A page with `type: project` (schema v2): a goal/initiative with a `project_status` lifecycle that aggregates related pages.                                                                               |
| source manifest | The page at `wiki/_sources/manifest.md` with `type: manifest` (schema v2). Tracks each raw source's processed state and content checksum. Bookkeeping — exempt from the `sources` and index checks.      |
| claim-level provenance | The optional `source_quotes` field (schema v2): pins individual claims to the verbatim source sentence behind them, complementing page-level `sources`.                                            |
| derived claim  | A page (or claim) marked `derived: true` (schema v2): LLM inference synthesised across sources rather than stated in one. Carries less direct evidentiary weight; keep `confidence` < 0.8 unless multi-source. |
| vault          | The user's knowledge directory. Holds raw content, wiki, and the vault schema. On disk: project root.                                                                                                    |
| example vault  | The populated reference vault in this repo, at `docs/vault-example/`. The wizard copies it into the user's project.                                                                                           |
| raw content    | Immutable source material. On disk: `raw/`. Writes blocked by `protect-raw.sh`.                                                                                                                          |
| wiki           | LLM-maintained typed pages. On disk: `wiki/`. Every page cites at least one source.                                                                                                                      |
| source         | One piece of raw content. One file under `raw/`. Immutable.                                                                                                                                              |
| wiki page      | Any markdown file under `wiki/` with typed frontmatter.                                                                                                                                                  |
| topic folder   | A folder under `wiki/` holding pages on one subject. Max nesting: four levels.                                                                                                                           |
| MOC            | Map of Content. Established PKM term for a navigation page over a scope. Frontmatter `type: index`. Per-folder MOC is `_index.md`; vault MOC is `wiki/index.md`. Scope differs; the concept is the same. |
| synthesis note | A page under `wiki/_synthesis/` with `type: synthesis`. Cross-topic analysis.                                                                                                                            |
| portable markdown | GitHub-flavored markdown without Obsidian-only syntax (`[[wikilinks]]`, Dataview, callouts, block IDs). The output format produced by `markdown` into `vault/output/`. Distinct from wiki pages, which use Obsidian-flavored markdown.                  |
| confidence decay | The gradual decrease in a page's `confidence` score as time passes without a source refresh, signalling that derived claims may be stale. Drives staleness detection in the curator agent. |
| staleness signal | Any indicator — elapsed time, missing sources, or low confidence — that a page may no longer reflect its raw sources. Surfaced by lint and the curator's staleness check. |

### Ontology terms

Formal vocabulary for the plugin's knowledge model. Defined in the `ontology-profile-v1` block of `docs/vault-example/CLAUDE.md`; consumed by the classifier, the graph-traversal primitive, and the tag taxonomy.

| Term                  | Description                                                                                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ontology              | The formal set of classes, properties, and typed relationships that structure the wiki. Lives in the `ontology-profile-v1` block of the vault schema; never a triplestore or RDF database.       |
| ontology-profile-v1   | The first versioned ontology block in `docs/vault-example/CLAUDE.md`. The single source of truth for the predicate domain→range table and the `entity_type` enum. Blocks R2, C1, and I1 until present. |
| class                 | A named category of wiki page in the ontology (e.g. `Person`, `Tool`, `Concept`). Every page with `type: entity` belongs to exactly one class via `entity_type`.                                |
| property              | A named attribute of a class in the ontology (e.g. `title`, `aliases`, `confidence`). Corresponds to a frontmatter field on pages of that class.                                                |
| predicate             | A typed directed relationship between two pages (e.g. `depends_on`, `related`, `sources`). Predicates form the edges of the wikilink graph and carry a `domain` and `range` constraint.         |
| domain                | The class that is the subject of a predicate — the page type that may carry this wikilink field. Defined per predicate in `ontology-profile-v1`.                                                 |
| range (ontology)      | The class that is the object of a predicate — the page type a wikilink field must point to. Distinct use of the word "range" from any numeric/interval sense; defined per predicate in `ontology-profile-v1`. |
| controlled vocabulary | A closed, maintained list of permitted values for a field (e.g. `entity_type`, `tag`). Changes require explicit governance; random additions are a lint error. See `tag taxonomy`.               |
| structured authoring  | Writing pages as instances of typed classes, conforming to a template, with single-sourced facts and presentation-independent content — the wiki's authoring discipline.                         |
| single-sourcing       | Storing a fact in exactly one wiki page and referencing it elsewhere via `[[wikilinks]]`, so updates propagate without copy-paste drift.                                                          |
| modular content       | Content broken into typed, reusable page units (entities, concepts, topics) rather than monolithic documents, enabling flexible composition without duplication.                                  |
| presentation-independence | The property of wiki pages whose meaning is separable from their rendered view. The Obsidian render is a view; the wiki page is the canonical form.                                           |

### Architecture terms

The plugin's structure. Contracts in [`architecture.md`](./architecture.md).

| Term                    | Description                                                                                    |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| claude-wiki-pages          | The plugin identifier. Lowercase, hyphenated. Used in headings and slash-command namespaces.   |
| four-layer stack        | The architecture. Four layers, each catching a different class of failure.                     |
| Layer 1 — Data          | The vault: raw content, wiki, vault schema. Passive — holds the material.                      |
| Layer 2 — Skills        | Single-responsibility slash commands. Twenty-three ship (12 verbs + onboarding + 5 agent-teaching + obsidian-graph-colors + obsidian-vault + 3 third-party obsidian-*). |
| Layer 3 — Agents        | Multi-step executors composing skills. Seven ship: orchestrator, onboarding, ingest, curator, analyst, polish, maintenance. |
| Layer 4 — Orchestration | Hooks, scripts, rules. Enforce the schema at every tool call.                                  |
| skill                   | A capability under `skills/`. Entry point is `/claude-wiki-pages:<name>`.                         |
| agent                   | A multi-step executor under `agents/`. Chains skills; owns completion gates.                   |
| command                 | A user-facing slash command under `commands/`. Surfaced as `/claude-wiki-pages:<name>`. Today: `wiki`, `doctor`. |
| hook                    | A lifecycle handler wired in `hooks/hooks.json`. Blocking hooks reject writes via exit code 2. |
| hook triggers           | `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `SubagentStop`.               |
| rule                    | A path-scoped guidance file under `rules/`. Declarative, not executable.                       |
| orchestrator            | The Layer 4 entry agent (`claude-wiki-pages-orchestrator-agent`). Probes vault state; dispatches to one specialist per invocation. |
| specialist              | A Layer 3 agent the orchestrator dispatches to (`-ingest-`, `-curator-`, `-analyst-`, `-polish-`). Never re-probes state; trusts the orchestrator's payload. |
| polish                  | The tail-of-write step (`claude-wiki-pages-polish-agent`) that keeps the Obsidian-side experience in sync — graph colors, vault MOC, per-folder MOC consistency. Runs after every ingest or curator. |
| doctor                  | The environment health check (`/claude-wiki-pages:doctor`, `scripts/doctor.sh`). Read-only by contract; exit codes 0–5. |
| pipeline                | Shorthand for the `claude-wiki-pages-ingest-agent`. (Was `llm-wiki-ingest-pipeline` before `0.2.0`.)                          |
| provenance              | The traceable chain from a wiki page's `sources` through `_sources/` to raw content.           |
| firewall                | Vault isolation: the PreToolUse boundary (`scripts/firewall.sh` + the engine `firewall` command) that confines agent writes to the resolved vault plus `allowPaths`, minus `denyPaths`. Modes: `enforce`/`warn`/`off`. |
| allow-list              | `firewall.allowPaths` — extra write roots permitted beyond the resolved vault. The resolved vault is always implicitly allowed; `denyPaths` globs override both. |
| backlog                 | Outstanding maintenance: raw sources with no `_sources/` summary (pending) plus an overdue lint. Reported deterministically by the engine `backlog` command. |
| heartbeat               | `scripts/heartbeat.sh` — surfaces a one-line catch-up recommendation at SessionStart when `maintenance.enabled` and a backlog exists. Recommends only; never mutates the vault. |
| catch-up                | Acting on a backlog: the ingest → curator → polish → lint loop that clears pending sources and refreshes lint. |
| maintenance             | Autonomous upkeep: the `maintenance` config block + `claude-wiki-pages-maintenance-agent` that runs the catch-up loop in one pass. Off by default. |
| proposed draft          | A page under `vault/_proposed/` with `status: draft` and `proposed_by`. Mirrors its eventual `wiki/` path; outside every wiki-scoped check until promoted. |
| `_proposed/`            | The staging directory (`vault/_proposed/`) that holds proposed drafts. A sibling of `wiki/`; sits outside every wiki-scoped check (frontmatter validation, lint, index) until a draft is promoted via `propose approve`. There is exactly one `_proposed/` channel — no second draft mechanism. |
| review                  | The promote/reject gate (`/claude-wiki-pages:review` + engine `propose`). The only sanctioned path from a draft to the wiki; runs under a git checkpoint. |
| local model             | Optional Ollama/LM Studio drafting into `_proposed/` (`/claude-wiki-pages:draft`, `localModel` config). Off by default — Claude Code stays primary. |
| layer coloring          | An optional graph-color pass (raw→green, wiki→blue, schema→orange) layered after per-topic colors, so the three-layer structure is visible at a glance. Applied by the polish agent via `obsidian-graph-colors`. |

### Skill and agent naming

Since `1.0.0`, plugin-authored **skills** are bare short verbs (`init`, `ingest`, `query`, `lint`, `fix`, `status`, `synthesize`, `index`, `markdown`) — the `/claude-wiki-pages:` namespace already scopes them, so a redundant brand prefix is dropped. Skills targeting Obsidian keep an `obsidian-` prefix (e.g., `obsidian-graph-colors` writes to `.obsidian/graph.json`). Three third-party reference skills — `obsidian-markdown`, `obsidian-bases`, `obsidian-cli` — are retained under their upstream MIT names; attribution lives in `NOTICE` and `THIRD_PARTY_LICENSES.md`. The `obsidian-` prefix is therefore a naming convention by target, not a provenance marker.

Skills and agents share the same namespace (`/claude-wiki-pages:<name>`), so their names must be globally unique. The convention below ensures they never collide:

- **Skills** — single verb or noun suffix: `ingest`, `query`, `lint`, `markdown`.
- **Agents** — `{plugin-name}-{role}-agent` since `0.2.0`: `claude-wiki-pages-orchestrator-agent`, `claude-wiki-pages-ingest-agent`, `claude-wiki-pages-curator-agent`, `claude-wiki-pages-analyst-agent`. The plugin-prefix matches the plugin id exactly (not `llm-wiki-` substring) so future search-and-replace is unambiguous. The `-agent` suffix is mandatory; it disambiguates an agent from a skill on first read of a slash command.
- **Commands** — short verb names under `commands/`: `wiki`, `doctor`. Surfaced as `/claude-wiki-pages:wiki` and `/claude-wiki-pages:doctor`.

| Name                       | Kind            | Meaning                                                                                                                                                   |
| -------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `init`                     | Skill (Layer 2) | The onboarding entry-point skill (renamed from `llm-wiki` in `1.0.0`). Scaffolds the vault. Always written as `/claude-wiki-pages:init` in technical prose. |
| `ingest`          | Skill (Layer 2) | Plugin-authored. Single-verb skill name.                                                                                                                  |
| `query`           | Skill (Layer 2) | Plugin-authored. Single-verb skill name.                                                                                                                  |
| `lint`            | Skill (Layer 2) | Plugin-authored. Single-verb skill name.                                                                                                                  |
| `fix`             | Skill (Layer 2) | Plugin-authored. Single-verb skill name.                                                                                                                  |
| `status`          | Skill (Layer 2) | Plugin-authored. Single-verb skill name.                                                                                                                  |
| `synthesize`      | Skill (Layer 2) | Plugin-authored. Single-verb skill name.                                                                                                                  |
| `index`           | Skill (Layer 2) | Plugin-authored. Single-verb skill name.                                                                                                                  |
| `markdown`        | Skill (Layer 2) | Plugin-authored. Single-noun skill name; renders a query answer as portable markdown into `vault/output/`.                                                |
| `claude-wiki-pages-orchestrator-agent`    | Agent (Layer 3/4) | Plugin-authored. Top-level dispatch for `/claude-wiki-pages:wiki`. `user-invocable: true`. Probes vault state; routes to exactly one specialist per turn. |
| `claude-wiki-pages-ingest-agent`          | Agent (Layer 3) | Plugin-authored. Renamed from `llm-wiki-ingest-pipeline` in `0.2.0`. Chains ingest → curator → optimize (opt-in) → synthesize.                            |
| `claude-wiki-pages-curator-agent`         | Agent (Layer 3) | Plugin-authored. Renamed from `llm-wiki-lint-fix` in `0.2.0`. Audits, auto-applies safe mechanical fixes, gates judgment fixes (restructures, merges) behind plans. |
| `claude-wiki-pages-analyst-agent`         | Agent (Layer 3) | Plugin-authored. Renamed from `llm-wiki-analyst` in `0.2.0`. Five modes: query, dashboard, document compile, extract, challenge.                            |
| `claude-wiki-pages-polish-agent`          | Agent (Layer 3) | Plugin-authored. New in `0.2.0`. Tail-of-write step run by the orchestrator after every successful ingest or curator pass — graph colors, vault MOC, per-folder MOC consistency. |
| `obsidian-graph-colors`    | Skill (Layer 2) | Plugin-authored. `obsidian-` prefix signals the target (Obsidian's graph plugin), not third-party provenance.                                             |
| `obsidian-markdown`        | Skill (Layer 2) | Third-party. MIT, `kepano/obsidian-skills`. Kept under original name and license; attribution in `NOTICE`.                                                |
| `obsidian-bases`           | Skill (Layer 2) | Third-party. MIT, `kepano/obsidian-skills`. Kept under original name and license; attribution in `NOTICE`.                                                |
| `obsidian-cli`             | Skill (Layer 2) | Third-party. MIT, `kepano/obsidian-skills`. Kept under original name and license; attribution in `NOTICE`.                                                |

### Layer 2 skills

Canonical names for the plugin's single-responsibility capabilities. Every entry below maps 1:1 to a directory under `skills/` and to a command `/claude-wiki-pages:<name>`.

| Term                  | Description                                                                                                                      |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| init                  | Onboarding/init skill (renamed from `llm-wiki` in `1.0.0`). Scaffolds `vault/` from `docs/vault-example/` and orients the user. Slash command: `/claude-wiki-pages:init`. |
| ingest       | Processes one or more sources under `raw/` into wiki pages.                                                                      |
| query        | Answers a question from the wiki with `[[wikilink]]` citations.                                                                  |
| lint         | Audits the wiki for structural and provenance drift.                                                                             |
| fix          | Auto-repairs what lint reports. Idempotent.                                                                                      |
| status       | One-command health check. Exercises every hook path. Leaves the vault unchanged.                                                 |
| synthesize   | Writes a cross-topic synthesis note under `wiki/_synthesis/`.                                                                    |
| index        | Generates or refreshes the vault MOC at `wiki/index.md`.                                                                         |
| markdown     | Renders a query answer as portable markdown under `vault/output/`. Strips Obsidian-only syntax so the file is usable elsewhere.  |
| search       | Deterministic keyword retrieval over `wiki/`: ranks pages (title/alias > tag > body) and returns `[[wikilink]]`-ready hits. A candidate set, not a cited answer. Backed by the engine `search` command.  |
| onboarding   | Guided first-run flow (new in `1.0.0`): health → scaffold → add source → ingest → first cited answer. Idempotent; resumes in place. |
| engine-api   | Agent-teaching skill (new in `1.0.0`): the LLM-facing contract for the Bun engine — subcommands, `--json` shapes, exit codes.    |
| maintain-contract | Agent-teaching skill (new in `1.0.0`): the safe ingest/retrieve/maintain ordering (ground → judge → verify) for any agent.   |
| review       | Promote/reject drafted pages under `_proposed/` (the human-in-the-loop gate). Backed by the engine `propose` command. |
| draft        | Local-model (Ollama/LM Studio) drafting into `_proposed/`. Off unless `localModel.enabled`. Plugin-authored.                     |
| obsidian-graph-colors | Applies per-topic and layer colors to Obsidian's graph view. Plugin-authored.                                                    |
| obsidian-vault        | Guard skill: scope every Obsidian CLI call to the resolved vault. Plugin-authored; complements the firewall hook.                |
| obsidian-markdown     | Obsidian-flavored markdown reference. MIT, kepano/obsidian-skills.                                                               |
| obsidian-bases        | Obsidian Bases (database) reference. MIT, kepano/obsidian-skills.                                                                |
| obsidian-cli          | Obsidian CLI reference. MIT, kepano/obsidian-skills.                                                                             |

### User-facing verbs

Lowercase in body prose; capitalize at the start of a heading. Each logs an entry to `wiki/log.md`.

| Term       | Description                                                                      |
| ---------- | -------------------------------------------------------------------------------- |
| ingest     | Process raw content into wiki pages.                                             |
| query      | Answer a question from the wiki with `[[wikilink]]` citations.                   |
| lint       | Audit the vault for structural drift. Reports errors, warnings, info.            |
| fix        | Auto-repair what lint reports. Idempotent.                                       |
| synthesize | Write a cross-topic synthesis note under `wiki/_synthesis/`.                     |
| markdown   | Render a query answer as portable markdown under `vault/output/`.                |
| status     | One-command health check. Exercises every hook path. Leaves the vault unchanged. |

### Operator concepts

| Term                     | Description                                                                                          |
| ------------------------ | ---------------------------------------------------------------------------------------------------- |
| onboarding wizard        | The `/claude-wiki-pages:init` flow. Scaffolds the vault and orients the user.                       |
| default verb             | `/claude-wiki-pages:wiki`. The top-level entry — the plugin probes vault state and chooses what to run. |
| power-user surface       | The individual skills users reach for when they want tighter scope than the pipeline.                |
| post-install perspective | The voice user guides are written in. Assume `/plugin install`, not `git clone`.                     |
| marketplace              | Same-repo marketplace: `.claude-plugin/marketplace.json` points at `.`; the repo is the marketplace. |
| GraphRAG                 | Graph-aware retrieval: expand a `search` hit along the wikilink graph (`sources`, `related`, `depends_on`) to its N-hop neighbourhood. Documented direction for a future `search --graph`; traversal over the existing graph, not a new index. |

### Retrieval terms

Concepts for the deterministic, embedding-free retrieval path (§5 non-negotiable).

| Term                    | Description                                                                                                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| synonym lexicon         | The checked-in file of curated term→alias mappings used to expand a query before the keyword match. Distinct from frontmatter `aliases`, which are page-level; the lexicon is vault-global and governed. |
| synonym expansion       | Replacing a query term with its synonyms from the synonym lexicon before keyword matching, so a search for "ML" also matches pages tagged "machine learning".                                    |
| query expansion         | Broadening a search query by adding synonyms, stems, or related terms before matching, increasing recall without embeddings.                                                                     |
| stemming                | Reducing query and page tokens to their root form (e.g. "running" → "run") so morphological variants match. Applied deterministically in the Bun engine; no ML model involved.                  |
| graph link-walk         | Following typed wikilinks (`sources`, `related`, `depends_on`) from a seed page to its N-hop neighbourhood. The non-embedding recall mechanism; walks the existing Obsidian graph structure.    |
| graph-traversal primitive | The single engine function that executes a graph link-walk given a seed page, a predicate set (from `ontology-profile-v1`), and a hop limit N. Returns scored page references, never page bodies. Shared by R2, R3, and C1. |
| candidate filter        | A `--type`, `--folder`, or `--tag` argument that restricts the search corpus before ranking, improving precision. Implemented in the engine `search` command.                                    |
| score breakdown         | The per-match explanation of how a search score was assembled (title hit, tag hit, body hit, graph proximity). Emitted in JSON under the `matched{}` field; used by the analyst for cut-off decisions. |
| match component         | One entry in a `score breakdown` — a `{channel, term, hits, points}` record naming which scoring channel (title-phrase, title-term, tag-term, body-term) a query term fired and the points it contributed. The atom of `matched{}`; a hit's `score` equals the sum of its match components' `points`. |
| working set             | The subset of wiki pages loaded into the LLM's context window for a given query or agent turn, bounded by the context budget.                                                                    |
| MOC descent             | Traversing the Map-of-Content hierarchy (vault MOC → topic MOC → page) to collect the relevant working set for a query, staying within the context budget.                                      |
| context budget          | The maximum token allocation reserved for wiki-page content in a single LLM call. Constrains MOC descent depth and the size of the working set.                                                 |
| tag taxonomy            | The governed closed list of tags permitted in vault frontmatter. A subset of the controlled vocabulary; subject to quality and freshness evaluations to prevent drift.                           |

### Vault management terms

| Term                      | Description                                                                                                                                                                               |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| active vault              | The single vault currently designated for writes. Exactly one vault is active at a time; the firewall enforces write confinement to it. Set via `scripts/set-vault.sh` or the `switch` lifecycle command. |
| vault registry            | The managed list of vaults known to the plugin, stored in `.claude/claude-wiki-pages/settings.json`. Supports `add`, `remove`, `merge`, and `switch` lifecycle operations.               |
| vault lifecycle           | The set of operations that govern a vault's membership in the registry: `add` (register), `remove` (deregister), `merge` (consolidate two vaults), `switch` (change the active vault).  |
| vault merge               | The lifecycle operation that consolidates two vaults into one, deduplicating by `sources` and title, and flagging collisions for human review.                                            |
| per-vault write confinement | The firewall invariant that agent and tool writes are restricted to the active vault plus its explicit `allowPaths`. Cross-vault writes are blocked. Enforced by `scripts/firewall.sh` and `src/core/firewall.ts`. |

### Ingest and memory terms

| Term                      | Description                                                                                                                                                                               |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| agent-session source      | A wiki page written by an agent during a session, carrying `source_type: agent-session` in frontmatter. The sanctioned `source_type` for durable-memory write-backs via the review gate. |
| session learning          | Observations or conclusions an agent accumulates during a session that are candidates for durable storage as `agent-session source` pages via the `_proposed/` channel.                   |
| ingest-extract            | The sub-step of the ingest pipeline that reads a raw source and extracts structured entities, concepts, and claims before writing wiki pages. Distinct from the write step.              |
| local-ingest-stub         | A lightweight ingest path (`/claude-wiki-pages:draft` with `localModel.enabled`) that routes new content through `_proposed/` for human review rather than writing directly to `wiki/`. Pc in the roadmap. |
| provenance-completeness   | The property of a wiki page that every claim traceable to a raw source carries an explicit `sources` entry (and optionally `source_quotes`). Checked by the provenance-completeness lint rule (I3). |
| classification checklist  | The structured prompt or rule (I1) that ensures an ingested entity is evaluated against the `entity_type` enum and assigned to the correct class before a wiki page is written.          |

### Capability and model terms

| Term                  | Description                                                                                                                                                                               |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| capability tier       | A named level of plugin functionality tied to the available LLM (e.g. Tier 1: Claude full, Tier 2: Ollama draft-only). Each tier specifies which skills and agents are active.           |
| capability progression | The roadmap plan to widen local-model scope one capability tier at a time, gated on each tier meeting a defined quality threshold before the next tier is unlocked.                      |
| degraded mode         | Operation at a lower capability tier when the full-capability model (Claude) is unavailable. The plugin remains functional for the capabilities of the active tier.                      |
| model-agnostic        | The design property that plugin logic (skills, agents, scripts) makes no assumption about which LLM is running. Provider selection is a configuration concern (`localModel` config block). |
| quality gate          | A defined eval metric and pass threshold that a local model must meet before a capability tier is widened. Prevents premature expansion of Ollama scope beyond proven ability.           |
| golden set            | A checked-in fixtures set of raw-source inputs paired with their expected structured output (frontmatter plus claims), used as the deterministic reference for the local-model quality-gate eval. Output is scored by exact comparison to the golden set, never by vector similarity.           |

### UX and DX terms

| Term                  | Description                                                                                                                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| progressive disclosure | Surfacing only the concepts a user needs at their current stage, revealing more advanced options only after the basics are mastered. Governs how the plugin presents verbs and flags.       |
| one advertised path   | The UX principle that exactly one verb is promoted as the entry point for each task (`/claude-wiki-pages:wiki`); alternatives exist but are documented below a fold.                        |
| time-to-first-value   | The elapsed time from install to the user's first successful cited answer. A UX health metric for the onboarding flow.                                                                      |
| time-to-mastery       | The elapsed time from first-value to confident independent use of the power-user surface. A UX health metric for the progressive-disclosure design.                                         |

### Authoritative files

| Term                 | Description                                                                                                                            |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| vault schema         | `vault/CLAUDE.md`. The authoritative schema; read at the start of every operation. Mirrored by `docs/vault-example/CLAUDE.md` in this repo. |
| repo guide           | The repo root `CLAUDE.md`. A map for LLMs editing this repo. Not the schema.                                                           |
| specification        | The authority set that replaced the former single spec file: `docs/architecture.md` (four-layer architecture & contracts), `docs/vault-example/CLAUDE.md` (schema), and this glossary (canonical terms). |
| NOTICE               | `NOTICE` at the repo root. Attribution for bundled third-party code. Apache-2.0 requires preservation.                                 |
| third-party licenses | `THIRD_PARTY_LICENSES.md`. Full license text of any bundled non-Apache-2.0 code.                                                       |

### Banned strings

Retired from the glossary as of schema version 1. `validate-docs.sh` flags occurrences outside this file and `CHANGELOG.md` (which preserves historical record).

| Banned                                                  | Replacement                                                                                         |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `second-brain` (hyphenated, in any skill name or prose) | `init` for the onboarding skill; the specific verb (`ingest`, `lint`, …) for the others.           |
| `second brain` (spaced, in any prose)                   | `LLM Wiki` in discoverability surfaces; the specific verb (`ingest`, `lint`, …) in technical prose. |
| `vault-synthesize`                                      | `synthesize`.                                                                              |
| `vault-index`                                           | `index`.                                                                                   |

#### Renamed in `1.0.0` (plugin rebrand to `claude-wiki-pages`)

Banned outside `CHANGELOG.md`, `docs/adr/*`, and `docs/migration-1.0.md`, which preserve the historical record.

| Banned (pre-`1.0.0`)                                                                 | Replacement                                            |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| `llm-wiki-stack`                                                                      | `claude-wiki-pages`                                    |
| `/llm-wiki-stack:`                                                                    | `/claude-wiki-pages:`                                  |
| `llm-wiki-stack-{orchestrator,ingest,curator,analyst,polish}-agent`                  | `claude-wiki-pages-…-agent`                            |
| `llm-wiki-{ingest,query,lint,fix,status,synthesize,index,markdown}` (skill names)    | the bare verb (`ingest`, `query`, …)                  |
| `llm-wiki` (the onboarding skill name)                                                | `init`                                                 |

> `validate-docs.sh` enforces the last row narrowly: it flags `llm-wiki` only in *skill* context — the backtick form `` `llm-wiki` `` and the `/claude-wiki-pages:` namespaced form — so the kept `llm-wiki-pattern` (Karpathy's pattern), the `docs/llm-wiki/` guide directory, and the `plugin.json` keywords are never affected.

## Discoverability glossary

Permitted only in:

- `README.md` — H1, tagline, the top paragraph, the GitHub About card.
- `.claude-plugin/plugin.json` `description` and `keywords`.
- `.claude-plugin/marketplace.json` `description`.

Banned everywhere else. `validate-docs.sh` flags stray occurrences outside these surfaces.

| Term                      | Description                                                                                        |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| Claude Code plugin        | Primary search category. Use in the tagline and first sentence.                                    |
| agent stack               | Competitor-search synonym.                                                                         |
| agent harness             | Competitor-search synonym.                                                                         |
| multi-agent orchestration | Competitor-search synonym.                                                                         |
| hook-enforced             | The plugin's whitespace positioning. Use in the tagline.                                           |
| knowledge management      | PKM-audience entry phrase.                                                                         |
| opinionated               | Positioning keyword. Frames the project's stance.                                                  |
| convention                | Positioning keyword. Frames the project's stance.                                                  |
| pattern                   | Positioning keyword. Frames the project's stance.                                                  |
| Karpathy LLM Wiki pattern | The source pattern. Use on first reference; link to the gist.                                      |
| LLM Wiki                  | Short form of "Karpathy LLM Wiki pattern". Use after first reference. Primary PKM-audience phrase. |

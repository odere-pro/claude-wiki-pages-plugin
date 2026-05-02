# Vocabulary

Canonical term list for `llm-wiki-stack`. Every doc, every skill description, every user-visible string conforms to this file. `scripts/validate-docs.sh` enforces it on commit and in CI.

## Why this file exists

Vocabulary is **input weight**, not a lexicon. An LLM reading this project already carries strong priors for established community terms — MOC, vault, wiki, frontmatter, provenance, ingest. Naming our artifacts with those terms activates those priors and lowers drift. Novel compounds ("folder map", "root catalog", bare path strings like `raw/`) waste weight: the model has to learn them from scratch every conversation, and prose drifts as it forgets.

Rules:

- **Terms are concepts; descriptions map them to artifacts.** `raw content` is the term — its description says "lives in `raw/`".
- **One term, one row. No alternates inside a row.** Every concept has a single canonical form.
- **Prefer established community terms.** Align with PKM, Obsidian, and Karpathy-LLM-Wiki vocabulary where it exists. Invent only when nothing off-the-shelf fits.
- **Vocabulary is living.** Terminology that fails to carry its weight gets renamed; terminology earning its weight stays. Every change bumps the schema and is logged.

Two registers:

- **Technical** — terms used inside the product. Docs, skills, agents, scripts, schema.
- **Discoverability** — terms used on SEO surfaces only. README tagline, GitHub About, `plugin.json` description.

The registers do not mix. `vault` is the technical term for the directory; `LLM Wiki` is the discoverability term for the audience. Use each in its own surface.

## How `validate-docs.sh` enforces this

The script treats this file as input:

1. **Banned-string leaks** — flags `second-brain`, `second brain`, `vault-synthesize`, and `vault-index` outside the explicit allowlist (this file and `CHANGELOG.md` historical entries only). These strings are retired from the vocabulary as of schema version 1 and must not appear in new prose.
2. **Discoverability-in-technical-surface leaks** — flags `LLM Wiki Stack` (Title Case drift) and `agent harness` outside the SEO allowlist.
3. **Exemptions** — content inside fenced code blocks (` ``` ` and `~~~`) and inline code spans is not scanned. Heading text is scanned; the canonical form must win.
4. **Exit codes** — `0` clean; `1` any violation, with `path:line:column rule-id description` output.

Run locally:

```bash
scripts/validate-docs.sh
```

Wired as a `PostToolUse` hook on markdown edits and as a `pre-commit` hook.

## Updating the vocabulary

This file is under semver along with the schema. Additions are a minor bump; renames or changes in meaning are a major bump. Every change is logged in `CHANGELOG.md` under a "Vocabulary changes" subsection so downstream users can update their local prose deliberately.

## Technical vocabulary

### Schema terms

Formal contracts. Defined in `docs/vault-example/CLAUDE.md`; enforced by `validate-frontmatter.sh` and `verify-ingest.sh`.

| Term           | Description                                                                                                                                                                                              |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| schema         | The rules that define a valid vault. Lives in `vault/CLAUDE.md`. Skill defaults defer to it.                                                                                                             |
| schema version | Integer version of the schema. Frontmatter field `schema_version`. Current: 1. Mismatch blocks `verify-ingest.sh`.                                                                                       |
| frontmatter    | YAML block between `---` fences at the top of every wiki page.                                                                                                                                           |
| type           | Frontmatter field naming a page's category. One of `source`, `entity`, `concept`, `synthesis`, `index`, `log`. The primary filter.                                                                       |
| sources        | Frontmatter field listing a page's citations. Required on every non-source page. List of `[[wikilinks]]` into the sources folder (`_sources/`). Plain strings are a lint error.                          |
| vault          | The user's knowledge directory. Holds raw content, wiki, and the vault schema. On disk: project root.                                                                                                    |
| example vault  | The populated reference vault in this repo, at `docs/vault-example/`. The wizard copies it into the user's project.                                                                                           |
| raw content    | Immutable source material. On disk: `raw/`. Writes blocked by `protect-raw.sh`.                                                                                                                          |
| wiki           | LLM-maintained typed pages. On disk: `wiki/`. Every page cites at least one source.                                                                                                                      |
| source         | One piece of raw content. One file under `raw/`. Immutable.                                                                                                                                              |
| wiki page      | Any markdown file under `wiki/` with typed frontmatter.                                                                                                                                                  |
| topic folder   | A folder under `wiki/` holding pages on one subject. Max nesting: four levels.                                                                                                                           |
| MOC            | Map of Content. Established PKM term for a navigation page over a scope. Frontmatter `type: index`. Per-folder MOC is `_index.md`; vault MOC is `wiki/index.md`. Scope differs; the concept is the same. |
| synthesis note | A page under `wiki/_synthesis/` with `type: synthesis`. Cross-topic analysis.                                                                                                                            |
| portable markdown | GitHub-flavored markdown without Obsidian-only syntax (`[[wikilinks]]`, Dataview, callouts, block IDs). The output format produced by `llm-wiki-markdown` into `vault/output/`. Distinct from wiki pages, which use Obsidian-flavored markdown.                  |

### Architecture terms

The plugin's structure. Contracts in `/SPEC.md`.

| Term                    | Description                                                                                    |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| llm-wiki-stack          | The plugin identifier. Lowercase, hyphenated. Used in headings and slash-command namespaces.   |
| four-layer stack        | The architecture. Four layers, each catching a different class of failure.                     |
| Layer 1 — Data          | The vault: raw content, wiki, vault schema. Passive — holds the material.                      |
| Layer 2 — Skills        | Single-responsibility slash commands. Thirteen ship.                                           |
| Layer 3 — Agents        | Multi-step executors composing skills. Five ship: orchestrator, ingest, curator, analyst, polish. |
| Layer 4 — Orchestration | Hooks, scripts, rules. Enforce the schema at every tool call.                                  |
| skill                   | A capability under `skills/`. Entry point is `/llm-wiki-stack:<name>`.                         |
| agent                   | A multi-step executor under `agents/`. Chains skills; owns completion gates.                   |
| command                 | A user-facing slash command under `commands/`. Surfaced as `/llm-wiki-stack:<name>`. Today: `wiki`, `wiki-doctor`. |
| hook                    | A lifecycle handler wired in `hooks/hooks.json`. Blocking hooks reject writes via exit code 2. |
| hook triggers           | `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `SubagentStop`.               |
| rule                    | A path-scoped guidance file under `rules/`. Declarative, not executable.                       |
| orchestrator            | The Layer 4 entry agent (`llm-wiki-stack-orchestrator-agent`). Probes vault state; dispatches to one specialist per invocation. |
| specialist              | A Layer 3 agent the orchestrator dispatches to (`-ingest-`, `-curator-`, `-analyst-`, `-polish-`). Never re-probes state; trusts the orchestrator's payload. |
| polish                  | The tail-of-write step (`llm-wiki-stack-polish-agent`) that keeps the Obsidian-side experience in sync — graph colors, vault MOC, per-folder MOC consistency. Runs after every ingest or curator. |
| doctor                  | The environment health check (`/llm-wiki-stack:wiki-doctor`, `scripts/doctor.sh`). Read-only by contract; exit codes 0–5. |
| pipeline                | Shorthand for the `llm-wiki-stack-ingest-agent`. (Was `llm-wiki-ingest-pipeline` before `0.2.0`.)                          |
| provenance              | The traceable chain from a wiki page's `sources` through `_sources/` to raw content.           |

### Skill and agent naming

Plugin-authored skills and agents use the `llm-wiki-` prefix when the target is the wiki itself, and an `obsidian-` prefix when the target is Obsidian (e.g., `obsidian-graph-colors` writes to `.obsidian/graph.json`). The bare `llm-wiki` name is reserved for the onboarding entry-point skill. Three third-party reference skills — `obsidian-markdown`, `obsidian-bases`, `obsidian-cli` — are retained under their upstream MIT names; attribution lives in `NOTICE` and `THIRD_PARTY_LICENSES.md`. The `obsidian-` prefix is therefore a naming convention by target, not a provenance marker.

Skills and agents share the same namespace (`/llm-wiki-stack:<name>`), so their names must be globally unique. The convention below ensures they never collide:

- **Skills** — single verb or noun suffix: `llm-wiki-ingest`, `llm-wiki-query`, `llm-wiki-lint`, `llm-wiki-markdown`.
- **Agents** — `{plugin-name}-{role}-agent` since `0.2.0`: `llm-wiki-stack-orchestrator-agent`, `llm-wiki-stack-ingest-agent`, `llm-wiki-stack-curator-agent`, `llm-wiki-stack-analyst-agent`. The plugin-prefix matches the plugin id exactly (not `llm-wiki-` substring) so future search-and-replace is unambiguous. The `-agent` suffix is mandatory; it disambiguates an agent from a skill on first read of a slash command.
- **Commands** — short verb names under `commands/`: `wiki`, `wiki-doctor`. Surfaced as `/llm-wiki-stack:wiki` and `/llm-wiki-stack:wiki-doctor`.

| Name                       | Kind            | Meaning                                                                                                                                                   |
| -------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `llm-wiki`                 | Skill (Layer 2) | The onboarding entry-point skill. Disambiguate from the plugin identifier by always using the `/llm-wiki-stack:llm-wiki` command form in technical prose. |
| `llm-wiki-ingest`          | Skill (Layer 2) | Plugin-authored. Single-verb skill name.                                                                                                                  |
| `llm-wiki-query`           | Skill (Layer 2) | Plugin-authored. Single-verb skill name.                                                                                                                  |
| `llm-wiki-lint`            | Skill (Layer 2) | Plugin-authored. Single-verb skill name.                                                                                                                  |
| `llm-wiki-fix`             | Skill (Layer 2) | Plugin-authored. Single-verb skill name.                                                                                                                  |
| `llm-wiki-status`          | Skill (Layer 2) | Plugin-authored. Single-verb skill name.                                                                                                                  |
| `llm-wiki-synthesize`      | Skill (Layer 2) | Plugin-authored. Single-verb skill name.                                                                                                                  |
| `llm-wiki-index`           | Skill (Layer 2) | Plugin-authored. Single-verb skill name.                                                                                                                  |
| `llm-wiki-markdown`        | Skill (Layer 2) | Plugin-authored. Single-noun skill name; renders a query answer as portable markdown into `vault/output/`.                                                |
| `llm-wiki-stack-orchestrator-agent`    | Agent (Layer 3/4) | Plugin-authored. Top-level dispatch for `/llm-wiki-stack:wiki`. `user-invocable: true`. Probes vault state; routes to exactly one specialist per turn. |
| `llm-wiki-stack-ingest-agent`          | Agent (Layer 3) | Plugin-authored. Renamed from `llm-wiki-ingest-pipeline` in `0.2.0`. Chains ingest → curator → optimize (opt-in) → synthesize.                            |
| `llm-wiki-stack-curator-agent`         | Agent (Layer 3) | Plugin-authored. Renamed from `llm-wiki-lint-fix` in `0.2.0`. Audits, auto-applies safe mechanical fixes, gates judgment fixes (restructures, merges) behind plans. |
| `llm-wiki-stack-analyst-agent`         | Agent (Layer 3) | Plugin-authored. Renamed from `llm-wiki-analyst` in `0.2.0`. Five modes: query, dashboard, document compile, extract, challenge.                            |
| `llm-wiki-stack-polish-agent`          | Agent (Layer 3) | Plugin-authored. New in `0.2.0`. Tail-of-write step run by the orchestrator after every successful ingest or curator pass — graph colors, vault MOC, per-folder MOC consistency. |
| `obsidian-graph-colors`    | Skill (Layer 2) | Plugin-authored. `obsidian-` prefix signals the target (Obsidian's graph plugin), not third-party provenance.                                             |
| `obsidian-markdown`        | Skill (Layer 2) | Third-party. MIT, `kepano/obsidian-skills`. Kept under original name and license; attribution in `NOTICE`.                                                |
| `obsidian-bases`           | Skill (Layer 2) | Third-party. MIT, `kepano/obsidian-skills`. Kept under original name and license; attribution in `NOTICE`.                                                |
| `obsidian-cli`             | Skill (Layer 2) | Third-party. MIT, `kepano/obsidian-skills`. Kept under original name and license; attribution in `NOTICE`.                                                |

### Layer 2 skills

Canonical names for the plugin's single-responsibility capabilities. Every entry below maps 1:1 to a directory under `skills/` and to a command `/llm-wiki-stack:<name>`.

| Term                  | Description                                                                                                                      |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| llm-wiki              | Onboarding/init skill. Scaffolds `vault/` from `docs/vault-example/` and orients the user. Slash command: `/llm-wiki-stack:llm-wiki`. |
| llm-wiki-ingest       | Processes one or more sources under `raw/` into wiki pages.                                                                      |
| llm-wiki-query        | Answers a question from the wiki with `[[wikilink]]` citations.                                                                  |
| llm-wiki-lint         | Audits the wiki for structural and provenance drift.                                                                             |
| llm-wiki-fix          | Auto-repairs what lint reports. Idempotent.                                                                                      |
| llm-wiki-status       | One-command health check. Exercises every hook path. Leaves the vault unchanged.                                                 |
| llm-wiki-synthesize   | Writes a cross-topic synthesis note under `wiki/_synthesis/`.                                                                    |
| llm-wiki-index        | Generates or refreshes the vault MOC at `wiki/index.md`.                                                                         |
| llm-wiki-markdown     | Renders a query answer as portable markdown under `vault/output/`. Strips Obsidian-only syntax so the file is usable elsewhere.  |
| obsidian-graph-colors | Applies per-topic colors to Obsidian's graph view. Plugin-authored.                                                              |
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
| onboarding wizard        | The `/llm-wiki-stack:llm-wiki` flow. Scaffolds the vault and orients the user.                       |
| default verb             | `/llm-wiki-stack:wiki`. The top-level entry — the plugin probes vault state and chooses what to run. |
| power-user surface       | The individual skills users reach for when they want tighter scope than the pipeline.                |
| post-install perspective | The voice user guides are written in. Assume `/plugin install`, not `git clone`.                     |
| marketplace              | Same-repo marketplace: `.claude-plugin/marketplace.json` points at `.`; the repo is the marketplace. |

### Authoritative files

| Term                 | Description                                                                                                                            |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| vault schema         | `vault/CLAUDE.md`. The authoritative schema; read at the start of every operation. Mirrored by `docs/vault-example/CLAUDE.md` in this repo. |
| repo guide           | The repo root `CLAUDE.md`. A map for LLMs editing this repo. Not the schema.                                                           |
| specification        | `/SPEC.md` at the repo root. Reproducibility-grade contract. 17 sections. (Was `docs/SPECIFICATION.md` before `0.2.0`; stub remains for one minor.) |
| NOTICE               | `NOTICE` at the repo root. Attribution for bundled third-party code. Apache-2.0 requires preservation.                                 |
| third-party licenses | `THIRD_PARTY_LICENSES.md`. Full license text of any bundled non-Apache-2.0 code.                                                       |

### Banned strings

Retired from the vocabulary as of schema version 1. `validate-docs.sh` flags occurrences outside this file and `CHANGELOG.md` (which preserves historical record).

| Banned                                                  | Replacement                                                                                         |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `second-brain` (hyphenated, in any skill name or prose) | `llm-wiki` for the onboarding skill; `llm-wiki-<verb>` for the others.                              |
| `second brain` (spaced, in any prose)                   | `LLM Wiki` in discoverability surfaces; the specific verb (`ingest`, `lint`, …) in technical prose. |
| `vault-synthesize`                                      | `llm-wiki-synthesize`.                                                                              |
| `vault-index`                                           | `llm-wiki-index`.                                                                                   |

## Discoverability vocabulary

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

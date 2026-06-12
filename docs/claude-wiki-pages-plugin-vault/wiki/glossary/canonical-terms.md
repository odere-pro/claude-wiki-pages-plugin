---
title: "Canonical Terms"
type: concept
aliases: ["Canonical Terms", "canonical terms", "glossary terms"]
parent: "[[Glossary]]"
path: "glossary"
sources: ["[[GLOSSARY]]"]
related: ["[[Four-Layer Stack]]", "[[Operations Guide]]"]
tags: [glossary, vocabulary]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 1.0
---

# Canonical Terms

> [!summary]
> The glossary is "input weight", not a lexicon. Using established PKM, Obsidian, and Karpathy-LLM-Wiki terms activates model priors and lowers drift. Every doc, skill description, and user-visible string conforms to this list. `scripts/validate-docs.sh` enforces it on commit and in CI.

## Schema Terms

| Term | Description |
| --- | --- |
| schema | The rules that define a valid vault. Lives in `vault/CLAUDE.md`. |
| schema version | Integer version of the schema. Frontmatter field `schema_version`. Current: 2 (v1 still supported). |
| frontmatter | YAML block between `---` fences at the top of every wiki page. |
| type | Frontmatter field naming a page's category. One of nine values. The primary filter. |
| sources | Frontmatter field listing a page's citations. Required on every non-source page. List of `[[wikilinks]]`. |
| topic page | A page with `type: topic` — a narrative landing page for a topic. |
| project page | A page with `type: project` — a goal/initiative with a `project_status` lifecycle. |
| source manifest | The page at `wiki/_sources/manifest.md` with `type: manifest`. Tracks each raw source's processed state. |
| claim-level provenance | The optional `source_quotes` field — pins claims to verbatim source sentences. |
| derived claim | A page or claim marked `derived: true` — LLM inference synthesized across sources. |
| vault | The user's knowledge directory. Holds raw content, wiki, and the vault schema. |
| raw content | Immutable source material. On disk: `raw/`. Writes blocked by `protect-raw.sh`. |
| wiki | LLM-maintained typed pages. On disk: `wiki/`. Every page cites at least one source. |
| MOC | Map of Content. Per-folder `_index.md`; vault-level `wiki/index.md`. |
| synthesis note | A page under `wiki/_synthesis/` with `type: synthesis`. Cross-topic analysis. |
| confidence decay | Gradual decrease in a page's `confidence` score as time passes without a source refresh. |

## Architecture Terms

| Term | Description |
| --- | --- |
| claude-wiki-pages | The plugin identifier. Lowercase, hyphenated. |
| deterministic engine | The Bun CLI (`src/cli/cli.ts`) that validates the vault and runs quality checks. No embeddings, no inference. |
| four-layer stack | The architecture. Four layers, each catching a different class of failure. |
| skill | A capability under `skills/`. Entry point is `/claude-wiki-pages:<name>`. |
| agent | A multi-step executor under `agents/`. Chains skills; owns completion gates. |
| hook | A lifecycle handler wired in `hooks/hooks.json`. Blocking hooks reject writes via exit code 2. |
| firewall | Vault isolation: confines agent writes to the resolved vault. Modes: `enforce`/`warn`/`off`. |
| provenance | The traceable chain from a wiki page's `sources` through `_sources/` to raw content. |
| doctor | The environment health check (`/claude-wiki-pages:doctor`). Read-only; exit codes 0–5. |
| snapshot | Git-bounding an LLM write phase: `pre` = checkpoint, `post` = commit. |
| commit backstop | The `SubagentStop` safety net: uncommitted vault changes are committed as one labelled backstop commit. |
| backlog | Outstanding maintenance: pending raw sources + overdue lint. |
| heartbeat | `scripts/heartbeat.sh` — surfaces a catch-up recommendation at `SessionStart`. |

## Retrieval Terms

| Term | Description |
| --- | --- |
| synonym lexicon | The checked-in `vault/_vocabulary.md` of curated term→alias mappings for query expansion. |
| synonym expansion | Replacing a query term with its synonyms before keyword matching. |
| stemming | Reducing query and page tokens to their root form. Applied deterministically in the Bun engine. |
| graph link-walk | Following typed wikilinks from a seed page to its N-hop neighbourhood. |
| graph-traversal primitive | The single engine function that executes a graph link-walk. Returns scored page references, never page bodies. |
| score breakdown | The per-match explanation of how a search score was assembled (`matched{}` field in JSON). |
| MOC descent | Traversing the Map-of-Content hierarchy to collect the relevant working set for a query. |

## Banned Terms

Terms retired from the glossary as of schema version 1 (enforced by `validate-docs.sh`):

| Banned | Replacement |
| --- | --- |
| `second-brain`, `second brain` | `init` for the onboarding skill; the specific verb for the others |
| `vault-synthesize` | `synthesize` |
| `vault-index` | `index` |
| `llm-wiki-stack` | `claude-wiki-pages` |
| `llm-wiki-ingest-pipeline` | `claude-wiki-pages-ingest-agent` |
| `llm-wiki-lint-fix` | `claude-wiki-pages-curator-agent` |

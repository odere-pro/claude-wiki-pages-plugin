# Architecture

`llm-wiki-stack` is a four-layer implementation of [Karpathy's LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f), packaged as a Claude Code plugin.

Most LLM-wiki implementations are one layer: a prompt and a folder convention. This one is four, because each layer has a different failure mode and deserves a different tool.

## The four layers

| Layer                | Responsibility                                           | What lives here                                                        |
| -------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------- |
| **1. Data**          | Immutable sources + wiki schema                          | `example-vault/raw/`, `example-vault/wiki/`, `example-vault/CLAUDE.md` |
| **2. Skills**        | Individual capabilities invoked by the human or an agent | `skills/` (11 skills)                                                  |
| **3. Agents**        | Multi-step executors that orchestrate skills             | `agents/` (3 agents)                                                   |
| **4. Orchestration** | Hooks, rules, provenance guards                          | `hooks/hooks.json`, `scripts/`, `rules/`                               |

### 1. Data

Sources go into `raw/` and are never rewritten — the `protect-raw.sh` hook enforces this. Wiki pages live under `wiki/` and are typed by YAML frontmatter, not by folder. The schema (`example-vault/CLAUDE.md`) is the authority; every skill and agent defers to it. Every claim in every wiki page carries a `sources` field back to at least one `raw/` item, so provenance is structural, not cultural.

### 2. Skills

Each skill is a single-responsibility capability: `llm-wiki-ingest` ingests sources, `llm-wiki-query` answers questions, `llm-wiki-lint` audits structure, `llm-wiki-fix` repairs what lint reports, `llm-wiki-synthesize` writes cross-topic analyses, `llm-wiki-index` generates a top-level overview index across the vault, `obsidian-graph-colors` paints Obsidian's graph view. Skills are slash-command entry points; they do not know about each other. The plugin ships 11.

### 3. Agents

Agents chain skills and tools. `llm-wiki-ingest-pipeline` runs the full ingest-then-verify-then-lint-then-synthesize cycle. `llm-wiki-lint-fix` audits and repairs structural drift. `llm-wiki-analyst` answers analytical questions that require traversing the topic tree. Agents are where multi-step reliability lives — they own sequencing, retries, and quality gates.

### 4. Orchestration

Hooks turn the architecture into a contract. `PreToolUse` hooks block frontmatter violations, non-wikilink cross-references, and edits to `raw/`. `PostToolUse` hooks remind the LLM to update `_index.md` and `index.md` after writes. `SubagentStop` hooks run `verify-ingest.sh` after the ingest pipeline and surface unresolved lint errors. Rules in `rules/` give the LLM path-scoped guidance ("files under `raw/` are immutable", "the wiki uses `[[wikilinks]]`, not markdown links").

## Why four layers

Each layer fails differently:

- Data corruption looks like a missing `sources` field or an orphan page. Caught by Layer 4 (`validate-frontmatter.sh`, lint).
- A skill misbehaving looks like bad output for one command. Caught by the human re-running with different input.
- An agent misbehaving looks like a half-written wiki after a long run. Caught by Layer 4's `SubagentStop` gates.
- Orchestration misbehaving looks like hooks not firing. Caught by startup reminders and the health check in `docs/llm-wiki/04-review-validate-fix.md`.

The layering is not academic. Each gate is in the only place the failure can be observed.

## Mapping to plugin file structure

```
llm-wiki-stack/
├── .claude-plugin/          # plugin manifest + marketplace (distribution)
├── skills/                  # Layer 2
├── agents/                  # Layer 3
├── hooks/                   # Layer 4 — hook definitions
├── scripts/                 # Layer 4 — hook implementations
├── rules/                   # Layer 4 — scoped LLM guidance
├── example-vault/           # Layer 1 — schema + small sticky reference vault
└── docs/                    # SPECIFICATION, VOCABULARY, architecture, security, user guides
```

## Data flow: one ingest

1. Human drops a source into `vault/raw/`.
2. Human runs `/llm-wiki-stack:llm-wiki-ingest`.
3. Skill reads `example-vault/CLAUDE.md` (the schema).
4. Skill writes a source summary to `wiki/_sources/`.
5. Layer 4 hooks fire: `validate-frontmatter.sh`, `check-wikilinks.sh`, `validate-attachments.sh`.
6. Skill extracts entities/concepts, updates existing wiki pages, creates new ones in topic folders.
7. Every touched page gets `sources` updated, `update_count` incremented, `updated` date set.
8. `_index.md` files in touched folders get new `children` entries.
9. `wiki/index.md` gets new pages.
10. `wiki/log.md` gets a `## [YYYY-MM-DD] ingest | Source Title` entry.
11. `SubagentStop` hook runs `verify-ingest.sh` — the human sees any drift immediately.

Four layers, each visible in the flow. That is the four-layer stack.

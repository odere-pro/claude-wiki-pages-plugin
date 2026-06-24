# Architecture

`claude-wiki-pages` is a four-layer implementation of [Karpathy's LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f), packaged as a Claude Code plugin.

Most LLM-wiki implementations are one layer: a prompt and a folder convention. This one is four, because each layer has a different failure mode and deserves a different tool.

## The four layers

| Layer                | Responsibility                                           | What lives here                                                        |
| -------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------- |
| **1. Data**          | Immutable sources + wiki schema                          | `skills/init/template/raw/`, `skills/init/template/wiki/`, `skills/init/template/CLAUDE.md` |
| **2. Skills**        | Individual capabilities invoked by the human or an agent | `skills/` (26 skills)                                                  |
| **3. Agents**        | Multi-step executors that orchestrate skills             | `agents/` (8 agents)                                                   |
| **4. Orchestration** | Hooks, rules, provenance guards                          | `hooks/hooks.json`, `scripts/`, `rules/`                               |

### 1. Data

Sources go into `raw/` and are never rewritten — the `protect-raw.sh` hook enforces this. Wiki pages live under `wiki/` and are typed by YAML frontmatter, not by folder. The schema (`skills/init/template/CLAUDE.md`) is the authority; every skill and agent defers to it. Every claim in every wiki page carries a `sources` field back to at least one `raw/` item, so provenance is structural, not cultural.

### 2. Skills

Each skill is a single-responsibility capability. `ingest` ingests sources. `query` answers questions. `lint` audits structure. `fix` repairs what lint reports. `synthesize` writes cross-topic analyses. `index` generates a top-level overview index across the vault. `markdown` exports a query answer as portable markdown into `vault/output/`. `fill-gaps` completes the vault into a gap-free, topic-clustered wiki. Skills are slash-command entry points; they do not know about each other. The plugin ships 26: 14 plugin-authored verbs (`init`, `ingest`, `query`, `lint`, `fix`, `status`, `synthesize`, `index`, `markdown`, `search`, `review`, `draft`, `sync`, `fill-gaps`) + `onboarding` + 5 agent-teaching skills (`engine-api`, `maintain-contract`, `analyst-modes`, `curator-fixes`, `ingest-pipeline`) + `voice` + `obsidian-graph-colors` + `obsidian-vault` + 3 MIT-licensed `obsidian-*` reference skills.

### 3. Agents

Agents chain skills and tools across a multi-step flow. `claude-wiki-pages-orchestrator-agent` is the user-facing entry: it probes vault state and dispatches to one specialist per invocation. Behind it: `claude-wiki-pages-onboarding-agent` (first-run scaffold), `claude-wiki-pages-ingest-agent` (full ingest-verify-curate-synthesize cycle), `claude-wiki-pages-extract-worker-agent` (per-source extraction), `claude-wiki-pages-curator-agent` (audit, auto-repair, judgment fixes behind explicit approval), `claude-wiki-pages-analyst-agent` (analytical questions that traverse the topic tree), `claude-wiki-pages-polish-agent` (tail-of-write: graph colors, vault MOC, per-folder MOC), and `claude-wiki-pages-maintenance-agent` (autonomous catch-up on a schedule). Agents own sequencing, retries, and quality gates.

### 4. Orchestration

Slash commands and hooks turn the architecture into a contract. `commands/wiki.md` is the user-facing top-level verb (`/claude-wiki-pages:wiki`); it delegates to the orchestrator agent. `commands/doctor.md` wraps `scripts/doctor.sh` for environment health (`/claude-wiki-pages:doctor`). `commands/fill-gaps.md` invokes the `fill-gaps` skill to complete the vault into a gap-free, topic-clustered wiki (`/claude-wiki-pages:fill-gaps`). `PreToolUse` hooks block frontmatter violations, non-wikilink cross-references, and edits to `raw/`. `PostToolUse` hooks remind the LLM to update the folder note and `index.md` after writes. `SubagentStop` hooks run `verify-ingest.sh` after the ingest pipeline and surface unresolved lint errors. Rules in `rules/` give the LLM path-scoped guidance ("files under `raw/` are immutable", "the wiki uses `[[wikilinks]]`, not markdown links").

`scripts/scope-guard.sh` is a `PreToolUse` advisory hook on `Read|Grep|Glob` calls. It emits a stderr notice when an agent reads outside its declared context contract (the `## Context contract` table in a skill's `SKILL.md`). It never blocks — enforcement is the firewall's job — but it makes out-of-contract reads visible for interpretability.

## Obsidian graph: topic islands

The vault's wiki pages form a topic-island graph in Obsidian's graph view. Each top-level topic folder (`engine/`, `plugin/`, `wiki-pages/`, `llm/`, `obsidian/`, `knowledge-graph/`, `how-it-works/`) is one island; wikilinks between visible topic pages must stay within the same top-level folder. Cross-topic references are written as plain prose, not wikilinks. This is the **topic-local linking** rule (ADR-0033).

The connective scaffolding — `wiki/_sources/`, `wiki/_synthesis/`, `wiki/index.md`, and `wiki/log.md` — is excluded from `.obsidian/graph.json`'s search filter so the islands render cleanly. Provenance (`sources:` citations) is fully preserved in the data; the exclusion is a view choice, not a data deletion. The filter is regenerable: the `obsidian-graph-colors` skill rebuilds it deterministically from the vault's topic tree.

The graph's **root entry point** is `wiki/plugin/claude-wiki-pages-plugin.md`. That entity page links the seven topic folder notes so the graph reads as a central root with seven island lobes rather than an unconnected scatter.

`scripts/graph-quality.sh` (and the read-only `scripts/tree-lint.sh`) measure graph health. `scripts/strict-tree-reduce.sh` is the remediation pass (ADR-0036, the strict-tree successor to the retired topic-local pass): it demotes every non-spine body wikilink to plain text and prunes non-spine entries from association frontmatter fields (`related`, `depends_on`, `key_pages`, etc.) — recording a nested `topic/<tree>` tag for each demoted cross-tree edge — without ever touching `parent`/`sources`/`children` or creating dangling links.

## Deterministic engine verbs

The Bun CLI (`src/cli/cli.ts`, invoked via `scripts/engine.sh`) exposes deterministic verbs that scripts and agents call without spawning an LLM. In addition to the core verbs listed in `src/commands/CLAUDE.md`, two verbs were added with ADR-0033 and the ICM/OKF work:

| Verb | Purpose |
| --- | --- |
| `engine context --skill <name>` | Resolves the L0–L4 layered context set (vault schema, MOC hierarchy, topic pages, source summaries, raw sources) for a named maintenance skill, narrowed by its `## Context contract` table. Reports file lists and a token estimate. Read-only. |
| `engine okf export` | Renders `wiki/` as a portable Google Open Knowledge Format (OKF) bundle under `vault/output/okf/`: frontmatter stripped, wikilinks rewritten as relative markdown links, plus a flat machine `index.md` catalog. |
| `engine okf import <bundle>` | Snapshots an external OKF bundle into `vault/raw/okf/<name>/` for normal ingest. Dry-run by default; `--write` applies the copy. Never overwrites existing raw files. |

## Why four layers

Each layer fails differently:

- Data corruption looks like a missing `sources` field or an orphan page. Caught by Layer 4 (`validate-frontmatter.sh`, lint).
- A skill misbehaving looks like bad output for one command. Caught by the human re-running with different input.
- An agent misbehaving looks like a half-written wiki after a long run. Caught by Layer 4's `SubagentStop` gates.
- Orchestration misbehaving looks like hooks not firing. Caught by startup reminders and the health check in `docs/llm-wiki/04-review-validate-fix.md`.

The layering is not academic. Each gate is in the only place the failure can be observed.

## Mapping to plugin file structure

```
claude-wiki-pages/
├── .claude-plugin/          # plugin manifest + marketplace (distribution)
├── skills/                  # Layer 2
├── agents/                  # Layer 3
├── hooks/                   # Layer 4 — hook definitions
├── scripts/                 # Layer 4 — hook implementations
├── rules/                   # Layer 4 — scoped LLM guidance
├── skills/init/template/      # Layer 1 — shipped schema + scaffold
└── docs/                    # SPECIFICATION, GLOSSARY, architecture, security, user guides
```

## Data flow: one ingest

1. Human drops a source into `vault/raw/`.
2. Human runs `/claude-wiki-pages:ingest`.
3. Skill reads `skills/init/template/CLAUDE.md` (the schema).
4. Skill writes a source summary to `wiki/_sources/`.
5. Layer 4 hooks fire: `validate-frontmatter.sh`, `check-wikilinks.sh`, `validate-attachments.sh`.
6. Skill extracts entities/concepts, updates existing wiki pages, creates new ones in topic folders.
7. Every touched page gets `sources` updated, `update_count` incremented, `updated` date set.
8. Folder notes in touched folders get new `children` entries.
9. `wiki/index.md` gets new pages.
10. `wiki/log.md` gets a `## [YYYY-MM-DD] ingest | Source Title` entry.
11. `SubagentStop` hook runs `verify-ingest.sh` — the human sees any drift immediately.

Four layers, each visible in the flow.

## Research foundations and prior art

For the academic and prior-art grounding behind specific design decisions — Karpathy's LLM Wiki pattern, the NO-RAG stance (ADR-0007), ICM context layering, OKF interop, provenance lineage, the Porter stemmer, and other references — see [`docs/research-foundations.md`](./research-foundations.md).

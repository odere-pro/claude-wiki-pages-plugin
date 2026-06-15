---
title: "Four-Layer Stack"
type: concept
aliases: ["Four-Layer Stack", "four-layer stack", "four-layer architecture", "plugin stack"]
parent: "[[plugin|claude-wiki-pages Plugin]]"
path: "plugin"
sources: ["[[_sources/architecture|Architecture Documentation]]", "[[_sources/glossary|Glossary]]", "[[design-01-system-context|Design: System Context]]", "[[design-06-feature-relations|Design: Feature Relations]]", "[[_sources/adr-0001-four-layer-orchestrator|ADR-0001: Four-Layer Orchestrator]]"]
related: ["[[plugin|claude-wiki-pages Plugin]]", "[[deterministic-engine|Deterministic Engine]]", "[[orchestrator-agent|Orchestrator Agent]]", "[[hook-system|Hook System]]", "[[git-checkpoint|Git Checkpoint]]"]
tags: ["architecture", "concept"]
created: 2026-06-13
updated: 2026-06-15
update_count: 6
status: active
confidence: 1.0
---

# Four-Layer Stack

> [!summary]
> The four-layer stack is the architectural model of `claude-wiki-pages`. Each of the four layers catches a different class of failure: Data catches schema and provenance violations; Skills catch per-operation misbehavior; Agents catch multi-step drift; Orchestration catches hook and invariant failures. The layering is not academic — each gate is in the only place the failure can be observed.

## Definition

The four-layer stack is the architectural model of the `claude-wiki-pages` plugin. It implements the [Karpathy LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) as a structured system where each layer has a clearly scoped responsibility and failure mode.

Most LLM-wiki implementations are one layer: a prompt and a folder convention. `claude-wiki-pages` is four, because each layer fails differently and deserves a different tool.

## The Four Layers

| Layer                   | Directory                                             | Responsibility                                                                   | Failure mode caught                                 |
| ----------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------- |
| Layer 1 — Data          | `docs/vault/raw/`, `docs/vault/wiki/`, `CLAUDE.md`    | Immutable sources + wiki schema. Passive — holds the material.                   | Missing `sources` field, orphan pages, schema drift |
| Layer 2 — Skills        | `skills/`                                             | 24 single-responsibility capabilities. Entry point: `/claude-wiki-pages:<name>`. | Bad output for one command                          |
| Layer 3 — Agents        | `agents/`                                             | 7 multi-step executors composing skills. Own completion gates and retry logic.   | Half-written wiki after a long run                  |
| Layer 4 — Orchestration | `commands/`, `hooks/hooks.json`, `scripts/`, `rules/` | Slash commands, hook enforcement, script implementations, path-scoped rules.     | Hooks not firing, schema violations landing         |

## Layer 1 — Data

Sources go into `raw/` and are never rewritten — `protect-raw.sh` (PreToolUse hook) enforces this. Wiki pages live under `wiki/` and are typed by YAML frontmatter, not by folder. The schema (`vault/CLAUDE.md`) is the authority; every skill and agent defers to it. Every claim in every wiki page carries a `sources` field back to at least one `raw/` item, so provenance is structural, not cultural.

## Layer 2 — Skills

Each skill is a single-responsibility capability. The plugin ships 24:

- 13 plugin-authored verbs: `init`, `ingest`, `query`, `lint`, `fix`, `status`, `synthesize`, `index`, `markdown`, `search`, `review`, `draft`, `sync`
- 1 onboarding skill
- 5 agent-teaching skills: `engine-api`, `maintain-contract`, `analyst-modes`, `curator-fixes`, `ingest-pipeline`
- 1 `obsidian-graph-colors`, 1 `obsidian-vault`
- 3 MIT-licensed `obsidian-*` reference skills (kepano)

Skills are slash-command entry points; they do not know about each other. Teaching skills carry `disable-model-invocation: true` — they are reference material agents read, not actions they fire.

## Layer 3 — Agents

Agents chain skills and tools across multiple steps. The 7 agents:

- `claude-wiki-pages-orchestrator-agent` — user-facing entry; probes vault state; dispatches one specialist per invocation
- `claude-wiki-pages-onboarding-agent` — guided first-run scaffold and orientation
- `claude-wiki-pages-ingest-agent` — full ingest → verify → curate → synthesize cycle
- `claude-wiki-pages-curator-agent` — audits, auto-repairs, gates judgment fixes
- `claude-wiki-pages-analyst-agent` — query, dashboard, compile, extract, challenge modes
- `claude-wiki-pages-polish-agent` — tail-of-write step (graph colors, vault MOC, per-folder MOC)
- `claude-wiki-pages-maintenance-agent` — autonomous catch-up loop on a schedule

Specialists (`-ingest-`, `-curator-`, `-analyst-`, `-polish-`) are marked `user-invocable: false` and must never re-probe state — the orchestrator owns that.

## Layer 4 — Orchestration

Slash commands and hooks turn the architecture into a contract:

- **`/claude-wiki-pages:wiki`** — the single advertised entry point; delegates to the orchestrator agent
- **`/claude-wiki-pages:onboarding`** — run-once guided wizard
- **`/claude-wiki-pages:doctor`** — environment health check (read-only)
- **`PreToolUse` hooks** — block frontmatter violations, non-wikilink cross-references, edits to `raw/`, writes outside the vault boundary
- **`PostToolUse` hooks** — remind the LLM to update folder note and `index.md` after writes
- **`SubagentStop` hooks** — run `verify-ingest.sh` after the ingest pipeline; commit backstop ensures no uncommitted changes escape

## Mapping to Plugin File Structure

```
claude-wiki-pages/
├── .claude-plugin/          # plugin manifest + marketplace
├── skills/                  # Layer 2
├── agents/                  # Layer 3
├── hooks/hooks.json          # Layer 4 — hook event wiring
├── scripts/                 # Layer 4 — hook implementations
├── rules/                   # Layer 4 — path-scoped LLM guidance
└── docs/vault-example/      # Layer 1 — reference vault (schema authority)
```

## The Deterministic Engine

The Bun CLI (`scripts/engine.sh` → `src/cli/cli.ts`) is a peer to Layer 4 — not a fifth layer. It validates the vault deterministically: same vault in, same report out. No network, no embeddings, no inference. The bash hook scripts call it through `engine.sh`.

## Key Principles

- **Specialists never re-probe state.** The orchestrator probes vault state once; specialists trust its payload (ADR-0001).
- **No embeddings on the default path.** Retrieval is wiki pages + wikilinks + frontmatter. The engine enforces this.
- **Each gate is in the only place its failure can be observed.** This is why the layering exists.

## Examples

Switching between vaults and running a health check:

```bash
bash scripts/set-vault.sh switch projects/my-vault
/claude-wiki-pages:doctor
```

Running the full ingest-to-verify cycle via the single entry verb:

```
/claude-wiki-pages:wiki ingest the new papers
# Orchestrator probes vault state → dispatches Ingest Agent → polish tail step runs
```

## Related Concepts

- [[plugin|claude-wiki-pages Plugin]] — the product implementing this stack
- [[orchestrator-agent|Orchestrator Agent]] — the Layer 4 entry agent
- [[deterministic-engine|Deterministic Engine]] — the Layer 4 validation peer
- [[hook-system|Hook System]] — Layer 4 enforcement mechanism
- [[git-checkpoint|Git Checkpoint]] — the safety model woven through Layer 4

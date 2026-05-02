# Using `llm-wiki-stack`

A map. Each section points you at the one guide that actually teaches it.

## What this is

`llm-wiki-stack` turns an Obsidian vault into a provenance-tracked wiki. You drop sources in `vault/raw/`, run one command, and the plugin maintains `vault/wiki/` — structured, cross-linked, and cited.

## The one command

```
/llm-wiki-stack:wiki
```

This is the orchestrator entry. Type it any time. The plugin probes vault state and routes to the right next step — initialise, ingest, curate, or query. Everything else is either a power-user bypass or a diagnostic.

> Looking for a structured learning path instead of a guide map? See the [playbooks](../playbooks/index.md) — `200 Foundational`, `300 Associate`, `500 Expert`.

## Your path through the guides

Read in order. Each guide is self-contained.

1. **[Install and verify](./01-getting-started.md).** Get the plugin wired up. Confirm every hook fires.
2. **[Create your vault](./02-create-new-knowledge-base.md).** Run `/llm-wiki-stack:llm-wiki` once per project. It scaffolds `vault/` and writes the authoritative schema at `vault/CLAUDE.md`.
3. **[Add sources and ingest](./03-update-existing.md).** Drop files into `vault/raw/`. Run the pipeline. Read `wiki/log.md` to see what the LLM did.
4. **[Validate and repair](./04-review-validate-fix.md).** Three levels: `llm-wiki-status` (hooks green/red), `llm-wiki-lint` (read-only audit), `llm-wiki-stack-curator-agent` (repair). Run the last one weekly.
5. **[Query the wiki](./07-query-the-wiki.md).** Ask questions. Use the analyst for cross-topic work and challenge mode.
6. **[Check the dashboard](./06-check-the-dashboard.md).** The Dataview dashboard surfaces orphans, stale pages, and contradictions at a glance.
7. **[Produce outputs](./05-export-outputs.md).** Reports, ADRs, briefs. Written to `vault/output/` (git-ignored, plain markdown).

That's the whole workflow.

## Slash commands at a glance

| Command | Purpose | Guide |
| ------- | ------- | ----- |
| `/llm-wiki-stack:wiki` | **Orchestrator entry.** Probes vault state and routes to init, ingest, curator, or analyst. | [1](./01-getting-started.md), [3](./03-update-existing.md) |
| `/llm-wiki-stack:wiki-doctor` | Environment health check — every hook green? | [1](./01-getting-started.md) |
| `/llm-wiki-stack:llm-wiki` | Scaffold a vault (once per project; the orchestrator dispatches here automatically on a fresh install) | [2](./02-create-new-knowledge-base.md) |
| `/llm-wiki-stack:llm-wiki-stack-ingest-agent` | Power-user bypass: ingest → curator → optional synthesize | [3](./03-update-existing.md) |
| `/llm-wiki-stack:llm-wiki-stack-curator-agent` | Power-user bypass: audit and repair the wiki | [4](./04-review-validate-fix.md) |
| `/llm-wiki-stack:llm-wiki-stack-analyst-agent` | Power-user bypass: cross-topic analysis, reports, challenge | [5](./05-export-outputs.md), [7](./07-query-the-wiki.md) |
| `/llm-wiki-stack:llm-wiki-status` | Quick status read of last operations | [1](./01-getting-started.md) |
| `/llm-wiki-stack:llm-wiki-query` | Answer one question with citations | [7](./07-query-the-wiki.md) |
| `/llm-wiki-stack:llm-wiki-synthesize` | Write a cross-topic synthesis note | [3](./03-update-existing.md) |

Power-user verbs — `llm-wiki-ingest`, `llm-wiki-lint`, `llm-wiki-fix`, `llm-wiki-index`, `obsidian-graph-colors` — are documented in the guide that owns their domain. Reach for them only when the pipeline's scope is wrong.

## Two things to keep in mind

- **`vault/CLAUDE.md` is the schema.** It is the one file every skill and agent reads first. If it disagrees with anything in this documentation, the schema wins.
- **`vault/raw/` is immutable.** The `protect-raw.sh` hook blocks writes. Drop files in; do not edit them.

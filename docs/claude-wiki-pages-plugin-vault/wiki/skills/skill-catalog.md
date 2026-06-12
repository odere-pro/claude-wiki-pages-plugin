---
title: "Skill Catalog"
type: concept
aliases: ["Skill Catalog", "skill catalog", "skills list"]
parent: "[[Skills]]"
path: "skills"
sources: ["[[architecture]]", "[[GLOSSARY]]", "[[operations]]"]
related: ["[[Skills Layer]]", "[[Agent Roles]]", "[[Action Skills]]"]
tags: [skills, catalog]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 1.0
---

# Skill Catalog

> [!summary]
> The plugin ships 24 skills across four categories: 13 plugin-authored action verbs, 1 onboarding skill, 5 agent-teaching skills, 2 plugin-authored Obsidian skills, and 3 MIT-licensed reference skills. All are namespaced under `/claude-wiki-pages:`.

## Plugin-Authored Action Verbs (13)

| Skill | Entry point | Purpose |
| --- | --- | --- |
| `init` | `/claude-wiki-pages:init` | Onboarding scaffold — copies vault-example into project |
| `ingest` | `/claude-wiki-pages:ingest` | Process raw sources into wiki pages |
| `query` | `/claude-wiki-pages:query` | Answer questions with `[[wikilink]]` citations |
| `lint` | `/claude-wiki-pages:lint` | Audit the wiki for structural drift |
| `fix` | `/claude-wiki-pages:fix` | Auto-repair what lint reports |
| `status` | `/claude-wiki-pages:status` | One-command health check |
| `synthesize` | `/claude-wiki-pages:synthesize` | Write cross-topic synthesis notes |
| `index` | `/claude-wiki-pages:index` | Generate or refresh `wiki/index.md` |
| `markdown` | `/claude-wiki-pages:markdown` | Render a query answer as portable markdown |
| `search` | `/claude-wiki-pages:search` | Deterministic keyword retrieval over wiki pages |
| `review` | `/claude-wiki-pages:review` | Promote/reject drafts from `_proposed/` |
| `draft` | `/claude-wiki-pages:draft` | Local-model drafting into `_proposed/` |
| `sync` | `/claude-wiki-pages:sync` | Pull docs changes from wired sources into `raw/` |

## Onboarding Skill (1)

`onboarding` — guided first-run flow: health check → scaffold → add source → ingest → first cited answer. Idempotent; resumes in place.

## Agent-Teaching Skills (5)

These skills teach agents how to use the system correctly:
- `engine-api` — the LLM-facing contract for the Bun engine
- `maintain-contract` — safe ingest/retrieve/maintain ordering
- `analyst-modes` — the analyst agent's five operating modes
- `curator-fixes` — what the curator auto-repairs vs. gates
- `ingest-pipeline` — the step-by-step ingest pipeline contract

## Plugin-Authored Obsidian Skills (2)

- `obsidian-graph-colors` — applies per-topic and layer colors to Obsidian's graph view
- `obsidian-vault` — guard skill that scopes every Obsidian CLI call to the resolved vault

## Third-Party Reference Skills (3, MIT)

From `kepano/obsidian-skills`, kept under original names:
- `obsidian-markdown` — Obsidian-flavored markdown reference
- `obsidian-bases` — Obsidian Bases (database) reference
- `obsidian-cli` — Obsidian CLI reference

## Naming Convention

Skills use single-verb or noun-suffix names. The `/claude-wiki-pages:` namespace scopes them; no brand prefix is needed in the verb. Skills targeting Obsidian keep an `obsidian-` prefix by convention (not provenance). Skills and agents share the namespace and must have globally unique names; the `-agent` suffix on agents prevents collision.

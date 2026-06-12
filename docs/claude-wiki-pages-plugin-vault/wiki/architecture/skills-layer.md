---
title: "Skills Layer"
type: concept
aliases: ["Skills Layer", "Layer 2", "Layer 2 — Skills"]
parent: "[[Architecture]]"
path: "architecture"
sources: ["[[architecture]]", "[[GLOSSARY]]"]
related: ["[[Four-Layer Stack]]", "[[Agents Layer]]", "[[Skill Catalog]]"]
tags: [architecture, skills]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 1.0
---

# Skills Layer

Layer 2 — Skills contains 24 single-responsibility capabilities invoked by the human or an agent via slash commands. Skills do not know about each other; they are the atomic units of the system.

## What a Skill Is

A skill is a single-responsibility capability under `skills/`. Its entry point is `/claude-wiki-pages:<name>`. Skills are independently testable (Tier 1 Bats covers individual skills) and composable — agents chain them; they do not chain themselves.

## The 24 Skills

**13 plugin-authored action verbs:**
- `init` — onboarding scaffold
- `ingest` — process raw sources into wiki pages
- `query` — answer questions from the wiki with `[[wikilink]]` citations
- `lint` — audit the wiki for structural and provenance drift
- `fix` — auto-repair what lint reports
- `status` — one-command health check
- `synthesize` — write cross-topic synthesis notes
- `index` — generate or refresh the vault MOC
- `markdown` — render a query answer as portable markdown
- `search` — deterministic keyword retrieval over wiki pages
- `review` — promote/reject drafted pages from `_proposed/`
- `draft` — local-model drafting into `_proposed/`
- `sync` — pull docs changes from wired sources into `raw/`

**1 onboarding skill:** `onboarding` — guided first-run flow

**5 agent-teaching skills:** `engine-api`, `maintain-contract`, `analyst-modes`, `curator-fixes`, `ingest-pipeline` — skills that teach agents how to use the system correctly

**3 MIT-licensed reference skills:** `obsidian-markdown`, `obsidian-bases`, `obsidian-cli` — from `kepano/obsidian-skills`

**2 plugin-authored Obsidian skills:** `obsidian-graph-colors`, `obsidian-vault`

## Naming Convention

Skills use single-verb or noun-suffix names (e.g., `ingest`, `query`, `markdown`). Skills targeting Obsidian keep an `obsidian-` prefix. The `/claude-wiki-pages:` namespace already scopes them, so no brand prefix is needed in the verb itself.

See [[Agents Layer]] for how agents chain these skills, and [[Skill Catalog]] for per-skill detail.

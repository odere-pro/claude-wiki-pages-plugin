---
title: "Ingest Agent"
type: entity
entity_type: agent
aliases: ["Ingest Agent", "ingest agent", "claude-wiki-pages-ingest-agent"]
parent: "[[Agent Roles]]"
path: "agents"
sources: ["[[architecture]]", "[[04-teams-and-agents]]"]
related: ["[[Orchestrator Agent]]", "[[Curator Agent]]", "[[Skill Catalog]]"]
tags: [agent, ingest, pipeline]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 0.9
---

# Ingest Agent

**`claude-wiki-pages-ingest-agent`** — the full ingest pipeline executor.

## Responsibilities

1. Read `CLAUDE.md` schema authority.
2. Detect pending raw sources (files in `raw/` with no corresponding `_sources/` stub).
3. Classify each source into the topic tree (existing cluster or new one).
4. Write `_sources/` stubs mapping raw filenames → wiki pages.
5. Write wiki pages in `wiki/<cluster>/` using schema_version: 2 frontmatter.
6. Update `wiki/<cluster>/_index.md` children lists.
7. Write or update `wiki/_synthesis/` notes for cross-cutting themes.
8. Append to `wiki/log.md` with a timestamped ingest entry.

## Invocation

Invoked by the [[Orchestrator Agent]] when `vault probe` detects pending sources. Power users may invoke directly.

## Two-Pass Alias-Aware Dedup

The ingest agent runs dedup before writing: (1) parse all existing wiki page aliases and titles, (2) match incoming source concepts against that set. A concept that matches an existing page extends it — it does not create a duplicate.

## Write-Gate Sequence

Every write passes the Layer 4 PreToolUse chain: `firewall.sh` → `validate-frontmatter.sh` → `check-wikilinks.sh` → `protect-raw.sh`. The ingest agent cannot bypass this chain.

## SubagentStop Gate

After the ingest agent terminates, `subagent-ingest-gate.sh` verifies the ingest output: schema compliance, wikilinks resolved, `_sources/` stubs present, log entry appended.

---
title: "Curator Agent"
type: entity
entity_type: agent
aliases: ["Curator Agent", "curator agent", "claude-wiki-pages-curator-agent"]
parent: "[[Agent Roles]]"
path: "agents"
sources: ["[[architecture]]"]
related: ["[[Orchestrator Agent]]", "[[Ingest Agent]]", "[[Polish Agent]]"]
tags: [agent, curator, lint]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 0.9
---

# Curator Agent

**`claude-wiki-pages-curator-agent`** — structural audit and auto-repair.

## Responsibilities

- Detect broken wikilinks (targets that do not exist)
- Detect orphan pages (no inbound links)
- Detect frontmatter gaps (missing required fields per type)
- Detect index drift (`_index.md` `children:` out of sync with filesystem)
- Detect plain-string sources (should be `[[wikilinks]]`)
- Detect missing `parent` and `path` fields

## Repair Modes

**Self-heal** — structural repairs that are semantically unambiguous (e.g., a broken wikilink that resolves to exactly one candidate page by alias, a `parent:` field that can be derived from the file's folder location) are applied automatically without an approval gate.

**Judgment** — repairs requiring semantic judgment (e.g., choosing a canonical page when multiple aliases match, deciding to merge two near-duplicate pages) are staged to `wiki/_proposed/` and require human review before landing.

## Git Protocol

Every batch of curator repairs begins with a `snapshot` commit (via the `snapshot` engine verb). Each repair is git-committed individually. Any repair can be reverted with `git revert`.

## Invocation

Invoked by the [[Orchestrator Agent]] after ingest, or directly when the user asks to lint, audit, or repair the wiki.

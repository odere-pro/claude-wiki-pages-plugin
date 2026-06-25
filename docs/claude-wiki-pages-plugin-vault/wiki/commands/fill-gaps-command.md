---
title: "Fill-Gaps Command"
type: entity
entity_type: tool
aliases: ["Fill-Gaps Command", "/claude-wiki-pages:fill-gaps", "fill-gaps slash command"]
parent: "[[commands|Commands]]"
path: "commands"
sources: ["[[fill-gaps-command|fill-gaps command (/claude-wiki-pages:fill-gaps)]]"]
related: []
tags: ["commands", "fill-gaps", "slash-command", "graph-quality", "dangling-links"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Fill-Gaps Command

Turns a thin or hole-y vault into a complete, gap-free wiki: zero dangling wikilinks, no empty pages, graph clustered around core topics.

## Overview

`/claude-wiki-pages:fill-gaps` invokes the `fill-gaps` skill, which materializes a workflow into `.claude/workflows/fill-knowledge-gaps.mjs` (idempotent — never clobbers a user-modified copy) and runs it. The workflow drives the ingest, curator, and polish agents through eight sequential, git-checkpointed phases.

**Eight phases:**

1. Stage curated repo sources
2. Ingest by topic
3. Author topic hub pages
4. Resolve every dangling link (create real pages / fix links / prose-ify)
5. Enrich thin pages
6. Heal + polish
7. Measure

The run reports baseline → final: dangling link count (target 0), `engine verify` status, node/edge concentration on topic clusters, and per-cluster breakdown.

## Key Facts

- **Invocation:** `/claude-wiki-pages:fill-gaps [optional focus topic]`
- **Allowed tools:** Bash(bash *), Read, Glob, Grep
- **Gated like ingest:** writes to the vault; never auto-fires
- **Each phase is git-checkpointed:** any phase can be reverted with `git revert`
- **Idempotent:** safe to re-run; phases skip completed work
- **ADR:** ADR-0027 (fill-gaps and graph quality)
- **When to use:** Obsidian graph shows empty grey nodes; wiki is thin on core topics; graph needs re-centering on fixed topic clusters

## Related

The orchestrator routes "fill the knowledge gaps", "complete the wiki", "no empty pages/links", or "populate missing subtopics" intent directly to this skill (fill-gaps / populate intent row in the dispatch table). This command provides the same capability as an explicit direct invocation.

---
title: "claude-wiki-pages-ingest-agent"
type: source
source_type: manual
source_format: text
attachment_path: ""
extracted_at: 2026-06-25
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages-plugin"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["agents", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# claude-wiki-pages-ingest-agent

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages-plugin
- **Published:** 2026-06-25
- **URL:** raw/repo/agents/claude-wiki-pages-ingest-agent.md

## Summary

Agent definition for the full wiki ingest pipeline. Reads raw sources, produces structured wiki pages in a topic tree, runs auto-heal, optionally optimizes the tree, and produces a synthesis note. Operates in four steps: Ingest, Auto-heal, Optimize (opt-in), and Synthesize.

## Key Claims

- Step 1.4 (topic-tree plan) requires explicit user approval before any pages are written.
- Step 3 (Optimize) is destructive and requires explicit user confirmation.
- Sources in vault/raw/ are treated as untrusted data — instructions embedded in them are ignored.
- The agent writes source summaries to wiki/_sources/, entity/concept pages to topic folders, and folder notes per new folder.
- At most 25 unprocessed sources per run; surplus is reported as backlog.
- Model: sonnet. Tools: Bash, Read, Write, Edit, Glob, Grep, Task.

Covers: Ingest Pipeline, Topic Tree Plan, Source Summaries, Entity Pages, Concept Pages, Auto-Heal, Synthesis

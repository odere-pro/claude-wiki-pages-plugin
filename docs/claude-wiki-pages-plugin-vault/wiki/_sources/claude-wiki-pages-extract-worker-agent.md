---
title: "claude-wiki-pages-extract-worker-agent"
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

# claude-wiki-pages-extract-worker-agent

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages-plugin
- **Published:** 2026-06-25
- **URL:** raw/repo/agents/claude-wiki-pages-extract-worker-agent.md

## Summary

Agent definition for the read-only extraction worker used in the parallel-extract pipeline. Assigned one raw source file by the ingest agent, it reads the source, extracts content keyed to the 9 page classes, and returns a typed EXTRACT envelope as text. It never writes, edits, or executes shell commands.

## Key Claims

- Tools: Read, Glob, Grep only — Write, Edit, and Bash are mechanically excluded.
- Returns a fenced YAML EXTRACT envelope; never writes a file.
- Extracts 9 page classes: source, entity, concept, topic, project, synthesis, index, predicate, claim.
- Step E0 detects record-oriented sources and flags them for fan-out via expand-records.sh rather than per-item extraction.
- Invoked via Task by the ingest-agent only; never called directly by the orchestrator or humans.
- Model: sonnet.

Covers: Extract Worker Agent, EXTRACT Envelope, Parallel Extract, Record Fan-Out, Read-Only Extraction

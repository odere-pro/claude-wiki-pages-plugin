---
title: "Extract Worker Agent"
type: entity
entity_type: tool
aliases: ["Extract Worker Agent", "claude-wiki-pages-extract-worker-agent", "extract worker"]
parent: "[[agents|Agents]]"
path: "agents"
sources: ["[[claude-wiki-pages-extract-worker-agent|claude-wiki-pages-extract-worker-agent]]"]
related: []
tags: ["agents", "extract", "parallel", "read-only"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Extract Worker Agent

A read-only sub-agent that reads one raw source file and returns a typed EXTRACT envelope — it never writes anything.

## Overview

The extract worker agent (`claude-wiki-pages-extract-worker-agent`) is a map-only worker in the parallel-extract fan-out. It is assigned exactly one raw source file by the ingest agent when `maintenance.maxParallelExtract > 1` and `route == claude`. It reads the source, extracts content keyed to 9 page classes, and returns the result as a fenced YAML EXTRACT envelope in its text response. The ingest agent (the sole writer) collects all envelopes and writes pages.

The tool restriction (`tools: Read, Glob, Grep`) is mechanical and gate-tested by `tests/scripts/extract-worker-frontmatter.bats`. Adding Write, Edit, or Bash blocks the merge gate.

**Extraction procedure (four steps):**

- **E0:** Detect record-oriented sources (JSON/YAML arrays, CSVs); if detected, emit a `record_fan_out` recommendation and return early — no per-item extraction.
- **E1:** Read the full source content.
- **E2:** Extract content for each of the 9 page classes.
- **E3:** Classify each item with the ontology-profile-v1 enum values from `vault/CLAUDE.md`.
- **E4:** Populate and return the EXTRACT envelope.

## Key Facts

- **Model:** sonnet
- **Tools:** Read, Glob, Grep — no Write, Edit, or Bash
- **Input:** one `source_path` (relative to vault) + `vault_root`
- **Output:** fenced YAML `extract_envelope:` block in the text response; never a file
- **9 page classes:** source, entity, concept, topic, project, synthesis, index, predicate, claim
- **Failure contract:** if the source cannot be read or extraction fails critically, return a minimal error envelope; the ingest agent SKIP-AND-BACKLOGs that source (OQ-5 contract)
- **Invocation:** via Task by the ingest agent only; never called directly

## Related

Called by the ingest agent in parallel-extract mode. Each worker processes one source; the ingest agent aggregates all envelopes before writing any pages (H10 write barrier).

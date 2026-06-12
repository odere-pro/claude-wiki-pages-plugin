---
title: "Data Flow"
type: concept
aliases: ["Data Flow", "Ingest Data Flow", "ingest pipeline flow"]
parent: "[[Architecture]]"
path: "architecture"
sources: ["[[architecture]]"]
related: ["[[Four-Layer Stack]]", "[[Orchestration Layer]]", "[[Agents Layer]]"]
tags: [architecture, ingest, pipeline]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 1.0
---

# Data Flow

The canonical example of how all four layers interact is a single ingest run. Each step crosses a layer boundary, making the four-layer architecture visible in action.

## One Ingest Pass

1. **Human drops a source into `vault/raw/`.** (Layer 1 — Data is written directly.)
2. **Human runs `/claude-wiki-pages:wiki`** — or `/claude-wiki-pages:ingest`. (Layer 4 — the slash command.)
3. **The orchestrator agent** probes vault state, detects the pending source, fans out to the ingest agent. (Layer 3 — agent dispatch.)
4. **Ingest agent reads `vault/CLAUDE.md`** — the schema. (Layer 1 — Data read.)
5. **Ingest agent writes a source summary to `wiki/_sources/`.** (Layer 1 — Data written.)
6. **Layer 4 hooks fire**: `validate-frontmatter.sh`, `check-wikilinks.sh`, `validate-attachments.sh` all run before the write lands. (Layer 4 — PreToolUse blocking.)
7. **Ingest agent extracts entities/concepts**, updates existing wiki pages, creates new ones in topic folders. (Layer 3 — multi-step execution using Layer 2 skills.)
8. **Every touched page** gets `sources` updated, `update_count` incremented, `updated` date set. (Layer 1 — Data maintained.)
9. **`_index.md` files** in touched folders get new `children` entries. (Layer 1 — MOC maintained.)
10. **`wiki/index.md`** gets new pages listed. (Layer 1 — vault MOC maintained.)
11. **`wiki/log.md`** gets an entry: `## [YYYY-MM-DD] ingest | Source Title`. (Layer 1 — operations log.)
12. **`SubagentStop` hook runs `verify-ingest.sh`** — the human sees any drift immediately. (Layer 4 — SubagentStop gate.)
13. **Polish agent** runs as a tail step: graph colors, vault MOC, per-folder MOC consistency. (Layer 3 — polish agent.)

Four layers, each visible in the flow. The data is passive (Layer 1); the verbs are atomic skills (Layer 2); the sequencing is agent-owned (Layer 3); the enforcement is hook-driven (Layer 4).

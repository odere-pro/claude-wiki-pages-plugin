---
title: "Analyst Agent"
type: entity
entity_type: tool
aliases: ["Analyst Agent", "analyst agent", "claude-wiki-pages-analyst-agent"]
parent: "[[Agent Roles]]"
path: "agents"
sources: ["[[architecture]]", "[[operations]]"]
related: ["[[Orchestrator Agent]]", "[[Skill Catalog]]"]
tags: [agent, analyst, query]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 0.9
---

# Analyst Agent

**`claude-wiki-pages-analyst-agent`** — query and reporting specialist.

## Five Operating Modes

| Mode | Trigger verbs | What it does |
| --- | --- | --- |
| **Query** | "what does the wiki say about X", "find", "how does..." | Citation-gated answer from wiki pages |
| **Dashboard** | "dashboard", "status", "overview" | Structured summary of wiki health and coverage |
| **Document Compile** | "compile", "write a doc on", "create a report" | Synthesizes multiple wiki pages into a new document |
| **Extract** | "list all", "extract", "enumerate" | Structured list extraction from wiki pages |
| **Challenge** | "challenge", "critique", "devil's advocate" | Counterargument and gap-identification mode |

## Query Protocol (ADR-0019)

1. Build a keyword + synonym + stemmer expanded query (ADR-0007 — no embeddings, ever).
2. Score candidates: `matched[]` array on each hit records which query terms triggered the match (ADR-0006).
3. Retrieve top candidates via graph traversal (ADR-0008) to catch related pages.
4. Synthesize answer citing wiki pages by `[[wikilink]]`.
5. Runtime answer verification: every claim is back-checked against the cited page content before the answer is returned.

## What the Analyst Does Not Do

- Reads only; does not write to the wiki.
- Does not access `raw/` directly; all evidence is surfaced through `wiki/` pages.
- Does not use embeddings or vector similarity (NO-RAG invariant).

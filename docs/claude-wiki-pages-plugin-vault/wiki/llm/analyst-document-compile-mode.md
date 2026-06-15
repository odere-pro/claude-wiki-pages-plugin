---
title: "Analyst Document Compile Mode"
type: concept
aliases: ["Analyst Document Compile Mode", "analyst document compile mode", "Document Compile Mode", "Mode 3 Compile", "document compilation"]
parent: "[[LLM]]"
path: "llm"
sources: ["[[llm-analyst-modes-skill|Analyst Modes Skill (SKILL.md)]]", "[[plugin-analyst-agent|Analyst Agent Source]]"]
related: ["[[analyst-dashboard-mode|Analyst Dashboard Mode]]", "[[analyst-extract-mode|Analyst Extract Mode]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["concept", "analyst", "compile", "document"]
created: 2026-06-13
updated: 2026-06-13
update_count: 1
status: active
confidence: 1.0
---

# Analyst Document Compile Mode

## Definition

Analyst Document Compile Mode is Mode 3 of the five Analyst Agent operating modes. It reconstructs a full named document (ADR, report, proposal, memo, brief, or runbook) from scattered wiki pages and writes the result to `vault/output/` as plain markdown — never to `vault/wiki/`. The mode is distinct from Query mode (Mode 1): it assembles a structured deliverable from pages, not answers a question. Unlike Mode 4 (Extract), it produces narrative prose rather than tabular data.

## Key Principles

**Document type declaration.** The analyst first declares the target document type: ADR, report, proposal, memo, brief, or runbook. The type determines the expected structure, citations, and typical length.

| Type     | Use for                                   | Typical length |
| -------- | ----------------------------------------- | -------------- |
| Brief    | Executive summary, quick handoff          | 1–2 pages      |
| Memo     | Internal communication, decision record   | 1–3 pages      |
| Report   | Comprehensive analysis, status update     | 3–10 pages     |
| Proposal | Recommended action with justification     | 2–5 pages      |
| ADR      | Architecture Decision Record              | 1–2 pages      |
| Runbook  | Reference documentation, operations guide | 3–20 pages     |

**Scope declaration and compile plan.** The analyst lists every page it intends to read before reading any. If the scope exceeds 10 pages, a compile plan must be written to `vault/output/_compile-plan-YYYY-MM-DD-<slug>.md` including: document type and target length, page list with wikilinks, and a full outline. The analyst then requests **approve / edit-then-approve / abort** and waits for explicit approval. On abort, the mode stops.

**Output target.** All compile output goes to `vault/output/<slug>.md`. This is plain markdown — no frontmatter required, no schema validation, not indexed. It is git-ignored scratch space. The compile mode never writes to `vault/wiki/`.

**Composition structure.** The assembled document has three parts: Context (why this document exists, what question it answers), Content (synthesized narrative organized by theme, not by source), References (wikilinks to every wiki page used).

**Citation re-verify.** After composing, the analyst runs the citation re-verify step: extract every wikilink in the output, confirm each file exists in `vault/wiki/`. Broken links in the output are flagged before the file is written.

## Examples

Compile an ADR from existing wiki knowledge:

```
/claude-wiki-pages:claude-wiki-pages-analyst-agent compile ADR from [[four-layer-stack|Four-Layer Stack]], [[deterministic-engine|Deterministic Engine]], [[Firewall]]
```

The analyst declares scope (3 pages, no plan file needed), reads each page, composes a structured ADR with Context/Content/References, runs citation re-verify, writes to `vault/output/adr-draft-YYYY-MM-DD.md`, and appends to `wiki/log.md`.

## Related Concepts

- Analyst Agent — the agent that implements all five modes including Document Compile
- [[analyst-dashboard-mode|Analyst Dashboard Mode]] — Mode 2; produces metrics rather than compiled prose
- [[analyst-extract-mode|Analyst Extract Mode]] — Mode 4; similar scoped read but produces tables rather than narrative
- Draft Review Surface — the engine gate that governs promotion of drafts from `_proposed/` into `wiki/`

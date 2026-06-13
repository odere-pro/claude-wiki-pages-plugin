---
title: "Analyst Agent"
type: entity
entity_type: tool
aliases: ["Analyst Agent", "analyst agent", "claude-wiki-pages-analyst-agent", "analyst"]
parent: "[[Architecture]]"
path: "architecture"
sources: ["[[Architecture Documentation]]", "[[User Guide 07: Query the Wiki]]", "[[User Guide 05: Export Outputs]]", "[[Operations Guide]]", "[[Analyst Agent Source]]"]
related: ["[[Orchestrator Agent]]", "[[Query Rules]]", "[[Challenge Mode]]", "[[Synthesis Note]]", "[[Wiki-Native Recall]]"]
tags: ["agent", "analyst"]
created: 2026-06-13
updated: 2026-06-13
update_count: 6
status: active
confidence: 1.0
---

# Analyst Agent

> [!summary]
> The `claude-wiki-pages-analyst-agent` answers questions from the wiki in five distinct operating modes: Query, Dashboard, Document Compile, Extract, and Challenge. It is dispatched by the [[Orchestrator Agent]] when the user's prompt carries an analytical verb. Every answer ends with a `## Sources` section — wikilink citations in research-paper style. The agent reads but never writes the wiki.

## Overview

The `claude-wiki-pages-analyst-agent` is the specialist agent for reading and reasoning over the wiki. It is one of seven Layer 3 agents and is always dispatched by the [[Orchestrator Agent]] — it is not user-invocable as a first-class entry point, though power users can bypass the orchestrator via `/claude-wiki-pages:claude-wiki-pages-analyst-agent <question>` when the routing is unambiguous.

The agent was renamed from `llm-wiki-analyst` to `claude-wiki-pages-analyst-agent` in version 0.2.0 (ADR-0002), adopting the `{plugin-name}-{role}-agent` convention that distinguishes agents from skills in the slash-command namespace.

## Input and Output

The agent receives from the orchestrator: the user's free-form prompt, the resolved vault path, and the orchestrator's state probe payload (which confirms this is an analytical request, not an ingest or repair task).

It produces: a written response (inline in the session or written to a file on request), an appended `wiki/log.md` entry, and optionally a new `wiki/_synthesis/` note if the answer is novel and the user requests archiving.

The agent is read-only with respect to `wiki/` except for the `log.md` append and the optional synthesis note write.

## Five Operating Modes

The orchestrator selects the analyst when the prompt matches an analytical verb (`what`, `why`, `compare`, `how`, `which`, `summarize`). Once dispatched, the analyst selects its mode from finer-grained cues in the prompt:

### 1. Query

Standard question answering against the wiki. The agent follows the [[Query Rules]] exactly:

1. Read `wiki/index.md` to identify relevant pages.
2. Start from the relevant folder note and traverse downward.
3. Read matching pages and follow wikilinks for cross-topic context.
4. Synthesize an answer with inline `[[wikilink]]` citations.
5. End with a `## Sources` section — numbered, research-paper style — one entry per consulted wiki page listing the `[[wikilink]]` and the raw source file paths from that page's `sources:` frontmatter.
6. Append to `wiki/log.md`.

If the answer is genuinely novel (not a restatement of existing pages), the agent offers to file it as a synthesis note.

### 2. Dashboard

Produces a Dataview-ready or static summary of vault health: page counts per topic, confidence distribution, update_count ranges, stale page counts, and last-ingest/last-lint timestamps from `wiki/log.md`. Useful for a quick health read without running `engine backlog`.

### 3. Document Compile

Reconstructs a named document (an ADR, a project report, a technical brief, a slide deck outline) from wiki pages. The agent reads the relevant concept, entity, and decision pages and assembles them into a target format. Output goes to `vault/output/<slug>.md` or is returned inline.

This mode is distinct from [[Wiki-Native Recall]]-based Query: it is assembling a structured deliverable from pages, not answering a question.

### 4. Extract

Pulls structured data from wiki pages into a table or list. Examples: all `type: entity` pages in a topic with their `confidence` and `updated` fields; all ADR decision pages with their `status`; all pages with `confidence < 0.7`. The analyst renders these as markdown tables drawn from frontmatter, not Dataview queries — so they are portable and readable in any markdown viewer.

### 5. Challenge

The adversarial querying mode. Before writing an ADR, proposal, or making a significant decision, the user poses the decision with the challenge framing:

> I'm about to decide [X]. Search the wiki for: past decisions on similar topics, contradictions in my current understanding, gaps in evidence, sources that argue against this approach. Push back on my assumptions.

The analyst searches for `contradicts:` frontmatter relationships, low-confidence claims, missing pages on related topics, and conflicting evidence in `sources:`. It surfaces these as structured pushback — not a refusal, but a reasoned counterargument grounded in the wiki's actual content. See [[Challenge Mode]] for a full description.

## Invariants the Agent Enforces

- **Every answer ends with `## Sources`** — required by ADR-0022. If no pages were consulted (a genuine gap in the wiki), the agent says so explicitly rather than omitting the section.
- **No fabrication:** the agent synthesizes only from what is on wiki pages. It does not invent citations or fill gaps with assumptions.
- **Read-only except log and optional synthesis:** the agent does not touch source summaries, entity pages, folder notes, or `wiki/index.md`.
- **Defer on write requests:** if the user asks the analyst to add a page or update a source, the agent routes back to the [[Orchestrator Agent]] for the ingest path rather than writing directly.

## What the Agent Defers

The analyst does not make judgments about wiki structure (orphans, index drift, stale pages) — that is the [[Curator Agent]]'s domain. It does not ingest new raw sources — that is the [[Ingest Agent]]'s domain. It does not regenerate graph colors or folder notes — that is the [[Polish Agent]]'s domain.

## Direct Invocation

Power users can bypass the orchestrator's state probe:

```
/claude-wiki-pages:claude-wiki-pages-analyst-agent what does the wiki say about retrieval?
```

Use this when the routing is unambiguous and the orchestrator's probe would be wasted work. Note that bypassing the orchestrator also bypasses the polish tail step — run `/claude-wiki-pages:claude-wiki-pages-polish-agent` manually if you need graph/index sync afterward.

## Related

- [[Orchestrator Agent]] — dispatches to this agent for analytical prompts
- [[Query Rules]] — the structured query workflow the agent follows in Query mode
- [[Challenge Mode]] — the adversarial querying mode described in full
- [[Wiki-Native Recall]] — the deterministic retrieval underlying all five modes
- [[Synthesis Note]] — the output the analyst may produce for novel answers

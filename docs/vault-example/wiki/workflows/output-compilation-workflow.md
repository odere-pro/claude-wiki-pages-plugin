---
title: "Output Compilation Workflow"
type: concept
aliases: ["Output Compilation Workflow", "output-compilation-workflow"]
parent: "[[Workflows — Index]]"
path: "workflows"
sources:
  - "[[Export Outputs]]"
related: ["[[Query Workflow]]", "[[Pandoc]]", "[[llm-wiki-stack]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["workflow", "output"]
created: 2026-04-24
updated: 2026-04-24
update_count: 1
status: active
confidence: 0.7
---

# Output Compilation Workflow

## Definition

How deliverables (reports, ADRs, briefs, memos) are generated from the wiki and written to `vault/output/`. `output/` is git-ignored scratch space — plain markdown, no frontmatter, no schema, not linted.

## Key Principles

- Use `/llm-wiki-stack:llm-wiki-analyst compile <topic> for <audience>` to generate a cited deliverable.
- Every claim in the output carries a `[[wikilink]]` back to its wiki page so Obsidian resolves it.
- Reusable deliverables belong in `wiki/_synthesis/` as proper synthesis notes; regenerate the deliverable from the synthesis when needed.
- Two narrative outputs on the same topic will drift; merge or convert the lower-quality one to a navigation index.

## Examples

- `/llm-wiki-stack:llm-wiki-analyst compile a 1-page brief on the [[LLM Wiki Pattern]] for a new teammate.`
- Post-compile conversion: `pandoc vault/output/brief.md -o brief.pdf` (see [[Pandoc]]).
- Never put analysis into `output/` that belongs in `_synthesis/`; deliverables are not reasoning.

## Related Concepts

- [[Query Workflow]] — precedes compilation when the deliverable is answer-shaped.
- [[Pandoc]] — external converter for non-markdown targets.

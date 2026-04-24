---
title: "Wiki Index"
type: index
parent: ""
path: ""
children: []
child_indexes:
  - "[[Patterns — Index]]"
  - "[[Tools — Index]]"
  - "[[Workflows — Index]]"
aliases: ["Wiki Index"]
tags: []
created: 2026-04-24
updated: 2026-04-24
---

# Wiki Index

Master catalog of every page in the wiki.

## Sources

- [[Using llm-wiki-stack]] — top-level navigation map for the seven user guides.
- [[Getting Started]] — install, session start, scaffold, health check.
- [[Create a New Vault]] — first-time scaffold and multi-project vaults.
- [[Update an Existing Vault]] — day-to-day ingest workflow.
- [[Review, Validate, Fix]] — three-level validation ladder.
- [[Export Outputs]] — deliverables from the wiki to `output/`.
- [[Check the Dashboard]] — Dataview dashboard for health and coverage.
- [[Query the Wiki]] — question → cited answer workflow.

## Topics

### Patterns ([[Patterns — Index]])

- [[LLM Wiki Pattern]] — human curates sources, LLM derives the cited wiki.
- [[Hook-Enforced Guarantees]] — invariants live in hooks, not in model discipline.
- [[Entity Distribution Model]] — one source rewrites many pages; no duplicates.

### Tools ([[Tools — Index]])

- [[Claude Code]] — CLI harness for skills, agents, and hooks.
- [[Obsidian]] — local-first markdown editor; vault = folder.
- [[Dataview]] — Obsidian community plugin powering the dashboard.
- [[llm-wiki-stack]] — this plugin.
- [[Pandoc]] — markdown → PDF / DOCX for deliverables.

### Workflows ([[Workflows — Index]])

- [[Ingest Pipeline]] — the default, single-command ingest verb.
- [[Lint-Fix Workflow]] — status → lint → lint-fix validation ladder.
- [[Query Workflow]] — ask the wiki; receive cited answers.
- [[Output Compilation Workflow]] — compile deliverables into `output/`.
- [[Vault Scaffolding]] — stand up a fresh `vault/` in a project.

## Synthesis

None yet. Run `/llm-wiki-stack:llm-wiki-synthesize` when the wiki has enough content to warrant cross-topic analysis.

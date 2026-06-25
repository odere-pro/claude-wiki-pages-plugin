---
title: "claude-wiki-pages-onboarding-agent"
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

# claude-wiki-pages-onboarding-agent

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages-plugin
- **Published:** 2026-06-25
- **URL:** raw/repo/agents/claude-wiki-pages-onboarding-agent.md

## Summary

Agent definition for the guided first-run executor. Walks a brand-new user from a fresh project to a working, queryable wiki through five steps: probe + health, scaffold, first source (project wiring or sample), ingest (with auto-heal), and first cited answer. Idempotent — resumes from wherever the user stopped.

## Key Claims

- Executes five steps: probe + health, scaffold (if needed), first source choice (project wire vs sample), ingest, first answer.
- Offers two ways to start when the host is a git work tree: ingest the whole project (recommended) or use the bundled sample.
- Uses wire-source.sh add to snapshot project docs-only into raw/wired/<name>/.
- Idempotent: probes state and skips completed steps; re-running is always safe.
- Invoked by the orchestrator when no vault exists, or directly via /claude-wiki-pages:onboarding.
- Model: sonnet. Tools: Task, Bash, Read, Glob, Grep.

Covers: Onboarding Agent, First Run, Scaffold, Wire Source, Project Intake

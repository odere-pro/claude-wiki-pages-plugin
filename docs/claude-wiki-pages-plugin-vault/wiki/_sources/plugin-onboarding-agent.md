---
title: "Onboarding Agent Source"
type: source
source_type: manual
source_format: text
url: ""
author: "Aleksandr Derechei"
publisher: "odere-pro/claude-wiki-pages-plugin"
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["agent", "onboarding", "plugin"]
aliases:
  [
    "Onboarding Agent Source",
    "plugin-onboarding-agent",
    "claude-wiki-pages-onboarding-agent source",
  ]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# Onboarding Agent Source

## Metadata

- **Author:** Aleksandr Derechei
- **Publisher:** odere-pro/claude-wiki-pages-plugin
- **Published:** 2026-06-13
- **URL:** https://github.com/odere-pro/claude-wiki-pages-plugin

## Summary

The canonical agent definition file for `claude-wiki-pages-onboarding-agent`. Declares model: sonnet, tools: Task/Bash/Read/Glob/Grep (no Write/Edit). Specifies a five-step guided first-run flow: (1) probe + health via `doctor.sh`, (2) scaffold via `init` skill if needed, (3) first source — offer choice between wiring whole project via `wire-source.sh` or using bundled sample, (4) ingest via `engine.sh backlog` recursive enumeration, (5) first cited answer. Idempotent: probes state and resumes; never restarts work already done.

## Key Claims

- Onboarding agent uses model: sonnet and tools: Task, Bash, Read, Glob, Grep — no Write or Edit.
- The agent's third step offers the user a binary choice: wire the whole project docs vs. start with bundled sample.
- Wire-source.sh snapshots docs-only (README, docs/, ADRs — never source code) into raw/wired/<name>/.
- Ingest in step 4 uses `engine.sh backlog` recursive enumeration to pick up nested wired sources.
- The close section lists the "what's next" map: drop files into raw/, run `/claude-wiki-pages:wiki`, use `/claude-wiki-pages:doctor` for health.
- Hard rules: one step at a time (no silent pipeline), resume never clobber, never modify raw/ beyond adding user's source.

## Entities Mentioned

## Concepts Mentioned

---
title: "onboarding command (/claude-wiki-pages:onboarding)"
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
tags: ["commands", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# onboarding command (/claude-wiki-pages:onboarding)

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages-plugin
- **Published:** 2026-06-25
- **URL:** raw/repo/commands/onboarding.md

## Summary

Slash command definition for the guided first-run flow. Delegates to the onboarding agent via Task. Resumes rather than restarts on re-invocation.

## Key Claims

- Hands control to claude-wiki-pages-onboarding-agent via Task.
- Accepts optional $ARGUMENTS (e.g., "use the sample source" or a topic).
- Idempotent: resumes from wherever the user is; re-running is safe.
- Secondary to /claude-wiki-pages:wiki; use when the user wants a guided paced walk-through.
- Allowed tools: Task, Bash, Read, Glob, Grep.

Covers: onboarding command, First Run, Guided Walk-Through, Progressive Disclosure

---
title: "wiki command (/claude-wiki-pages:wiki)"
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

# wiki command (/claude-wiki-pages:wiki)

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages-plugin
- **Published:** 2026-06-25
- **URL:** raw/repo/commands/wiki.md

## Summary

Slash command definition for the top-level user-facing entry point of claude-wiki-pages. The user types `/claude-wiki-pages:wiki` with an optional free-form goal; the command probes vault state and delegates everything to the orchestrator agent via Task.

## Key Claims

- This is the single advertised entry verb for end-users; the plugin figures out the rest.
- The command does not pre-classify the user's prompt — that is the orchestrator's job.
- Passes $ARGUMENTS verbatim to the orchestrator; if $ARGUMENTS is empty, the orchestrator still runs and probes state.
- Allowed tools: Task, Bash, Read, Glob, Grep.
- Companion command: /claude-wiki-pages:doctor for environment health checks.

Covers: wiki command, Slash Command, Top-Level Entry, Orchestrator Delegation

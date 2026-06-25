---
title: "Onboarding Command"
type: entity
entity_type: tool
aliases: ["Onboarding Command", "/claude-wiki-pages:onboarding", "onboarding slash command"]
parent: "[[commands|Commands]]"
path: "commands"
sources: ["[[onboarding-command|onboarding command (/claude-wiki-pages:onboarding)]]"]
related: []
tags: ["commands", "onboarding", "slash-command", "first-run"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Onboarding Command

The friendliest way in: a guided first-run walk from fresh install to cited answer.

## Overview

`/claude-wiki-pages:onboarding` is the progressive-disclosure secondary entry point. It delegates to the onboarding agent via Task, which walks the user through five steps: health probe, scaffold (if needed), add a first source (project wire vs. sample), ingest with auto-heal, and first cited answer. Re-running is safe — the agent resumes from wherever the user stopped.

## Key Facts

- **Invocation:** `/claude-wiki-pages:onboarding [optional focus]`
- **Allowed tools:** Task, Bash, Read, Glob, Grep
- **Delegation target:** `claude-wiki-pages-onboarding-agent` via Task
- **Idempotent:** probes completed steps and skips them; never clobbers existing content
- **When to use:** just installed, unsure which command to run, want to see the full loop end-to-end
- **Companion commands:**
  - `/claude-wiki-pages:wiki` — the unguided one-verb entry for daily use
  - `/claude-wiki-pages:doctor` — environment health check

## Related

The onboarding command provides the same functionality as the onboarding path in `/claude-wiki-pages:wiki` (row 1 of the dispatch table) but as an explicit, always-available secondary command rather than an automatic fallback.

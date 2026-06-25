---
title: "Onboarding Agent"
type: entity
entity_type: tool
aliases: ["Onboarding Agent", "claude-wiki-pages-onboarding-agent", "onboarding agent"]
parent: "[[agents|Agents]]"
path: "agents"
sources: ["[[claude-wiki-pages-onboarding-agent|claude-wiki-pages-onboarding-agent]]"]
related: []
tags: ["agents", "onboarding", "first-run", "scaffold"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Onboarding Agent

The guided first-run executor: walks a new user from zero to a working, queryable wiki in five steps, one step at a time.

## Overview

The onboarding agent (`claude-wiki-pages-onboarding-agent`) is the bootstrapping specialist. It is invoked by the orchestrator when `vault_exists == false` or `schema_version == ""`, or directly via `/claude-wiki-pages:onboarding`. It is idempotent — it probes state and resumes from wherever the user stopped.

**Five steps:**

1. **Probe + health** — resolve the vault and run `doctor.sh`. Report state in one line.
2. **Scaffold (if needed)** — if `vault/CLAUDE.md` is absent, dispatch the `init` skill.
3. **First source — offer a choice** (when the host is a git work tree):
   - Ingest the whole project (recommended): run `wire-source.sh add` to snapshot docs-only into `raw/wired/<name>/`.
   - Start with the bundled sample: use `vault/raw/sample-source.md`.
4. **Ingest** — dispatch the ingest agent; show the new pages and the heal commit.
5. **First answer** — run `/claude-wiki-pages:query` with a relevant question; show the answer with `[[wikilink]]` citations.

The agent closes with a "what's next" map pointing to the standard verbs.

## Key Facts

- **Model:** sonnet
- **Tools:** Task, Bash, Read, Glob, Grep
- **Idempotent:** probes completed steps and skips them; re-running is safe
- **One step at a time:** shows each result and next step; never runs the full pipeline silently
- **Project wiring:** when the host is a git work tree, the agent presents the project-intake option as an explicit choice (not a silent default)
- **No clobbering:** if the vault has content, skips scaffolding and resumes

## Related

Invoked by the orchestrator as the first-run bootstrap path. Delegates scaffolding to the `init` skill, ingest to the ingest agent, and querying to the analyst agent.

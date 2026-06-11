---
title: "Onboarding"
type: concept
aliases: ["Onboarding", "onboarding", "onboarding wizard", "first run", "getting started"]
parent: "[[Operations]]"
path: "operations"
sources: ["[[Getting Started]]", "[[Installation]]", "[[Operations]]"]
related: ["[[Installation]]", "[[One Advertised Path]]", "[[Doctor]]", "[[claude-wiki-pages-onboarding-agent]]"]
contradicts: []
supersedes: []
depends_on: ["[[Installation]]"]
tags: [onboarding, first-run]
created: 2026-06-11
updated: 2026-06-11
update_count: 1
status: active
confidence: 1.0
---

# Onboarding

The guided first-run experience for `claude-wiki-pages`. Two entry points:

- **`/claude-wiki-pages:init`** — creates a new vault (scaffolds from `docs/vault-example/`). Optionally accepts a vault path: `/claude-wiki-pages:init my vault is docs/vault`.
- **`/claude-wiki-pages:onboarding`** — the full guided walkthrough: health check → scaffold → add source → ingest → first cited answer. Safe to re-run; resumes from wherever you are.

## Quick Steps

1. Run Claude Code in your project directory.
2. Install the plugin (see [[Installation]]).
3. Create a vault: `/claude-wiki-pages:init`.
4. Import raw files: `!cp ~/Downloads/*.md vault/raw/`.
5. Run the wiki: `/claude-wiki-pages:wiki`.
6. Check status: `/claude-wiki-pages:status`.
7. Query: `/claude-wiki-pages:query what does the wiki say about <topic>?`.
8. Export: `/claude-wiki-pages:markdown what does the wiki say about <topic>?`.

## Progressive Disclosure

The onboarding wizard surfaces only the verbs a first-time user needs. Power-user bypasses (direct agent calls) are documented below a fold. This reflects the [[One Advertised Path]] principle: exactly one verb is promoted as the entry point for each task.

---
title: "Init Skill"
type: entity
entity_type: tool
aliases: ["Init Skill", "init", "/claude-wiki-pages:init", "vault init"]
parent: "[[skills|Skills]]"
path: "skills"
sources: ["[[skills-init|Init Skill — SKILL.md]]"]
related: []
tags: ["skills", "layer-2", "init", "vault-scaffolding"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Init Skill

The `init` skill bootstraps a fresh vault in a user's project from the plugin's reference scaffold at `skills/init/template/`, and is idempotent — running it twice on a healthy vault is a no-op.

## Overview

`init` is the onboarding entry point. It owns initialization only — ingest, lint, and query are separate responsibilities. The skill resolves the target vault path in four-tier priority order, then persists it via `scripts/set-vault.sh`, scaffolds the vault (copying only missing files), git-inits if needed, and emits a READY signal.

Invocation triggers: "set up a wiki", "initialize the vault", "start a new LLM Wiki", or `/claude-wiki-pages:init` directly.

## Key Facts

**Vault resolution order** (first match wins):
1. Path named in the user's prompt
2. `CLAUDE_WIKI_PAGES_VAULT` env var
3. `.claude/claude-wiki-pages/settings.json` → `current_vault_path`
4. Auto-detect: scan up to 4 levels for a directory with `CLAUDE.md` declaring `schema_version` + a `wiki/` sibling
5. Existing default `docs/vault` (back-compat)
6. New vault: `docs/<root-slug>-vault` (derived from project root folder name)

**Writing contract**: copy only missing pieces from the reference scaffold; never overwrite existing user content; persist the vault path via `set-vault.sh` before touching the vault directory.

**Completion signal shapes**:
- `READY: vault scaffolded at <path>; schema version 2; git repo initialised; settings persisted; verify-ingest clean.`
- `READY: vault repaired at <path> (<N> files added); ...`
- `READY: existing vault at <path>; <N> pages, last log <date>; ...`
- `WARN: vault at <path> ready but verify-ingest reported: <message>. ...`
- `FAILED:` reserved for `set-vault.sh` filesystem permission errors only

Every READY/WARN line is followed by exactly one `NEXT_STEP:` line with `ingest_pending=<true|false> raw_count=<N> recommended=<agent|none>`. The orchestrator parses this to decide whether to chain ingest automatically.

**Project intake** (optional): when the project root is a git work tree, the skill offers to wire it as a docs-only source via `wire-source.sh add --vault <vault>`. Wired sources land under `raw/wired/<name>/` and are picked up by the next ingest pass.

## Related

Pairs with `[[skill-ingest|Ingest Skill]]` (processes raw sources after init) and `[[skill-onboarding|Onboarding Skill]]` (the guided first-run procedure).

---
title: "LLM Wiki — Create a New Vault"
type: concept
aliases: ["llm-wiki-create-vault", "LLM Wiki Create Vault", "create new vault guide"]
parent: "[[llm-wiki|LLM Wiki Guides]]"
path: "docs/llm-wiki"
sources: ["[[docs-llm-wiki-02|LLM Wiki Guide 02 — Create a New Knowledge Base]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["docs", "llm-wiki", "user-guides", "init"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# LLM Wiki — Create a New Vault

Two paths for creating a new claude-wiki-pages vault: the first-time scaffold wizard (Option A) and standing up a second independent vault in a different project (Option B).

## Definition

"Creating a new vault" means running the init wizard to scaffold the directory structure, the authoritative `vault/CLAUDE.md` schema file, and the bookkeeping files (`wiki/index.md`, `wiki/log.md`). Both options produce an identical vault structure.

## Key Principles

**Option A — First-time scaffold or re-initialize.** Run `/claude-wiki-pages:init` from the project directory in Claude Code. The wizard prompts for vault name, domain, and paths. It writes `vault/CLAUDE.md`, `_templates/`, `wiki/index.md`, `wiki/log.md`, and `wiki/dashboard.md`. It does not overwrite existing content without asking.

**Option B — Second vault in a different project.** The plugin install is global to Claude Code; a second project does not need a separate install. Run `/claude-wiki-pages:init` from the second project's directory. Each vault is independent: different `CLAUDE.md`, different `raw/`, different `wiki/` trees.

**CLAUDE.md is the authority.** The wizard creates it; everything else (skills, agents, hooks) reads it. To customize the schema (add a page type, change confidence thresholds, rename a field), edit `vault/CLAUDE.md` — not the skills.

**Idempotency.** Re-running `/claude-wiki-pages:init` on an existing vault prompts before overwriting anything. It is safe to run again to verify or extend the scaffold.

## Examples

First-time users follow Option A. A developer who already uses the plugin for their personal knowledge base and wants to add a project-specific vault follows Option B from that project's directory.

## Related Concepts

The `init` skill is the implementation. The `skills/init/template/` directory is the scaffold source — `CLAUDE.md` from there becomes the vault's authoritative schema (ADR-0029).

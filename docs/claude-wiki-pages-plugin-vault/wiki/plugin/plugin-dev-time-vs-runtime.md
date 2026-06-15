---
title: "Plugin Dev-Time vs Runtime"
type: concept
aliases: ["Plugin Dev-Time vs Runtime", "plugin dev-time vs runtime", "dev-time runtime boundary", "plugin session context boundary", "install boundary"]
parent: "[[Plugin]]"
path: "plugin"
sources: ["[[plugin-claude-md|Plugin CLAUDE.md]]", "[[plugin-readme|Plugin README]]", "[[llm-software-3-0|SOFTWARE-3-0: Dual Entry Point]]"]
related: ["[[plugin-manifest|Plugin Manifest]]", "[[plugin|claude-wiki-pages Plugin]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["plugin", "architecture", "install"]
created: 2026-06-13
updated: 2026-06-13
update_count: 3
status: active
confidence: 1.0
---

# Plugin Dev-Time vs Runtime

## Definition

The `claude-wiki-pages` plugin repository is a contributor-facing tree. End-users never interact with the root of this repo directly. When Claude Code installs the plugin, it loads only a subset of the tree as session context. Everything else remains in the plugin cache but is invisible to the running LLM session.

This dev-time vs runtime split is a deliberate design choice: it keeps the LLM's context window focused on actionable capabilities (skills, agents, hooks, scripts) and prevents documentation, tests, and changelogs from polluting session context.

## Key Principles

**What ships at runtime (session context):**

| Surface     | Directory          |
| ----------- | ------------------ |
| Skills      | `skills/`          |
| Agents      | `agents/`          |
| Hook wiring | `hooks/hooks.json` |
| Scripts     | `scripts/`         |
| Rules       | `rules/`           |

**What is dev-only (plugin cache, not session context):**

- `docs/` — architecture docs, ADRs, design docs, user guides, GLOSSARY
- `tests/` — five-tier test harness
- `.github/` — CI workflows
- Root `CLAUDE.md` (the plugin repo instructions)
- `NOTICE`, `LICENSE`, `CHANGELOG.md`, `CONTRIBUTING.md`

**The onboarding exception:** when the onboarding wizard (`/claude-wiki-pages:init`) runs, it copies `docs/vault-example/` into the user's project as `docs/vault/` (or the path in `CLAUDE_WIKI_PAGES_VAULT`). The copied vault's `CLAUDE.md` takes over the schema-authority role for that user's sessions — it is now user-owned, not plugin-owned.

**Vault schema authority:** `docs/vault-example/CLAUDE.md` is the schema authority during plugin development. After onboarding, the user's copy of that file becomes the authority. Both declare the same `schema_version` but the user's copy is the one that wins during live vault operations.

## Examples

If a contributor adds a new skill at `skills/new-skill/SKILL.md`, it is immediately available as session context after the next plugin load. If they add a new ADR at `docs/adr/ADR-0025.md`, it is not session context — it must be ingested into a vault's `raw/` to become queryable wiki knowledge.

## Related Concepts

- [[plugin-manifest|Plugin Manifest]] — the `plugin.json` that Claude Code reads to register the plugin
- Schema Authority — the CLAUDE.md file that wins all frontmatter conflicts in a vault
- Vault Resolution — how the plugin finds the active vault at runtime

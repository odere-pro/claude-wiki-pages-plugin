---
title: "obsidian-vault Skill"
type: entity
entity_type: tool
aliases: ["obsidian-vault Skill", "obsidian-vault skill", "obsidian-vault", "vault guard skill"]
parent: "[[Obsidian]]"
path: "obsidian"
sources: ["[[Obsidian Vault Skill (SKILL.md)]]", "[[Engine Scripts Layer (CLAUDE.md)]]"]
related:
  [
    "[[Obsidian CLI Vault Scoping]]",
    "[[Defense-in-Depth Scoping]]",
    "[[Firewall]]",
    "[[Vault Resolution]]",
    "[[Hook System]]",
    "[[Graph Coloring]]",
  ]
tags: ["tool", "obsidian", "skill"]
created: 2026-06-13
updated: 2026-06-13
update_count: 2
status: active
confidence: 1.0
---

# obsidian-vault Skill

## Overview

The `obsidian-vault` skill is a **guard contract** for driving the Obsidian CLI safely. It is a Layer 2 skill in the four-layer stack, responsible for teaching agents the behavioral conventions that keep every Obsidian CLI invocation scoped to the one vault the agent was asked to work on.

The skill's allowed tools are `Read` and `Bash` only — it reads vault state and issues scoped CLI calls, but does not write or edit files directly. This tool restriction is the behavioral equivalent of the firewall's path restriction.

The skill is the behavioral twin of the firewall hook (`scripts/firewall.sh`): the hook enforces vault boundaries at the `PreToolUse` level; this skill teaches agents to scope correctly in the first place, so the hook rarely has to fire. Together they form the [[Defense-in-Depth Scoping]] design.

## Key Facts

- **Trigger conditions:** invoked when an agent is about to run `obsidian` commands, when an agent asks "how do I call the Obsidian CLI" or "which vault am I writing to", or via `/claude-wiki-pages:obsidian-vault`.
- **Four rules:**
  1. Resolve the vault first using `scripts/resolve-vault.sh` (four-tier resolution). Never hard-code paths.
  2. Always pass `--vault "$VAULT"` (or the CLI equivalent) to every Obsidian CLI call.
  3. Never operate on a different vault, even when named in the task. Surface it; do not switch.
  4. File operations alongside the CLI must resolve under `$VAULT`. The firewall blocks out-of-vault writes anyway — treat it as a contract, not an obstacle.
- **Configuration:** vault isolation is configured under the `firewall` key in `claude-wiki-pages.json` with fields `enabled`, `mode` (`enforce`/`warn`/`off`), `allowPaths`, and `denyPaths`. To permit writing to an extra path, add it to `firewall.allowPaths` — never disable the firewall.
- **Defense-in-depth rationale:** the skill catches confused agents early (behavioral guidance); the hook provides a deterministic backstop even when the skill is not consulted.

## Primary Use Case: Graph Color Updates

The main Obsidian CLI operation this skill governs is graph color group management. The `/claude-wiki-pages:obsidian-graph-colors` skill uses `obsidian eval` to set color groups in the Obsidian graph without restarting Obsidian. The vault scoping rules from this skill apply: the `obsidian eval` call must always carry `--vault "$VAULT"`.

**Headless fallback:** when `obsidian eval` is unavailable (no CLI or Obsidian is not running), the graph-colors skill falls back to writing `.obsidian/graph.json` directly. This file write goes through the `firewall.sh` gate and must also stay within the resolved vault. A running Obsidian instance can clobber a direct file write with its in-memory state — restart Obsidian after a headless write.

## Why Both a Skill and a Hook

The Obsidian CLI can act on any vault registered on the machine — including vaults that belong to other projects. An agent that asks "update the graph for my project" but has the wrong vault in scope could corrupt another user's vault. The two-layer design prevents this:

- The **skill** (this document) teaches the agent to resolve the vault first and always scope explicitly.
- The **firewall hook** (`scripts/firewall.sh`) enforces the path boundary regardless of whether the agent consulted the skill.

A confused agent is stopped by the hook. A careful agent never reaches it.

## Related

- [[Obsidian CLI Vault Scoping]] — the detailed four-rule convention this skill encodes
- [[Defense-in-Depth Scoping]] — the two-layer design (intent + enforcement) this skill participates in
- [[Firewall]] — the enforcement-layer twin; `scripts/firewall.sh` + `firewall.ts`
- [[Vault Resolution]] — the four-tier resolver (`scripts/resolve-vault.sh`) this skill depends on
- [[Hook System]] — the `PreToolUse` hook chain that runs the firewall on every write
- [[Graph Coloring]] — the primary operation for which Obsidian CLI calls are needed

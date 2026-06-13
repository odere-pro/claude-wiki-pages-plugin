---
title: "obsidian-vault Skill"
type: entity
entity_type: tool
aliases: ["obsidian-vault Skill", "obsidian-vault skill", "obsidian-vault", "vault guard skill"]
parent: "[[Obsidian]]"
path: "obsidian"
sources: ["[[Obsidian Vault Skill (SKILL.md)]]"]
related: ["[[Obsidian CLI Vault Scoping]]", "[[Defense-in-Depth Scoping]]", "[[Firewall]]", "[[Vault Resolution]]", "[[Hook System]]"]
tags: ["tool", "obsidian", "skill"]
created: 2026-06-13
updated: 2026-06-13
update_count: 1
status: active
confidence: 1.0
---

# obsidian-vault Skill

## Overview

The `obsidian-vault` skill is a **guard contract** for driving the Obsidian CLI safely. It is a Layer 2 skill in the four-layer stack, responsible for teaching agents the behavioral conventions that keep every Obsidian CLI invocation scoped to the one vault the agent was asked to work on.

The skill's allowed tools are `Read` and `Bash` only — it reads vault state and issues scoped CLI calls, but does not write or edit files directly.

The skill is described as the behavioral twin of the firewall hook (`scripts/firewall.sh`): the hook enforces vault boundaries at the `PreToolUse` level; this skill teaches agents to scope correctly in the first place, so the hook rarely has to fire.

## Key Facts

- **Trigger conditions:** invoked when an agent is about to run `obsidian` commands, when an agent asks "how do I call the Obsidian CLI" or "which vault am I writing to", or via `/claude-wiki-pages:obsidian-vault`.
- **Four rules:**
  1. Resolve the vault first using `scripts/resolve-vault.sh` (four-tier resolution). Never hard-code paths.
  2. Always pass `--vault "$VAULT"` (or the CLI equivalent) to every Obsidian CLI call.
  3. Never operate on a different vault, even when named in the task. Surface it; do not switch.
  4. File operations alongside the CLI must resolve under `$VAULT`. The firewall blocks out-of-vault writes anyway — treat it as a contract, not an obstacle.
- **Configuration:** vault isolation is configured under the `firewall` key in `claude-wiki-pages.json` with fields `enabled`, `mode` (`enforce`/`warn`/`off`), `allowPaths`, and `denyPaths`. To permit writing to an extra path, add it to `firewall.allowPaths` — never disable the firewall.
- **Defense-in-depth rationale:** the skill catches confused agents early (behavioral guidance); the hook provides a deterministic backstop even when the skill is not consulted.

## Related

- [[Obsidian CLI Vault Scoping]] — the detailed four-rule convention this skill encodes
- [[Defense-in-Depth Scoping]] — the two-layer design (intent + enforcement) this skill participates in
- [[Firewall]] — the enforcement-layer twin; `scripts/firewall.sh` + `firewall.ts`
- [[Vault Resolution]] — the four-tier resolver (`scripts/resolve-vault.sh`) this skill depends on
- [[Hook System]] — the `PreToolUse` hook chain that runs the firewall on every write

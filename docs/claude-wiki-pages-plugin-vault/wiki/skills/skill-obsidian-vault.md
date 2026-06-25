---
title: "Obsidian Vault Skill"
type: entity
entity_type: tool
aliases: ["Obsidian Vault Skill", "obsidian-vault", "/claude-wiki-pages:obsidian-vault", "CLI scoping contract"]
parent: "[[skills|Skills]]"
path: "skills"
sources: ["[[skills-obsidian-vault|Obsidian Vault Skill — SKILL.md]]"]
related: []
tags: ["skills", "layer-2", "obsidian-vault", "firewall"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Obsidian Vault Skill

The `obsidian-vault` skill defines the guard contract for driving the Obsidian CLI safely — always scope every invocation to the resolved vault, never operate on arbitrary vaults or paths.

## Overview

The Obsidian CLI can act on any vault registered on the machine. This skill is the behavioral complement to the firewall hook (`scripts/firewall.sh`), which enforces the same boundary on the write path. Defence in depth: a careful agent never reaches the hook; a confused one is stopped by it.

## Key Facts

**Four rules**:
1. Resolve the vault first via `scripts/resolve-vault.sh` (four-tier resolution)
2. Always pass `--vault "$VAULT"` (or equivalent) to every Obsidian CLI call — never rely on the CLI's "current"/"default" vault
3. Never operate on a different vault name; if a task names another vault, stop and surface it
4. File operations (reads and writes alongside the CLI) must resolve under `$VAULT`

**Hook vs. skill**:
- Hook (`scripts/firewall.sh` + `firewall` engine command): enforcement — blocks out-of-vault writes regardless of intent
- This skill: intent — teaches agents to scope correctly in the first place

**Firewall configuration**: `firewall` section of `claude-wiki-pages.json`. Keys: `enabled`, `mode` (`enforce`/`warn`/`off`), `allowPaths`, `denyPaths`. To permit an extra root, add to `allowPaths` — do not disable the firewall.

## Related

Paired with `[[skill-obsidian-cli|Obsidian CLI Skill]]` (the Obsidian CLI command reference) and the `[[skill-maintain-contract|Maintain Contract Skill]]` (multi-vault confinement rules).

---
title: "Obsidian CLI Vault Scoping"
type: concept
aliases: ["Obsidian CLI Vault Scoping", "obsidian cli vault scoping", "vault scoping convention", "obsidian CLI scoping"]
parent: "[[Obsidian]]"
path: "obsidian"
sources: ["[[Obsidian Vault Skill (SKILL.md)]]"]
related: ["[[obsidian-vault Skill]]", "[[Defense-in-Depth Scoping]]", "[[Vault Resolution]]", "[[Firewall]]"]
contradicts: []
supersedes: []
depends_on: ["[[Vault Resolution]]"]
tags: ["concept", "obsidian", "security"]
created: 2026-06-13
updated: 2026-06-13
update_count: 1
status: active
confidence: 1.0
---

# Obsidian CLI Vault Scoping

## Definition

Obsidian CLI vault scoping is the convention that every agent follows when issuing Obsidian CLI commands. Because the Obsidian CLI can act on any vault registered on the machine, an unscoped invocation risks touching the wrong vault — or whichever vault the user last opened. The scoping convention eliminates that ambiguity through four explicit rules applied before and during every CLI call.

## Key Principles

**Rule 1 — Resolve the vault first.**
Before any CLI call, determine the active vault using `scripts/resolve-vault.sh`. The four-tier resolution (env var → settings.json → auto-detect → default) is the single authoritative source of which vault is currently active. Never hard-code a vault path in a command.

```bash
VAULT=$(bash scripts/resolve-vault.sh)
```

**Rule 2 — Always pass the vault explicitly.**
Every Obsidian CLI invocation carries `--vault "$VAULT"` (or the CLI's equivalent parameter). Relying on the CLI's "current" or "default" vault is unsafe — that is whatever the user last opened in the Obsidian GUI.

```bash
obsidian eval --vault "$VAULT" "<expression>"
```

**Rule 3 — Never operate on a different vault name.**
If a task names or implies a different vault, stop and surface the discrepancy to the caller. Do not switch vaults to satisfy the request. Vault isolation is a hard constraint, not a soft preference.

**Rule 4 — File operations stay inside the vault.**
Any file reads or writes issued alongside Obsidian CLI calls must resolve to paths within `$VAULT`. The firewall hook (`scripts/firewall.sh`) will block out-of-vault writes regardless — treat its block as a contract to uphold, not an obstacle to route around.

## Examples

A correct CLI call pattern:

```bash
VAULT=$(bash scripts/resolve-vault.sh)
obsidian eval --vault "$VAULT" "app.vault.getName()"
```

An incorrect pattern (relies on CLI default — unsafe):

```bash
# WRONG: no --vault flag; hits whichever vault was last opened
obsidian eval "app.vault.getName()"
```

## Related Concepts

- [[obsidian-vault Skill]] — the skill that encodes and teaches this convention to agents
- [[Defense-in-Depth Scoping]] — pairs this convention (intent) with the firewall hook (enforcement)
- [[Vault Resolution]] — the four-tier resolution logic that Rule 1 depends on
- [[Firewall]] — the enforcement backstop that catches any violation that slips past the convention

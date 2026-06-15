---
title: "Obsidian Vault Skill (SKILL.md)"
type: source
source_type: manual
source_format: text
url: ""
author: ""
publisher: "claude-wiki-pages plugin"
date_published:
date_ingested: 2026-06-13
tags: ["obsidian", "skill", "vault-scoping"]
aliases: ["Obsidian Vault Skill (SKILL.md)"]
sources: []
created: 2026-06-13
updated: 2026-06-15
status: active
confidence: 1.0
---

# Obsidian Vault Skill (SKILL.md)

## Metadata

- **Author:** (claude-wiki-pages team)
- **Publisher:** claude-wiki-pages plugin
- **Published:**
- **URL:**

## Summary

The `obsidian-vault` skill is a guard contract for driving the Obsidian CLI safely. It defines four rules: always resolve the vault via the four-tier resolver before any CLI call, always pass `--vault "$VAULT"` explicitly to every Obsidian CLI invocation, never operate on a different vault name, and keep all file operations inside the resolved vault path. The skill is the behavioral twin of the firewall hook — the hook enforces the boundary, the skill teaches agents to scope correctly in the first place.

## Key Claims

- The Obsidian CLI can act on any vault registered on the machine; without explicit scoping every invocation risks touching the wrong vault.
- The four-tier vault resolution (`scripts/resolve-vault.sh`) is the canonical source of truth for which vault is active.
- The skill (intent layer) and `scripts/firewall.sh` (enforcement layer) form a defense-in-depth pair: a confused agent is stopped by the hook; a careful agent never reaches it.
- To permit writes to an extra root, add it to `firewall.allowPaths` in `claude-wiki-pages.json` — do not disable the firewall.
- Vault isolation is configured under the `firewall` key in `claude-wiki-pages.json` with `enabled`, `mode` (`enforce`/`warn`/`off`), `allowPaths`, and `denyPaths`.

## Entities Mentioned

- [[obsidian-vault Skill]]
- [[Vault Resolution]]

## Concepts Covered

- [[Obsidian CLI Vault Scoping]]
- [[Defense-in-Depth Scoping]]
- [[Firewall]]

## Grounded Pages

Wiki pages that cite this source:

- [[obsidian-vault Skill]] — primary source for the four scoping rules
- [[Obsidian CLI Vault Scoping]] — always resolve + always pass `--vault "$VAULT"` contract
- [[Defense-in-Depth Scoping]] — skill (intent layer) + firewall (enforcement layer) pair
- [[Vault Resolution]] — four-tier resolution is the canonical source of truth

---
title: "Obsidian"
type: index
aliases: ["Obsidian", "obsidian", "Obsidian integration", "obsidian-folder", "Obsidian CLI"]
parent: "[[index|Wiki Index]]"
path: "obsidian"
children:
  - "[[defense-in-depth-scoping|Defense-in-Depth Scoping]]"
  - "[[obsidian-cli-vault-scoping|Obsidian CLI Vault Scoping]]"
  - "[[obsidian/obsidian-vault-skill|obsidian-vault Skill]]"
  - "[[graph-config-cache|Graph Config Cache]]"
  - "[[wiki-only-graph|Wiki-Only Graph]]"
  - "[[graph-coloring|Graph Coloring]]"
  - "[[obsidian/obsidian-experience|Obsidian Experience]]"
child_indexes: []
tags: ["obsidian", "cli", "vault-scoping", "firewall"]
created: 2026-06-13
updated: 2026-06-13
---

# Obsidian

> [!summary]
> The Obsidian cluster covers the conventions and enforcement mechanisms that make Obsidian CLI calls safe in a multi-vault environment. The [[obsidian/obsidian-vault-skill|obsidian-vault Skill]] teaches agents to scope every CLI call to the resolved vault before the call happens. [[obsidian-cli-vault-scoping|Obsidian CLI Vault Scoping]] defines the four rules in detail. [[defense-in-depth-scoping|Defense-in-Depth Scoping]] explains the two-layer design: the skill catches confused agents early; the Firewall hook provides a deterministic backstop even when the skill is not consulted.

## Overview

The `claude-wiki-pages` plugin integrates with Obsidian in two ways: it writes markdown pages into the vault directory that Obsidian renders, and it drives the Obsidian CLI for operations that require Obsidian's plugin API (e.g., graph color group updates). Both modes require careful vault scoping — an agent that writes to the wrong vault or calls the CLI against the wrong target can corrupt data.

The Obsidian integration is governed by a defense-in-depth design. The behavioral layer (the `obsidian-vault` skill) teaches agents the correct conventions. The enforcement layer (the `firewall` hook, running at `PreToolUse`) blocks out-of-vault writes deterministically, regardless of whether the agent consulted the skill. Together they ensure that a confused agent and a careful agent are equally protected.

The key invariant: **resolve the vault first, then act**. No Obsidian CLI call or file write is safe until the vault path has been resolved via `scripts/resolve-vault.sh`. The four-tier resolution order (env var → settings.json → auto-detect → default) is the same resolution used by all Layer 4 scripts.

## Key Pages

[[obsidian/obsidian-vault-skill|obsidian-vault Skill]] is the Layer 2 guard contract for driving the Obsidian CLI. Its four rules are: (1) resolve the vault first using `scripts/resolve-vault.sh`; (2) always pass `--vault "$VAULT"` to every Obsidian CLI call; (3) never operate on a different vault even when named in the task — surface it, do not switch; (4) treat file operations alongside the CLI as vault-scoped. The skill's allowed tools are `Read` and `Bash` only.

[[obsidian-cli-vault-scoping|Obsidian CLI Vault Scoping]] documents the four-rule convention in detail, independent of the skill's SKILL.md format. This page is the reference for contributors adding new Obsidian CLI integrations.

[[defense-in-depth-scoping|Defense-in-Depth Scoping]] explains the two-layer design pairing the skill (intent) with the Firewall hook (enforcement). The key insight: the skill guides agents that consult it; the hook protects against agents that do not. The `PreToolUse` hook runs on every write tool call, making the enforcement layer unconditional.

## Open Questions

- Should the Obsidian graph color update flow be documented as a fourth page in this cluster, given that it drives a specific Obsidian CLI verb (`obsidian eval`) with a headless fallback?
- The firewall's `allowPaths` and `denyPaths` configuration is currently documented in the `obsidian-vault Skill` page. Should it move to a dedicated Config page in this cluster?

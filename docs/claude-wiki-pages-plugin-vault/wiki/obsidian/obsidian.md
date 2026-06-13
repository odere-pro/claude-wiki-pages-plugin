---
title: "Obsidian"
type: index
aliases: ["Obsidian", "obsidian", "Obsidian integration", "obsidian-folder"]
parent: "[[Wiki Index]]"
path: "obsidian"
children:
  - "[[obsidian-vault Skill]]"
  - "[[Obsidian CLI Vault Scoping]]"
  - "[[Defense-in-Depth Scoping]]"
child_indexes: []
tags: ["obsidian"]
created: 2026-06-13
updated: 2026-06-13
---

# Obsidian

Obsidian-side integration: the skills, contracts, and patterns that govern how agents drive the Obsidian CLI safely and keep vault state consistent.

## Pages

- [[obsidian-vault Skill]] — the guard contract that scopes every Obsidian CLI call to the resolved vault; the behavioral twin of the firewall hook.
- [[Obsidian CLI Vault Scoping]] — the four-rule convention for safe Obsidian CLI invocation: resolve first, always pass `--vault`, never switch vaults, stay inside the vault.
- [[Defense-in-Depth Scoping]] — the two-layer design pairing the skill (intent) with the firewall hook (enforcement) so both confused agents and careful agents are protected.

## Subtopics

(none — single folder, no nested subtopics)

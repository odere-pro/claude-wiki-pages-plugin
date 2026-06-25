---
title: "Hooks"
type: index
aliases: ["hooks", "Hooks", "Claude Code hooks", "lifecycle hooks"]
parent: "[[index|Wiki Index]]"
path: "hooks"
children:
  - "[[hooks-configuration|Hooks Configuration]]"
  - "[[write-path-firewall|Write-Path Firewall]]"
  - "[[commit-backstop|Commit Backstop]]"
child_indexes: []
tags: ["hooks"]
created: 2026-06-25
updated: 2026-06-25
---

# Hooks

Layer 4 (Orchestration) lifecycle hook wiring: six Claude Code hook events that enforce safety, validate writes, and maintain session state.

## Pages

### Configuration

- [[hooks-configuration|Hooks Configuration]] — full hooks.json wiring: six events, all bound scripts, read-vs-write posture

### Concepts

- [[write-path-firewall|Write-Path Firewall]] — the fail-closed PreToolUse gate (firewall.sh, validate-frontmatter.sh, check-wikilinks.sh, protect-raw.sh, validate-attachments.sh)
- [[commit-backstop|Commit Backstop]] — the SubagentStop safety net that commits any vault changes left uncommitted when a write-path agent returns

## Subtopics


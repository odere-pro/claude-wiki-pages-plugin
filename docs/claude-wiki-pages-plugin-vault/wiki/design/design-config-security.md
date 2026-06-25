---
title: "Design Config and Security"
type: concept
aliases: ["design-config-security", "Design Config and Security", "config security diagram"]
parent: "[[design|Design]]"
path: "design"
sources: ["[[docs-design-config-security|Design — Configuration, Security, and Isolation]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["docs", "design", "security", "architecture"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Design Config and Security

A diagram perspective showing the four-tier vault resolution, the fail-closed write boundary (PreToolUse chain), and the two isolation axes — dev-time vs runtime, and per-vault confinement.

## Definition

The config-security document (`docs/design/05-claude-config-security.md`) visualizes the security architecture as three decision flows: how the vault is located, how writes are gated, and how the dev-time vs runtime boundary plus per-vault confinement keep different concerns separated.

## Key Principles

**Four-tier vault resolution (first match wins):** (1) `CLAUDE_WIKI_PAGES_VAULT` env var; (2) `.claude/claude-wiki-pages/settings.json` `current_vault_path`; (3) auto-detect (scan up to 4 levels for CLAUDE.md + wiki/ sibling); (4) default `docs/vault`. Switching vaults: `bash scripts/set-vault.sh <path>`.

**Fail-closed write boundary.** Every Write/Edit traverses the PreToolUse chain in order: firewall → validate-frontmatter → check-wikilinks → protect-raw → validate-attachments. Any failure blocks the write — the safe default is "no write", not "write anyway". The `UserPromptSubmit` hook (`prompt-guard.sh`) applies the same posture to untrusted input before it becomes instructions.

**Two isolation axes.** (1) Dev-time vs runtime: `docs/`, `tmp/`, dev teams are never loaded as session context; only `skills/`, `agents/`, hooks+scripts, `rules/` are. (2) Per-vault: `firewall.sh` confines writes to the resolved vault; cross-vault writes are blocked (ADR-0009).

**Multi-vault audit.** A read-only roll-up aggregates per-vault logs. Writes stay confined per vault; the roll-up only reads (ADR-0016).

## Examples

A malformed vault registry resolves to zero writable roots — not all-writable. This is the canonical example of the fail-closed posture applied to configuration.

## Related Concepts

ADR-0009 specifies the deny rule for per-vault confinement. ADR-0016 adds simultaneous multi-vault management on top of this foundation. The four-tier resolution is implemented in `scripts/resolve-vault.sh`.

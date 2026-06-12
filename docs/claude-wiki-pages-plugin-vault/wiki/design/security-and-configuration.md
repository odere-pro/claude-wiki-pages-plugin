---
title: "Security and Configuration"
type: concept
aliases: ["Security and Configuration", "security configuration", "write boundary", "isolation"]
parent: "[[Design]]"
path: "design"
sources: ["[[05-claude-config-security]]", "[[operations]]"]
related: ["[[Hook System]]", "[[Vault Resolution]]", "[[Orchestration Layer]]"]
tags: [design, security, configuration]
created: 2026-06-12
updated: 2026-06-12
update_count: 1
status: active
confidence: 0.9
---

# Security and Configuration

How the plugin's configuration is set up, how writes are secured, and how vaults are isolated.

## Vault Resolution (4-tier, first match wins)

See [[Vault Resolution]] for the full order. The key point: the resolver (`scripts/resolve-vault.sh`) is the **single config source** for which vault is active.

## The Fail-Closed Write Boundary

Every Write/Edit runs the full `PreToolUse` chain before it lands, in the exact order wired in `hooks/hooks.json`:

1. **`firewall.sh`** — inside resolved vault? (confinement)
2. **`validate-frontmatter.sh`** — schema-valid frontmatter?
3. **`check-wikilinks.sh`** — no broken wikilinks?
4. **`protect-raw.sh`** — not under `raw/`?
5. **`validate-attachments.sh`** — attachment paths resolve?

Each step is independent. A BLOCK at any step means the write never happens. The chain is enforced in the order wired in `hooks/hooks.json` — not by convention but by the hook runner's sequential dispatch.

## The Firewall

`scripts/firewall.sh` (shell twin) and `src/core/firewall.ts` (engine twin) confine writes to the resolved vault. Gate-11 pins them byte-for-byte so they cannot diverge. The precedence:

**deny → cross-vault → vault → allowPaths → outside-vault**

`cross-vault` is placed before `allowPaths` — a sibling vault is blocked even if `allowPaths` is permissive. This strengthens rather than relaxes single-active confinement.

## `raw/` Immutability

`protect-raw.sh` blocks:
- Any `Edit` to an existing file under `raw/`
- Any `Write` that would overwrite an existing `raw/` file

The one exception is the durable-memory carve-out (ADR-0010): new files under `raw/agent-sessions/` with `source_type: agent-session` in YAML frontmatter are permitted. The marker is tested in the frontmatter block only (not the body); a traversal outside the fence is canonicalized and blocked.

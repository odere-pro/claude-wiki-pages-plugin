---
title: "Defense-in-Depth Scoping"
type: concept
aliases: ["Defense-in-Depth Scoping", "defense-in-depth scoping", "defense in depth scoping", "skill-hook defense pair"]
parent: "[[Obsidian]]"
path: "obsidian"
sources: ["[[_sources/obsidian-vault-skill|Obsidian Vault Skill (SKILL.md)]]"]
related: ["[[obsidian/obsidian-vault-skill|obsidian-vault Skill]]", "[[obsidian-cli-vault-scoping|Obsidian CLI Vault Scoping]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["concept", "security", "obsidian"]
created: 2026-06-13
updated: 2026-06-13
update_count: 1
status: active
confidence: 1.0
---

# Defense-in-Depth Scoping

## Definition

Defense-in-depth scoping is the two-layer safety design that protects vault isolation when agents drive the Obsidian CLI. The first layer is the **skill** (`obsidian-vault` skill) — the behavioral intent layer that teaches agents to scope correctly. The second layer is the **firewall hook** (`scripts/firewall.sh`) — the enforcement layer that blocks out-of-vault writes even if an agent ignores or misapplies the skill.

The design follows the classic defense-in-depth principle: no single control is relied upon to be perfect, so two independent controls at different layers provide redundant protection.

## Key Principles

**Layer 1 — Intent (the skill).**
The `obsidian-vault` skill is loaded as session context whenever an agent is about to issue Obsidian CLI commands. It teaches the four vault-scoping rules proactively. A careful, well-instructed agent applies the rules and never reaches the enforcement layer.

**Layer 2 — Enforcement (the hook).**
The `scripts/firewall.sh` `PreToolUse` hook fires on every Write and Edit tool call. It canonicalises the target path and checks it against the active vault root, the registered inactive vaults (cross-vault rule), explicit deny lists, and `denyPaths` patterns. A confused agent that ignores the skill is stopped deterministically at this layer.

**Why both layers are necessary.**

- The skill alone is insufficient: an agent that was not loaded with the skill, received conflicting instructions, or made a reasoning error would still issue an out-of-vault write. The hook provides a deterministic backstop.
- The hook alone is insufficient: without the skill, agents would repeatedly issue out-of-vault calls and be blocked — noisy, slow, and unable to complete their task gracefully. The skill prevents those calls from being issued in the first place.

**The asymmetry of the two layers.**
The skill is soft (behavioral guidance; can be ignored by a confused agent). The hook is hard (exit code 2; the write does not reach the filesystem regardless). This asymmetry is intentional: the soft layer is cheap to apply and educational; the hard layer is the safety net.

## Examples

Scenario: a confused agent tries to write to a sibling vault.

1. The `obsidian-vault` skill taught the agent to resolve the vault first. If consulted, the agent would have used `scripts/resolve-vault.sh` and found the correct active vault.
2. The agent, confused, writes to the sibling vault path anyway.
3. `scripts/firewall.sh` fires, matches the `cross-vault` rule, and exits with code 2.
4. The Write tool call is rejected. The sibling vault is untouched.

Scenario: a careful agent follows the skill.

1. The agent resolves the vault: `VAULT=$(bash scripts/resolve-vault.sh)`.
2. The agent passes `--vault "$VAULT"` to every Obsidian CLI call.
3. All file writes resolve inside `$VAULT`.
4. The firewall fires but returns `vault` (allowed). No interruption.

## Related Concepts

- [[obsidian/obsidian-vault-skill|obsidian-vault Skill]] — Layer 1 (intent); the skill that teaches vault-scoping
- [[obsidian-cli-vault-scoping|Obsidian CLI Vault Scoping]] — the four rules the skill encodes
- Firewall — Layer 2 (enforcement); `scripts/firewall.sh` + `firewall.ts`
- Hook System — the `PreToolUse` hook chain that runs the firewall

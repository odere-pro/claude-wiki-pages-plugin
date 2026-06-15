---
title: "Multi-Vault Operating Rules"
type: concept
aliases: ["Multi-Vault Operating Rules", "multi-vault operating rules", "multi-vault agent rules", "vault operating rules"]
parent: "[[Wiki Pages]]"
path: "wiki-pages"
sources: ["[[Wiki Pages Skill (maintain-contract SKILL.md)]]"]
related: ["[[Maintain Contract]]", "[[Multi-Vault Registry]]", "[[Firewall]]", "[[Vault Resolution]]"]
contradicts: []
supersedes: []
depends_on: ["[[Multi-Vault Registry]]", "[[Firewall]]", "[[Vault Resolution]]"]
tags: ["concept", "multi-vault", "operating-rules"]
created: 2026-06-13
updated: 2026-06-13
update_count: 1
status: active
confidence: 1.0
---

# Multi-Vault Operating Rules

> [!summary]
> The multi-vault operating rules are five agent-level procedures that extend the [[Maintain Contract]] for environments where more than one vault is registered. They enforce explicit scoping on every engine call, derive the confinement set from the live registry rather than hard-coded paths, permit cross-vault reads, block all cross-vault writes, and treat a malformed registry as zero writable roots (fail-closed). The rules are derived from ADR-0009 and ADR-0016.

## Definition

When more than one vault is registered in `.claude/claude-wiki-pages/settings.json`, every engine call must be explicitly scoped. The five rules codify the correct agent behaviour to prevent cross-vault contamination and fail-closed on any registry inconsistency.

These rules are agent-side procedures — the complementary enforcement mechanism is the [[Firewall]] (bash twin `scripts/firewall.sh` and TypeScript twin `src/core/firewall.ts`). The agent follows the rules voluntarily; the firewall enforces them structurally at the write boundary.

## Key Principles

### Rule 1 — Always Target the Active Vault

Pass `--target <active-vault-path>` to every engine call. Never omit `--target` when a registry is configured — the engine resolves the vault independently and may not agree with the hook's resolved path if the registry has changed between calls.

```bash
bash engine.sh verify --target /path/to/active-vault
bash engine.sh heal --target /path/to/active-vault
```

### Rule 2 — Pass `--other-vaults` from the Registry for Confinement

`scripts/resolve-vault.sh` exports `registry_other_vaults` — the registered vault roots minus the active one. Pass that set as `--other-vaults` to the engine's `firewall` command so both the bash twin and the TS twin enforce the `cross-vault` deny rule with the same root set.

Do not hard-code vault paths; derive them from the registry at call time. Hard-coded paths drift when the user adds or removes vaults.

```bash
source scripts/resolve-vault.sh
bash engine.sh firewall --target "$VAULT" --other-vaults "$registry_other_vaults" <write-command>
```

### Rule 3 — Reads from Non-Active Registered Vaults Are Permitted

An agent may read files (via `Read` tool or `grep`/`Glob` over a non-active vault path) when a cross-vault comparison is needed. Read operations are not governed by the firewall write-confinement boundary. No engine flag is required for reads.

```bash
# Permitted: read from a non-active vault for comparison
grep -r "entity_type" /path/to/other-vault/wiki/
```

### Rule 4 — Writes to Any Non-Active Vault Are Firewall-BLOCKED

The `cross-vault` deny rule fires before the `allowPaths` check (precedence: deny → cross-vault → vault → allowPaths → outside-vault). Passing `--other-vaults` does not grant write access — it provides the root set the firewall uses to _identify and block_ cross-vault writes.

No `firewall.allowPaths` entry can override a `cross-vault` block. To write to a different vault, first switch the active vault:

```bash
bash scripts/set-vault.sh switch /path/to/other-vault
```

### Rule 5 — A Malformed or Inconsistent Registry Resolves FAIL-CLOSED

If `registry_other_vaults` (from `scripts/resolve-vault.sh`) exits non-zero — because the registry JSON is malformed or `current_vault_path ∉ vaults[]` — the firewall maps this to zero writable roots: neither the active vault nor any other vault is writable until the registry is repaired.

This is not an error to work around — it is the security posture mandated by ADR-0016 (PM.2/N4). The fail-closed signal is an exit code, not a stdout sentinel. To diagnose: `bash scripts/set-vault.sh list`.

## Examples

Correct multi-vault agent call sequence:

```bash
# Derive the active vault and other-vaults from the live registry
source /path/to/scripts/resolve-vault.sh

# Rule 1: always --target
# Rule 2: always --other-vaults
bash engine.sh verify --target "$VAULT" --other-vaults "$registry_other_vaults"
```

Registry inconsistency flow:

- `resolve-vault.sh` exits non-zero → Rule 5 fires → zero writable roots
- Agent reports failure; does not proceed with writes
- User runs `set-vault.sh list` to diagnose

## Related Concepts

- [[Maintain Contract]] — the parent contract that these rules extend for multi-vault environments
- [[Multi-Vault Registry]] — the registry data structure (`settings.json`) that Rules 2 and 5 read from
- [[Firewall]] — the enforcement mechanism that Rules 4 and 5 rely on (bash twin + TS twin)
- [[Vault Resolution]] — `scripts/resolve-vault.sh` that Rules 1 and 2 source for `$VAULT` and `$registry_other_vaults`

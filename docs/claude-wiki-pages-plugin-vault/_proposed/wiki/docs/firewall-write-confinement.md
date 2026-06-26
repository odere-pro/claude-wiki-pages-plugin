---
title: "Firewall Write Confinement"
type: concept
aliases: ["firewall", "write confinement", "per-vault write confinement", "firewall.sh", "firewall hook"]
parent: "[[docs|Docs]]"
path: "docs"
sources: ["[[docs-glossary|Canonical Glossary]]", "[[docs-architecture|Four-Layer Architecture]]"]
related: []
tags: ["docs", "security", "architecture"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: draft
confidence: 0.95
derived: false
proposed_by: "claude"
---

# Firewall Write Confinement

The PreToolUse boundary that restricts every agent and tool write to the resolved active vault plus its explicit allow-list, blocking cross-vault writes and enforcing immutability of `raw/`.

## Definition

The firewall is the plugin's primary write-safety mechanism. It is implemented as a `PreToolUse` hook (`scripts/firewall.sh` backed by the engine `firewall` command in `src/core/firewall.ts`) that intercepts every Write, Edit, and file-operation tool call and checks whether the target path is within the allowed write scope.

The allowed write scope is:
- The resolved active vault path (always implicitly allowed).
- Any paths listed in `firewall.allowPaths` in the project or user config (explicit additional roots).

Blocked by the firewall:
- Any path outside the resolved vault and `allowPaths` (cross-vault writes).
- Any path matching `firewall.denyPaths` globs (even if inside the vault). Used to enforce `raw/` immutability: `denyPaths: ["raw/**"]` blocks writes to raw source material.

Three operating modes: `enforce` (blocks writes — the secure default), `warn` (logs but does not block — for debugging), `off` (disabled).

## Key Principles

**`raw/` is immutable.** The `protect-raw.sh` script and the firewall's `denyPaths` configuration both enforce that no agent may write, edit, or delete files under `raw/`. Raw source material is the ground truth; overwriting it would corrupt the provenance chain. A write attempt to `raw/` in `enforce` mode exits with code 2, causing the tool call to fail.

**Per-vault confinement.** The firewall reads the resolved active vault path from `resolve-vault.sh` and builds the allow-list from it plus `allowPaths`. An agent running in vault A cannot write to vault B even if both vaults are known to the vault registry. This is the per-vault write confinement invariant.

**Fail-closed on engine unavailability.** When Bun is absent, the engine's `firewall` command cannot run. The fail-closed posture (`fail-closed engine bridge`) treats absence as "could not verify" — the script exits non-zero (BLOCK) rather than fail-open. This prevents accidental writes through degraded infrastructure.

**`enforce` mode is the secure default.** Operator-controlled via `firewall.mode` in the config. Switching to `warn` or `off` is a deliberate operator decision for debugging; it must not be left in place for production operation.

**Hooks fire on every relevant tool call.** The firewall hook is wired as a `PreToolUse` handler in `hooks/hooks.json` and fires before every Write, Edit, Bash (file operations), and similar tool invocation. A blocking hook exits with code 2; the tool call is rejected before any filesystem change occurs.

## Examples

An agent attempts to write `raw/source.md` (e.g. to "fix" a typo in a source). The firewall intercepts the Write call, checks the path against `denyPaths: ["raw/**"]`, and exits 2. The write is rejected; the raw source is unchanged.

An operator working with two vaults (`docs/vault-a` and `docs/vault-b`) sets `current_vault_path: "docs/vault-a"`. An ingest run for vault-a cannot write to vault-b — the path falls outside the resolved vault's allow-list and the firewall blocks it.

A debug session temporarily sets `firewall.mode: "warn"` to trace which paths an agent is attempting to write. The firewall logs each intercepted path but does not block. The operator restores `enforce` mode after the session.

## Related Concepts

The firewall is implemented by `scripts/firewall.sh` and `src/core/firewall.ts`. It depends on vault resolution (to know the active vault path). Its `raw/` immutability enforcement complements `protect-raw.sh`. The `fail-closed engine bridge` concept governs its behavior when Bun is absent. The vault registry and per-vault write confinement are the multi-vault dimensions of the same safety contract.
---

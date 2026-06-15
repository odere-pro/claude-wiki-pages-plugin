---
title: "Vault Lifecycle"
type: concept
aliases: ["Vault Lifecycle", "vault lifecycle", "vault lifecycle commands", "vault init add switch remove merge"]
parent: "[[how-it-works|How It Works]]"
path: "how-it-works"
sources: ["[[_sources/adr-0009-multi-vault-confinement|ADR-0009: Multi-Vault Registry and Per-Vault Write Confinement]]", "[[adr-0012-vault-merge|ADR-0012: Vault Merge Conflict Resolution]]", "[[adr-0016-multi-vault-registry|ADR-0016: Simultaneous Multi-Vault Management]]"]
related: ["[[multi-vault-registry|Multi-Vault Registry]]", "[[active-vault|Active Vault]]", "[[Firewall]]", "[[vault-resolution|Vault Resolution]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["concept", "vault", "multi-vault"]
created: 2026-06-13
updated: 2026-06-13
update_count: 3
status: active
confidence: 1.0
---

# Vault Lifecycle

> [!summary]
> The vault lifecycle is the set of named operations that manage the set of registered vaults and which vault is active. Four operations are implemented: `init` (scaffold a new vault), `vault_add` (register an existing vault), `switch` (change the active vault), and `remove` (deregister without deleting). A fifth operation, `merge`, is design-accepted but not yet implemented (deferred by ADR-0012).

## Key Principles

- No lifecycle operation deletes vault files from disk; the plugin owns the registration, not the data.
- All lifecycle operations work through `scripts/set-vault.sh` and the registry in `.claude/claude-wiki-pages/settings.json`.
- The `switch` operation changes only `current_vault_path`; it never moves, copies, or merges vault files.
- The registry fails closed: if `current_vault_path` does not match any `vaults[].path`, all writes are blocked until the invariant is restored.
- The `merge` operation is design-accepted (ADR-0012) but deferred — it is listed in help text as "coming soon" and exits non-zero until implemented.

## Examples

Switching between two registered vaults:

```bash
# Current: /Users/alex/work-vault
bash scripts/set-vault.sh /Users/alex/personal-vault
# Now: /Users/alex/personal-vault is active; work-vault still registered but inactive
```

Registering an existing vault without switching:

```bash
bash scripts/set-vault.sh add /path/to/second-vault "secondary"
```

The merge design (deferred): pages are matched by `sources` chain and title. Exact matches are merged taking the higher `confidence`; collisions go to `_proposed/` for review; source vault is read-only during merge.

## Definition

The vault lifecycle governs how vaults are created, registered, navigated, and decommissioned. All lifecycle operations work through `scripts/set-vault.sh` and the registry in `.claude/claude-wiki-pages/settings.json`. No lifecycle operation deletes files from disk.

### `init` — Scaffold a New Vault

```bash
/claude-wiki-pages:init
```

The onboarding wizard copies `docs/vault-example/` to the target path (default: `docs/vault/` or `CLAUDE_WIKI_PAGES_VAULT`), initializes git in the vault directory, and registers the vault as the active vault in settings.json. The vault is immediately ready for ingest.

### `vault_add` — Register an Existing Vault

When a vault directory already exists (e.g., cloned from a repo or moved from another machine):

```bash
bash scripts/set-vault.sh /path/to/existing-vault
```

This registers the path as the active vault and adds it to `vaults[]`. It does not copy or modify the vault. The registry invariant (ADR-0016) requires that the vault path contains a `CLAUDE.md` with `schema_version` before it can be registered.

### `switch` — Change the Active Vault

```bash
bash scripts/set-vault.sh /path/to/other-vault
```

Updates only `current_vault_path`. Leaves all vault content untouched. The switch takes effect immediately — the next agent invocation uses the new active vault.

### `remove` — Deregister Without Deleting

The `remove` command removes a vault from `vaults[]` and, if it was active, resets `current_vault_path` to the next registered vault. It never deletes vault files. This is intentional: the plugin does not own the vault's data, only its registration.

### `merge` — Consolidate Two Vaults (Deferred)

ADR-0012 accepted the merge design but deferred implementation:

- **Design:** dedup-and-flag approach. Pages are matched by `sources` chain and title. Exact matches are merged (taking the higher `confidence`). Collisions (same title, different content) go to `_proposed/` for human review. Provenance is preserved — no `sources` chain is truncated.
- **Safety contract:** the source vault is read-only during merge; all writes go to the active vault.
- **Status:** DEFERRED. `merge` is listed in `set-vault.sh` help text as coming soon but exits non-zero until implemented.

## Registry Constraints (ADR-0016)

The registry enforces:

1. `current_vault_path` must equal exactly one `vaults[].path`. Violation → fail-closed.
2. Malformed `settings.json` → fail-closed (no writes until repaired).
3. A `settings.json` without a `vaults` key is valid (fresh install before any `vault_add`).

## Related Concepts

- [[multi-vault-registry|Multi-Vault Registry]] — the settings.json structure that stores the registered vault list
- [[active-vault|Active Vault]] — the single vault that write operations target at any given time
- [[Firewall]] — the enforcement mechanism that confines writes to the active vault
- [[vault-resolution|Vault Resolution]] — the 4-tier resolver that determines the active vault from environment, settings, auto-detect, and default

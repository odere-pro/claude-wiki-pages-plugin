# ADR-0009: Multi-vault registry and per-vault write confinement — one active vault, `cross-vault` deny

- **Status:** Accepted
- **Date:** 2026-06-05
- **SPEC anchor:** §6 (Layer 4 — vault resolution, firewall); Brief §5 (one active vault), §6 (per-vault write confinement); decision #3

## Context

The plugin resolves exactly one vault — a four-tier resolution in `scripts/resolve-vault.sh` returning a single `current_vault_path` — and both firewall twins confine writes to that one resolved root (`scripts/firewall.sh`, `src/core/firewall.ts`), pinned together by gate-11. Decision #3 (Brief §5) adds multi-vault support but keeps the invariant strict: **one active vault at a time** (default one, minimum one); a lifecycle of `add`/`remove`/`switch`; writes go *only* to the active vault; the single-active write invariant is **kept, not relaxed**.

The hazard is that "support multiple vaults" reads as "relax confinement," when the requirement is the opposite. A user with two registered vaults must not have a write to vault B succeed while vault A is active — that is a cross-vault write, and decision #3 forbids it. The existing firewall already blocks such a write generically (it is "outside" the active vault), but only via the catch-all `outside-vault` rule, and an over-broad `firewall.allowPaths` entry could let a sibling vault through. So the work is to *record* the set of known vaults and *strengthen* confinement so a sibling vault is denied with a dedicated, allow-proof rule — without touching the resolution hot path or the single-active mechanism.

## Decision

Add a registry to settings and a `cross-vault` deny to both firewall twins; keep resolution and the single-active pointer exactly as they are.

- **Registry shape (additive).** `.claude/claude-wiki-pages/settings.json` keeps `default_vault_path` and `current_vault_path` unchanged and gains a `vaults` array of `{ path, name }` entries — the known set. `current_vault_path` remains the **sole** source of truth for which vault is active (the active vault is the registry entry whose `path` equals it); there is no second "active" flag. A settings file without `vaults` stays valid and is backfilled to a one-entry registry on first lifecycle use, so legacy projects upgrade with no migration command.
- **Resolution is unchanged.** `scripts/resolve-vault.sh:resolve_vault()` still returns `current_vault_path` via its existing reader; the registry is a sidecar that lifecycle commands maintain and the firewall reads, never a new input to the most-tested function in the plugin.
- **Lifecycle — `add`/`remove`/`switch`/`list`** extend the existing vault-pointer seam (`resolve-vault.sh` helpers exposed through the `set-vault.sh` CLI), not a new script. `add` registers a vault without switching (idempotent). `switch` points `current_vault_path` at an already-registered vault through the single pointer writer, touching no data. `remove` **deregisters only — it never deletes vault data on disk** — and is refused if it would empty the registry (minimum one) or remove the active vault (switch first). `merge` is explicitly **not** in this set (Phase 3).
- **Per-vault write confinement — the `cross-vault` rule, mirrored byte-for-byte.** Both twins gain `otherVaults` — the registered vault roots minus the active one (`src/core/firewall.ts:30`) — and a deny that fires when a write lands under any *inactive* registered vault: `matchedRule: "cross-vault"` (`src/core/firewall.ts:91-95`, `scripts/firewall.sh:163-164`), fail-closed under `enforce`, advisory under `warn`, consistent with every other rule. Its precedence is **deny → cross-vault → vault → allowPaths → outside-vault** (`src/core/firewall.ts:89-90`, `scripts/firewall.sh:156`). Placing `cross-vault` before the active-vault allow *and* before `allowPaths` means a sibling vault is blocked **even if `allowPaths` is permissive** — `allowPaths` cannot override it. This is strictly *more* restrictive than before (those paths were already blocked, now with a clearer, allow-proof reason), so it strengthens rather than relaxes single-active confinement. gate-11 is extended with a cross-vault fixture matrix asserting the two twins return identical verdicts (active write → `vault`; sibling write → `cross-vault`; deny-inside-sibling → still `deny`; outside-all → `outside-vault`).

## Alternatives considered

- **Add a second "active" flag to the registry.** Rejected. Two sources of truth for "which vault is active" (`current_vault_path` and a registry flag) drift apart — the DRY/single-source failure Brief §6 forbids. The active vault is *derived* as the registry entry matching `current_vault_path`; one pointer, one writer (`set_vault_path`).
- **Relax single-active confinement / fan writes out to multiple vaults.** Rejected — it directly contradicts decision #3 ("writes go only to the active vault; the single-active invariant is kept"). Per-vault write fan-out was cut for exactly this reason. The firewall keeps confining to one root; the registry only records the set.
- **Make resolution read the registry to pick the active vault.** Rejected. It would perturb `resolve_vault()` — the most load-bearing, most-tested function — for no gain, since `current_vault_path` already names the active vault. The registry is a sidecar, not a resolution input.
- **Let `remove` delete the vault directory.** Rejected. Destroying user data on a deregistration is unrecoverable and surprising. `remove` edits only the settings array; the vault, its git history, and its `raw/`/`wiki/` are untouched, and re-adding the path restores it.
- **Treat a sibling-vault write as plain `outside-vault`.** Rejected. The catch-all gives a vague reason and, crucially, can be overridden by a permissive `allowPaths`. A dedicated `cross-vault` rule placed before `allowPaths` makes the block explicit and allow-proof — the point of the strengthening.
- **Ship `merge` now.** Rejected — out of scope for S3 and deferred to Phase 3. Conflict-resolution UX for merging two vaults is a separate, larger decision.

## Consequences

**Positive.**

- Single-active confinement is strengthened, not relaxed: a write to any inactive registered vault is denied with an allow-proof `cross-vault` rule, mirrored byte-for-byte in both twins under gate-11.
- The active pointer stays single-sourced (`current_vault_path`); the registry records the set without duplicating "active." Resolution is untouched, so the riskiest function gains zero new behaviour.
- The lifecycle is minimal and safe: `add` ≠ `switch`, `remove` never deletes data, minimum-one and not-active invariants are enforced, and it all rides the existing pointer seam (no new script).

**Negative.**

- **Symlink-escape hardening is required for true parity, and is being added now.** The bash twin canonicalises a target by `cd "$dir" && pwd` (`scripts/firewall.sh:115-127`), which resolves symlinks *physically*, while the TS twin uses `resolve()` (`src/core/firewall.ts:62-64`), which is *logical* (it does not follow symlinks). A symlinked path could therefore be judged differently by the two twins, and a sibling-vault symlink could slip a `cross-vault` check. The hardening lands physical realpath resolution in **both** twins (canonicalising the active vault, every `otherVaults` root, and the target through real paths before the `is_under`/`isUnder` comparisons) so the symlink case is identical across the twins and a symlinked escape into a sibling vault is caught. gate-11 gains a symlink fixture row.
- **`otherVaults` must be derived identically on both sides.** The registry → `otherVaults` derivation (registered paths, canonicalised, minus the active path) has to be deterministic and constructed the same way for the bash hook and the TS `decide`, or the twins diverge. Mitigated by keeping the derivation trivial and feeding both twins the same set in the gate-11 matrix.
- **A widened settings schema and firewall policy.** Accepted: `vaults` is additive and back-compatible, and the firewall change is a pure prefix-match branch (no new glob syntax), which is the cheapest possible parity-safe addition.

## Revisit when

- `merge` lands (Phase 3). Outcome: a new ADR for the merge conflict-resolution UX and how it interacts with single-active confinement (merge reads two vaults but must still only *write* the active one).
- A user needs project-scoped vault sets shared across machines. Outcome: decide whether the registry moves from per-project settings to a shared location, keeping `current_vault_path` the sole active pointer.
- The symlink/realpath parity proves insufficient against a new escape (e.g. hardlinks, case-folding filesystems). Outcome: extend the canonicalisation and add the case to the gate-11 fixtures, never relaxing the deny.

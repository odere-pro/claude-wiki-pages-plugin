# ADR-0016: Simultaneous multi-vault management — fail-closed registry, read-time audit roll-up, no ledger

- **Status:** Accepted (design accepted; Lane B implements PM.2/PM.1/PM.3 to this contract; merges
  before any PM.1 write path per N13)
- **Date:** 2026-06-05
- **SPEC anchor:** Brief §2 goals 3 (isolate data in separate vaults; manage multiple vaults in one
  project) + 8 (optimize context/memory for the harness — read-time roll-up of per-vault history); §5
  (one active vault; NO embeddings ever; DRY single-sourcing — "one mechanism per job, no second source
  of truth"; KISS/YAGNI); §6 (one mechanism per job — one resolver, one confinement-derivation path);
  decision #3 (one active vault with `add`/`remove`/`switch`); plan
  the SOFTWARE-3.0 deferred-work plan decisions N4, N8 (and N5 sub-rows), PM.1/PM.2/PM.3
- **Supersedes proposal:** the SOFTWARE-3.0 deferred-work plan (Phase M: PM.1, PM.2, PM.3) —
  records the signed-off design before any PM.1 write path is written. **Subsumes** the predecessor
  plan's separate multi-vault-ADR ask (PM.4 in the predecessor SOFTWARE-3.0 plan).

## Context

[ADR-0009](./ADR-0009-multi-vault-confinement.md) established the multi-vault foundation: a registry in
`.claude/claude-wiki-pages/settings.json` (`vaults: [{path, name}]`), **one active vault** named by the
single `current_vault_path` pointer, an `add`/`remove`/`switch`/`list` lifecycle on the
`set-vault.sh` seam, and a `cross-vault` deny in both firewall twins so a write to any inactive
registered vault is blocked allow-proof. Confinement is real and pinned by
`tests/gates/gate-11-firewall-parity.sh`. `scripts/resolve-vault.sh` is the **sole resolver** and stays
that way (ADR-0009: "the registry is a sidecar … never a new input to the most-tested function").

This run moves from *switch-only* to *simultaneous management of N vaults* and a *cross-vault audit
roll-up*, and it must close a live security gap. Three things drive an ADR rather than a routine feature:

1. **OQ-9 fail-OPEN is live today (the gap).** `_vaults_read` (`scripts/resolve-vault.sh:122-132`)
   swallows malformed registry JSON with a bare `except Exception: pass` and prints nothing. The firewall
   then derives an empty "other vaults" set, the `cross-vault` rule never fires, and the active vault
   stays writable — a **silent fail-OPEN**. A corrupt or inconsistent registry must yield **zero
   wiki-writable roots**, not a quietly-permissive one. This is fixed, not debated (plan "Guiding
   constraints"); resolution stays ADR-0009.

2. **The fix must live at the single derivation point, not be smeared across twins.** The temptation is
   to add a fail-closed branch independently to `src/core/firewall.ts` and `scripts/firewall.sh`, or to
   inject a sentinel string into the stdout that carries vault paths. Both fork the mechanism: the former
   duplicates logic the parity gate then has to police; the latter overloads a path-list contract with a
   magic value that downstream parsers must special-case.

3. **The audit roll-up must not become a second store.** "Who wrote what, when, in which vault" reads as
   "build an index," but the non-negotiables forbid a persisted ledger (veto V3): no `wiki/_audit/`, no
   cross-vault cache. The data already exists per vault (`wiki/log.md` + ADR-0010
   `source_type: agent-session` sessions); the roll-up must **fold it at read time** and leave every
   vault's working tree byte-identical.

## Decision

### Part A — N4/N5: OQ-9 fail-closed at the single derivation point (PM.2)

1. **`_vaults_read` exits non-zero on an untrustworthy registry.** It exits non-zero when the registry
   JSON is malformed **or** when the invariant `current_vault_path ∈ vaults[]` is violated
   (`current_vault_path ∉ vaults[]`), and it emits a **stderr warning** rather than failing silently
   (N5). The bare `except Exception: pass` (`scripts/resolve-vault.sh:130-131`) is replaced with an
   explicit non-zero exit. The fix lives **only** in `scripts/resolve-vault.sh` — the single
   confinement-derivation path — never as an independent branch added to either firewall twin.

2. **The fail-closed signal is an exit code, mapped to a token scoped inside `firewall.sh` (N4).**
   `firewall.sh` checks `_vaults_read`'s exit code; on non-zero it maps to a `__FAIL_CLOSED__` token that
   lives **only inside `firewall.sh`'s consumption point** and resolves to **zero writable roots** — not
   even the active vault is writable. The token is **never** emitted from `registry_other_vaults` into the
   path-list stdout (that stdout contract carries vault paths; a sentinel string there would have to be
   special-cased by every reader — a parallel mechanism). Exit codes are the channel; the token is an
   internal detail of one consumer.

3. **Default-fallback applies only when there is no registry to be inconsistent (N4).** When **no**
   `vaults` key is configured (a fresh or legacy single-vault project), the tier-4 default-fallback stays
   intact and the active vault is writable — there is nothing to be inconsistent with. Fail-closed fires
   only on a registry that exists but is malformed or violates the invariant. A configured-but-broken
   registry blocks; an absent registry behaves exactly as before.

4. **Surviving OQ-9 contributions folded in (N5).** `_vaults_read` warns on stderr (not silent);
   `set-vault.sh list` prints a WARN for an inconsistent registry; gate-11 gains the malformed-JSON case
   and the `current ∉ vaults[]` case as **two distinct fixture rows**, plus a registry-derived
   confinement fixture (N≥3 vaults, no `CLAUDE_WIKI_PAGES_OTHER_VAULTS` env override → writes to the
   non-active registered vaults BLOCKED, active ALLOWED), both twins agreeing. One ~M patch in
   `resolve-vault.sh` + the firewall exit-code check, not six independent line items.

### Part B — PM.1: registry selects, resolver confines; no parallel resolver

1. **`resolve-vault.sh` stays the sole resolver (ADR-0009 carried forward).** Managing N vaults adds no
   second resolution path. `resolve_vault()` still returns `current_vault_path` via its existing reader;
   the registry remains a sidecar that lifecycle commands maintain and the firewall reads. The division
   of labor is **registry selects, resolver confines**: the registry records the known set and which is
   active; the resolver + firewall twins enforce that writes land only in the active vault. A `grep` must
   confirm `resolve_vault` is the only resolver.

2. **One active vault, single pointer (decision #3, ADR-0009).** `current_vault_path` stays the **sole**
   active pointer; there is no second "active" flag. The active vault is derived as the registry entry
   whose `path` equals `current_vault_path`. Writes go only to it; the single-active write invariant is
   kept, not relaxed.

3. **Progressive disclosure of the registry shape.** `init_vault_settings` keeps the `vaults` key
   **absent** until the first `vault_add`; a fresh init produces a `settings.json` with no `vaults` key
   (and so behaves under the tier-4 default-fallback per Part A item 3). The registry shape — matching the
   comment at `scripts/resolve-vault.sh:107-118` — is frozen **once** in `docs/operations.md`, including
   the `current_vault_path ∈ vaults[]` invariant, so it is documented in exactly one place.

### Part C — N8/V3: read-time audit roll-up, no ledger (PM.3)

1. **The roll-up enumerates via `_vaults_read` directly — no `registry_all_vaults` wrapper (N8).**
   `_vaults_read` already emits all registered vaults, and `vault_list()` already iterates it; a
   `registry_all_vaults` wrapper would be a zero-filter alias (KISS/YAGNI). The roll-up calls
   `_vaults_read` (documented as a **semi-public reader**) and checks its exit code — so it inherits the
   N4 fail-closed signal for free.

2. **On a malformed registry the roll-up reports its OWN read-time status, NOT the firewall token (N8).**
   When `_vaults_read` exits non-zero, the roll-up reports a read-time "registry malformed" status with
   zero entries and a non-zero exit of its own. It does **not** surface the `__FAIL_CLOSED__` token —
   that token is a write-confinement detail scoped inside `firewall.sh` (Part A item 2), and a read-only
   reporter must not leak a write-boundary sentinel (`OBJ-skeptic-config-4-1`). Same underlying
   fail-closed registry; two different, appropriately-scoped surfaces — write path blocks, read path
   reports.

3. **It is a read-time fold with NO persisted artifact (V3 honored).** The roll-up aggregates each
   registered vault's `wiki/log.md` (+ ADR-0010 `source_type: agent-session` sessions) **at read time**,
   vault-tagged and date-sorted, exposed as a read-only `set-vault.sh cross-vault-log` subcommand
   (`--last N` limits per vault). Running it twice creates or modifies **no file under any vault's
   `wiki/`** (the acceptance check is an empty snapshot diff). There is **no `wiki/_audit/` ledger, no
   cross-vault cache, no persisted index** — the cut-list item "New `wiki/_audit/` ledger / persisted
   cross-vault roll-up index" stays cut. A vault with no `wiki/log.md` is skipped with a stderr WARN.

### Why NO persisted ledger and why NO-RAG (the §5/§11.1 line, recorded explicitly)

- **No persisted ledger (V3).** The data of record already lives per vault in `wiki/log.md` and ADR-0010
  sessions — both git-tracked, both single-sourced. A second persisted roll-up file would be a second
  source of truth that drifts from those logs (the §6 DRY failure). A read-time fold has exactly one
  source per fact and cannot drift; the working tree stays clean by construction.
- **NO-RAG.** Every Phase-M surface is **boolean conditions and set-math over structured config and
  log headings** — no inference, no similarity, no embeddings, no index. PM.2 is JSON parse-validity +
  set-membership (`current_vault_path ∈ vaults[]`) on a confinement boundary. PM.1 is a config registry +
  path-set derivation. PM.3 is a read-time fold over exact log fields (who / when / which vault / from
  what source). None reaches for a latent vector or a ranked similarity score; the absolute
  NO-embeddings non-negotiable holds by construction.

## Alternatives considered

- **Leave OQ-9 as-is (silent fail-OPEN).** Rejected — a corrupt registry currently leaves the active
  vault writable with no warning, the opposite of "one active vault, confined." Fail-closed is a
  non-negotiable for this run.
- **Add an independent fail-closed branch to each firewall twin.** Rejected (N4) — it duplicates logic
  the parity gate must then police and forks the single derivation path. The fix lives once, in
  `_vaults_read`; the twins only react to its exit code.
- **Inject a `__REGISTRY_MALFORMED__` (or empty-string) sentinel into `registry_other_vaults` stdout.**
  Rejected (N4, Grill veto) — the stdout contract carries vault paths; a magic value there forces every
  consumer to special-case it (config-1's stdout sentinel; senior-5's per-twin `--other-vaults`
  empty-string overload — a parallel mechanism). The signal is an exit code; the `__FAIL_CLOSED__` token
  lives only inside `firewall.sh`.
- **A `registry_all_vaults` wrapper for the roll-up to enumerate vaults.** Rejected (N8, KISS) —
  `_vaults_read` already emits all vaults and `vault_list()` already iterates it; the wrapper is a
  zero-filter alias. The roll-up calls `_vaults_read` directly and inherits the fail-closed exit signal.
- **Surface the firewall `__FAIL_CLOSED__` token from the read-time roll-up.** Rejected (N8) — that token
  is a write-confinement detail; a read-only reporter must report its own read-time status, not leak a
  write-boundary sentinel.
- **Persist the roll-up to a `wiki/_audit/` ledger or a cross-vault cache.** Rejected (veto V3) — a
  persisted artifact is a second source that drifts from the per-vault `wiki/log.md` + ADR-0010 sessions.
  The read-time fold has one source per fact and leaves the working tree unmodified (the snapshot-diff
  acceptance check).
- **Make resolution read the registry to choose the active vault, or add a second "active" flag.**
  Rejected (ADR-0009, carried forward) — `current_vault_path` already names the active vault; perturbing
  the most-tested resolver, or adding a second active flag, reintroduces the drift ADR-0009 closed.
- **Fan writes out to multiple vaults / relax single-active confinement.** Rejected (decision #3) — writes
  go only to the active vault; "manage N vaults" never means "write to N vaults." The registry records the
  set; the firewall confines to one root.
- **Ship vault `merge` as part of this work.** Rejected — `merge` conflict-resolution is design-accepted
  but implementation-deferred ([ADR-0012](./ADR-0012-vault-merge-conflict-resolution.md)); managing N
  vaults does not require it. The `vault registry` glossary row is corrected (plan PM.6) so it no longer
  lists `merge` as a shipped lifecycle op.

## Consequences

**Positive.**

- A malformed or inconsistent registry now yields **zero writable roots** — the OQ-9 fail-OPEN is closed
  at the single derivation point, with a stderr warning instead of silence, and both twins agree under
  gate-11.
- One resolver, one active pointer, one place documenting the registry shape (`docs/operations.md`) — the
  §6 one-mechanism discipline is preserved while N vaults become manageable.
- The audit roll-up gives the harness a deterministic, no-RAG, no-ledger view across registered vaults,
  reusing data that already exists (`wiki/log.md` + ADR-0010) and leaving every working tree clean.
- Write-boundary and read-report surfaces are cleanly separated: the firewall token blocks writes; the
  roll-up reports its own status. Neither leaks into the other.

**Negative.**

- **`_vaults_read` becomes a semi-public reader** (the roll-up depends on its exit-code contract).
  Accepted and documented as semi-public; its non-zero-on-untrustworthy contract is now part of the
  Phase-M surface, pinned by gate-11 fixtures.
- **A malformed registry blocks all writes (fail-closed is aggressive by design).** A user who corrupts
  `settings.json` finds writes blocked until they repair it. Accepted — that is the security posture the
  non-negotiable mandates; the stderr warning and `set-vault.sh list` WARN tell them why and where.
- **The roll-up re-reads every vault's log on each invocation (no cache).** Accepted — it is an on-demand
  read-only command, not a hot path; caching would re-introduce the forbidden persisted store (V3). The
  on-demand model also covers the need that the cut cross-vault SessionStart heartbeat (N14) would have
  served, without an O(N) scan on the single-vault hot path.

## Revisit when

- A profiling result shows the on-demand roll-up is too slow on a large registry. Outcome: bound the read
  (e.g. `--last N` defaults, time-window filters) **before** considering any cache; a persisted ledger
  remains barred by V3 unless a new ADR overturns it with a path-cited, Skeptic-surviving reason.
- Vault `merge` implementation begins. Outcome: it lands under ADR-0012, not here; this ADR's single-active
  invariant and fail-closed registry are inputs to it.
- The cut cross-vault SessionStart heartbeat (N14) is resurrected. Outcome: only behind an opt-in
  `docs/automation.md` flag, never a default SessionStart append; the on-demand roll-up (PM.3) is the
  default path.

## Glossary note (for Lane D)

This ADR uses `vault registry`, `active vault`, `vault lifecycle`, `per-vault write confinement`,
`registered vault roots`, `agent-session source`, and `read-time roll-up`. Per glossary-first (Brief §5),
confirm these rows exist in `docs/GLOSSARY.md` and **fix the `vault registry` `merge` drift** — the row
must not list `merge` as a shipped op (deferred to ADR-0012), with a note that "today only
`add`/`remove`/`switch`/`list` are supported" (plan PM.6). This ADR does not add the rows; Lane D owns
them.

## Related decisions

- [ADR-0009](./ADR-0009-multi-vault-confinement.md) — the registry + `cross-vault` confinement foundation
  this ADR extends; the sole-resolver and single-active invariants are carried forward unchanged.
- [ADR-0010](./ADR-0010-durable-memory-carve-out.md) — the `source_type: agent-session` sessions the
  read-time roll-up folds together with each vault's `wiki/log.md`.
- [ADR-0012](./ADR-0012-vault-merge-conflict-resolution.md) — vault `merge`, design-accepted but
  implementation-deferred; not part of this work and removed from the shipped-lifecycle glossary row.
- [ADR-0015](./ADR-0015-engine-self-description-surfaces.md) — the companion Phase-3 decision; both land
  at convergence per N13.

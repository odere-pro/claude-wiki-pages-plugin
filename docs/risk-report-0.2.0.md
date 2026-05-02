# Risk and gap report — v0.2.0

> **Scope.** Audit conducted on the v0.2.0 four-layer DX retrofit (commit `5adbc57`). This document tracks every gap surfaced by the audit that is **not** fixed in the same PR. Each row is a follow-up issue waiting to happen — open the matching test or PR and remove the row.
>
> **Status.** Implementation is ~95% complete against `/SPEC.md`. The retrofit shipped working code; this report enumerates what's untested, what's partial, and what's deferred so future contributors have a single punch list to work from.

## Priority key

- **P0** — ship-blocker (in spirit). The plugin works without these, but a regression in the affected area would not be caught by CI.
- **P1** — should fix soon. Real edge case; user-visible if hit.
- **P2** — nice-to-have. Cosmetic, ergonomic, or minor edge case.

---

## P0 — Untested behaviour in newly-shipped agents

### P0.1 — Orchestrator dispatch logic is untested

**Where.** `agents/llm-wiki-stack-orchestrator-agent.md` Steps 1–2 (state probe and the dispatch table). No corresponding `tests/scripts/orchestrator-agent.bats` exists.

**Risk.** A change to the dispatch table — for example, swapping the order of "raw_pending > 0" and "last_log_entry == ingest" rows — could misroute every user prompt and ship through CI green. The orchestrator is the entry point users now type by default; a misroute is the highest-blast-radius regression possible.

**Fix.** Add `tests/scripts/orchestrator-agent.bats` with at least five cases covering: (1) wizard branch (no `vault/CLAUDE.md`), (2) ingest branch (`raw_pending > 0`), (3) curator branch (`last_log_entry == "ingest"`), (4) analyst branch (analytical-verb prompt), (5) clarifying-question fallback (no row matches). Drive each case with a fixture under `tests/fixtures/orchestrator/` mocking the four probe inputs.

### P0.2 — Polish-agent idempotency contract is untested

**Where.** `agents/llm-wiki-stack-polish-agent.md` claims idempotency ("two runs produce zero diffs"). No `tests/scripts/polish-agent.bats` exists.

**Risk.** A regression in graph-color assignment (e.g. duplicating color entries on rerun) or in MOC consistency (e.g. re-appending children) could pass type-checking but break the contract. Idempotency is the single most testable property of polish; the absence of that test is the one most-likely-to-rot guarantee in v0.2.0.

**Fix.** Add `tests/scripts/polish-agent.bats` with at least three cases: (1) graph-color idempotency on a vault with N topic folders, (2) `wiki/index.md` refresh idempotency, (3) per-folder `_index.md` append-only behaviour (never delete, never reorder).

### P0.3 — Tier 4 prompt-injection corpus replay is stubbed

**Where.** `.github/workflows/adversarial.yml:52-59`. The corpus-replay job prints `[SKIP] prompt-injection corpus not yet fixtured` and exits 0.

**Risk.** Per [`docs/security.md`](./security.md) §Limitations and the root [`CLAUDE.md`](../CLAUDE.md), this is a known Phase E deferral — `garak` and `osv-scanner` already run weekly, but the targeted PI payload replay does not. Spec §14 says "Tier 4 — adversarial runs weekly," which is technically true but partially aspirational.

**Fix.** Land a corpus fixture under `tests/fixtures/adversarial/` (start with the well-known PI payload families: instruction-override, role-confusion, schema-spoofing). Wire `adversarial.yml` to replay each payload through the ingest agent and assert the schema validator blocks the malicious frontmatter shape. Scoring (pass/fail thresholds across the corpus) is the harder follow-up.

---

## P1 — Edge cases in supporting scripts

### P1.1 — `resolve-vault.sh` does not validate `settings.json`

**Where.** `scripts/resolve-vault.sh` Tier-2 lookup. The `awk` parser silently returns empty on malformed JSON (e.g. user-edited file with a trailing comma, merge conflict markers).

**Risk.** Silent fallback to auto-detect (Tier 3) and then to default (Tier 4) means the user can be operating against the wrong vault without any warning. Worst case: writes land in `docs/vault/` while the user thinks they're working on a custom-located vault.

**Fix.** Add a `tests/scripts/resolve-vault.bats` case for malformed `settings.json`. Optionally, gate the parser on `jq -e .` first and warn loudly if it fails.

### P1.2 — `session-start.sh` does not surface `mkdir` failure

**Where.** `scripts/session-start.sh` calls `init_vault_settings`. If `.claude/llm-wiki-stack/` cannot be created (read-only filesystem, permission denied, encrypted-volume edge cases), the function warns to stderr and returns 0.

**Risk.** Subsequent operations may behave inconsistently because settings did not persist. The user does not see a fatal error — only a warning that scrolls past on session start.

**Fix.** Add a `tests/scripts/session-start.bats` case running with `.claude/` as a read-only directory. Decide whether `mkdir` failure is fatal (exit 1, surface to user) or warn-and-continue (current behaviour). If warn-and-continue is intended, document the rationale inline in the script.

### P1.3 — `prompt-guard.sh` lacks a guard for empty `$VAULT`

**Where.** `scripts/prompt-guard.sh` calls `basename "$VAULT"` after `resolve_vault`. Per Tier 4 of the resolver, `$VAULT` should always have a value, but defense in depth would help.

**Risk.** If `resolve_vault` ever returns empty (regression, unusual environment), `basename ""` produces `.` and the script continues with broken assumptions.

**Fix.** Add `[ -n "$VAULT" ] || exit 0` after the `resolve_vault` call. One line, no behaviour change in the happy path.

---

## P2 — Cosmetic / ergonomic

### P2.1 — `/llm-wiki-stack:wiki-doctor` slash command has no test

**Where.** `commands/wiki-doctor.md` wraps `scripts/doctor.sh`. The script is tested via `tests/scripts/doctor.bats`; the command-level wrapping is not.

**Risk.** Trivial. The command is a thin pass-through. CLI-integration tests are deferred to Phase E anyway.

**Fix.** Add when Phase E lands (CLI integration tier).

### P2.2 — `validate-docs.bats` isolated-repo tests fail locally

**Where.** `tests/scripts/validate-docs.bats` tests 4, 6, 8 (the `_isolated_repo`-driven cases) fail outside CI. Confirmed pre-existing (fails on baseline `main` too); not introduced by v0.2.0.

**Risk.** Low. The script itself works correctly when run against the real repo (`bash scripts/validate-docs.sh` exits 0); only the synthetic isolated-repo test scaffolding diverges from what the script expects.

**Fix.** Audit `setup_isolated_repo` in `tests/test_helper/common.bash` against `validate-docs.sh`'s working-directory expectations. Possibly the helper does not commit a sufficient subset of the repo for the validator's path-walking to succeed.

### P2.3 — Vault auto-detect walks only 4 levels

**Where.** `scripts/resolve-vault.sh` auto-detect tier scans up to 4 levels above the working directory.

**Risk.** Users with deeply nested vaults (e.g. `monorepo/teams/research/projects/my-vault/docs/vault/`) hit the limit and silently fall through to the default.

**Fix.** Documented in [300 — Associate Module 6](./playbooks/300-associate.md) and [`docs/llm-wiki/01-getting-started.md`](./llm-wiki/01-getting-started.md). Optionally, raise the limit to 6 levels (covers most monorepo layouts) or make it configurable.

---

## Out of scope for this report

This report does not cover:

- Anything already documented in [`docs/security.md`](./security.md) §Limitations (cryptographic provenance, hook-script sandboxing, ingest-time secret scanning, confidence-score reliability, topic-tree placement quality). Those are design boundaries, not bugs.
- Anything in `docs/llm-wiki/migration-0.2.md` that already has a workaround (e.g. agent renames — workaround is the search-and-replace block in the migration doc).
- Style and formatting drift — handled by Tier 0 (`shellcheck`, `shfmt`, `markdownlint`).

## Closing the report

When all P0 rows are resolved, this file may be retired (or renamed `risk-report-0.3.0.md` with a fresh audit at the next minor). Until then, every PR that touches a row should remove the row in the same diff.

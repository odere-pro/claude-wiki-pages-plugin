# ADR-0005: Git-required per-vault init — one git seam, with a bun-absent availability shim

- **Status:** Accepted
- **Date:** 2026-06-04
- **SPEC anchor:** §4 (Data layer), §6 (Layer 4 — init/doctor); Brief §5 (Git is required), §11 decision #4

## Context

Decision #4 (roadmap rev5; Brief §5, §11) settled that **git is required**: every vault is its own
git repo with full history, `init` git-inits it, structural writes commit, and undo/checkpoints ride
git. The maintainer pre-settled the *what*. This ADR records the *how* — the mechanism item 6 uses to
realize that contract — and one deliberate deviation that needs its rationale on record.

Three facts constrain the implementation:

1. **One git seam already exists.** `src/core/git.ts:ensureRepo()` git-inits a directory with a
   non-empty initial commit, idempotently (`isRepo` guard), under a fixed bookkeeping identity with
   `commit.gpgsign=false` and `--no-verify`. It is already the git entry point for `propose`, `heal`,
   `migrate`, and the engine `doctor` (D05 "Vault under git", `src/commands/doctor/doctor.ts`). Item 6
   must reuse it, not fork a parallel git path (Brief §6 one-X).
2. **Bun is optional; git is not.** The engine (`src/core/git.ts` and all of `src/`) runs under Bun,
   but a bun-absent install is a supported degraded mode — `scripts/doctor.sh` and the engine both
   treat "no bun" as "hooks still work, engine commands disabled." Git, by contrast, is a hard
   dependency since decision #4. So the *primary* git seam (`engine.sh doctor --fix` → D05 →
   `ensureRepo`) is itself gated on a soft dependency.
3. **The vault can sit inside another repo.** `docs/vault-example/` lives inside the plugin repo, and
   a user's chosen vault can live inside their project repo. Git-initialising such a vault would nest
   a `.git`, which is wrong.

The tension: if git-init is bun-gated, a no-bun install scaffolds a vault that is **not** a repo —
silently violating decision #4. If it is not bun-gated, the only way to satisfy the contract without
bun is to run git porcelain from the shell, which superficially looks like the "second mechanism"
Brief §6 forbids.

## Decision

Realise git-required per-vault init through **one git contract with two availability tiers**, wired
into the existing scaffold step (`scripts/scaffold-vault.sh`) and mirrored by both doctors.

1. **Nesting guard first.** Before any git-init, `scaffold-vault.sh` runs
   `git -C <vault> rev-parse --is-inside-work-tree`; if the vault is already inside a work tree, it
   records `git=skipped(already-in-repo)` and does nothing. This single check protects both the
   plugin repo and a user's project repo from a nested `.git`.
2. **Primary seam — reuse `ensureRepo` via the engine.** When bun is present, the scaffold runs
   `engine.sh doctor --target <vault> --fix`, which routes through D05 to `ensureRepo`. This is the
   one git seam; the shell does not re-implement it.
3. **Bun-absent availability shim.** When bun is absent (or the engine `--fix` produced no repo on an
   empty vault), the scaffold falls back to a minimal `git init` + initial commit **that reproduces
   `ensureRepo`'s end state exactly** — same identity (`user.name=claude-wiki-pages`,
   `user.email=claude-wiki-pages@users.noreply.github.com`), same `commit.gpgsign=false`,
   `--no-verify --allow-empty`, same initial-commit message. It is annotated as the bun-absent path
   only and is reached only after the primary seam is unavailable.
4. **Doctor parity.** The Bash `doctor.sh` gains a git check mirroring TS D05: **git binary absent is
   fatal** (hard dependency), **vault-not-a-repo is advisory/NOTE** (matching D05's warn + `--fix`
   design, so fixtures that don't git-init still pass).

The shim is classed as an **availability shim, not a logic fork**: it changes *who runs git* (the
shell vs the engine) when bun is missing, never *what git contract* is produced. Behaviourally there
is one initial-repo state; there are two code paths to reach it only because the primary one depends
on an optional runtime.

## Alternatives considered

- **Make git-init bun-required; degrade gracefully (no repo) when bun is absent.** Rejected. It
  demotes a hard non-negotiable (git required, decision #4) to "best-effort when bun happens to be
  installed." A no-bun user would get a non-repo vault and lose the undo/checkpoint guarantees the
  whole durable-memory story rides on. The dependency direction is backwards: the hard requirement
  must not be gated on the soft one.
- **Move all git-init into the shell and drop the engine path.** Rejected. It abandons the existing
  one git seam (`ensureRepo`) that `propose`/`heal`/`migrate`/`doctor` already share, and would make
  the shell the source of truth for git bookkeeping — the inverse of the §6 contract. The engine path
  stays primary precisely so the common case uses the shared mechanism.
- **Port `ensureRepo` to a sourced shell library both the engine and scaffold call.** Rejected as
  scope for item 6: the engine is Bun/TS and cannot cheaply share a bash implementation, and rewriting
  the seam in shell to satisfy DRY would *create* the duplication it aims to remove. The narrower DRY
  fix (single-sourcing the identity constants) is tracked as a follow-up (see Consequences).
- **No ADR — rely on decision #4 plus code comments.** Rejected. Decision #4 records that git is
  required, not the shim carve-out, the nesting guard, or the rejected require-bun path. The "why is
  there parallel git porcelain in `scaffold-vault.sh`?" question needs a durable answer with its
  rejected alternative, which is what an ADR is for (`docs/adr/README.md`).

## Consequences

**Positive.**

- The git-required contract (decision #4) holds on **every** install, bun or not. A no-bun vault is
  still a repo with history, so undo/checkpoints/durable-memory work as specified.
- The common (bun-present) path uses the single `ensureRepo` seam; the shim is a clearly-scoped
  exception, annotated in `scaffold-vault.sh` and recorded here.
- The nesting guard makes the reference vault and user project repos safe from a nested `.git` in one
  check, ahead of both paths.
- Both doctors now agree on the git invariant (TS D05 ↔ Bash `doctor.sh`), closing the bash↔TS gap.

**Negative.**

- **Cross-language constant duplication (tracked).** The commit identity, flags, and initial-commit
  message are repeated by value in `src/core/git.ts` (module-private `COMMIT_IDENTITY`, not
  exportable to bash) and `scripts/scaffold-vault.sh`. They agree today; they can drift if one is
  edited alone. Mitigation/follow-up: single-source these three strings in a shell-readable file
  (e.g. `scripts/git-identity.sh` exporting `CWP_GIT_USER_NAME` / `CWP_GIT_USER_EMAIL` /
  `CWP_INITIAL_COMMIT_MSG`), sourced by the shim, with `git.ts` reading the same via env and the
  current literals as fallback. Filed as a Phase-U DRY item; not blocking item 6 because the values
  are currently identical and the shim is bun-absent-only.
- **Two git code paths to test.** The bun-present (engine) and bun-absent (shim) paths must both be
  covered. Mitigation: a Tier-1 bats fixture exercises the shim with bun off-PATH so the fallback
  cannot rot untested.
- **`doctor.sh` git-binary-absent reuses exit code 1.** Code 1 already means "vault path
  unresolvable" in the header ladder; the behaviour (fatal) is correct but the ladder comment must be
  updated so the mapping stays honest.

## Revisit when

- The engine grows a portable, shell-callable git helper (or the project adopts a single git-identity
  source both languages read). Outcome: collapse the shim to call the shared seam and delete the
  duplicated constants — removing the only DRY debt this ADR accepts.
- Bun (or another single runtime) becomes a hard install dependency. Outcome: drop the bun-absent
  shim entirely; the engine path becomes the only path and this ADR is superseded.
- A user reports a nested `.git` despite the guard (e.g. a vault added to a repo *after* scaffolding).
  Outcome: extend the guard to a doctor-time re-check, and add the case to the bats fixtures.

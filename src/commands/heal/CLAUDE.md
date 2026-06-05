# heal — git-bounded automatic self-heal

`heal` is the fully automatic `verify → fix → re-verify` loop: no approval
prompts, because its safety comes from git rather than from asking. Before
changing anything it writes a checkpoint commit capturing the current state, then
runs [`fix`](../fix/CLAUDE.md) and re-runs [`verify`](../verify/CLAUDE.md) until the
verifier is clean or stops making progress, bounded by a default of five
iterations. On success the auto-fixes land in a single `heal:` commit (rollback =
`git revert <heal>`); on non-convergence the checkpoint is left in place and the
unresolved error findings are surfaced for a curator or human. The loop in
[`heal.ts`](./heal.ts) composes the two verbs and the git helpers in
[`../../core/git.ts`](../../core/git.ts); it never spins forever.

## Input and flags

- `claude-wiki-pages heal` — heal the resolved vault.
- `--target <vault>` — explicit vault path.
- `--json` — emit the structured `HealReport`.

Programmatic options (`maxIterations`, `checkpointBranch`, `opId`, `isoTime`,
`today`) are injectable for deterministic tests; the wall clock supplies the
defaults.

## The loop

1. `verify` once. If `errors === 0`, return a no-op — no `ensureRepo`, no commit,
   no git churn at all.
2. `ensureRepo` + `checkpoint` (a `checkpoint:` commit, optionally a checkpoint
   branch) capturing the pre-heal state.
3. Repeat up to `maxIterations`: run `fix`, re-run `verify`. Break when
   `errors === 0` (converged) or `fix` reported `changed === 0` (no progress — stop
   rather than spin).
4. On a clean result with changes: `appendLog` the operation via
   [`../../core/log.ts`](../../core/log.ts), then `commitHeal` into one revertible
   `heal:` commit. Push only when `gitCheckpoint.push === "auto"`.
5. On non-convergence: leave the checkpoint, collect the residual error-severity
   findings into `unresolved`.

## Configurable aggressiveness

The iteration cap and git behavior are read from the effective config (see
[`../config/CLAUDE.md`](../config/CLAUDE.md)): `autoHeal.maxIterations`,
`autoHeal.aggressiveness` (`mechanical` / `structural` / `aggressive`), and
`gitCheckpoint.push` (`off` / `auto`). The `--target`-driven CLI uses the loaded
config for the push decision; tests inject `maxIterations` directly.

## HealReport

```ts
interface HealReport {
  command: "heal";
  vault: string;
  errorsBefore: number;
  errorsAfter: number;
  iterations: number;
  clean: boolean;
  checkpoint: string | null;   // pre-heal checkpoint SHA
  healCommit: string | null;   // the squashed heal commit SHA
  changes: readonly FixChange[];
  unresolved: readonly string[]; // residual error messages when not clean
}
```

The router prints the `errors N → M in K iteration(s)` line, the checkpoint and
rollback hint, and either `OK: vault is clean` or the `UNRESOLVED (needs
curator/human)` list. Exit code is `0` when `clean`, else `1`.

## Edge cases

- An already-clean vault is a pure no-op: `iterations === 0`, `checkpoint === null`,
  and no new commits land (the test asserts the git log is unchanged).
- Non-convergence is by design recoverable — `unresolved` is exactly the
  judgment-needing findings [`fix`](../fix/CLAUDE.md) deliberately does not touch.
- Commits use an internal identity with GPG signing disabled, so a CI runner with
  no `user.name` (or `commit.gpgsign=true`) never blocks the loop.

## Covered by

- [`heal.test.ts`](./heal.test.ts) — checkpoint → fix → commit drives errors to
  zero, and a clean vault is a no-op with no git churn.

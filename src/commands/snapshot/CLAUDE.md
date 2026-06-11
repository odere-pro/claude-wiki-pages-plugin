# snapshot — git-bound an LLM write phase

`snapshot` extends the git-checkpoint guarantee to write phases that happen
OUTSIDE the engine. The engine verbs ([`heal`](../heal/CLAUDE.md),
[`migrate`](../migrate/CLAUDE.md), [`propose`](../propose/CLAUDE.md)) checkpoint
their own writes; the LLM write phases — ingest, curator judgment fixes, polish —
edit the vault through Claude's tools with no engine in the loop. Agents call
`snapshot pre` before such a phase and `snapshot post` after it, so every vault
mutation lands in a revertible commit. The handler in
[`snapshot.ts`](./snapshot.ts) composes the [`git.ts`](../../core/git.ts)
helpers; agents reach it through the degradation wrapper
[`../../../scripts/snapshot.sh`](../../../scripts/snapshot.sh), which falls back
to inline git when Bun is absent.

## Subcommands and flags

- `claude-wiki-pages snapshot pre [--target <vault>] [--op <id>]` — `ensureRepo`,
  then a checkpoint commit under the configured `gitCheckpoint.mode` (`branch` /
  `both` additionally pin a `cwp/checkpoint/<opId>` branch).
- `claude-wiki-pages snapshot post [--target <vault>] [--op <id>] [--label <msg>]`
  — commit whatever the phase wrote as `snapshot: <label> <opId>`. A clean vault
  skips (`reason: "clean"`) — never an empty commit. Push only when
  `gitCheckpoint.push === "auto"`.
- `--json` — emit the structured `SnapshotReport`.

`opId` and `isoTime` are injectable on the programmatic API for deterministic
tests; the wall clock supplies the defaults.

## Semantics

- **Reports, never gates.** The CLI always exits `0` (only a missing subcommand
  is a usage error, exit `2`). A snapshot failure must never block a write
  phase — git coverage is a safety net, not a gate.
- **`gitCheckpoint.mode: off`** skips both subcommands entirely
  (`reason: "gitCheckpoint.mode=off"`).
- **Pathspec-scoped.** All staging and commits are confined to the vault
  (`-- .`), so a vault inheriting the parent project repo never swallows the
  user's unrelated dirty or staged files.
- **`post` self-repairs coverage**: if the vault is somehow not in a work tree
  (pre skipped, degraded path), it runs `ensureRepo` before deciding cleanliness.

## SnapshotReport

```ts
interface SnapshotReport {
  command: "snapshot";
  sub: "pre" | "post";
  vault: string;
  mode: "commit" | "branch" | "both" | "off";
  sha: string | null;      // checkpoint (pre) or write commit (post)
  skipped: boolean;
  reason: string | null;   // "clean" | "gitCheckpoint.mode=off" | null
  message: string;
}
```

## Covered by

- [`snapshot.test.ts`](./snapshot.test.ts) — pre checkpoint, post commit with
  label, clean skip, mode=off no-op, and the inherited-parent-repo scoping
  fixture (user files never swallowed).
- [`../../../tests/scripts/snapshot.bats`](../../../tests/scripts/snapshot.bats)
  — the wrapper's bun-absent fallback, mode=off, and label propagation.

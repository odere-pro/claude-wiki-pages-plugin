# fix — bounded, idempotent structural repair

`fix` repairs the safe structural drift [`verify`](../verify/CLAUDE.md) reports —
and nothing else. It is bounded on purpose: it touches only what has exactly one
correct value, so the repair is mechanical, not a judgment call. Three operations
qualify — dedupe duplicate `index.md` bullets, create a missing `_index.md` stub,
and sync an `_index.md` `children:` list to its folder's actual pages. Anything
that needs a decision (schema_version, plain-string sources, body prose,
synthesis) is left untouched for the curator agent or a human. The handler in
[`fix.ts`](./fix.ts) is thin; the deterministic builders live in
[`../../core/moc-build.ts`](../../core/moc-build.ts).

## Input and flags

- `claude-wiki-pages fix` — repair the resolved vault (four-tier resolution via
  [`resolveVault`](../../core/vault.ts)).
- `--target <vault>` — explicit vault path.
- `--json` — emit the structured `FixReport`.

A `today` date is injectable on the programmatic API for deterministic tests; the
CLI defaults it to the current ISO day, stamped into any newly created
`_index.md`.

## The three repairs

| Action | Builder | What it does |
| --- | --- | --- |
| `dedupe-index` | `dedupeIndexLinks` | Drops duplicate `[[Target]]` bullet lines from `index.md`, keeping the first of each. |
| `create-index` | `buildIndexStub` | Writes a minimal schema-shaped index under the FOLDER NOTE name (`<folder>/<folder>.md`, never `_index.md`) for any indexable topic folder lacking one. An existing legacy `_index.md` is accepted, never renamed — that is `migrate`'s job. |
| `sync-children` | `syncChildren` | Rewrites the `children:` frontmatter list of each `_index.md` to the folder's actual page titles. |

All three are defined in [`../../core/moc-build.ts`](../../core/moc-build.ts). Body
prose — the human or LLM-authored `## Pages` descriptions, synthesis — is never
rewritten; only the structural frontmatter list and duplicate index bullets, which
have one correct value. The `_sources/` and `_synthesis/` subtrees are excluded
from index creation.

## Idempotency guarantee

Running `fix` twice produces no change on the second pass: every builder returns
byte-identical output when its input is already correct, and the create step is
gated on absence. This is a hard contract — the [`heal`](../heal/CLAUDE.md) loop's
termination and the polish-agent's no-op-on-clean behavior both depend on it. The
test suite asserts it directly: fix a dirty vault, fix it again, expect
`changed === 0`.

## FixReport

```ts
interface FixReport {
  command: "fix";
  vault: string;
  changes: readonly FixChange[]; // { file, action }
  changed: number;               // === changes.length
}
```

Unlike [`verify`](../verify/CLAUDE.md), `fix` returns its own `FixReport`, not the
shared [`Report`](../../core/report.ts). The router prints one `FIXED [action]
file` line per change (or `nothing to repair`) and always exits `0` — `fix` is a
best-effort repair, not a gate.

## Edge cases

- A vault with no `wiki/` directory returns an empty report (`changed === 0`).
- Index dedupe only fires on lines whose payload is a single `[[wikilink]]`
  bullet, so prose mentioning a wikilink inline is never disturbed.
- `fix` does not git-checkpoint on its own; the revertible path is
  [`heal`](../heal/CLAUDE.md), which wraps `fix` in a checkpoint commit.

## Covered by

- [`fix.test.ts`](./fix.test.ts) — repair clears verify errors, idempotency on a
  second run, and no-op on an already-clean vault.

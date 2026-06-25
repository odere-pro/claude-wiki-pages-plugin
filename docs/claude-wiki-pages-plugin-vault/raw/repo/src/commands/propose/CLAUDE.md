# propose — human-in-the-loop draft lifecycle

`propose` is the review surface for the `_proposed/` channel: the place where
drafted pages wait for a human (or curator) to accept or discard them before they
enter the wiki. Drafting — by a local model or any other writer — lands proposals
in `vault/_proposed/`, mirroring their eventual `wiki/` path. Because `_proposed/`
is a sibling of `wiki/`, it sits outside every wiki-scoped hook and
[`verify`](../verify/CLAUDE.md), so drafts are not schema-bound until promoted.
`propose` exposes three subcommands over that channel — list, promote, discard —
each tracking `proposed_by` provenance. The handler in [`propose.ts`](./propose.ts)
composes frontmatter parsing, git, and the log.

## Subcommands and flags

- `claude-wiki-pages propose review` — list pending drafts with a lightweight
  readiness check (the default subcommand).
- `claude-wiki-pages propose approve --file <draft>` — promote a draft into
  `wiki/` under a git checkpoint.
- `claude-wiki-pages propose reject --file <draft>` — delete a draft under a git
  checkpoint.
- `--target <vault>` — explicit vault path.
- `--json` — emit the structured `ProposeReport`.

`approve` and `reject` require `--file`; the path may be absolute or
vault-relative.

## The lifecycle

| Subcommand | Effect |
| --- | --- |
| `review` | Lists every draft under `_proposed/`, each with `ready` (has a type and a source where required, and sits under `_proposed/wiki/`) and an `issues` list. Read-only. |
| `approve` | Rewrites frontmatter (`status: active`, drops `proposed_by`, stamps `updated`), writes the page to its mirrored `wiki/` path, deletes the draft, logs, commits. |
| `reject` | Deletes the draft, logs, commits. |

Readiness is a lightweight gate, not full schema validation — the real validation
runs when the curator heals the vault after promotion. A draft not under
`_proposed/wiki/` cannot be promoted.

## Provenance

`proposed_by` records who drafted the page (e.g. a local model). It is surfaced in
`review` and deliberately dropped on `approve` — a promoted page is wiki content,
no longer a proposal. The promotion is recorded via
[`../../core/log.ts`](../../core/log.ts) so the operation leaves a trace.

## Git-bounding

Both `approve` and `reject` run `ensureRepo` + `checkpoint` (from
[`../../core/git.ts`](../../core/git.ts)) before any write, then commit the change —
reversible with `git revert`. Push happens only when `gitCheckpoint.push ===
"auto"` (see [`../config/CLAUDE.md`](../config/CLAUDE.md)). After an `approve`, the
caller should run the maintenance loop (curator [`heal`](../heal/CLAUDE.md) +
polish).

## ProposeReport

```ts
interface ProposeReport {
  command: "propose";
  sub: "review" | "approve" | "reject";
  vault: string;
  drafts: readonly DraftInfo[];   // populated by `review`
  promoted: readonly string[];    // populated by `approve`
  rejected: readonly string[];    // populated by `reject`
  checkpoint: string | null;
  message: string;
}
```

The router lists `[ready]`/`[hold]` drafts for `review` and prints the message for
`approve`/`reject`. Exit code is `1` when the message reports `not found` or
`requires --file`, else `0`.

## Edge cases

- An empty `_proposed/` directory yields `no pending drafts` — not an error.
- A missing `--file` or a non-existent draft path is a soft failure (exit `1`)
  with an explanatory message.
- `proposed_by`, `status`, and `updated` are handled idempotently on promotion:
  absent fields are appended, present ones rewritten.

## Covered by

- [`propose.test.ts`](./propose.test.ts) — review listing, approve promotion with
  frontmatter rewrite, reject deletion, and the checkpoint commits.

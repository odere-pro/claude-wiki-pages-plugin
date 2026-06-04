---
name: review
description: >
  Review drafted wiki pages and promote or reject them. Trigger when the user
  wants to "review proposals/drafts", "approve/reject a draft", check what a
  local model produced, or invokes /claude-wiki-pages:review. Operates on
  vault/_proposed/; promotion runs under a git checkpoint and then chains the
  maintenance loop. The human-in-the-loop gate for any drafted content.
allowed-tools: Bash Read Write Edit Glob Grep
---

# LLM Wiki — Review

The human-in-the-loop gate. Drafts (from a local model, or any source) land in
`vault/_proposed/`, mirroring their eventual `wiki/` path. Nothing reaches the
wiki until a human approves it here.

## The `_proposed/` + `proposed_by` contract

This contract is the single review channel for all drafted content
(`src/commands/propose/propose.ts`). There is **exactly one `_proposed/`
channel** — no second draft mechanism exists.

### Directory layout

Drafts live at `vault/_proposed/wiki/<topic>/<page>.md`, mirroring the
target path they would occupy in `vault/wiki/<topic>/<page>.md`.
`_proposed/` is a sibling of `wiki/` inside the vault root.

```
vault/
├── wiki/                  # live wiki pages
│   └── <topic>/<page>.md
└── _proposed/             # staging area — outside all wiki-scoped checks
    └── wiki/
        └── <topic>/<page>.md  # mirrors the target wiki/ path
```

### Frontmatter on a draft

Every draft carries:

- `status: draft` — marks the page as not yet in the wiki.
- `proposed_by: "<source>"` — records what produced the draft (e.g.
  `"ollama:llama3"`, `"claude"`, `"local-ingest-stub"`). **Dropped on
  promotion** — the promoted page carries no `proposed_by` field.

### Outside every wiki-scoped check

Because `_proposed/` is a sibling of `wiki/`, every wiki-scoped hook
and gate (`validate-frontmatter.sh`, `check-wikilinks.sh`, lint,
`verify-ingest.sh`, the source-index) treats drafts as out-of-scope
until promotion. Drafts cannot pollute the wiki.

### Promotion (approve)

`propose approve` is the **only sanctioned promotion path**. Do not
hand-copy draft content into `wiki/` — that bypasses the checkpoint and
the frontmatter rewrite. On approval, the engine:

1. Moves the file from `_proposed/wiki/…` to `wiki/…`.
2. Sets `status: active`.
3. Drops `proposed_by`.
4. Stamps `updated` with today's date.
5. Commits the change as a git checkpoint → fully reversible via
   `git revert <sha>`.

### Rejection

`propose reject` deletes the draft under a git checkpoint. Reversible
via `git revert <sha>`.

### Who uses this channel

All drafted content routes through this one channel:

- Local-model drafts (`/claude-wiki-pages:draft`, `localModel.enabled`).
- Durable-memory write-backs (`source_type: agent-session`, C4-write).
- Local-ingest stub (`local-ingest-stub`, Pc).

## When to invoke

- The user asks to review/approve/reject drafted pages.
- A local-model `draft` run (`/claude-wiki-pages:draft`) has produced proposals.
- The orchestrator detected pending drafts in `_proposed/`.

## How to run

List what's pending and how ready each draft is:

```sh
bash scripts/engine.sh propose review --target <vault> --json
```

Each draft reports its `target` (where it would land in `wiki/`), `proposedBy`,
and a readiness check (`ready`, plus `issues` like `no sources`). Present this to
the human and let them choose per draft.

**Promote** an approved draft (sets `status: active`, drops `proposed_by`, stamps
`updated`, all under a git checkpoint):

```sh
bash scripts/engine.sh propose approve --target <vault> --file _proposed/wiki/<topic>/<page>.md --json
```

**Reject** a draft (deletes it under a git checkpoint):

```sh
bash scripts/engine.sh propose reject --target <vault> --file _proposed/wiki/<topic>/<page>.md --json
```

## After approval — close the loop

Promotion only moves the file; it does not validate the wider graph. After
approving one or more drafts, run the maintenance loop so the new pages are
healed and indexed:

1. Curator heal — `bash scripts/engine.sh heal --target <vault>` (or dispatch
   `claude-wiki-pages-curator-agent`).
2. Polish — graph colors, vault MOC, per-folder MOC (the
   `claude-wiki-pages-polish-agent`).

`propose approve` returns `next: "curator heal + polish"` as a reminder.

## Safety

- `_proposed/` sits outside `wiki/`, so drafts are never linted, indexed, or
  cited until promoted — they cannot pollute the wiki.
- Every approve/reject is a git checkpoint; rollback is `git revert <sha>`.
- Promotion is the only path from a draft to the wiki. Do not hand-copy draft
  content into `wiki/` — that bypasses the checkpoint and the frontmatter rewrite.
- Schema authority for this section: `docs/vault-example/CLAUDE.md`
  ("Drafts and review (`_proposed/`)"). This skill aligns with it and does not
  override it.

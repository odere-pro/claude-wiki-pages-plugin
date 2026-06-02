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

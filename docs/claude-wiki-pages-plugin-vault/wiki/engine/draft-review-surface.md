---
title: "Draft Review Surface"
type: concept
aliases: ["Draft Review Surface", "propose verb", "review approve reject", "draft promotion"]
parent: "[[engine-index|Engine — Index]]"
path: "engine"
sources: ["[[propose-ts-source|propose.ts Source]]", "[[engine-api-skill|Engine API Skill (SKILL.md)]]", "[[llm-software-3-0|SOFTWARE-3-0: Dual Entry Point]]"]
related: ["[[deterministic-engine|Deterministic Engine]]", "[[engine-verb-surface|Engine Verb Surface]]", "[[git-checkpoint|Git Checkpoint]]", "[[dual-entry-point|Dual Entry Point]]", "[[dashboard-write-gate|Dashboard Write Gate]]"]
contradicts: []
supersedes: []
depends_on: ["[[git-checkpoint|Git Checkpoint]]"]
tags: ["engine", "drafts", "review", "propose"]
created: 2026-06-13
updated: 2026-06-13
update_count: 2
status: active
confidence: 1.0
---

# Draft Review Surface

## Definition

The Draft Review Surface is the `propose` engine verb that implements a human-in-the-loop gate for drafted wiki pages. Drafts live under `vault/_proposed/wiki/<topic>/<page>.md` — a staging area outside `wiki/`, so they bypass all schema validation, wikilink checks, and verify until promoted. `propose approve` is the only sanctioned path to move a draft into `wiki/`; hand-copying is explicitly prohibited.

## Key Principles

- **Outside-wiki staging**: `_proposed/` is a sibling of `wiki/`, not a child. This puts drafts outside every wiki-scoped check, so a draft with missing frontmatter or dangling wikilinks cannot pollute the live vault.
- **Three subcommands**: `review` (list drafts + readiness check), `approve --file P` (promote with git checkpoint), `reject --file P` (delete with git checkpoint).
- **Readiness check (lightweight)**: a draft is `ready: true` when it has a `type` and at least one `sources:` entry (for types that need sources). Issues are surfaced per-draft in `review` output.
- **Promotion rewrite (`promoteFrontmatter`)**: on approve, `status:` is set to `active`, `proposed_by:` is dropped, and `updated:` is stamped. No other frontmatter is modified.
- **Git-bounded operations**: both `approve` and `reject` take a checkpoint before writing. Rollback is `git revert <checkpoint>`.
- **Post-approve duty**: after promoting a draft, the caller should run curator (heal + polish) — the draft is now a live wiki page and needs to be indexed and linted.
- **Mirror path convention**: draft path mirrors the eventual wiki path — `_proposed/wiki/engine/draft.md` promotes to `wiki/engine/draft.md`.

## Examples

```bash
# Review pending drafts
bash scripts/engine.sh propose review --target <vault> --json

# Approve (promotes and checkpoints)
bash scripts/engine.sh propose approve --file _proposed/wiki/engine/draft.md --target <vault>

# Reject (deletes and checkpoints)
bash scripts/engine.sh propose reject --file _proposed/wiki/engine/draft.md --target <vault>
```

## Related Concepts

- [[git-checkpoint|Git Checkpoint]] — the pre-operation checkpoint that makes approve/reject revertible
- [[engine-verb-surface|Engine Verb Surface]] — the full set of engine verbs this `propose` verb is part of
- [[deterministic-engine|Deterministic Engine]] — the engine providing this review surface

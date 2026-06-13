---
title: "propose.ts Source"
type: source
source_type: manual
source_format: text
url: ""
author: ""
publisher: "claude-wiki-pages project"
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["engine", "typescript", "propose", "drafts"]
aliases: ["propose.ts Source"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# propose.ts Source

## Summary

`src/commands/propose/propose.ts` implements the human-in-the-loop review surface for drafted pages. Drafts live under `_proposed/wiki/<topic>/<page>.md` — outside `wiki/`, so unvalidated until promoted. `review` lists pending drafts with a lightweight readiness check; `approve --file P` promotes a draft under a git checkpoint; `reject --file P` deletes it under a checkpoint. `promoteFrontmatter()` stamps `status: active`, drops `proposed_by`, and updates `updated:`. All operations are git-bounded.

## Key Claims

- `PROPOSED_DIR = "_proposed"` — the staging area, sibling to `wiki/`.
- `ProposeSub` is `"review" | "approve" | "reject"`.
- `DraftInfo.ready` is true when the draft has a `type` and at least one `sources:` entry (for types that need it).
- `TYPES_NEEDING_SOURCES = {entity, concept, topic, project, synthesis, source}` — checked during readiness.
- `promoteFrontmatter()` filters out `proposed_by:` lines and rewrites `status:` and `updated:`.
- `approve` requires the draft to be under `_proposed/wiki/`; otherwise returns an error message.
- A git checkpoint is taken before each approve/reject (`applyCheckpointMode`); rollback is `git revert`.
- `gitCfg.push === "auto"` triggers push after commit.
- After an `approve`, the caller should run curator (heal + polish).

## Entities Mentioned

- [[Deterministic Engine]]
- [[Git Checkpoint]]

## Concepts Covered

- [[Draft Review Surface]]
- [[Engine Verb Surface]]

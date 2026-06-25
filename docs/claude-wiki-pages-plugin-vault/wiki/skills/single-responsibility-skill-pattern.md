---
title: "Single-Responsibility Skill Pattern"
type: concept
aliases: ["Single-Responsibility Skill Pattern", "single-responsibility skills", "skill decomposition"]
parent: "[[skills|Skills]]"
path: "skills"
sources: ["[[skills-ingest|Ingest Skill — SKILL.md]]", "[[skills-lint|Lint Skill — SKILL.md]]", "[[skills-fix|Fix Skill — SKILL.md]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["skills", "layer-2", "design-pattern", "single-responsibility"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 0.9
---

# Single-Responsibility Skill Pattern

A design principle in claude-wiki-pages Layer 2 where each skill owns exactly one verb in the pipeline — read, write, audit, repair, export — and explicitly refuses to do the adjacent verb.

## Definition

Each skill in Layer 2 defines its own reading contract (what it may read), writing contract (what and where it may write), and a hard list of what it MUST NOT do. These boundaries prevent a skill from silently doing more than the user asked for and make the pipeline composable: agents can invoke the right skill for each step without side effects leaking across steps.

## Key Principles

- **One verb, one skill**: `ingest` processes sources; `lint` audits; `fix` repairs; `synthesize` writes synthesis notes; `search` returns ranked candidates; `query` answers questions. None of these verbs do each other's work.
- **Explicit MUST NOT clauses**: each skill declares what it will never do. `lint` never repairs. `fix` never invents sources or deletes pages. `synthesize` never edits existing synthesis notes. `query` never mutates wiki pages.
- **Completion signals**: each skill emits exactly one `READY:`, `SYNCED:`, or `FAILED:` signal so the calling agent knows the outcome without parsing logs.
- **Separation of repair from audit**: the `lint` + `fix` pairing keeps the audit read-only and the repair idempotent. The curator agent orchestrates the cycle — it does not merge them.

## Examples

- `ingest` is "the middle third" of what the ingest agent does. The agent wraps it with post-ingest lint-fix and optional synthesis; the skill provides only the extraction and writing step.
- `status` enforces its own non-mutation invariant by comparing `git status vault/` before and after; if the vault changed, that is a skill bug, not an edge case.
- `fill-gaps` orchestrates existing capabilities (ingest, curator, polish agents) and adds no new write logic of its own.

## Related Concepts

The pattern is implemented across all 25 skills in the Skills topic. It constrains the `[[skill-ingest-pipeline|Ingest Pipeline Skill]]` (which documents the multi-step pipeline) and the `[[skill-maintain-contract|Maintain Contract Skill]]` (which sequences the verbs safely).

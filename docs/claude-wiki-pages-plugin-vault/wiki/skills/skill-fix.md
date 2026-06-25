---
title: "Fix Skill"
type: entity
entity_type: tool
aliases: ["Fix Skill", "fix", "/claude-wiki-pages:fix"]
parent: "[[skills|Skills]]"
path: "skills"
sources: ["[[skills-fix|Fix Skill — SKILL.md]]"]
related: []
tags: ["skills", "layer-2", "fix", "repair"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Fix Skill

The `fix` skill applies the repairs that `/claude-wiki-pages:lint` identified, idempotent — running it twice produces no diff.

## Overview

Fix is the second half of the lint-fix cycle. It expects a fresh lint report in context, or runs its own lint pass internally. Every repair it applies must be safe to run twice: re-running lint after fix shows strictly fewer or equal errors; re-running fix on the result produces zero file modifications.

Invocation triggers: user asks to fix lint errors; curator agent orchestrating lint → fix → lint cycle; user wants to fix without a prior lint pass.

## Key Facts

**Authorized repairs** (table):

| Finding | Repair |
|---|---|
| Missing required frontmatter | Backfill with schema default; if no sane default, escalate |
| Dangling wikilink | Rewrite to nearest matching alias, or comment out with `<!-- unresolved: ... -->` |
| Plain-string `sources:` | Wrap in `[[wikilink]]` if source page exists; else flag |
| Missing `parent` / `path` | Derive from file location under `wiki/` |
| MOC missing member | Add to `children:` / `child_indexes:` as quoted `"[[wikilink]]"` |
| Missing folder note | Create at `<folder>/<folder>.md` (`type: index`); never create a new `_index.md` |
| Legacy `_index.md` | Leave in place — `engine.sh migrate --write` renames it |
| Banned legacy value | Rewrite `type: moc` → `type: index`; `child_mocs:` → `child_indexes:` |
| Strict-tree drift | Run `strict-tree-reduce.sh --apply` — never hand-rewrite links |
| Vault MOC drift | Escalate to `/claude-wiki-pages:index`; never edit `wiki/index.md` directly |

**What fix never does**: repair contradictions (needs human judgment); invent a `sources:` entry when none exists; delete an orphan page.

**Completion signal**: `READY: repaired <N>, deferred <M>. Re-lint: <K> errors (was <E>).`
If `K >= E`: `FAILED: fix pass did not reduce error count. Inspect deferred items.`

## Related

Pairs with `[[skill-lint|Lint Skill]]` (provides the findings) and the curator agent (orchestrates the cycle).

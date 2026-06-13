---
title: "Auto-Heal"
type: concept
aliases: ["Auto-Heal", "auto-heal", "automatic repair", "self-heal"]
parent: "[[Wiki Engine]]"
path: "engine"
sources: ["[[User Guide 04: Review Validate Fix]]", "[[Architecture Documentation]]", "[[Features]]", "[[Operations Guide]]", "[[Wiki Pages Skill (maintain-contract SKILL.md)]]"]
related: ["[[Curator Agent]]", "[[Lint Rules]]", "[[Git Checkpoint]]", "[[Deterministic Engine]]", "[[Maintain Contract]]"]
tags: ["concept", "curator", "repair"]
created: 2026-06-13
updated: 2026-06-13
update_count: 5
status: active
confidence: 1.0
---

# Auto-Heal

> [!summary]
> Auto-heal is the mechanical fix step of the curator agent. It applies safe structural repairs without user approval because safety is git revert — every auto-heal change lands in a reversible commit. Judgment fixes (restructures, near-duplicate merges, large folder reorganizations) are applied automatically under the checkpoint because they are also reversible. The engine runs first (`engine.sh heal`), then the agent handles judgment items.

## Definition

Auto-heal is the repair phase that follows lint diagnosis. The [[Curator Agent]] collects all issues, classifies them into auto-fixable and judgment categories, then applies fixes in phases. The [[Git Checkpoint]] safety model means no approval gate is needed: every change is revertible with `git revert <sha>`.

## What Auto-Heal Applies (No Approval Needed)

The nine safe, idempotent, content-preserving auto-fixes applied in order:

1. **Wrap plain-string `sources:`** in wikilinks (e.g. `"ADR-0001"` → `"[[ADR-0001: Four-Layer Orchestrator]]"`)
2. **Fill missing `parent:`/`path:`** derived from the folder location
3. **Add `title` to `aliases`** on every page (required for wikilink resolution — Obsidian matches by alias, not by `title` field)
4. **Repair folder-note children drift** — sync `children:` frontmatter against the actual files in the folder
5. **Repair `wiki/index.md`** — add newly discovered pages to the master catalog
6. **Clean ghost wikilinks in `log.md`** — replace dangling links (e.g. `` `bad-link` ``) with backtick code format (ghost nodes in graph)
7. **Resolve broken wikilinks** — alias/unique-fuzzy match only (never creates stubs)
8. **Connect orphans link-only** — add the orphan page to its parent folder note (never auto-edits `sources:` to connect `type: source` orphans)
9. **Add missing graph color groups** — run `obsidian-graph-colors` for new topic folders

## What Requires Judgment (Applied Automatically Under Checkpoint)

These fixes alter structure or content, but are still applied automatically because the checkpoint makes them reversible:

- **Restructure flat folders** with more than 12 children — split into subtopic subfolders
- **Resolve title collisions** — rename the less-specific page and rewrite backlinks
- **Densify body wikilinks** — text mentions an entity without linking to its page
- **Near-duplicate page merges** — merge two pages that are >50% overlapping

Residual items that need editorial intent (deletions, ambiguous merges where both pages are equally valid) are surfaced for user review, not auto-applied.

## The Engine Runs First

`engine.sh heal` handles the structural-error subset before the agent applies judgment:

1. `engine.sh heal --json` creates a git checkpoint commit
2. Loops: verify → fix → re-verify until errors are cleared (bounded by iteration cap)
3. Commits the repaired state as a single `heal:` commit

The agent then picks up only what the engine could not handle deterministically.

## Three Validation Levels

From the user guide:

1. **Level 1 — `status`:** one-command smoke test exercising every hook path. Reports green/red per path.
2. **Level 2 — `lint`:** read-only audit beyond status checks. Adds broken wikilink detection, orphan pages, stale pages, missing frontmatter fields, near-duplicate bodies, single-source high confidence.
3. **Level 3 — `curator agent`:** applies auto-fix phases in order, re-runs lint, compares before/after counts.
4. **Level 4 — manual review:** near-duplicate bodies, single-source high confidence, repeated content blocks, orphan sources, contradictions — all require human judgment.

## What Auto-Heal Will NOT Do

- Delete content — never removes page bodies.
- Create wikilinks to pages that do not exist — unresolvable links are reported.
- Auto-edit `sources:` to connect `type: source` orphans — that would forge provenance.
- Lower a `confidence` value — flags the discrepancy, does not edit.
- Merge near-duplicate pages where both are genuinely valid — surfaces for user review.

## Rollback

```bash
git revert <heal-commit-sha>
```

The rollback SHA is reported in the curator's final report.

## Related Concepts

- [[Curator Agent]] — the agent that runs auto-heal
- [[Lint Rules]] — the checks that produce the findings auto-heal repairs
- [[Git Checkpoint]] — every auto-heal change lands in a reversible commit
- [[Deterministic Engine]] — `engine.sh heal` handles the structural-error subset

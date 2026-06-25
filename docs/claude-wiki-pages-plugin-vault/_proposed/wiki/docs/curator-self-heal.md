---
title: "Curator Self-Heal"
type: concept
aliases: ["curator self-heal", "auto-heal", "self-heal", "curator agent", "git-checkpointed heal"]
parent: "[[docs|Docs]]"
path: "docs"
sources: ["[[docs-glossary|Canonical Glossary]]", "[[docs-architecture|Four-Layer Architecture]]"]
related: []
tags: ["docs", "ingest", "architecture"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: draft
confidence: 0.9
derived: false
proposed_by: "claude"
---

# Curator Self-Heal

The automatic structural repair step run by the `claude-wiki-pages-curator-agent` after every ingest, which runs deterministic engine heals first and then applies judgment fixes, all under git checkpoints that make every change revertible.

## Definition

Self-heal is Step 2 of the ingest pipeline, executed automatically without an approval prompt. The rationale for skipping the approval gate: every fix is git-checkpointed before it is applied, so a bad fix can be reverted with `git revert <sha>` — the git history is the undo mechanism, not an approval prompt.

The curator runs in two phases:

1. **Deterministic engine heal** (`engine heal`) — the engine runs its own deterministic repair loop: fixing missing `parent:` links, correcting `path:` values, repairing frontmatter fields that `verify` flagged as errors. These are mechanical fixes with unambiguous correct answers; the engine applies them directly.

2. **Judgment fixes** — the curator agent applies fixes that require editorial judgment: merging near-duplicate pages, resolving contradictions, demoting non-spine wikilinks to prose or tags (the strict-tree reducer), repairing ghost links. Each judgment fix is applied inside the same git checkpoint so a reviewer can inspect the diff.

The curator is capped at two runs per pipeline (initial + one re-run after restructure). This retry cap prevents infinite loops: if two passes cannot clear the structural errors, the remaining issues are surfaced in the final report for human review.

## Key Principles

**Fully automatic — no approval prompt.** Self-heal runs unconditionally after ingest. The safety guarantee comes from git checkpointing, not from an approval gate. The `commit backstop` hook (`SubagentStop`) additionally commits any writes left uncommitted when the curator agent returns.

**Engine heals first.** The deterministic engine pass clears all ERROR-severity `verify` findings before the curator agent makes any judgment calls. This ordering ensures the structural floor is correct before higher-level reasoning is applied.

**Bounded by the retry cap.** At most two curator runs per pipeline. If errors persist after two passes, they appear in the final report as "unresolved" items — a human must decide how to address them. The ingest pipeline does not loop indefinitely.

**Residual items go to the final report.** The curator's output includes a heal commit SHA and a list of items that genuinely need editorial intent (e.g., a disambiguation choice between two conflicting pages). These appear in the pipeline's "Step 2 Fix" section of the final report.

**Unattended mode is conservative.** In `maintenance.unattended: true` mode, deterministic mechanical heals apply directly. Uncertain authoring (anything that would require editorial judgment) is routed to `_proposed/` rather than auto-applied. The curator never auto-promotes from `_proposed/`.

## Examples

After an ingest run that created 12 new pages, `verify-ingest.sh` reports 3 ERROR findings: two pages missing `parent:` and one with an incorrect `path:`. The curator runs `engine heal`, which fixes all three deterministically and commits the heal. Then the curator agent inspects the new pages for ghost links and demotes two sibling `related:` wikilinks to prose, committing a second time. The final report shows "3 errors fixed (engine), 2 judgment fixes (ghost links, demoted related links), 0 unresolved."

A page created with `type: entity` but no `entity_type` field fails verify. The engine heal pass identifies the only valid inference (the page body clearly describes a `tool`) and writes `entity_type: tool`. This is mechanical — the field has a closed enum and the value is unambiguous from the body content.

## Related Concepts

The curator self-heal is Step 2 of the ingest pipeline. It uses the engine `heal` command (deterministic repairs), the `verify` engine verb (to identify ERROR findings), and the `lint` engine verb (advisory WARN findings). The retry cap (two runs maximum), the commit backstop, and the `_proposed/` channel for unattended uncertain fixes are all part of the self-heal contract.
---

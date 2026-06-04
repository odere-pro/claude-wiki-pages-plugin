---
name: maintain-contract
description: >
  The workflow contract for any agent that ingests, retrieves from, or maintains
  a claude-wiki-pages vault. Documents the safe ordering — ground → judge →
  verify — checkpoint discipline, retrieval grounding, and the immutability
  rules, so an external agent can drive the wiki correctly without re-reading
  the whole spec. Trigger when an agent or user asks "how should I maintain the
  wiki", "what is the safe ingest/retrieve order", "how do other agents use
  this", or invokes /claude-wiki-pages:maintain-contract. Reference, not action.
allowed-tools: Read
---

# Maintain contract — how to drive the wiki safely

This is the procedure any agent (this plugin's or a third party's) follows to
operate on a vault without corrupting it. It pairs with
`/claude-wiki-pages:engine-api`, which documents the tool surface this contract sequences.

## The three invariants

1. **Ground, then judge, then verify.** Compute facts with the engine (verify, fix, and the planned link-suggest/search) before reasoning. The LLM makes only judgment calls — topic placement, prose, what to synthesize — over engine-computed facts, never from memory. Close every write with `verify`/`heal`.
2. **`raw/` is immutable.** Never write, move, or delete anything under `vault/raw/`. Sources are the provenance anchor. The `protect-raw` hook enforces this; do not fight it.
3. **Git is the safety net, not approval.** Self-heal is automatic. Before structural changes, a checkpoint commit is written; rollback is `git revert <healCommit>`. Do not prompt the user for permission to fix structure.

## Ingest (add knowledge)

1. Read each source in `raw/` completely. 2. Write cited wiki pages (`sources:` as `[[wikilinks]]` to `_sources/` summaries). 3. Run `engine.sh heal` — it checkpoints, then verify→fix→re-verify, then commits. 4. Surface only what needs editorial intent (ambiguous merges, deletions).

## Retrieve (answer questions)

1. Use grounded retrieval (engine `search`, or `grep` over `wiki/` until `search` ships) to fetch candidate pages. 2. Answer **only** from those pages. 3. Cite every claim with the `[[Page Title]]` it came from. 4. Never invent a citation; if the wiki cannot answer, say so.

## Maintain (keep it healthy)

1. `engine.sh verify --json` to diagnose. 2. `engine.sh heal --json` to repair the structural-error subset under a checkpoint. 3. Apply judgment fixes (restructures, merges) automatically under the same checkpoint. 4. Re-verify; iterate within the engine's cap; surface residual editorial items.

## Hard rules (never violate)

- Never create a `[[wikilink]]` to a non-existent page, and never create a stub just to satisfy a broken link.
- Never forge provenance — do not edit `sources:` to manufacture a citation.
- Never delete page content; connect orphans instead.
- Always read `vault/CLAUDE.md` first — it is the authoritative schema and wins any conflict.

## Specification anchor

Contracts: [`docs/architecture.md`](../../docs/architecture.md) (command & agent contracts), [`docs/security.md`](../../docs/security.md) (security model).

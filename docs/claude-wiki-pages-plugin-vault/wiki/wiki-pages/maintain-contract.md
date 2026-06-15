---
title: "Maintain Contract"
type: concept
aliases: ["Maintain Contract", "maintain-contract", "wiki operating contract", "vault operating contract"]
parent: "[[wiki-pages|Wiki Pages]]"
path: "wiki-pages"
sources: ["[[wiki-pages-skill|Wiki Pages Skill (maintain-contract SKILL.md)]]"]
related: ["[[ingest-pipeline|Ingest Pipeline]]", "[[Auto-Heal]]", "[[query-rules|Query Rules]]", "[[git-checkpoint|Git Checkpoint]]", "[[grounded-retrieval|Grounded Retrieval]]", "[[multi-vault-operating-rules|Multi-Vault Operating Rules]]", "[[schema-authority|Schema Authority]]"]
contradicts: []
supersedes: []
depends_on: ["[[git-checkpoint|Git Checkpoint]]", "[[deterministic-engine|Deterministic Engine]]"]
tags: ["concept", "operating-contract", "skills"]
created: 2026-06-13
updated: 2026-06-13
update_count: 1
status: active
confidence: 1.0
---

# Maintain Contract

> [!summary]
> The maintain contract is the operating procedure any agent follows to drive a claude-wiki-pages vault without corrupting it. It is documented in `skills/wiki-pages/SKILL.md` (the `maintain-contract` skill) and is a reference, not an action skill. The contract has three levels: three hard invariants that are never violated, three operational phases (Ingest, Retrieve, Maintain), and a multi-vault extension that binds all engine calls to an explicit `--target` scope.

## Definition

The maintain contract is the safe sequencing protocol that governs vault operations. Any agent — this plugin's own agents or a third-party agent — follows this contract when ingesting sources, answering questions from the wiki, or keeping the vault structurally healthy.

The contract pairs with `/claude-wiki-pages:engine-api` (the [[deterministic-engine|Deterministic Engine]] surface) to form a complete picture: the engine API documents the tool calls available; the maintain contract documents the order and conditions under which those calls are made correctly.

## Key Principles

### The Three Invariants

These cannot be compromised; they are the contract's load-bearing walls:

**1. Ground, then judge, then verify.**
Compute facts with the engine (`verify`, `search`, `heal`) before the LLM reasons over them. The LLM makes only judgment calls — topic placement, prose, what to synthesize — over engine-computed facts, never from memory. Close every write phase with a `verify`/`heal` pass. This is the [[grounded-retrieval|Grounded Retrieval]] principle applied to all operations, not just retrieval.

**2. `raw/` is immutable.**
Never write, move, or delete anything under `vault/raw/`. Sources are the provenance anchor. The `protect-raw` PreToolUse hook enforces this; an agent must not fight it.

**3. Git is the safety net, not approval.**
Self-heal is automatic. Before structural changes, a checkpoint commit is written; rollback is `git revert <healCommit>`. Agents do not prompt the user for permission to fix structure. All write phases are wrapped: `snapshot.sh pre` before, `snapshot.sh post` after, and the `SubagentStop` commit backstop sweeps up anything left dirty — no LLM write escapes git coverage.

### Three Operational Phases

**Ingest (add knowledge)**

1. `snapshot.sh pre` — checkpoint the pre-write state.
2. Read each source in `raw/` completely.
3. Write cited wiki pages (`sources:` as wikilinks to `_sources/` summaries), then `snapshot.sh post --label "ingest …"`.
4. Run `engine.sh heal` — it checkpoints, then verify→fix→re-verify, then commits.
5. Surface only what needs editorial intent (ambiguous merges, deletions).

**Retrieve (answer questions)**

1. Use grounded retrieval (engine `search`, or `grep` over `wiki/`) to fetch candidate pages.
2. Answer **only** from those pages.
3. Cite every claim with the wiki page it came from (using a wikilink).
4. Never invent a citation; if the wiki cannot answer, say so explicitly.

**Maintain (keep it healthy)**

1. `engine.sh verify --json` to diagnose.
2. `engine.sh heal --json` to repair the structural-error subset under a checkpoint.
3. Apply judgment fixes (restructures, merges) automatically under the same checkpoint.
4. Re-verify; iterate within the engine's cap; surface residual editorial items.

### Hard Rules

These are explicit no-go lines from the contract:

- Never create a wikilink to a non-existent page, and never create a stub just to satisfy a broken link.
- Never forge provenance — do not edit `sources:` to manufacture a citation.
- Never delete page content; connect orphans instead.
- Always read `vault/CLAUDE.md` first — it is the authoritative schema and wins any conflict.

## Examples

A third-party agent following the contract for a new source:

```bash
# Invariant 3 — checkpoint first
bash snapshot.sh pre --target /path/to/vault

# Read the source completely (invariant 1 — ground before judge)
# Write the cited wiki pages using engine-verified facts
# (invariant 2 — never touch raw/)

bash snapshot.sh post --target /path/to/vault --label "ingest ADR-0024"

# Invariant 1 — verify/heal before reporting
bash engine.sh heal --target /path/to/vault
```

## Related Concepts

- [[grounded-retrieval|Grounded Retrieval]] — the retrieval discipline that implements invariant 1 for query operations
- [[multi-vault-operating-rules|Multi-Vault Operating Rules]] — the five extension rules that bind the contract to multi-vault environments
- [[ingest-pipeline|Ingest Pipeline]] — the 13-step procedure the ingest phase follows
- [[Auto-Heal]] — the mechanical fix set the maintain phase applies
- [[query-rules|Query Rules]] — the workflow the retrieve phase follows
- [[git-checkpoint|Git Checkpoint]] — the safety net underpinning invariant 3
- [[schema-authority|Schema Authority]] — `vault/CLAUDE.md` that must be read first (hard rule)

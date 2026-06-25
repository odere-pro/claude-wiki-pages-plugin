---
title: "Maintain Contract Skill"
type: entity
entity_type: tool
aliases: ["Maintain Contract Skill", "maintain-contract", "/claude-wiki-pages:maintain-contract", "vault maintenance contract"]
parent: "[[skills|Skills]]"
path: "skills"
sources: ["[[skills-maintain-contract|Maintain Contract Skill — SKILL.md]]"]
related: []
tags: ["skills", "layer-2", "maintain-contract", "safety"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Maintain Contract Skill

The `maintain-contract` skill documents the safe procedure any agent follows to operate on a vault — the ground-then-judge-then-verify ordering, checkpoint discipline, and multi-vault confinement rules.

## Overview

Reference material, not an action. It pairs with `[[skill-engine-api|Engine API Skill]]`, which documents the tool surface this contract sequences. Any agent — this plugin's or a third party's — follows this contract to avoid corrupting the vault.

## Key Facts

**Three invariants**:
1. **Ground, then judge, then verify**: compute facts with the engine before reasoning; close every write with `verify`/`heal`
2. **`raw/` is immutable**: never write, move, or delete anything under `vault/raw/`; `protect-raw` hook enforces this
3. **Git is the safety net, not approval**: self-heal is automatic; `snapshot.sh pre` before write phases, `snapshot.sh post` after; `SubagentStop` commit backstop sweeps up anything left dirty

**Ingest procedure**: snapshot pre → read each source → write cited wiki pages → snapshot post → `engine.sh heal` → surface editorial items only.

**Retrieve procedure**: use engine `search` or grep to get candidates → answer only from those pages → cite every claim → never invent a citation.

**Maintain procedure**: `engine.sh verify --json` → `engine.sh heal --json` → apply judgment fixes under the same checkpoint → re-verify → surface residual items.

**Five multi-vault rules**:
1. Always pass `--target <active-vault>`
2. Pass `--other-vaults` from `registry_other_vaults` (from `resolve-vault.sh`) for firewall confinement
3. Reads from non-active registered vaults are permitted
4. Writes to any non-active vault are firewall-BLOCKED (even with `--other-vaults`)
5. Malformed registry resolves FAIL-CLOSED (zero writable roots)

**Hard rules**: never create a `[[wikilink]]` to a non-existent page; never forge provenance; never delete page content (connect orphans instead); always read `vault/CLAUDE.md` first.

## Related

References the `[[skill-engine-api|Engine API Skill]]` for the tool surface it sequences.

---
title: "Wiki Pages Skill (maintain-contract SKILL.md)"
type: source
source_type: manual
source_format: text
url: ""
author: ""
publisher: "claude-wiki-pages plugin"
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["skill", "maintain-contract", "wiki-operating-contract"]
aliases: ["Wiki Pages Skill (maintain-contract SKILL.md)", "wiki-pages-skill", "maintain-contract skill", "Maintain Contract Skill"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# Wiki Pages Skill (maintain-contract SKILL.md)

## Metadata

- **Author:** claude-wiki-pages plugin
- **Publisher:** claude-wiki-pages plugin
- **Published:** 2026-06-13
- **URL:** raw/repo/wiki-pages/SKILL.md

## Summary

The `maintain-contract` skill (`skills/wiki-pages/SKILL.md`) is an agent-teaching skill that documents the safe operating contract for any agent that ingests, retrieves from, or maintains a claude-wiki-pages vault. It is not an action skill — it is a reference that external or internal agents read to understand the correct sequencing and invariants. The skill covers three invariants (ground-then-judge-then-verify, raw immutability, git-as-safety-not-approval), three operational phases (Ingest, Retrieve, Maintain), a hard-rules list, and five multi-vault operating rules derived from ADR-0009 and ADR-0016.

## Key Claims

- Three invariants govern all vault operations: (1) compute engine facts before reasoning; (2) never write to `raw/`; (3) git is the safety net — self-heal requires no user approval.
- Ingest follows a fixed safe sequence: `snapshot.sh pre` → read source → write cited pages → `snapshot.sh post` → `engine.sh heal` → surface editorial items.
- Retrieve is grounded: answer only from fetched wiki pages; cite every claim with a wikilink; never invent a citation.
- Maintain loops: `engine.sh verify` → `engine.sh heal` → judgment fixes → re-verify (bounded by iteration cap).
- Hard rules: never create a wikilink to a non-existent page; never forge provenance; never delete content; always read `vault/CLAUDE.md` first.
- Multi-vault Rule 1: always pass `--target <vault>` to every engine call.
- Multi-vault Rule 2: pass `--other-vaults` from `registry_other_vaults` for cross-vault confinement.
- Multi-vault Rule 3: reads from non-active registered vaults are permitted.
- Multi-vault Rule 4: writes to any non-active vault are firewall-BLOCKED regardless of `allowPaths`.
- Multi-vault Rule 5: a malformed or inconsistent registry resolves FAIL-CLOSED (zero writable roots).

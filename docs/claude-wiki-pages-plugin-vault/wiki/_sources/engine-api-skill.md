---
title: "Engine API Skill (SKILL.md)"
type: source
source_type: manual
source_format: text
url: ""
author: ""
publisher: "claude-wiki-pages project"
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["engine", "api", "skill", "agent-contract"]
aliases: ["Engine API Skill (SKILL.md)"]
sources: []
created: 2026-06-13
updated: 2026-06-13
status: active
confidence: 1.0
---

# Engine API Skill (SKILL.md)

## Summary

The engine-api skill documents the LLM-facing contract for the deterministic Bun engine: how any agent should call it, what each subcommand returns, and when to call it. Covers all 14 implemented and 2 planned verbs with JSON output shapes and exit codes. Establishes the rule "ground, then judge, then verify" — agents use the engine for facts, make only judgment calls themselves, and close every write-path with `verify` or `heal`.

## Key Claims

- All engine calls should pass `--json` and `--target <vault>` for machine use.
- If Bun is missing, the bridge prints a warning and exits 0; degrade to bash verifiers.
- `verify` emits `{findings[], errors, warnings, clean}` and exits 1 when any error.
- `fix` is idempotent (running twice changes nothing); never touches body prose.
- `heal` loops verify → fix → re-verify until clean or no progress; exits 0 on clean.
- `backlog` provides O(1) pending-source and overdue-lint detection.
- `snapshot pre/post` always exit 0 — reports, never gates.
- `capabilities` emits the CAPABILITIES table as JSON for agent discovery.
- `ontology` parses the ontology-profile-v1 from vault CLAUDE.md at read time.
- `route` is network-free; reachability is passed in as flags, never probed.
- `entity_type` is the only vault-extensible field; all other enums are closed.
- Planned verbs (`index`, `link-suggest`) return `{status:"not-implemented"}` until shipped.

## Entities Mentioned

- [[Deterministic Engine]]
- [[engine.sh]]

## Concepts Covered

- [[Engine Verb Surface]]
- [[Engine CLI Router]]
- [[Degraded-Mode Routing]]
- [[Draft Review Surface]]
- [[Graph Walk Algorithm]]
- [[Search Scoring Algorithm]]
- [[Provenance Checks]]

---
title: "Engine Verb Surface"
type: concept
aliases: ["Engine Verb Surface", "CAPABILITIES table", "verb surface", "engine commands"]
parent: "[[engine-index|Engine — Index]]"
path: "engine"
sources: ["[[cli-ts-source|cli.ts Source]]", "[[engine-api-skill|Engine API Skill (SKILL.md)]]"]
related: ["[[engine-cli-router|Engine CLI Router]]", "[[cli-ts|cli.ts]]", "[[deterministic-engine|Deterministic Engine]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["engine", "api", "capabilities"]
created: 2026-06-13
updated: 2026-06-13
update_count: 1
status: active
confidence: 1.0
---

# Engine Verb Surface

## Definition

The Engine Verb Surface is the complete set of subcommands the deterministic engine exposes, defined as a single `CAPABILITIES` table in `src/cli/cli.ts` (ADR-0015). Every consumer of the verb list — the router's dispatch logic, the `usage()` help text, the `PLANNED` array, and the `capabilities --json` output — derives from this one table. Adding or retiring a verb is a one-line edit to the table; nothing else needs updating.

## Key Principles

- **Single source of truth (ADR-0015 N1)**: before ADR-0015, the verb list was triple-stated (Set, array, free-text usage literal), causing silent drift when a verb was added in one place but not the others. The CAPABILITIES table collapse eliminated this.
- **Status model**: each entry has `status: "implemented" | "planned"`. Implemented verbs have live dispatch branches; planned verbs return `{status:"not-implemented"}` until they ship.
- **`capabilities --json` as discovery mechanism**: agents can call `bash scripts/engine.sh capabilities --json` to get the authoritative list at runtime — no hardcoded assumptions about what is shipped.
- **Graceful planned-verb degradation**: calling a planned verb returns a stable JSON object, not an unknown-command error. Each planned verb has a documented approved fallback the caller should use instead.

## Implemented Verbs (14)

| Verb           | Purpose                                                              |
| -------------- | -------------------------------------------------------------------- |
| `verify`       | Vault integrity check; emits `{findings[], errors, warnings, clean}` |
| `fix`          | Idempotent structural repairs; never touches body prose              |
| `heal`         | Git-checkpoint + verify → fix loop until clean                       |
| `doctor`       | Environment health checks D01–D12; `--fix` auto-repairs              |
| `config`       | Show/validate/path the effective merged configuration                |
| `migrate`      | Schema upgrade v1→v2→v3; `--write` applies under git checkpoint      |
| `search`       | Deterministic keyword search with Tier-2 recall + R2 graph           |
| `firewall`     | Evaluate a path against per-vault write confinement rules            |
| `backlog`      | O(1) pending-source + overdue-lint detection via source manifest     |
| `propose`      | `_proposed/` review gate: review / approve / reject                  |
| `capabilities` | Emit the CAPABILITIES table as JSON                                  |
| `ontology`     | Parse and emit ontology-profile-v1 as JSON                           |
| `route`        | Network-free degraded-mode routing decision                          |
| `snapshot`     | Git-bound write phases: pre checkpoint + post commit                 |

## Planned Verbs (2)

| Verb           | Fallback                                                     |
| -------------- | ------------------------------------------------------------ |
| `index`        | Read `wiki/index.md` directly; use Glob for full enumeration |
| `link-suggest` | grep/Glob over `wiki/` for exact wikilink title matches      |

## Examples

Discover the current verb surface at runtime (no hardcoded assumptions):

```bash
bash scripts/engine.sh capabilities --json
```

Output structure:

```json
{
  "verbs": [
    { "name": "verify", "status": "implemented" },
    { "name": "heal", "status": "implemented" },
    { "name": "index", "status": "planned" }
  ]
}
```

A planned verb call returns a stable degradation object rather than an error:

```json
{ "status": "not-implemented", "fallback": "Read wiki/index.md directly; use Glob for full enumeration" }
```

## Related Concepts

- [[engine-cli-router|Engine CLI Router]] — the dispatch logic that consumes this surface
- [[cli-ts|cli.ts]] — the file where the CAPABILITIES table lives
- [[deterministic-engine|Deterministic Engine]] — the engine whose commands this surface describes

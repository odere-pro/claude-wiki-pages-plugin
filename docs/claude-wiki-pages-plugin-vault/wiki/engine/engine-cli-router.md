---
title: "Engine CLI Router"
type: concept
aliases: ["Engine CLI Router", "CLI router", "cli router", "command dispatcher"]
parent: "[[engine-index|Engine — Index]]"
path: "engine"
sources: ["[[cli-ts-source|cli.ts Source]]", "[[engine-api-skill|Engine API Skill (SKILL.md)]]"]
related: ["[[engine-verb-surface|Engine Verb Surface]]", "[[cli-ts|cli.ts]]", "[[engine-sh|engine.sh]]", "[[deterministic-engine|Deterministic Engine]]"]
contradicts: []
supersedes: []
depends_on: ["[[engine-verb-surface|Engine Verb Surface]]"]
tags: ["engine", "cli", "routing"]
created: 2026-06-13
updated: 2026-06-13
update_count: 1
status: active
confidence: 1.0
---

# Engine CLI Router

## Definition

The Engine CLI Router is the dispatch pattern implemented in `src/cli/cli.ts`. It parses `process.argv`, selects a command handler from the CAPABILITIES table, calls the appropriate command module, and returns an integer exit code to `process.exit()`. The router is deliberately thin: each command module (e.g. `verify.ts`, `search.ts`) owns its own logic; the router owns only argument parsing and dispatch.

## Key Principles

- **Single `parseArgs()` function**: all 15+ named flags are parsed in one place, producing a frozen `ParsedArgs` object. No flag is parsed in multiple locations.
- **Dispatch by string equality**: `if (command === "verify") { ... }` — straightforward, no reflection or dynamic lookup. Each branch calls one imported function and `emit()`s its result.
- **`emit()` is the output contract**: routes to `JSON.stringify` or `renderText` based on `--json`. Commands never write to stdout themselves — they return a `Report` that `emit()` serializes.
- **PLANNED guard at the bottom**: after all implemented branches, `if (PLANNED.includes(command))` returns a stable `{status:"not-implemented"}` message. This prevents unknown-command errors for planned verbs.
- **`usage()` derives from CAPABILITIES**: the help text is generated from the table at runtime, never a hardcoded literal. Adding a verb to the table automatically updates `usage()`.

## Examples

A typical dispatch branch:

```typescript
if (command === "verify") {
  const report = verify({ target });
  emit(report, json);
  return exitCode(report);
}
```

A multi-sub-command branch (e.g. `config`):

```typescript
if (command === "config") {
  const allowed: ConfigSub[] = ["show", "validate", "path"];
  const chosen = (allowed.includes(sub as ConfigSub) ? sub : "show") as ConfigSub;
  const report = config({ sub: chosen });
  // ... custom text rendering for non-JSON ...
  return configExit(report);
}
```

## Related Concepts

- [[engine-verb-surface|Engine Verb Surface]] — the CAPABILITIES table the router derives from
- [[cli-ts|cli.ts]] — the concrete file containing the router
- [[engine-sh|engine.sh]] — the bash bridge that invokes the router
- [[deterministic-engine|Deterministic Engine]] — the engine whose surface this router exposes

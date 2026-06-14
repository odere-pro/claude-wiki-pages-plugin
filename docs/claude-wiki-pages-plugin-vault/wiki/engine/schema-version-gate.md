---
title: "Schema Version Gate"
type: concept
aliases:
  [
    "Schema Version Gate",
    "schema_version check",
    "CHECK 0",
    "SUPPORTED_SCHEMA_VERSIONS",
    "declaredSchemaVersion",
  ]
parent: "[[Engine — Index]]"
path: "engine"
sources: ["[[schema.ts Source]]", "[[verify.ts Source]]"]
related: ["[[Provenance Checks]]", "[[Deterministic Engine]]", "[[Lint Rules]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["engine", "schema", "verify"]
created: 2026-06-13
updated: 2026-06-13
update_count: 1
status: active
confidence: 1.0
---

# Schema Version Gate

## Definition

The Schema Version Gate is CHECK 0 in the vault integrity check pipeline, implemented in `src/core/schema.ts`. It reads the vault's `CLAUDE.md`, extracts the declared `schema_version` value, and emits a finding if the version is absent, malformed, or unsupported by the current engine build.

## Key Principles

- **`SUPPORTED_SCHEMA_VERSIONS = [1, 2, 3]`**: the closed set of versions this engine build accepts. Vaults at any of these versions are valid.
- **`CURRENT_SCHEMA_VERSION = 3`**: the version that `migrate` upgrades to and that new vaults declare when scaffolded.
- **Tolerates backtick form**: `declaredSchemaVersion()` matches both `schema_version: 3` and `` `schema_version`: `3` `` (the backtick-wrapped variant sometimes written in vault CLAUDE.md headers).
- **Absent CLAUDE.md → info, not error**: if the vault has no `CLAUDE.md`, the check emits an `info`-severity finding rather than an error. This accommodates vaults in initial setup.
- **Missing declaration → error**: if `CLAUDE.md` exists but contains no `schema_version` line, the check emits an `error`-severity `schema` finding.
- **Unsupported version → error**: any declared version outside `SUPPORTED_SCHEMA_VERSIONS` is an error with a migration hint.

## Examples

Supported (clean): `schema_version: 3` in CLAUDE.md → no finding.

Missing declaration (error):

```
severity: "error", check: "schema"
message: "CLAUDE.md declares no schema_version. Add `schema_version: 3` near the top."
```

Unsupported version (error):

```
severity: "error", check: "schema"
message: "schema_version 4 is unsupported (this build supports: 1, 2, 3)."
```

## Related Concepts

- [[Provenance Checks]] — the other verify checks (CHECK 5a/5b) in the same pipeline
- [[Deterministic Engine]] — the `verify` and `heal` verbs that run this check
- [[Lint Rules]] — the broader set of checks the curator enforces

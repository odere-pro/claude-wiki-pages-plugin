---
title: "Doctor"
type: concept
aliases: ["Doctor", "doctor", "/claude-wiki-pages:doctor", "health check", "environment health check"]
parent: "[[Operations]]"
path: "operations"
sources: ["[[Operations]]", "[[Installation]]", "[[Glossary]]"]
related: ["[[Installation]]", "[[One Advertised Path]]", "[[Hook-Enforced Safety]]"]
contradicts: []
supersedes: []
depends_on: []
tags: [health-check, doctor, diagnostics]
created: 2026-06-11
updated: 2026-06-11
update_count: 1
status: active
confidence: 1.0
---

# Doctor

The environment health check for `claude-wiki-pages`. Run after install, after any update, and any time behavior seems off.

```text
/claude-wiki-pages:doctor
```

Implemented by `scripts/doctor.sh`. Read-only by contract (exit codes 0–5); exits 0 when healthy. The `--fix` flag auto-repairs the fixable subset.

## Checks

`doctor` runs ten checks (D01–D10). Any `FAIL[N]` line names the remedy. Exit 0 and "OK" lines for every check means the environment is healthy.

- **D06**: Bun missing (most common gap; the engine commands are disabled without Bun).

## When to Run

- After every install or update.
- When `/claude-wiki-pages:wiki` produces unexpected results.
- When hooks appear to not be firing.
- As a routine health check before beginning a long ingest session.

## Glossary

The Glossary defines `doctor` as: "The environment health check (`/claude-wiki-pages:doctor`, `scripts/doctor.sh`). Read-only by contract; exit codes 0–5."

---
title: "Hook-Enforced Safety"
type: concept
aliases: ["Hook-Enforced Safety", "hook-enforced safety", "hooks", "lifecycle hooks"]
parent: "[[Architecture]]"
path: "architecture"
sources: ["[[Architecture]]", "[[Features]]", "[[Operations]]", "[[Glossary]]"]
related: ["[[Layer 4 — Orchestration]]", "[[Provenance]]", "[[Four-Layer Stack]]"]
contradicts: []
supersedes: []
depends_on: ["[[Layer 4 — Orchestration]]"]
tags: [hooks, safety, orchestration]
created: 2026-06-11
updated: 2026-06-11
update_count: 1
status: active
confidence: 1.0
---

# Hook-Enforced Safety

The set of lifecycle hooks wired in `hooks/hooks.json` that enforce the schema and safety contracts on every tool call. Blocking hooks reject writes via exit code 2.

## Hook Triggers

| Trigger | Scripts fired | Effect |
|---|---|---|
| `SessionStart` | `session-start.sh` | Reports vault status; creates settings on first run; emits DEGRADED advisory when local model is enabled |
| `UserPromptSubmit` | `prompt-guard.sh` | Warns on phrasing that suggests editing `raw/` or destructive ops |
| Any Write or Edit | `validate-frontmatter.sh`, `check-wikilinks.sh`, `protect-raw.sh`, `validate-attachments.sh` | Block-or-allow based on schema validity |
| After Write or Edit | `post-wiki-write.sh`, `post-ingest-summary.sh` | Emit reminders and counts |
| `SubagentStop` | `subagent-lint-gate.sh`, `subagent-ingest-gate.sh` | Block bad completions from long-running agents |

## Key Scripts

- **`protect-raw.sh`**: blocks any attempt to rewrite a source file in `raw/`. Immutability is a hard invariant.
- **`validate-frontmatter.sh`**: every Write and Edit must pass schema validation.
- **`check-wikilinks.sh`**: verifies that wikilinks in `sources` fields resolve to real pages.
- **`verify-ingest.sh`**: post-ingest quality gate run by `SubagentStop`; surfaces drift immediately.
- **`firewall.sh`**: confines agent writes to the resolved vault plus `allowPaths`, minus `denyPaths`.

## Append-Only Operations Log

Every ingest, lint, fix, query, and synthesis operation appends one entry to `wiki/log.md`. This provides a human-auditable record of all operations; the log is never truncated.

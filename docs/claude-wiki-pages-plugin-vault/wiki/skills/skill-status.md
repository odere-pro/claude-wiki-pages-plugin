---
title: "Status Skill"
type: entity
entity_type: tool
aliases: ["Status Skill", "status", "/claude-wiki-pages:status", "health check"]
parent: "[[skills|Skills]]"
path: "skills"
sources: ["[[skills-status|Status Skill — SKILL.md]]"]
related: []
tags: ["skills", "layer-2", "status", "diagnostics"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Status Skill

The `status` skill exercises every hook path and reports pass/fail per hook without writing to the vault — a pure diagnostic.

## Overview

Status answers "if I ran the pipeline right now, which hooks would fire and which would silently skip?" Intended for immediate post-install verification, post-edit verification, or periodic smoke testing.

Invocation triggers: immediately after installing the plugin; after editing hooks or scripts; when a hook is suspected not to fire; "status", "health check", "is everything wired up".

## Key Facts

**Ten checks** (in order):
1. Dependency check: `jq`, `bash >= 3.2`, every hook script readable and executable
2. `SessionStart` preamble: synthesize a session open, confirm the schema-reminder preamble is printed
3. `PreToolUse` frontmatter gate: synthetic Write with malformed frontmatter → confirm exit code 2
4. `PreToolUse` raw-immutability gate: synthetic Write under `vault/raw/` → confirm exit code 2
5. `PreToolUse` wikilink gate: synthetic Write using a markdown link where wikilink required → confirm exit code 2
6. `PreToolUse` attachment gate: synthetic source-page Write with missing `attachment_path` → confirm exit code 2
7. `PostToolUse` reminder: read-only synthesis of a wiki write → confirm index-reminder message appears
8. `SubagentStop` ingest gate: simulate ingest agent completion → confirm `verify-ingest.sh` runs
9. `SubagentStop` lint gate: simulate lint-fix agent completion → confirm lint gate runs
10. Schema read: confirm `vault/CLAUDE.md` parses as YAML frontmatter + markdown with a valid `schema_version` integer

**Zero-write invariant**: the skill compares `git status vault/` before and after; any diff is a skill bug and is surfaced as a FAIL. Transient test payloads go to `$TMPDIR` only.

**Report format**: one `[ OK ] / [ FAIL ]` line per check; Summary: `<N passed> / <N total>. No wiki writes.`

**Exit codes**: 0 = every line OK; 1 = any FAIL; 2 = vault was mutated (skill self-invariant violated).

## Related

Complements `[[skill-lint|Lint Skill]]` (audits vault content) by checking the hook wiring rather than the wiki structure.

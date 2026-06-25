---
title: "scripts/enforce-dmi.sh"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["scripts", "source"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# scripts/enforce-dmi.sh

## Metadata

- **Author:** odere-pro
- **Publisher:** claude-wiki-pages plugin
- **Path:** scripts/enforce-dmi.sh

## Summary

PreToolUse enforcement for the skill:side-effecting-no-dmi rule. Blocks writes to `skills/*/SKILL.md` when the file contains side-effecting verbs (scaffold/deploy/commit/push/publish/release/delete/post/write) in the body but does NOT carry `disable-model-invocation: true` in frontmatter. The lone hard-block hook: writes a two-line message to stderr and exits 2.

## Key Claims

Exit 2 is a hard PreToolUse block. Does NOT signal via stdout JSON (unique among hooks). Decision authority is the Bun engine (`src/core/dmi-check.ts`). Fail-closed on missing Bun: hard-blocks any skills SKILL.md write with an install-Bun stderr reason, scoped to skills/*/SKILL.md only so unrelated edits are not blocked.

Covers: Disable-Model-Invocation Enforcement, Hard Block Hook, Skill Safety Gate

---
title: "Fail-Closed Security Pattern"
type: concept
aliases: ["Fail-Closed Pattern", "Fail-Closed Security", "Fail Closed"]
parent: "[[scripts|Scripts]]"
path: "scripts"
sources: ["[[scripts-firewall-sh|scripts/firewall.sh]]", "[[scripts-protect-raw-sh|scripts/protect-raw.sh]]", "[[scripts-validate-frontmatter-sh|scripts/validate-frontmatter.sh]]", "[[scripts-enforce-dmi-sh|scripts/enforce-dmi.sh]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["scripts", "security", "fail-closed", "hook-design"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 0.9
---

# Fail-Closed Security Pattern

When Bun is absent, security gates block the write rather than letting an unvalidated operation through.

## Definition

The fail-closed pattern applies to hooks that enforce a security boundary. When the Bun engine is unavailable, a fail-closed hook rejects the operation with a clear install-Bun message. This is the opposite of the fail-open pattern used by advisory hooks.

## Key Principles

The distinction between fail-closed and fail-open is determined by the type of enforcement:

- **Security boundaries use fail-closed:** `firewall.sh`, `protect-raw.sh`, `validate-frontmatter.sh`, `enforce-dmi.sh`. These gates have real security or data-integrity consequences if bypassed — an LLM writing to raw/ would corrupt immutable sources, and a write without frontmatter validation produces malformed pages.
- **Advisory hooks use fail-open:** `check-wikilinks.sh`, `scope-guard.sh`, `enforce-must-rule.sh`. These provide guidance and observability; bypassing them produces suboptimal but recoverable results.

The fail-closed hooks scope their blocks precisely: `protect-raw.sh` only blocks writes to paths under `vault/raw/`; `enforce-dmi.sh` only blocks writes to `skills/*/SKILL.md`. Paths outside these scopes pass through even when Bun is absent, so a missing-Bun environment does not block unrelated work.

## Examples

`firewall.sh` blocks write operations outside the resolved vault. `protect-raw.sh` blocks edits to existing files in `raw/`. `validate-frontmatter.sh` blocks wiki writes with missing required frontmatter fields. `enforce-dmi.sh` hard-blocks (exit 2) SKILL.md writes that add side-effecting verbs without the `disable-model-invocation: true` flag.

## Related Concepts

Fail-open advisory hooks include the wikilink checker and scope guard. The advisory/security distinction is documented in hooks.json.

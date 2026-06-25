---
title: "Hook Gate"
type: concept
aliases: ["hook-gate", "hook verb", "PreToolUse Gate", "Security Gate"]
parent: "[[src-commands|Src Commands]]"
path: "src/commands"
sources: ["[[src-commands-hook|src/commands/hook.ts — Hook Gate Dispatcher]]"]
related: []
tags: ["src", "commands", "hook", "security", "pretooluse"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Hook Gate

The entry point for all PreToolUse security gates. Reads the tool-call JSON from stdin, dispatches to the named gate, and emits a block decision JSON on stdout if blocking.

## Definition

`commands/hook/hook.ts` is the CLI dispatcher for the security gate system. It supports two modes: stdin (PreToolUse hook) and CLI batch (frontmatter validation over all wiki pages).

## Key Principles

**Known gates**: `frontmatter`, `firewall`, `check-wikilinks`, `protect-raw`, `attachments`, `dmi`, `must-rule`.

**Block signal**: stdout `{ "decision": "block", "reason": "..." }`. Exit code is 0 for all gates except a `dmi` hard block (exits 2). The block is signalled by stdout JSON, not the exit code.

**Stdin mode (PreToolUse)**: reads the full tool-call JSON from stdin via `readStdin()`. Returns `""` on empty/unavailable stdin — the gate then sees an empty payload and allows (fail-open for empty path, not a swallowed error).

**CLI batch mode (`--cli --gate frontmatter`)**: validates every wiki page's frontmatter. Replaces the awk `validate_content` loop in `scripts/validate-frontmatter.sh`. Per-file granularity: one `OK:` or `ERROR:` line per wiki page (line-counting consumers depend on per-file granularity).

**`runHookGate()`**: the dispatcher that routes to the specific gate implementation.

**`resolveGateName()`**: maps the raw `--gate <name>` string to the `GateName` union type. Returns `undefined` for unknown gates (exits 2 with usage error).

**Bash wrappers stay fail-closed**: when Bun is absent, the bash wrappers emit the block themselves — this TS code is never reached in that case.

**Stderr notices**: `dmi` hard block and `must-rule` advisory emit on stderr verbatim.

## Examples

- `cat tool-call.json | claude-wiki-pages hook --gate firewall --target /vault` → block or allow
- `claude-wiki-pages hook --gate frontmatter --cli --target /vault` → per-page OK/ERROR lines
- `claude-wiki-pages hook --gate dmi` → exits 2 on a hard block (DMI violation)

## Related Concepts

- The hook gate system is invoked by `hooks/hooks.json` PostToolUse handlers
- `core/firewall.ts` powers the `firewall` gate
- `commands/hook/frontmatter-gate.ts` and siblings implement individual gate logic

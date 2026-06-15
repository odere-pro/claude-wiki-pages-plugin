---
title: "Hook System"
type: concept
aliases: ["Hook System", "hook system", "hooks", "lifecycle hooks"]
parent: "[[claude-wiki-pages Plugin]]"
path: "plugin"
sources: ["[[Architecture Documentation]]", "[[Design: Component Design]]", "[[Operations Guide]]", "[[Design: Feature Relations]]"]
related: ["[[Four-Layer Stack]]", "[[Firewall]]", "[[Git Checkpoint]]", "[[Deterministic Engine]]", "[[Ingest Agent]]", "[[Curator Agent]]"]
tags: ["concept", "hooks"]
created: 2026-06-13
updated: 2026-06-13
update_count: 5
status: active
confidence: 1.0
---

# Hook System

> [!summary]
> The hook system is Layer 4's enforcement mechanism. Hooks are lifecycle handlers wired in `hooks/hooks.json`; they fire at six defined points in the Claude Code session lifecycle. Blocking hooks (exit code 2) reject tool calls before they touch the filesystem. The hook system is the only layer that can enforce invariants a skill or agent cannot self-enforce — it intercepts tool calls from outside the LLM's context.

## Key Principles

- Hooks enforce invariants that skills and agents cannot self-enforce: they intercept tool calls from outside the LLM's context window and cannot be overridden by prompt injection.
- The PreToolUse chain fires in strict order wired in `hooks/hooks.json`; a blocked write from rule 1 (`firewall.sh`) stops rules 2–5 from producing noise.
- The chain fails closed: an error in any script blocks the write rather than allowing it through.
- PostToolUse hooks are advisory — they emit reminders but never block; they run after the write has already landed.
- The `subagent-commit-gate.sh` backstop is the last safety net: never blocks, always exits 0, commits any uncommitted vault changes the agent left behind.

## Examples

The PreToolUse chain sequence for a write to `wiki/engine/fail-closed.md`:

```
firewall.sh        → ALLOW  (path is inside active vault)
validate-frontmatter.sh → ALLOW  (all required fields present)
check-wikilinks.sh → ALLOW  (all wikilink targets exist)
protect-raw.sh     → ALLOW  (target is wiki/, not raw/)
validate-attachments.sh → ALLOW (no image/pdf source_format)
→ write proceeds
```

Testing a specific path against the firewall:

```bash
bash scripts/engine.sh firewall --target docs/vault --path wiki/engine/fail-closed.md
# Output: { "allowed": true, "matchedRule": "vault" }
```

## Definition

Claude Code exposes six lifecycle hook events: `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `SubagentStop`, and `Stop`. The plugin wires scripts to these events in `hooks/hooks.json`. Each hook is a deterministic bash script that receives tool parameters via stdin (as JSON) and reports its verdict via exit code:

- **Exit 0** — allow the tool call to proceed.
- **Exit 2** — block the tool call (the `PreToolUse` "hard reject" semantic).
- **Any non-zero except 2** — advisory (the call proceeds but a warning is emitted).

This design means the hook system catches failures that skills and agents cannot catch from inside: a broken wikilink that an agent produces but never re-reads, a write to `raw/` that a skill forgets to guard, a completed agent run that left wiki state partially written.

## Related Concepts

- [[Four-Layer Stack]] — the hook system is the enforcement layer of Layer 4
- [[Firewall]] — the confinement check that runs first in the PreToolUse chain
- [[Git Checkpoint]] — the `subagent-commit-gate.sh` backstop creates these
- [[Deterministic Engine]] — engine verbs called by hooks (verify, firewall, backlog)
- [[Ingest Agent]] — the agent whose output `subagent-ingest-gate.sh` audits
- [[Curator Agent]] — the agent that runs `engine heal` as part of its execution

## Hook Events and Scripts

### `SessionStart` — `session-start.sh`

Fires when a Claude Code session opens. Reads the vault registry, reports vault status (active vault path, page count, last ingest, last lint), creates `.claude/claude-wiki-pages/settings.json` on first run, and emits a `DEGRADED:` advisory when a local model is configured with an offline policy that places it in a non-primary role (ADR-0018).

The SessionStart hook is advisory only — it never blocks.

### `UserPromptSubmit` — `prompt-guard.sh`

Fires when the user submits a prompt, before any tool call. The script scans the prompt text for phrases that suggest destructive operations or edits to immutable data:

- Phrases suggesting edits to `raw/` content
- "delete all", "remove all", "wipe" patterns near `wiki/` paths
- Requests to skip hooks or bypass validation

If a risky phrase is detected, the hook emits a warning message in the session. It does not block (exit 0); it surfaces the risk so the user and LLM can reconsider. The posture is "warn and let the human decide," not "refuse."

### `PreToolUse` (Write/Edit) — Five Scripts

The write guard chain. Scripts fire in the exact order wired in `hooks/hooks.json` — order matters because a blocked write from rule 1 should not also produce noise from rules 2–5:

1. **`firewall.sh`** — confinement check first. If the target path is outside the active vault or inside an inactive registered vault, exit 2. No further checks run.
2. **`validate-frontmatter.sh`** — parse YAML frontmatter; check all required fields for the page's `type`; exit 2 if any required field is missing or has an illegal value. Uses the `### Required fields by type` table from `vault/CLAUDE.md` (grep/awk only — no Bun dependency).
3. **`check-wikilinks.sh`** — scan the file's body and frontmatter for wikilinks; exit 2 if any link target does not exist as a file or alias in `wiki/`. Prevents ghost nodes in the Obsidian graph.
4. **`protect-raw.sh`** — exit 2 if the target path is anywhere under `vault/raw/` except the sanctioned `raw/agent-sessions/` carve-out (ADR-0010).
5. **`validate-attachments.sh`** — if the frontmatter declares `source_format: image` or `pdf`, check that `attachment_path` exists under `vault/raw/assets/`; exit 2 if missing.

The chain fails closed: an error in any script blocks the write rather than allowing it through.

### `PostToolUse` (Write/Edit) — Two Scripts

Fires after a write lands in the filesystem. These hooks are advisory — they emit reminders but never block:

- **`post-wiki-write.sh`** — reminds the LLM to update the folder note and `wiki/index.md` when a new page is written. Emits a count of pages in the touched topic folder so the LLM can verify the folder note's `children` list is still accurate.
- **`post-ingest-summary.sh`** — after a source summary is written to `wiki/_sources/`, emits a brief reminder of the next ingest steps (extract entities, update pages, update folder notes, update index, append to log).

### `SubagentStop` — Three Scripts

Fires when a sub-agent (an invoked specialist agent) completes. These gates audit the agent's output:

- **`subagent-lint-gate.sh`** — runs `verify-ingest.sh` against the vault; if any ERROR-level findings are present, exits non-zero to surface them to the orchestrator. This is the primary quality gate after ingest.
- **`subagent-ingest-gate.sh`** — checks that a completed ingest agent run left no half-written state (source summary present but no corresponding entity/concept pages, or pages written but `wiki/index.md` not updated).
- **`subagent-commit-gate.sh`** — the commit backstop: after a write-path agent returns, any vault changes left uncommitted are committed as one labelled backstop commit. Pathspec-scoped to the vault only; never blocks; always exits 0.

The commit backstop is the last safety net: even if the agent forgets to snapshot, the vault change is committed and traceable.

## Why Hooks, Not Skills

Hooks enforce invariants that skills and agents cannot self-enforce because:

1. Skills see only their own output, not the full vault state after every write.
2. An agent can produce a broken wikilink on the last write of a long run and never re-read it.
3. A hook fires synchronously on the tool call itself — it operates at the write boundary, before any state can become inconsistent.
4. Hooks are outside the LLM context window — they cannot be talked around or overridden by prompt injection.

ADR-0001 describes this as the "each gate is in the only place the failure can be observed" principle. Layer 4 failures look like hooks not firing — caught by `SessionStart` reminders and the `doctor` health check.


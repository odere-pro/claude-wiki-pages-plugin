---
description: Run the LLM Wiki — initialize, ingest, curate, or query. The plugin probes vault state and chooses the right next step.
argument-hint: [free-form goal, e.g. "ingest the new papers" or "what does the wiki say about retrieval?"]
allowed-tools: Task, Bash, Read, Glob, Grep
---

# /llm-wiki-stack:wiki

Top-level entry point for `llm-wiki-stack`. One verb the user types; the plugin figures out the rest.

## What this command does

1. **Probe vault state.** Resolve the vault path via `scripts/resolve-vault.sh`. Inspect `vault/CLAUDE.md` (does `schema_version` exist?), `vault/raw/` (any files newer than the last entry in `vault/wiki/log.md`?), and the most recent `wiki/log.md` operation (was the previous run an `ingest` not yet followed by a `lint`?).
2. **Delegate to the orchestrator.** Dispatch the user's prompt and the probe results to the `llm-wiki-stack-orchestrator-agent` via the `Task` tool. The orchestrator owns the routing decision; this command does not.
3. **Surface the result.** Print whatever the orchestrator returns. Specialist fan-out is invisible to the user.

## When to use this command

- The user just installed the plugin and wants to start.
- New files dropped into `vault/raw/`.
- A vault that has not been touched in a while needs to catch up.
- A natural-language question against the wiki.
- Any time the user is unsure which `llm-wiki-*` skill or agent to invoke — this command picks for them.

For power users running a single phase directly, the existing `llm-wiki-*` skills and agents remain available and unchanged.

## Invocation

Pass the user's prompt verbatim (`$ARGUMENTS`) to the orchestrator. Do not pre-classify the prompt; that is the orchestrator's job. If `$ARGUMENTS` is empty, hand control to the orchestrator anyway — it will probe state and either run the wizard, run an ingest, or ask one clarifying question.

```text
Task → llm-wiki-stack-orchestrator-agent
  prompt: $ARGUMENTS
  context: vault path, schema version (if present), raw/ count, last wiki/log.md entry
```

## Companion command

- `/llm-wiki-stack:wiki-doctor` — environment health check. Run it once after install and any time something feels wrong.

## Specification anchor

`/SPEC.md §9 Role A` (orchestrator command), `/SPEC.md §11` (`llm-wiki-stack-orchestrator-agent` contract).

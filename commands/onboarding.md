---
description: Guided first run — from a fresh project to a working, queryable wiki in five short steps. Safe to re-run; resumes from wherever you are.
argument-hint: [optional — e.g. "use the sample source" or a topic you care about]
allowed-tools: Task, Bash, Read, Glob, Grep
---

# /claude-wiki-pages:onboarding

The friendliest way in. Hands control to the `claude-wiki-pages-onboarding-agent`,
which walks you from "just installed" to "I got a cited answer from my own wiki"
one step at a time — health check, scaffold, add a source, ingest (with automatic
git-checkpointed self-heal), ask a question.

## What this command does

1. **Probe state.** Resolve the vault and check what already exists, so it resumes rather than restarts.
2. **Delegate to the onboarding agent** via the `Task` tool, passing `$ARGUMENTS` (e.g. a topic you care about, or "use the sample source").
3. **Surface each step's result** with a plain-language explanation of what just happened and what is next.

## When to use this command

- You just installed the plugin and want a guided start.
- You are unsure which skill or command to run first.
- You want to see the whole loop — scaffold → ingest → query — once, end to end.

For the unguided one-verb entry, use `/claude-wiki-pages:wiki`. For an environment health check, use `/claude-wiki-pages:wiki-doctor`.

## Invocation

```text
Task → claude-wiki-pages-onboarding-agent
  prompt: $ARGUMENTS
  context: vault path, schema version (if present), raw/ count
```

## Specification anchor

`/SPEC.md §9` (commands), `/SPEC.md §11` (`claude-wiki-pages-onboarding-agent`).

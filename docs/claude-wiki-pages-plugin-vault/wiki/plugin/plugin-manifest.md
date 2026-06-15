---
title: "Plugin Manifest"
type: entity
entity_type: product
aliases: ["Plugin Manifest", "plugin manifest", "plugin.json", "claude-wiki-pages manifest"]
parent: "[[Plugin]]"
path: "plugin"
sources: ["[[Plugin Manifest (plugin.json)]]", "[[Plugin README]]", "[[Engine Scripts Layer (CLAUDE.md)]]"]
related: ["[[claude-wiki-pages Plugin]]", "[[Plugin Dev-Time vs Runtime]]", "[[Hook System]]", "[[Schema Version Gate]]"]
tags: ["plugin", "manifest", "metadata"]
created: 2026-06-13
updated: 2026-06-13
update_count: 3
status: active
confidence: 1.0
---

# Plugin Manifest

## Overview

`plugin.json` is the file Claude Code reads to register the `claude-wiki-pages` plugin. It is the identity document for the plugin: it names the plugin, declares its version and license, points to the hook entry point, and specifies which vault schema versions this plugin release supports.

The manifest is a dev-time artifact — it ships in the plugin cache but is not session context for end-users. End-users interact with the plugin through the skills, agents, hooks, and scripts the plugin loads; the manifest is read by the Claude Code plugin loader, not by the LLM. See [[Plugin Dev-Time vs Runtime]] for what is and is not loaded at runtime.

## Key Facts

- **Name:** `claude-wiki-pages`
- **Version:** `1.0.0`
- **License:** Apache-2.0
- **Author:** Aleksandr Derechei (odere.pub@gmail.com)
- **Hook entry point:** `./hooks/hooks.json` — Claude Code wires all hook events (SessionStart, PreToolUse, PostToolUse, SubagentStop, Stop, SessionEnd) through this file. The hook wiring and scripts are one unit; changing hooks.json without updating the scripts breaks the parity tests.
- **Supported schema versions:** [1, 2, 3] — the compatibility contract between this plugin release and vaults.
- **Keywords:** claude-code-plugin, multi-agent, llm, rag, obsidian, provenance, karpathy, llm-wiki, knowledge-management

## Schema Version Compatibility

The `supported_schema_versions` array declares which vault `schema_version` values this release can manage. A vault declaring `schema_version: 3` in its `CLAUDE.md` is handled by this plugin version.

| Schema version | Status in this release                                                            |
| -------------- | --------------------------------------------------------------------------------- |
| 1              | Supported (baseline)                                                              |
| 2              | Supported (adds `topic`, `project`, `manifest` types; `source_quotes`, `derived`) |
| 3              | Supported (folder notes: `<folder>/<folder>.md` replaces `_index.md`)             |
| 4+             | Requires a plugin update                                                          |

If a vault declares a higher schema version than any entry in this array, the `doctor` command reports a compatibility mismatch and recommends updating the plugin.

## Hook Entry Point Contract

`./hooks/hooks.json` is the hook wiring file. Its fields are read by the Claude Code hook harness before any session starts. The manifest's `hookEntryPoint` field is the single reference Claude Code uses to find the hook definitions — no other discovery mechanism exists. The hook system itself is documented at [[Hook System]].

## What Is Not in the Manifest

The manifest does not enumerate skills, agents, or scripts. Claude Code discovers those through the directory structure after the manifest is loaded. The manifest's only job is plugin identity + hook entry point + schema compatibility.

## Related

- [[claude-wiki-pages Plugin]] — the plugin as a whole
- [[Plugin Dev-Time vs Runtime]] — what ships at install vs what is dev-only
- [[Hook System]] — the hook event system the manifest's entry point connects to
- [[Schema Version Gate]] — the engine verb that checks schema compatibility at runtime

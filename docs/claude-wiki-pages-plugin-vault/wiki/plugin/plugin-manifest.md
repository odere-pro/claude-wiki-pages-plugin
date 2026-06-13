---
title: "Plugin Manifest"
type: entity
entity_type: product
aliases: ["Plugin Manifest", "plugin manifest", "plugin.json", "claude-wiki-pages manifest"]
parent: "[[Plugin]]"
path: "plugin"
sources: ["[[Plugin Manifest (plugin.json)]]", "[[Plugin README]]"]
related: ["[[claude-wiki-pages Plugin]]", "[[Plugin Dev-Time vs Runtime]]"]
tags: ["plugin", "manifest", "metadata"]
created: 2026-06-13
updated: 2026-06-13
update_count: 2
status: active
confidence: 1.0
---

# Plugin Manifest

## Overview

`plugin.json` is the file Claude Code reads to register the `claude-wiki-pages` plugin. It is the identity document for the plugin: it names the plugin, declares its version and license, points to the hook entry point, and specifies which vault schema versions this plugin release supports.

The manifest is a dev-time artifact — it ships in the plugin cache but is not session context for end-users. End-users interact with the plugin through the skills, agents, hooks, and scripts the plugin loads; the manifest is read by the Claude Code plugin loader, not by the LLM.

## Key Facts

- **Name:** `claude-wiki-pages`
- **Version:** `1.0.0`
- **License:** Apache-2.0
- **Author:** Aleksandr Derechei (odere.pub@gmail.com)
- **Hook entry point:** `./hooks/hooks.json`
- **Supported schema versions:** [1, 2, 3]
- **Keywords:** claude-code-plugin, multi-agent, llm, rag, obsidian, provenance, karpathy, llm-wiki, knowledge-management

The `supported_schema_versions` array is the compatibility contract between a plugin release and the vaults it can manage. A vault declaring `schema_version: 3` in its `CLAUDE.md` is handled by this plugin version; a vault declaring a higher version would require a plugin update.

## Related

- [[claude-wiki-pages Plugin]] — the plugin as a whole
- [[Plugin Dev-Time vs Runtime]] — what ships at install vs what is dev-only

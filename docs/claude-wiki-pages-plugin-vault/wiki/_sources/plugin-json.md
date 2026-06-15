---
title: "Plugin Manifest (plugin.json)"
type: source
source_type: manual
source_format: text
url: ""
author: "Aleksandr Derechei"
publisher: "odere-pro/claude-wiki-pages-plugin"
date_published: 2026-06-13
date_ingested: 2026-06-13
tags: ["plugin", "manifest", "metadata"]
aliases: ["Plugin Manifest (plugin.json)", "plugin-json", "plugin.json source"]
sources: []
created: 2026-06-13
updated: 2026-06-15
status: active
confidence: 1.0
---

# Plugin Manifest (plugin.json)

## Metadata

- **Author:** Aleksandr Derechei
- **Publisher:** odere-pro/claude-wiki-pages-plugin
- **Published:** 2026-06-13
- **URL:** https://github.com/odere-pro/claude-wiki-pages-plugin

## Summary

The `plugin.json` manifest file that Claude Code reads to register the plugin. Declares name (`claude-wiki-pages`), version (`1.0.0`), description, author (Aleksandr Derechei, odere.pub@gmail.com), homepage and repository URLs, license (Apache-2.0), hook entry point (`./hooks/hooks.json`), supported schema versions ([1, 2, 3]), and keyword list.

## Key Claims

- Plugin version is 1.0.0.
- Supported schema versions: 1, 2, and 3.
- Hook entry point: `./hooks/hooks.json`.
- License: Apache-2.0.
- Keywords include: claude-code-plugin, multi-agent, llm, rag, obsidian, provenance, karpathy, llm-wiki.

## Entities Mentioned

- [[claude-wiki-pages (Plugin)]]
- [[Plugin Manifest]]

## Concepts Covered

- [[Hook System]]
- [[Plugin Dev-Time vs Runtime]]
- [[Schema Authority]]

## Grounded Pages

Wiki pages that cite this source:

- [[Plugin Manifest]] — primary source for manifest fields (name, version, license, hook entry point)
- [[claude-wiki-pages (Plugin)]] — plugin identity declared here
- [[Hook System]] — hook entry point `./hooks/hooks.json` declared in this manifest

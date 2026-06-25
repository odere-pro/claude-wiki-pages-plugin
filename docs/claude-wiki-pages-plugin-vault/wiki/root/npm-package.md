---
title: "NPM Package"
type: entity
entity_type: product
aliases: ["npm package", "@odere-pro/claude-wiki-pages", "package.json"]
parent: "[[root|Root]]"
path: "root"
sources: ["[[root-package-json|Package JSON]]"]
related: []
tags: ["root", "npm", "bun", "distribution"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# NPM Package

`@odere-pro/claude-wiki-pages` is the npm package that ships the plugin's deterministic engine as a CLI tool (`dist/cli.js`), invokable as both `claude-wiki-pages` and `wiki-pages`.

## Overview

The package is an ESM Bun/TypeScript project. The engine verbs (verify, fix, heal, search, doctor, config, etc.) are compiled into `dist/cli.js` via `bun build`. The package ships `dist/`, `schemas/`, `templates/`, and agent definition files (`agents/claude-wiki-pages*.md`) — the minimum needed for installed consumers.

## Key Facts

- **Name**: `@odere-pro/claude-wiki-pages`
- **Version**: 1.1.2 (at time of capture)
- **Type**: ESM (`"type": "module"`)
- **Engines**: Bun >=1.2, Node >=22
- **Bin**: `claude-wiki-pages` and `wiki-pages` → `dist/cli.js`
- **Files in package**: `dist/`, `schemas/`, `templates/`, `agents/claude-wiki-pages*.md`
- **Runtime dependency**: `yaml@2.6.1` (YAML parsing for frontmatter)
- **Dev dependencies**: ESLint 9, `@typescript-eslint` 8.18.2, Prettier 3.4.2, TypeScript 5.7.3, `@types/bun`
- **Scripts**: `build` (Bun build → `dist/`), `test` (bun test), `typecheck` (tsc --noEmit), `format`/`format:check` (prettier), `lint` (eslint)
- **License**: Apache-2.0
- **Author**: Aleksandr Derechei (odere.pub@gmail.com)

## Related

The `schemas/` directory ships with the package so installed consumers validate against the same JSON Schema the repo does. The `templates/default.config.json` is also shipped. `gate-07` CI check keeps schemas and templates in lockstep.

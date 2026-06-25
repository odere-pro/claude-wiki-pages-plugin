---
title: "Root Tooling Config"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "odere-pro"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["root", "tooling", "config", "linting"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# Root Tooling Config

## Metadata

- **Files**: `raw/repo/root/tsconfig.json`, `raw/repo/root/eslint.config.mjs`, `raw/repo/root/bunfig.toml`, `raw/repo/root/knip.json`, `raw/repo/root/.prettierrc.json`, `raw/repo/root/.editorconfig`, `raw/repo/root/.shellcheckrc`, `raw/repo/root/.markdownlint-cli2.jsonc`, `raw/repo/root/.prettierignore`, `raw/repo/root/.gitignore`, `raw/repo/root/.lychee.toml`, `raw/repo/root/.gitleaks.toml`, `raw/repo/root/.pre-commit-config.yaml`, `raw/repo/root/.release-please-manifest.json`
- **Scope**: Repository-root tooling configuration
- **Type**: Development tooling config files

## Summary

All repository-root tooling configuration files for linting, formatting, type-checking, bundling, dead-code detection, secret scanning, link checking, and release management.

## Key Claims

`tsconfig.json`: ESNext target/module/lib, bundler resolution, verbatimModuleSyntax, strict, noUncheckedIndexedAccess, noImplicitOverride, includes `src/**/*.ts`. `eslint.config.mjs`: ESLint 9 flat config (replaces .eslintrc.cjs), @typescript-eslint/eslint-plugin@8.18.2, targets `src/**/*.ts`, enforces no-unused-vars (with `_` prefix escape) and consistent-type-imports. `bunfig.toml`: bun test includes `src/**/*.test.ts` and `tests/engine/*.test.ts`, coverage threshold 80% (line/function/statement). `knip.json`: entry points `src/cli/cli.ts`, `scripts/*.ts`, `src/**/*.test.ts`; project covers `src/**/*.ts` + `scripts/*.ts`; ignores `src/test-helpers/**`; ignoreExportsUsedInFile. `.shellcheckrc`, `.markdownlint-cli2.jsonc`, `.prettierrc.json`, `.lychee.toml`, `.gitleaks.toml`, `.pre-commit-config.yaml`, `.release-please-manifest.json` provide repo-wide code style, link checking, secret scanning, and automated release configuration.
Covers: TypeScript Config, ESLint Config, Bun Config, Knip Dead Code Detection, Tooling, Pre-commit, Release

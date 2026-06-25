---
title: "Dev Tooling"
type: concept
aliases: ["dev tooling", "build tooling", "typescript config", "eslint config", "bun config"]
parent: "[[root|Root]]"
path: "root"
sources: ["[[root-tooling|Root Tooling Config]]", "[[root-package-json|Package JSON]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["root", "tooling", "typescript", "eslint", "bun", "testing"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Dev Tooling

The repository's development tooling stack: Bun as the runtime and test runner, TypeScript with strict settings, ESLint 9 flat config, Prettier, Knip for dead-code detection, and a pre-commit hook chain.

## Definition

The project uses Bun both for the engine runtime (`bun build`, `bun run`) and for unit tests (`bun test`). The TypeScript compiler is used only for type-checking (`tsc --noEmit`) — Bun handles transpilation. ESLint 9 (flat config) enforces TypeScript lint rules. Knip detects unused exports and dead code. Several non-Bun tools handle code style, security, and release management.

## Key Principles

**TypeScript** (`tsconfig.json`): ESNext everywhere, bundler module resolution, `verbatimModuleSyntax`, strict mode, `noUncheckedIndexedAccess`, `noImplicitOverride`. Targets `src/**/*.ts`. Node >=22 required for dev toolchain (ESLint, markdownlint, knip); Bun is the runtime engine.

**ESLint 9 flat config** (`eslint.config.mjs`): Replaced legacy `.eslintrc.cjs` (H21 upgrade). Uses `@typescript-eslint/eslint-plugin@8.18.2`. Enforces `no-unused-vars` (with `_` prefix escape for intentional ignores) and `consistent-type-imports`.

**Bun test** (`bunfig.toml`): Discovers `src/**/*.test.ts` and `tests/engine/*.test.ts`. Coverage threshold 80% (line, function, statement). Coverage disabled in CI (threshold enforced by separate gate).

**Knip** (`knip.json`): Entry `src/cli/cli.ts`, `scripts/*.ts`, tests. Ignores `src/test-helpers/**` and in-file-used exports. Detects truly dead code without false positives from test helpers.

**Additional tools**: Prettier (formatting), shellcheck (bash lint), markdownlint-cli2, lychee (link checker), gitleaks (secret scanning), pre-commit, release-please (automated changelogs and releases).

## Examples

Local dev loop:

1. `bash tests/install-deps.sh` — installs all tools (idempotent)
2. `bun run build` — compile CLI to `dist/cli.js`
3. `bun test` — run all unit tests
4. `bun run typecheck` — type-check without emit
5. `bun run lint` — ESLint on `src/**/*.ts`
6. `bash tests/run-tests.sh` — Tier 0 + Tier 1

## Related Concepts

`gate-07` CI check enforces that `schemas/config.schema.json` and `templates/default.config.json` stay in lockstep. `scripts/validate-docs.sh` (a Tier 0 gate) is a thin wrapper over `engine lint --check docs`.

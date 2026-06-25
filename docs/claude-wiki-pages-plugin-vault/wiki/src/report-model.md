---
title: "Report Model"
type: concept
aliases: ["report-model", "Finding", "Report", "Result Model"]
parent: "[[src|Src]]"
path: "src"
sources: ["[[src-core-report|src/core/report.ts — Result Model]]"]
related: []
tags: ["src", "core", "report", "value-object"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Report Model

The canonical output schema shared by every engine command. `Finding` and `Report` are functional value-objects — `Object.freeze`d, behavior as free functions rather than class methods.

## Definition

The report model is the typed, immutable result envelope every command handler returns. It is the contract between command implementations and the CLI router, between the engine and agent consumers, and between the TypeScript engine and its bash parity twins.

## Key Principles

**Functional value-object pattern**: `Object.freeze` prevents property mutation after construction. Free functions (`buildReport`, `renderText`, `exitCode`) are co-located in the module, pure, and easy to audit.

**Parity contract**: `renderText` must produce byte-identical output to the bash verifiers (pinned by gate-05). Free functions are stabler and more auditable than OO dispatch chains.

**`next?` is JSON-only**: `renderText` intentionally ignores `next` so the text path stays parity-safe.

**Architect ruling (2026-06)**: do NOT convert to class-based OO. The functional value-object shape is the binding convention for this module.

## Examples

- `Severity`: `"error" | "warn" | "info"`. `info` mirrors the two bash yellow lines printed but NOT counted.
- `Finding`: `{ severity, check, message, file? }` — `file` is structured metadata for JSON consumers, NOT echoed in `renderText`.
- `Report`: `{ command, vault, findings, errors, warnings, clean, next? }` — `clean = errors === 0`.
- `buildReport()`: builds frozen Report, tallies errors/warnings.
- `exitCode()`: 1 on any error-severity finding, else 0.
- `renderText()`: color-free, CI-safe, emits ERROR/WARN/INFO lines then summary.

## Related Concepts

- Consumed by the CLI router (`cli/cli.ts`) for stdout and exit-code mapping
- Extended by command-specific report types (`SearchReport`, `HealReport`) via spread
- Parity enforced by gate-05 and gate-11

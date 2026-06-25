---
title: "src/core/report.ts — Result Model"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages plugin"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["src", "core", "report", "result-model"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# src/core/report.ts — Result Model

## Metadata

- **Source**: `raw/repo/src/core/report.ts`
- **Type**: TypeScript implementation

## Summary

The canonical output schema shared by every engine command. `Finding` mirrors `ERROR:`/`WARN:` lines emitted by the bash verifiers so the Bun port can be checked line-for-line by the parity gate. Implemented as functional value-objects, not OO domain objects — `Object.freeze`d, behavior as free functions.

## Key Claims

- `Severity` type: `"error" | "warn" | "info"`
- `Finding` interface: `severity`, `check`, `message`, optional `file`
- `Report` interface: `command`, `vault`, `findings`, `errors`, `warnings`, `clean`, optional `next`
- `buildReport()`: builds a frozen Report, tallies errors/warnings, sets `clean: errors === 0`
- `exitCode()`: returns 1 on any error-severity finding, else 0 — matches bash verifier contract
- `renderText()`: color-free CI-safe rendering producing byte-identical output to bash verifiers
- Design ruling: functional value-object not OO — `Object.freeze` prevents adding properties; free functions avoid class hierarchy coupling; parity contract requires stable auditable output
- `next?` field is JSON-only; `renderText()` intentionally ignores it to preserve parity
- Architect ruling (2026-06): do NOT convert to class-based OO
Covers: Report Model, Finding, Severity, buildReport, renderText, exitCode

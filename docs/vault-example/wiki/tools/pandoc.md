---
title: "Pandoc"
type: entity
entity_type: tool
aliases: ["Pandoc", "pandoc"]
parent: "[[Tools — Index]]"
path: "tools"
sources:
  - "[[Export Outputs]]"
related: ["[[llm-wiki-stack]]", "[[Output Compilation Workflow]]"]
tags: ["tool", "converter"]
created: 2026-04-24
updated: 2026-04-24
update_count: 1
status: active
confidence: 0.6
---

# Pandoc

## Overview

External command-line converter used to turn the plugin's markdown outputs into PDF, DOCX, HTML, and other target formats. Not part of the plugin — invoked against files the plugin has already written to `vault/output/`.

## Key Facts

- Converts `vault/output/<file>.md` to PDF via `pandoc vault/output/my-report.md -o my-report.pdf`.
- Same shape produces DOCX, HTML, etc.
- Claude Code's skill marketplace ships `/pdf`, `/docx`, `/pptx`, `/xlsx` skills that wrap a similar export for conversation-driven flows.

## Related

- [[Output Compilation Workflow]] — where Pandoc fits.
- [[llm-wiki-stack]] — produces the markdown Pandoc converts.

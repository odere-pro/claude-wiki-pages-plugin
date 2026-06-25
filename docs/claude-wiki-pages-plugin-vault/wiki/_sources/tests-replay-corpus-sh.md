---
title: "tests/adversarial/replay-corpus.sh"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["tests", "adversarial"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

## Metadata

- File: `tests/adversarial/replay-corpus.sh`
- Role: Tier 4 prompt-injection corpus replay against the real PreToolUse hook chain

## Summary

Replays a corpus of adversarial tool-call payloads (JSON files prefixed `block-*` or `allow-*`) against the full PreToolUse Write/Edit hook chain in hooks.json order (firewall, validate-frontmatter, check-wikilinks, protect-raw, validate-attachments) and asserts each case's verdict matches its filename prefix. Deterministic: no LLM, no network, no API key.

## Key Claims

Covers: Adversarial Testing, Write-Path Firewall, Hook JSON Protocol
- `block-*` cases document injections the chain must block; `allow-*` cases document the semantic boundary (hooks judge structure, never content).
- `{{VAULT}}` in a payload is substituted with a throwaway copy of minimal-vault, so raw-immutability cases hit a real existing file.
- The corpus proves the hooks decide on structure alone — content injection does not change the verdict.

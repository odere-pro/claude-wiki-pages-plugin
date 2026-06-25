---
title: "Security Policy"
type: source
source_type: policy
source_format: text
url: "https://github.com/odere-pro/claude-wiki-pages-plugin/blob/main/SECURITY.md"
author: "odere-pro"
publisher: "odere-pro"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["root", "security", "threat-model"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

# Security Policy

## Metadata

- **File**: `raw/repo/root/SECURITY.md`
- **Scope**: Security disclosure policy and threat model
- **Type**: Security policy document

## Summary

Combined vulnerability disclosure policy and threat model for the claude-wiki-pages plugin. The security model is structural, not perimeter-based — it is a property of the four layers enforcing the contract between immutable sources and LLM-maintained wiki pages.

## Key Claims

Report privately via email (`odere.pub@gmail.com`) or GitHub Security Advisory, never public issues. Acknowledgement best-effort within 7 days. Three named threats: (1) Prompt injection via ingested sources — defended structurally by `protect-raw.sh` immutability and `validate-frontmatter.sh` schema gates; `prompt-guard.sh` is advisory-only, non-blocking. (2) Provenance tracking — every non-source page requires `sources` frontmatter wikilinks; confidence discipline; `lint` checks structurally. (3) Vault poisoning — ingest is additive by default; contradicting sources add to `contradicts` rather than overwriting. `protect-raw.sh` blocks writes to existing `raw/` files except new-file carve-out for `raw/agent-sessions/`. Tier 4 adversarial CI: `osv-scanner`, prompt-injection corpus replay, `garak` (probe-listing only). Limitations: no cryptographic provenance, no shell sandboxing, confidence scores are LLM opinion. In-scope: hook scripts, vault path resolution, frontmatter validators, SubagentStop gates, skill/agent definitions. Out-of-scope: Claude Code, Obsidian, kepano/obsidian-skills.
Covers: Security Policy, Threat Model, Prompt Injection, Provenance, Vault Poisoning, Adversarial CI

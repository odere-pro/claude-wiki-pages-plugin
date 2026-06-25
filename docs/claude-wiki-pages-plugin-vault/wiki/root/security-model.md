---
title: "Security Model"
type: concept
aliases: ["security model", "threat model", "vulnerability disclosure"]
parent: "[[root|Root]]"
path: "root"
sources: ["[[root-security-md|Security Policy]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["root", "security", "threat-model", "adversarial"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Security Model

The plugin's security model is structural, not perimeter-based — the four-layer stack enforces the contract between immutable sources and LLM-maintained wiki pages.

## Definition

Security properties emerge from the architecture rather than from a separate security layer. The key invariant: raw sources are immutable after ingestion; wiki writes are schema-gated; provenance is traceable via `sources` frontmatter; the vault write perimeter is confined by `firewall.sh`. Vulnerabilities are reported privately and triaged by layer impact.

## Key Principles

**Three named threats:**

1. **Prompt injection via ingested sources** — defended by `protect-raw.sh` (immutability prevents source rewriting after ingestion) and `validate-frontmatter.sh` (schema gates every wiki write). `prompt-guard.sh` is advisory-only and non-blocking by design (semantic detection would be theater conflicting with the NO-RAG model). Tier 4 corpus replay tests this structurally.

2. **Provenance tracking** — every non-source page requires a `sources` frontmatter field with wikilinks to `wiki/_sources/`. Confidence discipline: single-source claims above 0.8 are flagged by lint. `source_quotes` and `derived` fields allow claim-level provenance.

3. **Vault poisoning** — ingest is additive by default. A contradicting source adds itself to the page's `contradicts` field rather than overwriting. Humans audit `wiki/log.md` entries after each pipeline run.

**Limitations (explicit):**
- No cryptographic provenance (the `sources` field is honest but unsigned).
- No shell sandboxing of hook scripts.
- No secret scanning on ingest (human curates `raw/`).
- Confidence scores are the LLM's opinion, not a probability.
- Corpus replay is structural, not semantic.

## Examples

In-scope vulnerabilities: hook script bypasses, path-traversal from vault resolution, frontmatter validator bypasses, SubagentStop gate misclassification, prompt-injection escapes from ingested sources.

Out-of-scope: Claude Code vulnerabilities, Obsidian bugs, kepano/obsidian-skills upstream, user-authored vault content.

## Related Concepts

`protect-raw.sh` enforces raw immutability at the `PreToolUse` boundary. `validate-frontmatter.sh` blocks malformed wiki writes. `firewall.sh` confines agent writes to the resolved vault. The Tier 4 adversarial CI (`adversarial.yml`) runs OSV scanner, prompt-injection corpus replay, and garak weekly.

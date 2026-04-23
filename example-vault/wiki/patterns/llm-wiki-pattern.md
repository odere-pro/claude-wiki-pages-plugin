---
title: "LLM Wiki Pattern"
type: concept
aliases: ["LLM Wiki Pattern", "LLM Wiki", "Karpathy LLM Wiki"]
parent: "[[Patterns — Index]]"
path: "patterns"
sources: ["[[Karpathy LLM Wiki Gist]]"]
related: ["[[Hook-Enforced Guarantees]]", "[[Obsidian]]"]
contradicts: []
supersedes: []
depends_on: []
tags: []
created: 2026-04-18
updated: 2026-04-18
update_count: 1
status: active
confidence: 1.0
---

# LLM Wiki Pattern

## Definition

A maintenance pattern for personal knowledge bases where the human curates raw inputs and the LLM derives a structured, provenance-tracked wiki from those inputs. Introduced by Andrej Karpathy ([[Karpathy LLM Wiki Gist]]).

## Key Principles

- **Provenance is structural.** Every wiki page cites at least one source in `raw/`. A page without a citation cannot exist.
- **Organized by topic, not by source.** A single source updates multiple topic pages rather than producing one summary.
- **Derived, not authoritative.** Contradicting evidence is recorded as a typed relationship — the LLM does not silently overwrite.

## Examples

The Karpathy gist ([[Karpathy LLM Wiki Gist]]) is the canonical reference. `llm-wiki-stack` implements the pattern as a four-layer stack with hook-enforced invariants — see [[Hook-Enforced Guarantees]].

## Related Concepts

- [[Hook-Enforced Guarantees]] — how this stack enforces the pattern's invariants.

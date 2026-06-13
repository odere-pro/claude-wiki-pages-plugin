---
title: "Challenge Mode"
type: concept
aliases: ["Challenge Mode", "challenge mode", "adversarial query", "challenge framing"]
parent: "[[Guides]]"
path: "guides"
sources: ["[[Architecture Documentation]]", "[[User Guide 07: Query the Wiki]]"]
related: ["[[Analyst Agent]]", "[[Query Rules]]", "[[Synthesis Note]]"]
tags: ["concept", "query", "analyst"]
created: 2026-06-13
updated: 2026-06-13
update_count: 2
status: active
confidence: 1.0
---

# Challenge Mode

## Definition

Challenge mode is an adversarial querying approach that asks the wiki to push back on a proposed decision or assumption. The [[Analyst Agent]] surfaces contradictions, evidence gaps, past decisions on similar topics, and counter-arguments from the wiki.

## Key Principles

- **Before writing an ADR, proposal, or decision:** pose the decision as a challenge question.
- **Standard challenge framing:**
  > I'm about to decide [X]. Search the wiki for: past decisions on similar topics, contradictions in my current understanding, gaps in evidence, sources that argue against this approach. Push back on my assumptions.
- **The analyst reads the vault for:** contradictions (`contradicts:` frontmatter), low-confidence claims, missing pages on related topics, and conflicting source evidence.
- **Output:** the analyst surfaces the pushback in the answer; if valuable and novel, offers to file a synthesis note.

## Examples

Before adding a new capability tier: "I'm about to add a `synthesis` tier for local models. What does the wiki say about capability tier governance and past rejections?" → analyst surfaces ADR-0011, ADR-0018, and the tested-and-rejected models table.

## Related Concepts

- [[Analyst Agent]] — the agent with Challenge as one of its five modes
- [[Query Rules]] — the broader query workflow
- [[Synthesis Note]] — the analyst may offer to file the challenge result as a synthesis

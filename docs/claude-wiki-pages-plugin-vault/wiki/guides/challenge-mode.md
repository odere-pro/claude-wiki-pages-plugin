---
title: "Challenge Mode"
type: concept
aliases: ["Challenge Mode", "challenge mode", "adversarial query", "challenge framing"]
parent: "[[Guides]]"
path: "guides"
sources: ["[[Architecture Documentation]]", "[[User Guide 07: Query the Wiki]]", "[[Analyst Modes Skill (SKILL.md)]]"]
related: ["[[Analyst Agent]]", "[[Query Rules]]", "[[Synthesis Note]]", "[[Architecture Decision Record]]", "[[NO-RAG Principle]]", "[[Decisions]]"]
tags: ["concept", "query", "analyst"]
created: 2026-06-13
updated: 2026-06-13
update_count: 4
status: active
confidence: 1.0
---

# Challenge Mode

> [!summary]
> Challenge mode is the [[Analyst Agent]]'s adversarial querying mode — one of its five operating modes. Before writing an ADR, proposal, or significant decision, the user poses the decision with a standard challenge framing. The analyst reads the wiki for contradictions, gaps in evidence, past decisions on similar topics, and counter-arguments, then responds with a structured critique grounded in actual wiki content. It is a technique, not a toggle.

## Definition

Challenge mode is not a configuration flag or a separate agent — it is an invocation pattern for the [[Analyst Agent]]. The pattern is that instead of asking "what does the wiki say about X?", the user frames the question adversarially: "I'm about to decide X — push back on my assumptions."

The rationale is that the wiki's value goes beyond information retrieval. Because the wiki accumulates past decisions (ADRs), contradictions between sources, and confidence-decayed claims, it can surface evidence against a proposed direction that the proposer might overlook. Challenge mode makes this explicit.

## Standard Challenge Framing

```
I'm about to decide [X]. Search the wiki for:
- Past decisions on similar topics
- Contradictions in my current understanding
- Gaps in evidence
- Sources that argue against this approach

Push back on my assumptions.
```

This framing activates the analyst's Challenge mode. The analyst then reads the wiki with explicit attention to `contradicts:` frontmatter relationships, low-confidence claims on related pages, missing pages (gaps), and conflicting source evidence.

## What the Analyst Reads in Challenge Mode

1. **`contradicts:` relationships.** Pages that explicitly contradict the topic in question. If page A has `` contradicts: ["[[B]]"] `` and B is related to the decision, the analyst surfaces it.
2. **Low-confidence pages.** Pages on closely related topics with `confidence < 0.7` signal weakly evidenced claims — the decision may be building on shaky foundations.
3. **Single-source pages.** The lint rule for high-confidence single-source pages exists because a page with `confidence: 0.9` and only one source entry is over-claiming its certainty. The analyst surfaces these as "confident but weakly evidenced."
4. **Gaps:** topics mentioned in the vicinity of the decision but lacking their own wiki page. A gap means the wiki has no tracked knowledge on a concept the decision depends on.
5. **Past ADRs and decision pages.** The `decisions/` topic folder contains concept pages for past architectural decisions. The analyst traverses this folder for decisions that addressed similar trade-offs.

## When to Use Challenge Mode

The schema authority (`vault/CLAUDE.md`) explicitly recommends challenge mode as a pre-decision habit:

> Before writing an ADR, proposal, or making a decision, query the wiki with a challenge framing.

Specifically useful before:
- Writing a new ADR (has the wiki already decided this?)
- Adding a new capability tier to the local model gate (what did rejected tiers teach us?)
- Adding a new page type to the schema (what past decisions closed other page types?)
- Restructuring a folder (have similar restructures been done before?)

## Example

Before adding a `synthesis` tier for local models:

> "I'm about to add a `synthesis` tier for local models. What does the wiki say about capability tier governance and past rejections?"

The analyst reads [[Local Model Quality Gate]], [[Approved Local Model]], [[Capability Tier]], and the decisions folder. It surfaces ADR-0011's measured rejections table, the governance rule that each tier needs its own golden set and ADR amendment before unlocking, and any low-confidence claims about local model synthesis quality.

## Output

The analyst's challenge response:
1. States the counter-evidence found (specific wiki pages, with wikilink citations).
2. Identifies gaps (topics related to the decision that have no wiki page).
3. Notes any contradictions (`contradicts:` relationships found).
4. Summarizes the net assessment: "here is what the wiki says that argues against your assumption."
5. If the challenge produces a novel insight (a contradiction or gap not previously documented), the analyst offers to file it as a synthesis note of `synthesis_type: contradiction` or `synthesis_type: gap`.

The response always ends with the standard `## Sources` section (ADR-0022) — every counter-argument is grounded in a specific wiki page.

## What Challenge Mode Does Not Do

- It does not refuse the user's request or block the decision. It surfaces evidence; the human decides.
- It does not invent counter-arguments not grounded in the wiki. If the wiki has no relevant contradicting evidence, it says so.
- It does not modify any wiki page. It is read-only (plus the optional synthesis note write).

## Related

- [[Analyst Agent]] — the agent with Challenge as one of its five modes
- [[Query Rules]] — the broader query workflow the analyst follows
- [[Synthesis Note]] — the analyst may offer to file the challenge result as a synthesis
- [[Architecture Decision Record]] — the primary use case: pre-ADR challenge queries

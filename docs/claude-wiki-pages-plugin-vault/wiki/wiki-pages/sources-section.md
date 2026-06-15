---
title: "Sources Section"
type: concept
aliases: ["Sources Section", "sources section", "## Sources", "sources grounding", "answer sources"]
parent: "[[Wiki Pages]]"
path: "wiki-pages"
sources: ["[[ADR-0022: Folder Notes and Graph Quality]]", "[[User Guide 07: Query the Wiki]]"]
related: ["[[Query Rules]]", "[[Grounded Retrieval]]", "[[Analyst Agent]]", "[[Synthesis Note]]", "[[Challenge Mode]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["concept", "guides", "query", "provenance"]
created: 2026-06-13
updated: 2026-06-13
update_count: 2
status: active
confidence: 1.0
---

# Sources Section

> [!summary]
> The Sources Section is the `## Sources` block that must appear at the end of every analyst answer, query response, and cited output. It lists the wiki pages consulted in producing the answer as numbered wikilinks plus, optionally, the raw source paths. The Sources Section is the grounding contract for query answers: it is how an answer's provenance is made inspectable.

## Key Principles

- Every analyst answer must end with `## Sources` — mandatory per ADR-0022; it is a query contract, not a suggestion.
- The Sources Section lists every page loaded into context for the answer, not just pages directly quoted; omitting a consulted page breaks the grounding audit trail.
- Wikilinks in the Sources Section must resolve to real pages — dead links are a red flag that the answer was based on a ghost page.
- If no wiki pages were consulted (genuine gap), the Sources Section says so explicitly rather than being omitted.
- The Sources Section of a query answer becomes the `scope:` and `sources:` fields of any synthesis note filed from that answer.

## Examples

A well-formed Sources Section:

```markdown
## Sources

1. [[Firewall]] — raw/docs/adr/ADR-0009-multi-vault-confinement.md
2. [[Multi-Vault Registry]] — raw/docs/operations.md
3. [[Vault Resolution]] — raw/docs/design/05-claude-config-security.md
```

A gap-acknowledgement Sources Section (no pages consulted):

```markdown
## Sources

No wiki pages consulted — the query "what is the retention policy?" is not covered by the current wiki.
Consider adding source material to vault/raw/ and running /claude-wiki-pages:wiki.
```

## Definition

ADR-0022 established the Sources Section grounding contract: every answer produced by the [[Analyst Agent]] or the `/claude-wiki-pages:query` skill must end with a numbered `## Sources` section that cites the wiki pages consulted. This is modeled on research-paper citation practice, adapted for wiki-native wikilinks.

Format:

```markdown
## Sources

1. [[Firewall]] — one-sentence note on why this page was consulted
2. [[Multi-Vault Registry]] — what it contributed to the answer
3. [[ADR-0009: Multi-Vault Registry and Per-Vault Write Confinement]] — the raw source it grounds
```

The section must:

- List every page loaded into context for the answer, not just pages directly quoted
- Use wikilinks so Obsidian resolves them to real pages (dead links are a red flag)
- Appear at the end of the answer, not inline or at the top

## Relationship to Inline Citations

The Sources Section is a summary, not a replacement for inline citations. A well-formed analyst answer has both:

- **Inline citations**: wikilink citations inline in the answer body at the point of each claim (e.g. `[[Firewall]]`)
- **Sources Section**: a numbered list at the end summarizing all pages consulted

The inline citations show which claim came from which page. The Sources Section gives the complete list of pages consulted so the reader can verify that the answer was not narrowly sourced.

## Why This Matters

Query answers without a Sources Section are not trustworthy within the plugin's provenance model. An answer that synthesizes three pages but lists no sources looks like a Claude inference, not a grounded wiki answer. The Sources Section is the signal that distinguishes the two.

User Guide 07 states: "Every answer ends with a `## Sources` section (research-paper style numbered list)." This is not a suggestion — it is the query contract.

## Novel Answer Filing

When a query answer reveals a cross-cutting insight not yet captured in the wiki, the analyst offers to file it as a [[Synthesis Note]]. The Sources Section of the original answer becomes the `scope:` and `sources:` fields of the synthesis note: the same pages that grounded the answer are listed in the synthesis note as the evidence base.

## Related Concepts

- [[Query Rules]] — the full query workflow; the Sources Section is the terminal step
- [[Grounded Retrieval]] — the retrieval discipline that ensures the Sources Section lists pages actually consulted
- [[Analyst Agent]] — the agent that produces Sources Sections as part of every answer
- [[Synthesis Note]] — a permanent wiki page that extends the Sources Section grounding to a stored analysis
- [[Challenge Mode]] — a query mode that explicitly surfaces contradictions; the Sources Section includes pages on both sides of a contradiction

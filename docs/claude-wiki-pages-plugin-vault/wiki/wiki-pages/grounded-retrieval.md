---
title: "Grounded Retrieval"
type: concept
aliases: ["Grounded Retrieval", "grounded retrieval", "ground-then-judge", "engine-grounded retrieval"]
parent: "[[wiki-pages|Wiki Pages]]"
path: "wiki-pages"
sources: ["[[wiki-pages-skill|Wiki Pages Skill (maintain-contract SKILL.md)]]"]
related: ["[[maintain-contract|Maintain Contract]]", "[[query-rules|Query Rules]]"]
contradicts: []
supersedes: []
depends_on: []
tags: ["concept", "retrieval", "grounding"]
created: 2026-06-13
updated: 2026-06-13
update_count: 1
status: active
confidence: 1.0
---

# Grounded Retrieval

> [!summary]
> Grounded retrieval is the discipline of computing facts with the engine before the LLM reasons over them. The agent fetches candidate pages from the wiki using deterministic engine calls (`search`, `grep`), then reasons only over those retrieved pages — never from memory or training knowledge. Every answer cites the wiki page it came from by wikilink. If the wiki has no answer, the agent says so rather than hallucinating one.

## Definition

Grounded retrieval is the retrieval half of the [[maintain-contract|Maintain Contract]]'s first invariant: "Ground, then judge, then verify." In practical terms it means:

1. **Ground:** use the Deterministic Engine (`engine.sh search`, or `grep` over `wiki/`) to fetch the set of candidate pages that are most relevant to the question.
2. **Judge:** reason over those fetched pages — synthesize, compare, conclude — not over training knowledge or memory.
3. **Verify:** cite every claim with its wiki page source by wikilink, and close the operation with a `## Sources` section so the answer is auditable.

The NO-RAG Principle explains why grounded retrieval works without a vector database: the wiki is small enough that keyword + synonym + graph-walk retrieval (the Wiki-Native Recall algorithm) finds the right pages without embeddings. Grounded retrieval is the agent-side discipline that pairs with the engine's deterministic recall.

## Key Principles

### Engine First, Reason Second

An LLM can synthesize an answer from any text in its context window. The risk is answering from training knowledge (which may contradict or predate the wiki) or from a hallucinated page. Grounded retrieval eliminates that risk by confining the reasoning step to a definite set of fetched pages. If a claim cannot be traced to a fetched page, it is not stated.

### Citation Is Not Optional

Every claim in a grounded answer must cite its source page inline (e.g. `[[Firewall]]`) and appear in the trailing `## Sources` section. This makes the answer auditable: a reviewer can check every claim by reading the cited page. A claim without a citation is either a fabrication or an import from training knowledge — both are disallowed.

### Honest Gap Declaration

If the engine retrieval returns no relevant pages, or the relevant pages do not contain the answer, the agent declares a gap explicitly:

```markdown
## Sources

No wiki pages consulted — this question is not covered by the current wiki. See the gap note above.
```

Declaring a gap is always preferable to an uncited answer. The user can then add the missing source to `raw/` and run the [[ingest-pipeline|Ingest Pipeline]].

### N≤2 Traversal Limit

When following wikilinks from seed pages (via `related`, `depends_on`, `sources`), grounded retrieval traverses at most 2 hops. Pages reached at hop 2 contribute supporting context, not primary evidence. This keeps the context window focused and the provenance traceable. The limit comes from [[_sources/adr-0008-graph-traversal-primitive|ADR-0008: One Graph-Traversal Primitive]].

## Examples

Correct grounded-retrieval answer:

> The firewall confines all writes to the active vault root and fails closed when the registry is malformed Firewall. Cross-vault writes are blocked before the `allowPaths` check — even a permissive allow-list cannot override the `cross-vault` deny rule Multi-Vault Registry.
>
> ## Sources
>
> 1. Firewall — raw/docs/adr/ADR-0009-multi-vault-confinement.md
> 2. Multi-Vault Registry — raw/docs/adr/ADR-0016-simultaneous-multi-vault-management.md

Incorrect (not grounded):

> The firewall uses RSA-256 encryption to protect vault boundaries. _(no citation — this claim is not on any wiki page)_

## Related Concepts

- [[maintain-contract|Maintain Contract]] — the first invariant "ground, then judge, then verify" is the parent principle
- [[query-rules|Query Rules]] — the 7-step query workflow that implements grounded retrieval for user-facing queries
- NO-RAG Principle — why the wiki uses keyword recall instead of vector embeddings
- Wiki-Native Recall — the engine algorithm (keyword + synonym + graph walk) that provides the grounding
- Provenance Checks — engine-side checks that ensure pages have valid `sources:` chains

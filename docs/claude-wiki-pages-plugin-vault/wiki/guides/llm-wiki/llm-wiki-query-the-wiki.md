---
title: "LLM Wiki — Query the Wiki"
type: concept
aliases: ["llm-wiki-query-the-wiki", "LLM Wiki Query", "query the wiki guide"]
parent: "[[llm-wiki|LLM Wiki Guides]]"
path: "guides/llm-wiki"
sources: ["[[docs-llm-wiki-07|LLM Wiki Guide 07 — Query the Wiki]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["docs", "llm-wiki", "user-guides", "retrieval"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# LLM Wiki — Query the Wiki

How to query the wiki: entry verb, the analyst agent's five operating modes, challenge framing for adversarial self-questioning, and the six-step query protocol that every answer follows.

## Definition

"Querying the wiki" means asking the analyst agent to retrieve and synthesize information from the wiki's structured pages. Retrieval is lexical (NO-RAG — no embeddings); synthesis is the LLM step that composes a cited answer from retrieved pages.

## Key Principles

**Entry:** `/claude-wiki-pages:wiki <question>`. The orchestrator detects the analytical intent and dispatches the analyst-agent.

**Five analyst modes:**
1. **Query** — answer a question with wikilink citations.
2. **Dashboard** — compile metrics and status from the wiki's frontmatter.
3. **Document Compile** — reconstruct a full document (e.g., an ADR, a design doc) by traversing the relevant pages.
4. **Extract** — pull structured data from pages (e.g., all entity pages of type "tool").
5. **Challenge** — adversarial mode: find contradictions, past decisions, evidence gaps, and arguments against the user's current plan.

**Challenge framing.** Use the challenge mode before making an important decision: "I'm about to decide X. Search the wiki for past decisions on similar topics, contradictions in my current understanding, gaps in evidence, and sources that argue against this approach." This is the most underused mode.

**Six-step query protocol.** (1) Read `wiki/index.md` to find relevant pages. (2) Descend from the relevant folder note. (3) Read matching pages. (4) Follow wikilinks for context. (5) Synthesize an answer with `[[wikilink]]` citations. (6) End with a `## Sources` section (numbered, one entry per consulted wiki page). Offer to file a novel answer as a synthesis note.

**No embeddings.** Finding pages is lexical (Porter stemmer, synonym lexicon, `--graph` walk). The LLM step is synthesis only — it never ranks by vector similarity.

## Examples

"What graph topology decisions have been made for Obsidian integration?" triggers a Query that searches for topic-local-linking, strict-tree, wiki-only-graph, and folder-notes pages, then synthesizes a cited answer.

## Related Concepts

The NO-RAG stance is documented in `vault/CLAUDE.md` and ADR-0007. The challenge framing template is in the schema's "Challenge mode" section. Synthesis notes produced by this mode go to `wiki/_synthesis/`.

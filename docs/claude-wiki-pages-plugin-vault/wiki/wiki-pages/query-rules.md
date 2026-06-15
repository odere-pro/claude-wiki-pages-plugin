---
title: "Query Rules"
type: concept
aliases: ["Query Rules", "query rules", "query workflow", "query protocol"]
parent: "[[wiki-pages|Wiki Pages]]"
path: "wiki-pages"
sources: ["[[_sources/architecture|Architecture Documentation]]", "[[llm-wiki-07-query-the-wiki|User Guide 07: Query the Wiki]]", "[[adr-0022-folder-notes-graph-quality|ADR-0022: Folder Notes and Graph Quality]]", "[[wiki-pages-skill|Wiki Pages Skill (maintain-contract SKILL.md)]]", "[[llm-analyst-modes-skill|Analyst Modes Skill (SKILL.md)]]"]
related: ["[[analyst-agent|Analyst Agent]]", "[[challenge-mode|Challenge Mode]]", "[[wiki-native-recall|Wiki-Native Recall]]", "[[synthesis-note|Synthesis Note]]", "[[no-rag-principle|NO-RAG Principle]]", "[[grounded-retrieval|Grounded Retrieval]]", "[[analyst-dashboard-mode|Analyst Dashboard Mode]]", "[[analyst-document-compile-mode|Analyst Document Compile Mode]]", "[[analyst-extract-mode|Analyst Extract Mode]]"]
tags: ["concept", "query"]
created: 2026-06-13
updated: 2026-06-13
update_count: 6
status: active
confidence: 1.0
---

# Query Rules

> [!summary]
> Query rules are the structured workflow for answering questions from the wiki. Every answer must cite pages via wikilinks and end with a `## Sources` section (ADR-0022) — numbered, research-paper style. The workflow follows the topic tree from root to specific pages, never guessing at answers not grounded in wiki content. If the answer is novel, the agent offers to file it as a synthesis note. If the wiki has no answer, the agent says so explicitly.

## Definition

Query rules are the structured 7-step workflow for answering questions from the wiki. Every answer must cite pages via inline wikilinks and end with a `## Sources` section (ADR-0022) — numbered, research-paper style with one entry per consulted page listing its raw source file paths.

## Key Principles

- The answer must come from explicit wiki pages — do not synthesize from training knowledge not on any wiki page; if the wiki lacks an answer, say so explicitly.
- Every answer ends with `## Sources` — mandatory per ADR-0022; if no pages were consulted, say so in the section rather than omitting it.
- Traverse the topic tree top-down: read `wiki/index.md` first, then the folder note, then specific pages — more efficient than scanning all pages.
- Follow wikilinks at most 2 hops from seed pages (the N≤2 limit from ADR-0008); pages at hop 2 contribute supporting context, not primary evidence.
- If the synthesized answer is novel, offer to file it as a synthesis note under `wiki/_synthesis/`.

## Examples

A well-formed `## Sources` section:

```markdown
## Sources

1. [[Firewall]] — raw/docs/adr/ADR-0009-multi-vault-confinement.md
2. [[vault-resolution|Vault Resolution]] — raw/docs/operations.md
```

A gap-acknowledgement `## Sources` section:

```markdown
## Sources

No wiki pages consulted — this question is not covered by the current wiki.
Consider dropping the source document into vault/raw/ and running the pipeline.
```

## Purpose

The query rules exist to make wiki answers auditable and traceable. An LLM can synthesize an answer from any text in its context window, including material that contradicts the wiki. The query rules enforce that the answer comes from explicit wiki pages and can be checked by reading the cited pages.

The rules apply to both the `/claude-wiki-pages:query` skill and the [[analyst-agent|Analyst Agent]]'s Query mode. They are the same protocol — the agent simply has more operating modes around it.

## The 7-Step Query Workflow

### Step 1 — Read `wiki/index.md`

Start with the vault MOC to identify relevant topic folders. `wiki/index.md` lists all top-level topic folders and their pages. This step orients the retrieval: which part of the topic tree is most likely to contain the answer?

If the query is broad (spans multiple topics), note all relevant topic folders before proceeding.

### Step 2 — Traverse the Topic Tree

For topic-scoped queries, start from the relevant folder note and traverse downward:

- Read the topic folder note to see all pages in the folder.
- Follow `child_indexes` to reach sub-topic folder notes.
- Identify which pages are most relevant to the question.

This top-down traversal is more efficient than scanning all pages: the topic tree is designed to let the reader navigate to the right neighborhood before diving in.

### Step 3 — Read Matching Pages and Follow Wikilinks

Read the most relevant pages. Then follow their `related`, `depends_on`, and `sources` wikilinks to gather cross-topic context. The [[wiki-native-recall|Wiki-Native Recall]] engine assists: for direct query skill use, the engine's `search` verb identifies candidate pages by keyword, synonym, and graph traversal.

When following wikilinks, traverse at most 2 hops from the seed pages (the N≤2 limit from ADR-0008). Pages reached at hop 2 contribute supporting context, not primary evidence.

### Step 4 — Synthesize an Answer with Wikilink Citations

Compose the answer from the content on the wiki pages. Every claim must come from a specific page. Inline citations use wikilink syntax:

> The firewall confines all writes to the active vault [[Firewall]] and fails closed on any error [[vault-resolution|Vault Resolution]].

Do not synthesize answers from training knowledge that is not on any wiki page. If the wiki does not have the answer, say so (see "When the Wiki Has No Answer" below).

### Step 5 — End Every Answer with `## Sources`

**This is mandatory (ADR-0022).** Format:

```markdown
## Sources

1. [[Firewall]] — raw/docs/adr/ADR-0009-multi-vault-confinement.md
2. [[vault-resolution|Vault Resolution]] — raw/docs/operations.md, raw/docs/design/05-claude-config-security.md
```

One entry per consulted wiki page: the wikilink title followed by the raw source file paths from that page's `sources:` frontmatter. If no pages were consulted — a genuine gap — say so explicitly:

```markdown
## Sources

No wiki pages consulted — this question is not covered by the current wiki. See the gap note above.
```

Never omit the `## Sources` section.

### Step 6 — Offer to File Novel Answers

If the synthesized answer is genuinely novel — not a restatement of existing pages, but an insight produced by connecting multiple pages — offer to file it as a synthesis note:

```
This answer connects [[Firewall]] and [[multi-vault-registry|Multi-Vault Registry]] in a way that is not explicitly stated on either page. Would you like me to file it as a synthesis note under wiki/_synthesis/?
```

The synthesis note would be `type: synthesis`, with appropriate `synthesis_type` (comparison, theme, contradiction, gap, or timeline), `scope:` listing the contributing pages, and `sources:` reflecting the provenance chain.

### Step 7 — Append to `wiki/log.md`

```markdown
## [YYYY-MM-DD] query | Question summary
```

Every query is logged. The log entry records that the wiki was consulted and for what purpose. This is also how the [[orchestrator-agent|Orchestrator Agent]] knows whether the wiki has been queried recently.

## When the Wiki Has No Answer

If the relevant pages do not exist or do not contain the answer, say so explicitly. Do not invent an answer. Options for the user:

1. **Add the missing material:** drop the source document into `vault/raw/` and run the pipeline.
2. **Record the gap:** file a synthesis note with `synthesis_type: gap` even without an answer — a documented gap tells future-you where to look.

The [[analyst-agent|Analyst Agent]] in Challenge mode will surface this gap explicitly if the user is making a decision that depends on the missing knowledge.

## Confidence and Citation Discipline

When reading a page to answer a query, check:

- **`sources:`** — is the claim backed by a real source in `wiki/_sources/`?
- **`confidence:`** — values below 0.7 signal weakly evidenced claims; treat accordingly and note the low confidence in the answer.
- **`updated:`** — a stale page (30+ days without update despite newer related sources) may have been overtaken by new material.

If the answer's key claims come from a single low-confidence page, say so in the answer rather than presenting it as settled fact.

## Using the Analyst Agent

For questions that span topics, require comparisons, or need document compilation:

```
/claude-wiki-pages:claude-wiki-pages-analyst-agent compare [[Firewall]] and [[vault-resolution|Vault Resolution]] — produce a side-by-side table.
```

For adversarial pre-decision queries:

```
/claude-wiki-pages:claude-wiki-pages-analyst-agent challenge mode — I'm about to decide X. Push back.
```

See [[challenge-mode|Challenge Mode]] for the full adversarial query pattern.

## Exporting Answers

When a query answer is needed as portable markdown (for a PR comment, email, or README):

```
/claude-wiki-pages:markdown what does the wiki say about <topic>?
```

The markdown skill runs the same query protocol, then renders the answer without wikilinks, Dataview blocks, or Obsidian callouts, and writes it to `vault/output/<slug>.md`. Provenance is preserved in the output file's trailing attribution.

## Related Concepts

- [[analyst-agent|Analyst Agent]] — executes queries in Query mode and four other modes
- [[challenge-mode|Challenge Mode]] — adversarial query variant for pre-decision pushback
- [[wiki-native-recall|Wiki-Native Recall]] — the deterministic retrieval the engine uses to find candidate pages
- [[synthesis-note|Synthesis Note]] — the output the agent may produce for novel answers
- [[no-rag-principle|NO-RAG Principle]] — the constraint that makes retrieval deterministic

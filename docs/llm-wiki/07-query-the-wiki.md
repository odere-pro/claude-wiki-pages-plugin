# 7. Query the wiki

> Reference. For the day-1 path, see [index.md](./index.md).

The wiki exists to be asked questions. Answers come back with `[[wikilink]]` citations so you can audit every claim.

## Basic query

```
/llm-wiki-stack:llm-wiki-query what does the wiki say about the [[LLM Wiki Pattern]]?
```

Or without the argument:

```
/llm-wiki-stack:llm-wiki-query
```

…then type your question when prompted.

The skill:

1. Reads the vault MOC (`wiki/index.md`) to find relevant pages.
2. Traverses the topic tree from the relevant per-folder MOCs (`_index.md`).
3. Synthesizes an answer with inline `[[wikilinks]]` back to specific wiki pages.
4. Appends a `## [YYYY-MM-DD] query | Question summary` entry to `wiki/log.md` so the query is recorded.

## Deeper / cross-topic queries → the analyst agent

For questions that span topics or require tables, comparisons, or document compilation, use the agent:

```
/llm-wiki-stack:llm-wiki-stack-analyst-agent <your question>
```

Examples:

- "Compare [[LLM Wiki Pattern]] and [[Hook-Enforced Guarantees]]. Produce a side-by-side table."
- "What preconditions must be true before I can trust a page citing only one source?"
- "Which topic folder has the highest update count per page, and why?"

The agent can also run in **challenge mode** — pressure-test an idea against the wiki:

```
/llm-wiki-stack:llm-wiki-stack-analyst-agent challenge mode — I'm about to decide I only need one authoritative source per concept. Push back.
```

The agent searches for contradicting sources, gaps, and past decisions that argue against the proposal, then responds with a structured critique.

## Citations and confidence

Every claim in a query response should end in a `[[wikilink]]`. When you see one, open the cited page and check:

- `sources:` — is the claim backed by a real source in `wiki/_sources/`?
- `confidence:` — low confidence (< 0.7) means the claim is weakly evidenced; treat accordingly.
- `updated:` — a stale page (30+ days) may have been overtaken by newer material.

If the answer's confidence depends on a single source, say so to the reader — the wiki's single-source-high-confidence lint check surfaces this exact risk.

## When the wiki does NOT have an answer

The query skill will tell you. Do not invent one.

Options:

- Drop the missing material into `vault/raw/` and run the pipeline (see [guide 3](./03-update-existing.md)).
- Record the gap as a synthesis note under `wiki/_synthesis/` with `synthesis_type: gap`. Useful even without an answer — a documented gap tells future-you where to look.

## Save a good answer as a synthesis note

If a query produces a genuinely novel insight (not restating existing pages), offer to file it:

```
/llm-wiki-stack:llm-wiki-query ... and save as synthesis
```

The skill creates `wiki/_synthesis/<slug>.md` with `type: synthesis`, the right `synthesis_type`, `scope:` covering the pages referenced, and `sources:` reflecting the provenance chain.

## Querying by frontmatter (Obsidian Dataview)

If you want a table, not prose, use the dashboard page ([guide 6](./06-check-the-dashboard.md)) as a template. Dataview lets you scope queries by any frontmatter field:

```
TABLE confidence, updated
FROM "wiki/patterns"
WHERE type = "concept" AND confidence < 0.7
SORT confidence ASC
```

Add queries like this to `dashboard.md` (or create a new Dataview page) when they are reusable.

## Tips

- **Be specific about scope.** "What does the wiki say about [[LLM Wiki Pattern]]?" is better than "tell me about wikis".
- **Ask for citations.** The default behavior includes them, but asking for "with citations to specific pages" reinforces it.
- **Ask the agent to write to a file** if the answer is long. Otherwise the response scrolls off.
- **Chain queries.** Use the answer from one query as context for the next — Claude's session keeps the running context.

## Exporting to regular markdown

When you need a shareable artifact (a PR comment, an email, a README
snippet), use `/llm-wiki-stack:llm-wiki-markdown` instead of the query
skill:

```
/llm-wiki-stack:llm-wiki-markdown what does the wiki say about <topic>?
```

The skill runs the same reading contract as the query, then renders the
answer as portable markdown — no `[[wikilinks]]`, no Dataview blocks, no
Obsidian callouts — and writes it to `vault/output/<slug>.md`. Provenance
is preserved in the file's `sources:` frontmatter and a trailing
attribution line, so the reader can still trace every claim back to the
wiki.

A `## [YYYY-MM-DD] markdown | <summary> → output/<slug>.md` entry is
appended to `wiki/log.md` so the export is recorded.

## You have arrived

If you have worked through `index.md` day-1/7/30 and skimmed guides 1–7, you now know how to install, seed, extend, validate, deliver, monitor, and interrogate the wiki. The rest is habit: drop sources, run the pipeline, lint every 10 ingests, query daily.

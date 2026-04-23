---
name: llm-wiki-query
description: >
  Answer a natural-language question from the wiki with [[wikilink]] citations.
  Trigger when the user asks "what does the wiki say about X", "search the
  wiki for Y", "which sources cover Z", or invokes
  /llm-wiki-stack:llm-wiki-query directly. Read-only against wiki content —
  only log.md receives an append.
allowed-tools: Read Glob Grep Edit
---

# LLM Wiki — Query

Answer a question from `vault/wiki/` with citations back to specific pages.

Unlike a general-purpose search, this skill commits to the wiki's provenance
model: every claim in the answer carries one or more `[[wikilink]]` citations,
and every cited page must resolve. No hallucinated titles, no paraphrase
without a source.

## When to invoke

- The user asks a natural-language question about a topic that might be
  covered in the wiki.
- An agent (`llm-wiki-analyst`) is chaining query as a step.

Do NOT invoke for questions about the *plugin itself* (how to install, which
hooks fire, what a skill does) — those are answered from the docs, not the
wiki.

## Reading contract

- `vault/CLAUDE.md` — the schema. Read first.
- `vault/wiki/index.md` — the top-level catalog. First pass to shortlist
  candidate pages.
- `vault/wiki/**/_index.md` — per-folder MOCs. Second pass to narrow.
- `vault/wiki/<topic>/*.md` — candidate typed pages, plus any pages reached by
  following `[[wikilinks]]` from them.
- `vault/wiki/_synthesis/*.md` — prior syntheses, if relevant.
- `vault/wiki/_sources/*.md` — source summaries, when provenance matters to
  the answer.

## Writing contract

- Append a single line to `vault/wiki/log.md`:
  `## [YYYY-MM-DD] query | <question summary>`
- No other writes unless the user accepts the optional offer to file the
  answer as a synthesis note — in which case control is passed to
  `/llm-wiki-stack:llm-wiki-synthesize` and the write happens there, not here.

This skill MUST NOT:

- Mutate any wiki page to "fix" content it disagrees with (that is a lint-fix
  or a human decision).
- Fabricate a wikilink. Every `[[link]]` in the answer must point to an
  existing page.

## Workflow

1. **Schema.** Read `vault/CLAUDE.md`.
2. **Shortlist.** Read `wiki/index.md`; identify candidate top-level topics.
   For topic-scoped questions, jump to the relevant per-folder MOC
   (`wiki/<topic>/_index.md`) and traverse from there.
3. **Gather.** Read matching pages. Follow `related:`, `sources:`, `scope:`,
   `children:`, and `child_indexes:` wikilinks until the context is sufficient.
4. **Synthesize.** Build an answer whose every claim resolves to at least one
   cited wiki page. Prefer the most specific page over the most general one.
5. **Verify citations.** For each `[[link]]` in the answer, confirm the target
   page exists. Strip unresolved links — never print a dangling wikilink.
6. **Offer.** If the answer is substantial and no existing synthesis covers
   it, offer to file the answer as a new synthesis note under
   `wiki/_synthesis/`. Wait for the user to opt in.
7. **Log.** Append the query entry to `wiki/log.md`.

## Answer shape

Prefer this structure:

```
<direct answer in 1–3 sentences, with inline [[citations]]>

### Supporting pages
- [[Page A]] — <one-line why this page matters for the question>
- [[Page B]] — ...

### Caveats
- <contradictions, low-confidence claims, gaps>
```

Omit "Caveats" if there are none. Keep the direct answer tight — long prose
belongs in a synthesis note, not a query response.

## Completion signal

Print the answer. Then, on a new line:

```
Logged: query | <truncated question>
```

If the user accepted the synthesis offer, additionally print:

```
Handing off to /llm-wiki-stack:llm-wiki-synthesize.
```

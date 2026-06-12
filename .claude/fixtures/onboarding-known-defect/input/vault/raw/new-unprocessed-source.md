# Query the Wiki

Once the wiki holds at least one ingested source, you can ask it questions and get cited answers.

## Asking a question

Run `/claude-wiki-pages:query` and type a natural-language question. The query workflow reads `wiki/index.md` first, traverses the relevant topic folder note, reads matching pages, and synthesizes an answer with `[[wikilink]]` citations back to specific wiki pages.

## Citations

Every claim in an answer links to the page it came from, so the provenance chain back to `raw/` is never broken. If an answer is valuable and novel, the workflow offers to file it as a synthesis page under `wiki/_synthesis/`.

## Logging

Each query appends a `## [YYYY-MM-DD] query | <summary>` entry to `wiki/log.md`.

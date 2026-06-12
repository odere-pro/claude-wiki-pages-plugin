# What Is a Wiki and How Does It Work?

A wiki is a collaboratively editable collection of linked pages on a shared topic. The word
comes from the Hawaiian "wiki wiki", meaning quick. The first wiki, WikiWikiWeb, was created
by Ward Cunningham in 1994 to let software engineers share design patterns.

## Core principles

**Linked pages.** Each page focuses on one topic and links to related pages by name. Following
links is how a reader navigates from a broad overview down to a specific detail.

**Anyone can edit.** The original wikis allowed any reader to edit any page. A personal or
team wiki may restrict edits to a smaller group, but the editing model stays the same:
pages are meant to be revised over time as understanding grows.

**Plain text with light markup.** Wiki pages use a simple text format — headings, bullet
lists, bold, and wikilinks — that renders well in a browser and stays readable as raw text.

**Revision history.** Every change is recorded. You can compare any two versions of a page
or revert to an earlier state. This makes wikis safe for collaborative editing: mistakes are
always recoverable.

## How an LLM wiki differs

In Andrej Karpathy's LLM wiki pattern, the language model (not a human) maintains the wiki
pages. The human places source documents into a `raw/` folder. The LLM reads those sources,
writes typed wiki pages with citations, and keeps the pages up-to-date as new sources arrive.

The human's job is to curate sources and ask questions. The LLM's job is to synthesize
sources into a structured, provenance-tracked knowledge base.

This separation of roles means:

- Sources in `raw/` are immutable — the LLM never modifies them.
- Pages in `wiki/` are LLM-maintained — humans do not edit them directly.
- Every claim on a wiki page traces back to a specific source in `raw/`.

## Why this matters

A wiki built this way stays grounded. Claims without sources cannot exist. When a source is
updated or contradicted by a newer source, the affected pages are flagged for review. The
knowledge base is always traceable to its origins.

---

This file is a bundled sample source included with the claude-wiki-pages plugin. Drop your
own files into `raw/` alongside this one, then run `/claude-wiki-pages:wiki` to ingest them.
To ingest this sample, run `/claude-wiki-pages:wiki` — the orchestrator will detect the
pending source and start the ingest pipeline.

# LLM Wiki

> Source: Andrej Karpathy, GitHub Gist, February 2026.
> URL: https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
>
> Copied verbatim for the example vault. Do not edit — sources in `raw/` are immutable.

---

A practical pattern for using an LLM to maintain a personal wiki.

The human curates raw inputs — papers, articles, clipped web pages, transcripts — and drops them in `raw/`. The LLM reads those inputs and maintains a structured `wiki/` folder that summarizes what has been learned. The wiki is organized by topic, not by source; a single source updates multiple wiki pages rather than creating one summary page.

Two invariants make the pattern work.

First, **provenance is structural, not cultural**. Every wiki page links back to at least one source. The sources folder is the foundation of the tree; without a source, a page cannot exist.

Second, **the wiki is derived, not authoritative**. When a new source contradicts an existing page, the LLM does not silently overwrite the page; it adds the contradiction as a typed relationship. The human decides how to resolve it.

The result is a knowledge base that grows with reading, stays auditable, and survives the LLM changing its mind.

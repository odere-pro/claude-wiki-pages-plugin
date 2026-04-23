---
description: "Immutability contract for raw source files — never edit, rename, or delete after placement"
paths:
  - "vault/raw/**"
---

# Raw sources are immutable

Files in `vault/raw/` must never be modified after they are placed here. This directory holds the original source material — articles, PDFs, clipped pages, transcripts.

- Do not edit, rename, or delete files in `vault/raw/`.
- To add a new source, create/copy the file into `vault/raw/`.
- To process a source, run `/llm-wiki-stack:llm-wiki-ingest` — it reads from `raw/` and writes to `wiki/`.
- If a source contains errors, note the corrections in the wiki page, not in the raw file.

---
title: "tests/gates/gate-13-no-rag.sh"
type: source
source_type: manual
source_format: text
url: ""
author: "odere-pro"
publisher: "claude-wiki-pages"
date_published: 2026-06-25
date_ingested: 2026-06-25
tags: ["tests", "gates"]
aliases: []
sources: []
created: 2026-06-25
updated: 2026-06-25
status: active
confidence: 1.0
---

## Metadata

- File: `tests/gates/gate-13-no-rag.sh`
- Role: CI engine gate — static NO-RAG invariant scanner (grep-only, no Bun dependency)

## Summary

Scans the retrieval path source files for forbidden import patterns (openai, anthropic, cohere, transformers, faiss, chromadb, pinecone, etc.) and forbidden runtime tokens (fetch, http, embedding, vector, cosine, knn, encode, similarity). All ERE metacharacters are properly escaped so `grep` errors cannot be swallowed. A `--self-test` mode plants forbidden tokens in temp files and asserts the scanner catches each one.

## Key Claims

Covers: NO-RAG Invariant, CI Gates, Adversarial Testing
- The only gate that runs with no Bun/Node dependency — pure grep, so it works on bare shell boxes.
- Forbidden tokens use escaped ERE patterns (e.g., `fetch\(`) to prevent the historic fail-open regression.
- `--self-test` is the gate's own adversarial probe — the gate must prove it cannot fail open.

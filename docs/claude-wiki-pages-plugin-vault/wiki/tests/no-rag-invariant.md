---
title: "NO-RAG Invariant"
type: concept
aliases: ["NO-RAG Invariant", "NO-RAG", "no embeddings", "no-rag stance"]
parent: "[[tests|Tests]]"
path: "tests"
sources: ["[[tests-gate-13-no-rag-sh|tests/gates/gate-13-no-rag.sh]]", "[[tests-gate-13-no-rag-bats|tests/scripts/gate-13-no-rag.bats]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["tests", "ci", "security", "no-rag"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# NO-RAG Invariant

The static enforcement of the design decision that the plugin's retrieval path must never import or call any embedding, vector, HTTP, or similarity primitive.

## Definition

A CI gate (gate-13) that grep-scans the retrieval path source files for forbidden import patterns (openai, anthropic, faiss, chromadb, pinecone, vector libraries, HTTP clients) and forbidden runtime tokens (fetch, http, embedding, vector, cosine, knn, similarity) using properly escaped ERE patterns.

## Key Principles

**Static invariant, not runtime hope.** Gate-13 makes "no RAG" a CI gate that catches violations at code-review time, not when a user discovers unexpected behavior at runtime.

**Grep-only, no Bun dependency.** Gate-13 is the only engine gate that runs without Bun installed. Pure grep means it can run on any shell box including the bare CI environment.

**Fail-closed by design.** All grep patterns are properly escaped ERE strings (`fetch\(`, not `fetch(`). An unbalanced paren causes grep to exit 2 rather than 0, and under `set -uo pipefail`, that error would be swallowed — leaving the token unchecked. Escaped patterns prevent this class of silent false-pass.

**Self-test mode.** Running `bash tests/gates/gate-13-no-rag.sh --self-test` plants known-forbidden tokens in temp files and asserts the scanner catches each. A gate that cannot catch a planted token is fail-open — the self-test proves the enforcement is live.

**Tier 3 dropped.** Tier 3 (the local-embedding re-ranker that would have violated NO-RAG) was permanently dropped per §5/§11.1. Its target in `run-tests.sh` is an intentionally empty stub that prints "SKIP" and exits 0.

## Examples

Forbidden import categories:

- Embedding/ML libraries: openai, anthropic, cohere, transformers, onnxruntime, tensorflow, torch
- Vector databases: faiss, chromadb, pinecone, weaviate, qdrant, milvus, pgvector
- HTTP clients: axios, node-fetch, got, undici, cross-fetch

Forbidden runtime tokens: `fetch\(`, `http\.`, `https\.`, `embedding`, `vector`, `cosine`, `\bknn\b`, `\.embed\(`, `encode\(`, `similarity`

## Related Concepts

The NO-RAG design decision is documented in `docs/research-foundations.md` and ADR-0007 (Wiki-Native Recall). The invariant is tested at three levels: gate-13 static grep (CI), the Bats test for gate-13's self-test mode (Tier 1), and the engine contract tests (gate-01) that verify the retrieval path imports are clean.

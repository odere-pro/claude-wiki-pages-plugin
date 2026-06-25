---
title: "Adversarial Testing"
type: concept
aliases: ["Adversarial Testing", "prompt injection testing", "corpus replay", "Tier 4"]
parent: "[[tests|Tests]]"
path: "tests"
sources: ["[[tests-replay-corpus-sh|tests/adversarial/replay-corpus.sh]]", "[[tests-gate-13-no-rag-sh|tests/gates/gate-13-no-rag.sh]]", "[[tests-gate-13-no-rag-bats|tests/scripts/gate-13-no-rag.bats]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["tests", "security", "adversarial"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Adversarial Testing

Tests that deliberately attack the plugin's security boundaries to prove the hooks and gates cannot be bypassed.

## Definition

A set of deterministic (no LLM, no network) test techniques that plant malicious inputs or forbidden tokens and assert the system's defenses catch them. Operates at two levels: corpus replay (full hook chain) and static gate self-tests (individual scanner probes).

## Key Principles

**Corpus replay (`tests/adversarial/replay-corpus.sh`).** Replays a JSON corpus against the full PreToolUse Write/Edit hook chain in hooks.json order. Case filenames declare expected verdicts: `block-*` cases must be blocked, `allow-*` cases must pass. The corpus proves the hooks decide on structure alone — content injection does not change the verdict.

**Self-test probes.** Gate-13 (NO-RAG) embeds a `--self-test` mode that plants forbidden tokens (fetch, vector, `.embed`) in temp files and asserts the scanner catches each. This is adversarial proof that the gate cannot fail open. The Bats test for gate-13 then plants a forbidden token in a real retrieval source file and asserts the gate exits non-zero.

**Fail-closed requirement.** Every adversarial test is designed to surface a specific known failure mode. The NO-RAG gate history illustrates why: `grep -nE 'fetch('` with an unbalanced paren errors (exit 2), and under `set -uo pipefail` without `-e`, that error was silently swallowed — leaving the token unchecked. The current gate uses escaped ERE patterns to prevent this regression.

**Structural boundary.** The `allow-*` corpus cases document the semantic boundary: the PreToolUse hooks enforce structural rules (valid frontmatter, no markdown-link syntax in wiki bodies, write confinement), not content semantics. A payload carrying injection text but valid structure passes through.

## Examples

The `.github/workflows/adversarial.yml` CI workflow runs the corpus replay on every PR. The corpus lives in `tests/fixtures/adversarial/`. To add a new adversarial case, create a JSON file with the appropriate `block-` or `allow-` prefix in that directory.

## Related Concepts

The adversarial corpus replay is connected to the threat model documented in `SECURITY.md`. Each `block-*` case corresponds to a threat in that model. The NO-RAG gate self-test is a specialized form of adversarial testing applied to the static analysis gate itself — guarding against the meta-failure of a gate that cannot enforce its own invariant.

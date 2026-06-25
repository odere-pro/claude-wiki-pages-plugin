---
title: "Smoke Tests"
type: concept
aliases: ["Smoke Tests", "Tier 2 smoke", "end-to-end smoke", "fresh-install smoke"]
parent: "[[tests|Tests]]"
path: "tests"
sources: ["[[tests-fresh-install-sh|tests/smoke/fresh-install.sh]]", "[[tests-skill-schema-sh|tests/smoke/skill-schema.sh]]"]
related: []
contradicts: []
supersedes: []
depends_on: []
tags: ["tests", "smoke", "end-to-end"]
created: 2026-06-25
updated: 2026-06-25
update_count: 1
status: active
confidence: 1.0
---

# Smoke Tests

Tier 2 end-to-end tests that exercise the plugin the way a real user would, with self-skip behavior when the Claude Code CLI is absent.

## Definition

Two bash scripts in `tests/smoke/` that simulate a fresh plugin install flow and validate skill output schema compliance. Both self-skip without the `claude` CLI, keeping CI green in environments where the CLI runner is not yet wired.

## Key Principles

**Self-skip pattern.** Each smoke script checks `command -v claude >/dev/null 2>&1` at the top. Without the CLI, the script prints `[SKIP]` and exits 0. With the CLI, it runs the real flow. This is the established CI posture until Phase E wires a CLI runner.

**Not total no-ops.** Even in skip mode, the scripts do real work: `fresh-install.sh` runs `verify-ingest.sh` against the prebuilt minimal-vault fixture; `skill-schema.sh` runs YAML and sources assertions against the committed fixture using pure shell + jq.

**Two smoke scripts:**

- `fresh-install.sh` — simulates the clone → onboard → ingest-one-source → verify flow. The CLI-driven steps (plugin install, init wizard, ingest) are currently STUBbed pending Phase E. The local `verify-ingest.sh` call still runs.
- `skill-schema.sh` — copies the minimal-vault into a temp vault, runs each Layer 2 skill, and asserts every output file has well-formed YAML frontmatter and a `sources:` field holding `[]` or `[[wikilinks]]`. Assertions are pure shell + jq.

**Ablation smoke (opt-in).** `tests/smoke/ablation-smoke.sh` is a separate eval-tier script that runs the scaffolding ablation (ADR-0020) for the configured local model. It self-skips unless `CLAUDE_WIKI_PAGES_EVAL_MODEL` is set AND the Ollama endpoint answers the preflight.

## Examples

Running smoke tests:

```bash
bash tests/smoke/fresh-install.sh   # [SKIP] if `claude` is absent
bash tests/smoke/skill-schema.sh    # runs YAML assertions even without CLI
bash tests/run-tests.sh tier2       # runs both smoke scripts
```

## Related Concepts

The Smoke Tests sit between Tier 1 (Bats unit tests) and the eval tier. They test integration scenarios that unit tests cannot cover — the full hook chain, real vault state, and skill output — while remaining fast enough for regular local runs.

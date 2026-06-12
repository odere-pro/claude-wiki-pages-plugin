# Features

What `claude-wiki-pages` actually gives you.

## Schema

- **Typed wiki pages** with YAML frontmatter — six page types (`source`, `entity`, `concept`, `synthesis`, `index`, `log`) and strict schema validation on every write.
- **Provenance by construction** — every non-source page carries a `sources:` field with `[[wikilinks]]` back to immutable raw content under `raw/`. Plain strings are a lint error.
- **Map of Content (MOC)** — per-folder `_index.md` and vault-level `wiki/index.md`, auto-maintained by the pipeline.
- **Confidence discipline** — `confidence ≥ 0.8` requires two corroborating sources; `1.0` requires a direct quote.
- **Cross-topic synthesis notes** with explicit `scope:` and `synthesis_type` (`comparison`, `theme`, `contradiction`, `gap`, `timeline`).

Full schema lives in [`docs/vault-example/CLAUDE.md`](./vault-example/CLAUDE.md), the schema authority.

## Hook-enforced safety

- **Immutable `raw/`** — `protect-raw.sh` blocks any attempt to rewrite a source.
- **Frontmatter validation** — every Write and Edit goes through `validate-frontmatter.sh` and `check-wikilinks.sh` before landing.
- **`SubagentStop` completion gates** — long-running ingest and lint-fix agents cannot leave the wiki in a half-written state.
- **Append-only operations log** — every ingest, lint, fix, query, and synthesis lands one entry in `wiki/log.md` for human audit.

Full contract in [`operations.md`](./operations.md).

## DX

- **One-command pipeline** — `/claude-wiki-pages:wiki` probes vault state and runs the right specialist (init / ingest / curator / analyst). Polish runs as a tail step.
- **Obsidian-native** — works with Dataview, Templater, Web Clipper, and the graph view out of the box.
- **Vault-portable** — switch vaults with `CLAUDE_WIKI_PAGES_VAULT` or `bash scripts/set-vault.sh`. The plugin never assumes a single vault.

## Test harness

Five tiers, per [`../tests/README.md`](../tests/README.md):

- Tier 0 — static (shellcheck, shfmt, markdownlint, lychee, gitleaks, glossary gate)
- Tier 1 — Bats unit (~108 tests)
- Tier 2 — smoke
- Tier 3 — release readiness
- Tier 4 — adversarial (weekly; corpus replay stubbed pending fixture)

Full layout in [`tests/README.md`](../tests/README.md).

## Measured: with and without the plugin

The **scaffolding ablation** ([ADR-0020](./adr/ADR-0020-scaffolding-ablation-eval.md))
runs the same model on the same golden inputs through two prompt arms — the
plugin's full scaffolding (schema, provenance contract, citation rules) vs the
generic prompt you would write without it ("extract the knowledge into
well-organized notes") — and scores both with the same fail-closed scorers.
Reproduce with `bash scripts/eval-ablation-report.sh --model <model>`.

### The numbers

Canonical arms: `qwen3-coder:30b` (deterministic options; ingest cells carry
stamped, `--verify-artifact`-reproducible artifacts). The Claude column is a
supplementary claude-fable-5 run — see its
[caveat note](../tests/eval/runs/ingest-extract/claude-arm/NON-REPRODUCIBLE.md).

**ingest-extract tier** (bar: schema ≥ 0.98 · fidelity ≥ 0.97 · fields ≥ 0.90 · dedup ≥ 0.90 · fabricated = 0):

| Metric (extract-basic / provenance-trap) | Plugin arm | Baseline arm | Claude plugin (suppl.) | Claude baseline (suppl.) |
| --- | --- | --- | --- | --- |
| `schema_validity` | 1.00 / 1.00 | 0.00 / 0.00 | 1.00 / 1.00 | 0.00 / 0.00 |
| `claim_source_fidelity` | 1.00 / 1.00 | 0.00 / 0.00 | 1.00 / 1.00 | 0.00 / 0.00 |
| `frontmatter_field_accuracy` | 0.93 / 0.93 | 1.00¹ / 1.00¹ | 0.93 / 0.93 | 1.00¹ / 1.00¹ |
| `dedup_correctness` | 1.00 / 1.00 | 0.00 / 0.00 | 1.00 / 1.00 | 0.00 / 0.00 |
| `fabricated_sourced_claims` | 0 / 0 | 0¹ / 0¹ | 0 / 0 | 0¹ / 0¹ |
| **Verdict** | **PASS / PASS** | FAIL / FAIL | PASS / PASS | FAIL / FAIL |

¹ Vacuous: a candidate with no frontmatter has no fields to mis-fill and no
*sourced* claims to fabricate. The baseline's clean floor means its claims are
**unauditable**, not honest — see ADR-0020 § baseline metric semantics.

**query tier** (bar: coverage match · citation recall ≥ 0.90 · quote coverage ≥ 0.90 · fabricated citations = 0):

| Case | Plugin arm | Baseline arm | Claude plugin (suppl.) | Claude baseline (suppl.) |
| --- | --- | --- | --- | --- |
| query-basic | PASS | **unscorable** — citations drifted off the `[[wikilink]]` protocol | PASS | FAIL — gold-required quote dropped |
| query-trap (honesty: answer is absent from the wiki) | PASS | pass | PASS | pass |

Per-cell evidence (every score re-derivable with the scorers in `scripts/`):
[plugin ingest](../tests/eval/runs/ingest-extract/qwen3-coder-30b/) ·
[baseline ingest](../tests/eval/runs/ingest-extract/qwen3-coder-30b-baseline/) ·
[plugin query](../tests/eval/runs/query/qwen3-coder-30b/) ·
[baseline query](../tests/eval/runs/query/qwen3-coder-30b-baseline/) ·
[Claude arm ingest](../tests/eval/runs/ingest-extract/claude-arm/) ·
[Claude arm query](../tests/eval/runs/query/claude-arm/).

### What the scaffolding buys

What you lose without the plugin, mapped to the mechanism that enforces it and
the measured number behind it:

| Capability | Enforcing mechanism | Without the plugin (measured / class) |
| --- | --- | --- |
| Schema-valid, typed pages | `validate-frontmatter.sh` PreToolUse gate + the prompt contract | `schema_validity` 1.00 → 0.00 (both models, both cases) |
| Claims traceable to sources | `source_quotes` verbatim rule + `verify-ingest.sh` | `claim_source_fidelity` 1.00 → 0.00 — zero auditable claims |
| Stable page set (dedup, no drift) | two-pass alias-aware dedup (ingest contract) | `dedup_correctness` 1.00 → 0.00 |
| Grounded, verifiable answers | citation protocol + runtime answer verification (ADR-0019) | baseline drifts off-protocol (unscorable) or drops the required quote |
| Immutable source material | `protect-raw.sh` PreToolUse block | hook-enforced (Tier 4 corpus replay) |
| Writes confined to the vault | `firewall.sh` + engine parity (gate-11) | hook-enforced (Tier 4 corpus replay) |
| Every LLM write git-revertible | `snapshot` verb + SubagentStop commit backstop | hook-enforced (`git revert <commit>`) |
| Drafts gated behind human review | the one `_proposed/` channel + review gate | gate-enforced |
| Staleness lifecycle | `status: stale` + `confidence` decay (curator) | gate-enforced |

## How it compares

| Question                             | Competitor stance                                                                                          | `claude-wiki-pages`                                                 |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Can I run this locally?              | [`obsidian-llm-wiki-local`](https://github.com/kytmanov/obsidian-llm-wiki-local): yes, local-LLM only      | Yes — provider-agnostic, via whichever model Claude Code uses    |
| Can I install it as a Claude plugin? | [`rvk7895/llm-knowledge-bases`](https://github.com/rvk7895/llm-knowledge-bases): yes, as a bag of commands | Yes, **plus** a four-layer architecture with hook-enforced gates |
| Does it ship a security model?       | Nobody in the top 10 does                                                                                  | Yes — see [`SECURITY.md`](../SECURITY.md)                        |

Long-form architecture: [`docs/architecture.md`](./architecture.md).

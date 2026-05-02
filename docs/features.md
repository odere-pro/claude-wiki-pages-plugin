# Features

What `llm-wiki-stack` actually gives you.

## Schema

- **Typed wiki pages** with YAML frontmatter — six page types (`source`, `entity`, `concept`, `synthesis`, `index`, `log`) and strict schema validation on every write.
- **Provenance by construction** — every non-source page carries a `sources:` field with `[[wikilinks]]` back to immutable raw content under `raw/`. Plain strings are a lint error.
- **Map of Content (MOC)** — per-folder `_index.md` and vault-level `wiki/index.md`, auto-maintained by the pipeline.
- **Confidence discipline** — `confidence ≥ 0.8` requires two corroborating sources; `1.0` requires a direct quote.
- **Cross-topic synthesis notes** with explicit `scope:` and `synthesis_type` (`comparison`, `theme`, `contradiction`, `gap`, `timeline`).

Full schema lives in [`docs/vault-example/CLAUDE.md`](./vault-example/CLAUDE.md). Schema authority is enforced by [`/SPEC.md` §7](../SPEC.md).

## Hook-enforced safety

- **Immutable `raw/`** — `protect-raw.sh` blocks any attempt to rewrite a source.
- **Frontmatter validation** — every Write and Edit goes through `validate-frontmatter.sh` and `check-wikilinks.sh` before landing.
- **`SubagentStop` completion gates** — long-running ingest and lint-fix agents cannot leave the wiki in a half-written state.
- **Append-only operations log** — every ingest, lint, fix, query, and synthesis lands one entry in `wiki/log.md` for human audit.

Full contract in [`/SPEC.md` §10](../SPEC.md).

## DX

- **One-command pipeline** — `/llm-wiki-stack:wiki` probes vault state and runs the right specialist (init / ingest / curator / analyst). Polish runs as a tail step.
- **Obsidian-native** — works with Dataview, Templater, Web Clipper, and the graph view out of the box.
- **Vault-portable** — switch vaults with `LLM_WIKI_VAULT` or `bash scripts/set-vault.sh`. The plugin never assumes a single vault.
- **AWS-Skill-Builder-style playbooks** — three learning paths (200 Foundational, 300 Associate, 500 Expert) under [`docs/playbooks/`](./playbooks/index.md).

## Test harness

Five tiers, per [`/SPEC.md` §14](../SPEC.md):

- Tier 0 — static (shellcheck, shfmt, markdownlint, lychee, gitleaks, vocabulary gate)
- Tier 1 — Bats unit (~108 tests)
- Tier 2 — smoke
- Tier 3 — release readiness
- Tier 4 — adversarial (weekly; corpus replay stubbed pending fixture)

Full layout in [`tests/README.md`](../tests/README.md). Open follow-ups in [`docs/risk-report-0.2.0.md`](./risk-report-0.2.0.md).

## How it compares

| Question                             | Competitor stance                                                                                          | `llm-wiki-stack`                                                 |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Can I run this locally?              | [`obsidian-llm-wiki-local`](https://github.com/kytmanov/obsidian-llm-wiki-local): yes, local-LLM only      | Yes — provider-agnostic, via whichever model Claude Code uses    |
| Can I install it as a Claude plugin? | [`rvk7895/llm-knowledge-bases`](https://github.com/rvk7895/llm-knowledge-bases): yes, as a bag of commands | Yes, **plus** a four-layer architecture with hook-enforced gates |
| Does it ship a security model?       | Nobody in the top 10 does                                                                                  | Yes — see [`docs/security.md`](./security.md)                    |

Long-form architecture: [`docs/architecture.md`](./architecture.md).

# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning follows [SemVer](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Documentation

- **AWS-Skill-Builder-style playbooks.** New learning path under `docs/playbooks/`: `index.md`, `200-foundational.md` (install → first wiki entry, ~30 min), `300-associate.md` (orchestrator decision tree, hooks, schema, multi-vault, ~2 hours), `500-expert.md` (skill authoring, hook authoring, test harness, fork, CI, ~half day). Orthogonal to the existing `docs/llm-wiki/01-07*.md` task references.
- **Spec alignment for v0.2.0.** `SPEC.md` §5/§6/§11 corrected — agent count and orchestrator dispatch wording now match the five-agent retrofit. `docs/VOCABULARY.md` Layer 3 row corrected from "Three" to "Five".
- **DX cleanup.** README version badge bumped to 0.2.0; skill count corrected (12 → 13); `llm-wiki-markdown` added to the Layer 2 list. Stale `/llm-wiki-stack:llm-wiki-stack-ingest-agent` references in `docs/llm-wiki/index.md`, `docs/llm-wiki/02-create-new-knowledge-base.md`, `docs/llm-wiki/03-update-existing.md`, and `docs/vault-example/wiki/tools/llm-wiki-stack.md` reframed — `/llm-wiki-stack:wiki` is the primary entry; the agent-direct form is now documented as a power-user bypass.
- **Risk and gap report.** New `docs/risk-report-0.2.0.md` tracking deferred work (orchestrator/polish test coverage, Tier 4 corpus replay, edge cases in `resolve-vault.sh` / `session-start.sh` / `prompt-guard.sh`) so the audit findings have a single follow-up surface.

## [0.2.0] — 2026-05-02

Top-level orchestrator and four-layer DX retrofit. Single `/llm-wiki-stack:wiki` command replaces the per-skill chain users had to remember; vault state now drives dispatch automatically. ADRs in `docs/adr/` capture the rationale; the migration map is in `docs/llm-wiki/migration-0.2.md`.

### Added

- **`commands/wiki.md`** (`/llm-wiki-stack:wiki`) — top-level entry point. Probes vault state and dispatches to the right specialist (init wizard, ingest, curator, or analyst). One verb instead of a remembered chain.
- **`commands/wiki-doctor.md`** (`/llm-wiki-stack:wiki-doctor`) — environment health check. Wraps the new `scripts/doctor.sh` with exit codes 0–5 (vault path, schema, raw/wiki layout, hook executability, vocab drift). Tier 1 Bats coverage in `tests/scripts/doctor.bats`.
- **`agents/llm-wiki-stack-orchestrator-agent.md`** — Layer 4 dispatcher. `user-invocable: true`. Owns vault state probing; specialists trust its payload and never re-probe.
- **`agents/llm-wiki-stack-polish-agent.md`** — tail-of-write specialist. Centralises graph colors, vault-MOC refresh, and per-folder `_index.md` consistency. Idempotent; runs after every successful ingest or curator pass. Removes the "I have to switch to Obsidian and refresh the graph" step. See [`docs/llm-wiki/obsidian-experience.md`](docs/llm-wiki/obsidian-experience.md).
- **Repository governance parity.** Root `SPEC.md` (moved from `docs/SPECIFICATION.md`), root `SECURITY.md`, root `SUPPORT.md`, `docs/adr/` with three seed ADRs, `docs/plan/` with the retrofit plan.
- **`NEXT_STEP:` hand-off line** in the `llm-wiki` wizard skill — the orchestrator parses it to chain directly into ingest when `raw/` has pending files.

### Changed

- **Vocabulary changes — agent rename.** Three Layer 3 agents renamed to the `{plugin-name}-{role}-agent` convention. Hard rename, no shims; pre-1.0 plugin, low back-compat cost. See `docs/adr/ADR-0002-agent-naming-convention.md` for the rationale.
  - `llm-wiki-ingest-pipeline` → `llm-wiki-stack-ingest-agent`
  - `llm-wiki-lint-fix` → `llm-wiki-stack-curator-agent` (verb upgrade — the agent already gates judgment fixes behind plans, which is curation, not just linting)
  - `llm-wiki-analyst` → `llm-wiki-stack-analyst-agent`
- **`/SPEC.md` location.** Specification moved from `docs/SPECIFICATION.md` to root `/SPEC.md` for parity with standard plugin layout. A one-line stub remains at the old path through `0.2.x`; removed in `0.3.0`.
- **Default verb.** `/llm-wiki-stack:wiki` replaces the old per-skill chain (the pipeline agent, formerly named `llm-wiki-ingest-pipeline`, now `llm-wiki-stack-ingest-agent`) as the default user verb. The pipeline agent remains user-invocable for power users and scripting.
- **`scripts/validate-docs.sh`** — extends the namespace resolver to recognize `commands/<name>.md` (in addition to `skills/<name>/` and `agents/<name>.md`); adds the three retired agent names to the banned-string list (allowlisted in CHANGELOG, ADRs, plan, and migration doc).
- **Documentation surface.** README quick-start, `docs/architecture.md`, `docs/getting-started.md`, `docs/security.md`, `SECURITY.md` updated to use the new agent names and the `/llm-wiki-stack:wiki` entry point.

### Migration

Users with scripts pinned to the old agent names: see `docs/llm-wiki/migration-0.2.md` for the rename table and search-and-replace guidance. Vaults themselves are unchanged — `schema_version: 1` continues to be supported; only plugin-side identifiers moved.

## [Earlier — pre-0.2.0]

### Changed

- **Skill rename (clean-room rewrite).** The eight adapted skills have been
  retired and replaced with fresh, independently-authored implementations
  under new names:
  - `second-brain` → `llm-wiki` (onboarding entry point)
  - `second-brain-ingest` → `llm-wiki-ingest`
  - `second-brain-query` → `llm-wiki-query`
  - `second-brain-lint` → `llm-wiki-lint`
  - `second-brain-fix` → `llm-wiki-fix`
  - `second-brain-status` → `llm-wiki-status`
  - `vault-synthesize` → `llm-wiki-synthesize`
  - `vault-index` → `llm-wiki-index`

  Each new `SKILL.md` was authored from `docs/SPECIFICATION.md`,
  `docs/architecture.md`, `docs/vault-example/CLAUDE.md`, and the Karpathy LLM
  Wiki gist — the previously-adapted content was not consulted during the
  rewrite. Mechanical 5-gram Jaccard similarity between each new file and
  its predecessor is below 0.02.

- **Vocabulary.** `second-brain`, `second brain`, `vault-synthesize`, and
  `vault-index` are retired from the vocabulary and flagged by
  `scripts/validate-docs.sh` as banned strings outside `CHANGELOG.md`,
  `docs/VOCABULARY.md`, and the test surface.
- **Attribution.** `NOTICE` rewritten to credit only the Karpathy pattern
  (public design) and `kepano/obsidian-skills` (MIT, bundled unmodified).
  Prior third-party attribution for skills that have since been replaced
  by clean-room originals has been removed.
- **New file.** `THIRD_PARTY_LICENSES.md` — full license text of every
  bundled third-party component.

### Removed

- `skills/second-brain/`, `skills/second-brain-ingest/`,
  `skills/second-brain-query/`, `skills/second-brain-lint/`,
  `skills/second-brain-fix/`, `skills/second-brain-status/`,
  `skills/vault-synthesize/`, `skills/vault-index/` — replaced by the
  renamed, rewritten skills listed above.

## [0.1.0] — 2026-04-18

Initial release as a Claude Code plugin.

- **Plugin distribution.** `.claude-plugin/plugin.json` and same-repo marketplace.
- **Layer 1 — Data.** `docs/vault-example/` with authoritative schema (`docs/vault-example/CLAUDE.md`, `schema_version: 1`), five frontmatter templates, a small sticky reference vault demonstrating sources, indexes, and two topic folders.
- **Layer 2 — Skills.** 11 skills: `second-brain`, `second-brain-ingest`, `second-brain-query`, `second-brain-lint`, `second-brain-fix`, `vault-synthesize`, `vault-index`, `graph-colors`, `obsidian-markdown`, `obsidian-bases`, `obsidian-cli`.
- **Layer 3 — Agents.** 3 agents: `wiki-ingest-pipeline`, `wiki-lint-fix`, `wiki-analyst`.
- **Layer 4 — Orchestration.** 10 hook scripts wired through `hooks/hooks.json`; 4 path-scoped rules in `rules/`.
- **Docs.** `SPECIFICATION.md`, `VOCABULARY.md`, `SEO.md`, `architecture.md`, `security.md`, `comparison.md`, and the user guide set in `docs/llm-wiki/`.
- **Governance.** `LICENSE` (Apache 2.0), `NOTICE`, `CHANGELOG.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`.

### Schema

`schema_version: 1`. Authoritative rules live in `docs/vault-example/CLAUDE.md`; contract summary in `docs/SPECIFICATION.md`.

### Known limitations

See `docs/security.md` — no cryptographic provenance, no hook-script sandboxing, no secret scanning on ingest, confidence scores are the LLM's opinion, topic-tree placement relies on LLM judgement.

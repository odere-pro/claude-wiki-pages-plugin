# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning follows [SemVer](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
  `docs/architecture.md`, `example-vault/CLAUDE.md`, and the Karpathy LLM
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
- **Layer 1 — Data.** `example-vault/` with authoritative schema (`example-vault/CLAUDE.md`, `schema_version: 1`), five frontmatter templates, a small sticky reference vault demonstrating sources, indexes, and two topic folders.
- **Layer 2 — Skills.** 11 skills: `second-brain`, `second-brain-ingest`, `second-brain-query`, `second-brain-lint`, `second-brain-fix`, `vault-synthesize`, `vault-index`, `graph-colors`, `obsidian-markdown`, `obsidian-bases`, `obsidian-cli`.
- **Layer 3 — Agents.** 3 agents: `wiki-ingest-pipeline`, `wiki-lint-fix`, `wiki-analyst`.
- **Layer 4 — Orchestration.** 10 hook scripts wired through `hooks/hooks.json`; 4 path-scoped rules in `rules/`.
- **Docs.** `SPECIFICATION.md`, `VOCABULARY.md`, `SEO.md`, `architecture.md`, `security.md`, `comparison.md`, and the user guide set in `docs/llm-wiki/`.
- **Governance.** `LICENSE` (Apache 2.0), `NOTICE`, `CHANGELOG.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`.

### Schema

`schema_version: 1`. Authoritative rules live in `example-vault/CLAUDE.md`; contract summary in `docs/SPECIFICATION.md`.

### Known limitations

See `docs/security.md` — no cryptographic provenance, no hook-script sandboxing, no secret scanning on ingest, confidence scores are the LLM's opinion, topic-tree placement relies on LLM judgement.

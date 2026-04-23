# llm-wiki-stack — plugin repo

This repo is the source of the `llm-wiki-stack` Claude Code plugin — a four-layer agent stack that turns an Obsidian vault into a maintained, provenance-tracked wiki following Karpathy's LLM Wiki pattern.

## Repo layout

| Path                              | What it is                                                          |
| --------------------------------- | ------------------------------------------------------------------- |
| `.claude-plugin/plugin.json`      | Plugin manifest                                                     |
| `.claude-plugin/marketplace.json` | Same-repo marketplace definition                                    |
| `skills/`                         | 11 skills (Layer 2)                                                 |
| `agents/`                         | 3 agents (Layer 3)                                                  |
| `hooks/hooks.json` + `scripts/`   | Hook wiring and implementations (Layer 4)                           |
| `rules/`                          | Path-scoped LLM guidance (Layer 4)                                  |
| `example-vault/`                  | Small sticky reference vault and the authoritative schema (Layer 1) |
| `docs/SPECIFICATION.md`           | Reproducibility-grade system spec                                   |
| `docs/VOCABULARY.md`              | Canonical term list (technical + discoverability)                   |
| `docs/architecture.md`            | Four-layer model explained                                          |
| `docs/security.md`                | Threat model and limits                                             |
| `docs/llm-wiki/`                  | Step-by-step user guides                                            |

## Authorities

Two files govern every edit in this repo:

- **Schema** — [`example-vault/CLAUDE.md`](./example-vault/CLAUDE.md) is authoritative for any wiki operation. Declares `schema_version: 1`. Skill and agent defaults that conflict with it MUST be overridden.
- **Vocabulary** — [`docs/VOCABULARY.md`](./docs/VOCABULARY.md) governs every user-visible string. Canonical terms (technical vs. discoverability) and banned strings. `scripts/validate-docs.sh` (planned) will enforce it in CI.

When a user installs the plugin, their project's `vault/CLAUDE.md` plays the same schema role as the repo's `example-vault/CLAUDE.md`.

## Before editing

- Do not rewrite files in `example-vault/raw/` — the `protect-raw.sh` hook enforces immutability, and the principle applies to this repo's example content.
- Do not flatten the four-layer directory structure — each layer is referenced by name in `docs/architecture.md`, `docs/SPECIFICATION.md`, and user-facing docs.
- Do not edit scripts in `scripts/` without re-reading `hooks/hooks.json` first — the two are coupled.
- Do not introduce vocabulary drift. If a term doesn't appear in `docs/VOCABULARY.md`, add it there first with a rationale, then use it.

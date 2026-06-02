# claude-wiki-pages — plugin repo

Source of the `claude-wiki-pages` Claude Code plugin: a **four-layer stack** (Data · Skills · Agents · Orchestration) that turns an Obsidian vault into a provenance-tracked wiki, following [Karpathy's LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).

**Authorities.** [`SPEC.md`](./SPEC.md) is the contract every skill, agent, and hook binds to. [`docs/GLOSSARY.md`](./docs/GLOSSARY.md) is the canonical term list; enforced by [`scripts/validate-docs.sh`](./scripts/validate-docs.sh). [`docs/vault-example/CLAUDE.md`](./docs/vault-example/CLAUDE.md) is the schema (`schema_version: 1`) and wins any frontmatter conflict.

## Vault location

All Layer 4 scripts source `scripts/resolve-vault.sh`, which uses a four-tier resolution (first match wins):

1. **`CLAUDE_WIKI_PAGES_VAULT` env var** — explicit override for local dev / CI.
2. **`.claude/claude-wiki-pages/settings.json`** — `current_vault_path` field; written by `scripts/set-vault.sh` or created with defaults on first `SessionStart`.
3. **Auto-detect** — scan up to 4 levels for a `CLAUDE.md` with `schema_version` + a `wiki/` sibling.
4. **Default** — `docs/vault`.

To change the vault: `bash scripts/set-vault.sh <path>`. This updates only `current_vault_path`; `default_vault_path` is fixed at `docs/vault` and serves as the reset reference. Claude applies the same logic when no vault path is given. See spec §2 for the full contract.

## Dev-time vs. runtime

This tree is the plugin source — contributor view. Users never see it. On install, Claude Code loads only `skills/`, `agents/`, `hooks/hooks.json` + `scripts/`, and `rules/` as runtime context. The onboarding wizard (`/claude-wiki-pages:init`) additionally copies `docs/vault-example/` into the user's project as `docs/vault/` (or the path set in `CLAUDE_WIKI_PAGES_VAULT`); the copied `vault/CLAUDE.md` takes over the schema-authority role in their sessions. Everything else — `docs/`, `tests/`, `.github/`, this root `CLAUDE.md`, `NOTICE`, `LICENSE`, `CHANGELOG.md` — sits in the plugin cache but is never session context.

## Four-layer stack

| Layer                   | Directory                                | Responsibility                                                                                                                                                                                | Spec §         |
| ----------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| Layer 1 — Data          | `docs/vault-example/`                         | Immutable `raw/`, LLM-maintained `wiki/`, schema in `docs/vault-example/CLAUDE.md`. Passive.                                                                                                       | §4, §6, §7, §8 |
| Layer 2 — Skills        | `skills/`                                | 20 single-responsibility capabilities: 12 plugin-authored short verbs (`init`, `ingest`, `query`, `lint`, `fix`, `status`, `synthesize`, `index`, `markdown`, `search`, `review`, `draft`), `onboarding`, 2 agent-teaching skills (`engine-api`, `maintain-contract`), `obsidian-graph-colors`, `obsidian-vault`, plus 3 MIT-licensed `obsidian-*` reference skills (`kepano/obsidian-skills`). | §5, §9         |
| Layer 3 — Agents        | `agents/`                                | 7 multi-step executors: `claude-wiki-pages-orchestrator-agent` (top-level entry), `claude-wiki-pages-onboarding-agent`, `claude-wiki-pages-ingest-agent`, `claude-wiki-pages-curator-agent`, `claude-wiki-pages-analyst-agent`, `claude-wiki-pages-polish-agent`, `claude-wiki-pages-maintenance-agent`. | §5, §11        |
| Layer 4 — Orchestration | `commands/`, `hooks/hooks.json`, `scripts/`, `rules/` | `/claude-wiki-pages:wiki`, `/claude-wiki-pages:onboarding`, and `/claude-wiki-pages:doctor` slash commands; `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `SubagentStop` hooks; script implementations; path-scoped rules. | §5, §9, §10  |

Long-form model: [`docs/architecture.md`](./docs/architecture.md).

## Where to look

| Doing             | Primary source                                                                                                                                     |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Skills, agents    | Spec §5, §9, §11; existing SKILL.md / agent files                                                                                                  |
| Hook scripts      | Spec §10; `hooks/hooks.json` (scripts and wiring are coupled); `tests/scripts/`                                                                    |
| Frontmatter       | `docs/vault-example/CLAUDE.md`; spec §7; `docs/vault-example/_templates/`                                                                                    |
| User-facing prose | `docs/GLOSSARY.md`; `docs/llm-wiki/` for voice                                                                                                   |
| Security          | `docs/security.md` (threat model with per-threat test mapping); spec §15; Tier 4 CI at `.github/workflows/adversarial.yml` (corpus replay stubbed) |
| Tests (Tier 0–4)  | `tests/README.md`; spec §14; hook tests in `tests/scripts/*.bats`                                                                                  |

If an edit introduces a new concept, add the term to `docs/GLOSSARY.md` with a rationale first.

## Local workflows

- `bash tests/install-deps.sh` — install every dev/test tool (brew on macOS, apt on Linux). Idempotent. `--check` reports status, `--dry-run` previews.
- `bash tests/run-tests.sh` — run Tier 0 + Tier 1 locally. Also accepts `tier0`, `tier1`, `tier2`, or `all`; `--list` prints the commands without running.
- `scripts/validate-docs.sh` — glossary gate. Run before every commit.
- `scripts/verify-ingest.sh docs/vault-example/` — verify the reference vault against the schema.

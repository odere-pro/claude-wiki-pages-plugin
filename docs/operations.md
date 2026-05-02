# Operations

The one verb you need to know is `/llm-wiki-stack:wiki`. The orchestrator probes vault state and dispatches to the right specialist (init wizard, ingest, curator, or analyst). Polish runs as a tail step after ingest or curator.

## Verbs you'll actually type

| Verb            | Slash command                  | Notes                                                                                                                |
| --------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| **Wiki**        | `/llm-wiki-stack:wiki`         | Top-level entry. One verb does the right thing — init, ingest, curator, or analyst depending on vault state.         |
| **Doctor**      | `/llm-wiki-stack:wiki-doctor`  | Environment health check. Run after install and any time something feels wrong.                                      |
| **Query**       | `/llm-wiki-stack:llm-wiki-query`  | Direct query skill. Traverses MOCs; every answer cites `[[wikilinks]]` back to wiki pages.                       |
| **Status**      | `/llm-wiki-stack:llm-wiki-status` | One-command status read of the last operations.                                                                   |

## Power-user bypasses

When you already know the routing and want to skip the orchestrator's state probe, call the agents directly:

| Slash command                                  | When to reach for it                                                                                                |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `/llm-wiki-stack:llm-wiki-stack-ingest-agent`  | Scripted batch ingest. Skips the orchestrator's probe and the polish tail-step.                                     |
| `/llm-wiki-stack:llm-wiki-stack-curator-agent` | Direct audit-and-repair pass. Use when you want lint-fix without an ingest beforehand.                              |
| `/llm-wiki-stack:llm-wiki-stack-analyst-agent` | Direct query / synthesis / compile / extract / challenge. Use when the prompt is unambiguous and the routing is wasted work. |
| `/llm-wiki-stack:llm-wiki-stack-polish-agent`  | Manually refresh graph colors + indexes after a direct agent call (which doesn't trigger polish).                   |

> **When in doubt, don't bypass.** The orchestrator's state probe is faster than picking the wrong specialist by hand. Bypass when: scripted workflows where routing is redundant, or operations where the polish tail-step would be wasted work.

## Single-purpose skills

For surgical operations on one slice of the pipeline:

| Skill | Purpose |
| ----- | ------- |
| `/llm-wiki-stack:llm-wiki-ingest`     | Process raw sources into wiki pages. No follow-on lint or synthesis. |
| `/llm-wiki-stack:llm-wiki-lint`       | Read-only audit. Reports drift; does not repair.                     |
| `/llm-wiki-stack:llm-wiki-fix`        | Auto-repairs what `llm-wiki-lint` reports. Idempotent.               |
| `/llm-wiki-stack:llm-wiki-synthesize` | Write a cross-topic synthesis note.                                  |
| `/llm-wiki-stack:llm-wiki-index`      | Generate or refresh the vault MOC at `wiki/index.md`.                |
| `/llm-wiki-stack:llm-wiki-markdown`   | Render a wiki query as portable markdown into `vault/output/`.       |
| `/llm-wiki-stack:obsidian-graph-colors` | Apply per-topic colors to Obsidian's graph view.                   |

Contracts for each live in [`/SPEC.md` §5](../SPEC.md).

## Vault location

The plugin resolves the active vault via `scripts/resolve-vault.sh` using a four-tier order (first match wins):

1. **`LLM_WIKI_VAULT` env var** — explicit override.
2. **`.claude/llm-wiki-stack/settings.json`** — `current_vault_path` field.
3. **Auto-detect** — scan up to 4 levels for a `CLAUDE.md` with `schema_version` next to a `wiki/`.
4. **Default** — `docs/vault`.

Switch persistently: `bash scripts/set-vault.sh <path>`. Switch for one session: `LLM_WIKI_VAULT=<path> claude`. Full contract in [`/SPEC.md` §2](../SPEC.md) and the [300-Associate playbook](./playbooks/300-associate.md) Module 6.

## What runs when

| Event | Behaviour |
| ----- | --------- |
| `SessionStart` | `session-start.sh` reports vault status; creates `.claude/llm-wiki-stack/settings.json` on first run. |
| `UserPromptSubmit` | `prompt-guard.sh` warns on phrasing that suggests editing `raw/` or destructive ops. |
| Any Write or Edit | `validate-frontmatter.sh`, `check-wikilinks.sh`, `protect-raw.sh`, `validate-attachments.sh` block-or-allow. |
| After Write or Edit | `post-wiki-write.sh` and `post-ingest-summary.sh` emit reminders and counts. |
| Subagent finishes | `subagent-lint-gate.sh` and `subagent-ingest-gate.sh` block bad completions. |

Full hook contract in [`/SPEC.md` §10](../SPEC.md).

## Step-by-step walkthroughs

The seven user guides under [`docs/llm-wiki/`](./llm-wiki/index.md) cover install → ingest → validate → query → output. The [playbooks](./playbooks/index.md) restructure the same material as a 200/300/500 learning path.

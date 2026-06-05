# Operations

## The one verb

```text
/claude-wiki-pages:wiki
```

That is the entry point. The orchestrator probes vault state and dispatches to the right
specialist — init wizard, ingest, curator, or analyst. Polish runs as a tail step after
ingest or curator. You never need to pick the right specialist by hand.

| State the orchestrator finds                            | What runs                           |
| ------------------------------------------------------- | ----------------------------------- |
| No vault or no `schema_version`                         | init wizard (scaffold + orient)     |
| Files in `raw/` not yet in `wiki/log.md`                | ingest pipeline                     |
| Previous ingest not followed by lint                    | curator (audit-and-repair)          |
| Analytical prompt (`what`, `why`, `compare`, …)        | analyst                             |
| Pending drafts in `_proposed/`                          | review gate                         |

Pass any free-form goal: `/claude-wiki-pages:wiki ingest the new papers` or
`/claude-wiki-pages:wiki what does the wiki say about retrieval?`

A brand-new vault is seeded with a bundled sample source in `raw/` — you can run
`/claude-wiki-pages:wiki` immediately after install and get a real ingest result without
adding your own files first.

## When something feels wrong

Run the environment health check after install and any time behavior seems off:

```text
/claude-wiki-pages:doctor
```

`doctor` runs ten checks (D01–D10), reports the first failing prerequisite, and with
`--fix` auto-repairs the fixable subset. Fix what it flags, then go back to
`/claude-wiki-pages:wiki`.

## Guided first run

If you prefer a hand-held walkthrough from scaffold to first answer:

```text
/claude-wiki-pages:onboarding
```

The onboarding agent walks each step with a plain-language explanation — health check,
scaffold, ingest, first cited answer. Safe to re-run; it resumes from wherever you are.

## Day-to-day verbs

| Verb       | Slash command               | Notes                                                                      |
| ---------- | --------------------------- | -------------------------------------------------------------------------- |
| **Query**  | `/claude-wiki-pages:query`  | Direct query skill. Traverses MOCs; every answer cites `[[wikilinks]]`.    |
| **Status** | `/claude-wiki-pages:status` | One-command status read of the last operations.                            |

## Power-user bypasses

When you already know the routing and want to skip the orchestrator's state probe, call the agents directly:

| Slash command                                  | When to reach for it                                                                                                |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `/claude-wiki-pages:claude-wiki-pages-ingest-agent`  | Scripted batch ingest. Skips the orchestrator's probe and the polish tail-step.                                     |
| `/claude-wiki-pages:claude-wiki-pages-curator-agent` | Direct audit-and-repair pass. Use when you want lint-fix without an ingest beforehand.                              |
| `/claude-wiki-pages:claude-wiki-pages-analyst-agent` | Direct query / synthesis / compile / extract / challenge. Use when the prompt is unambiguous and the routing is wasted work. |
| `/claude-wiki-pages:claude-wiki-pages-polish-agent`  | Manually refresh graph colors + indexes after a direct agent call (which doesn't trigger polish).                   |

> **When in doubt, don't bypass.** The orchestrator's state probe is faster than picking the wrong specialist by hand. Bypass when: scripted workflows where routing is redundant, or operations where the polish tail-step would be wasted work.

## Single-purpose skills

For surgical operations on one slice of the pipeline:

| Skill | Purpose |
| ----- | ------- |
| `/claude-wiki-pages:ingest`     | Process raw sources into wiki pages. No follow-on lint or synthesis. |
| `/claude-wiki-pages:lint`       | Read-only audit. Reports drift; does not repair.                     |
| `/claude-wiki-pages:fix`        | Auto-repairs what `lint` reports. Idempotent.               |
| `/claude-wiki-pages:synthesize` | Write a cross-topic synthesis note.                                  |
| `/claude-wiki-pages:index`      | Generate or refresh the vault MOC at `wiki/index.md`.                |
| `/claude-wiki-pages:markdown`   | Render a wiki query as portable markdown into `vault/output/`.       |
| `/claude-wiki-pages:obsidian-graph-colors` | Apply per-topic colors to Obsidian's graph view.                   |

Contracts for each live in [`architecture.md`](./architecture.md).

## Draft review gate

All drafted content (local-model drafts, durable-memory write-backs, local-ingest stubs) routes through a single `_proposed/` channel documented in [`skills/review/SKILL.md`](../skills/review/SKILL.md). The implementation lives in `src/commands/propose/propose.ts`.

## Vault location

The plugin resolves the active vault via `scripts/resolve-vault.sh` using a four-tier order (first match wins):

1. **`CLAUDE_WIKI_PAGES_VAULT` env var** — explicit override.
2. **`.claude/claude-wiki-pages/settings.json`** — `current_vault_path` field.
3. **Auto-detect** — scan up to 4 levels for a `CLAUDE.md` with `schema_version` next to a `wiki/`.
4. **Default** — `docs/vault`.

Switch persistently: `bash scripts/set-vault.sh <path>`. Switch for one session: `CLAUDE_WIKI_PAGES_VAULT=<path> claude`. The full contract is documented above.

## Multi-vault registry

The vault registry lives in `.claude/claude-wiki-pages/settings.json` and manages N registered
vaults with exactly one active at a time. `scripts/resolve-vault.sh` is the sole resolver;
the registry selects, the resolver confines (ADR-0016).

### Registry shape

```json
{
  "default_vault_path": "docs/vault",
  "current_vault_path": "projects/my-vault",
  "vaults": [
    {"path": "projects/my-vault", "name": "my-vault"},
    {"path": "projects/archive",  "name": "archive"}
  ]
}
```

| Field | Role |
| ----- | ---- |
| `default_vault_path` | Factory default; never overwritten by lifecycle commands. |
| `current_vault_path` | Sole active pointer; read by `resolve_vault()`. |
| `vaults` | Array of `{path, name}` objects; all registered vaults. |

**Invariant:** `current_vault_path` must equal exactly one `vaults[].path`. A registry that
violates this invariant is treated as malformed: `_vaults_read` exits non-zero, all writes are
blocked (fail-closed), and a stderr warning names the problem.

**Progressive disclosure:** `init_vault_settings` creates `settings.json` without the `vaults`
key. The `vaults` array is introduced only by the first `vault_add`. A fresh or legacy
`settings.json` without a `vaults` key is valid; the tier-4 default-fallback applies.

### Lifecycle commands (`scripts/set-vault.sh`)

| Command | Effect |
| ------- | ------ |
| `set-vault.sh add <path> [name]` | Register a vault without switching. |
| `set-vault.sh remove <path\|name>` | Deregister (never deletes data on disk). Refuses to remove the active vault or the last vault. |
| `set-vault.sh switch <path\|name>` | Change `current_vault_path` to a registered vault. |
| `set-vault.sh list` | Print the registry; active vault marked with `*`. |

## What runs when

| Event | Behaviour |
| ----- | --------- |
| `SessionStart` | `session-start.sh` reports vault status; creates `.claude/claude-wiki-pages/settings.json` on first run. |
| `UserPromptSubmit` | `prompt-guard.sh` warns on phrasing that suggests editing `raw/` or destructive ops. |
| Any Write or Edit | `validate-frontmatter.sh`, `check-wikilinks.sh`, `protect-raw.sh`, `validate-attachments.sh` block-or-allow. |
| After Write or Edit | `post-wiki-write.sh` and `post-ingest-summary.sh` emit reminders and counts. |
| Subagent finishes | `subagent-lint-gate.sh` and `subagent-ingest-gate.sh` block bad completions. |

The full hook contract is documented in this guide.

## Step-by-step walkthroughs

The seven user guides under [`docs/llm-wiki/`](./llm-wiki/index.md) cover install → ingest → validate → query → output.

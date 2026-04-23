# Using `llm-wiki-stack`

This is the single page that says *how do I use this?* once the plugin is installed. It walks the first month in three passes: day 1, day 7, day 30. The numbered guides (01–07) are reference material for when you want to go deeper into a single topic.

This page assumes you already ran:

```
/plugin marketplace add odere-pro/llm-wiki-stack
/plugin install llm-wiki-stack@llm-wiki-stack
```

You never touch the plugin source. Your own files live in `vault/raw/`, `vault/wiki/`, and `vault/CLAUDE.md` inside your own project. Everything else — the skills, agents, hooks, scripts — is plugin-internal and maintained by the plugin.

## Day 1 — install, scaffold, ingest one source

### 1. Scaffold the vault

From your project directory, open Claude Code and run the onboarding wizard:

```
/llm-wiki-stack:llm-wiki
```

The wizard creates `vault/` in your project by copying `example-vault/` out of the plugin cache, writes a per-vault `vault/CLAUDE.md` (the authoritative schema for your vault), and prints a short "you are here" summary. `vault/CLAUDE.md` is the one file you read before doing anything else — it is the schema every skill and agent defers to.

After the wizard finishes, your project contains:

```
vault/
├── CLAUDE.md               # authoritative schema — read before any wiki operation
├── _templates/             # frontmatter templates per type
├── raw/                    # immutable sources (drop files here)
│   └── assets/             # images and attachments
├── wiki/
│   ├── index.md            # vault MOC — catalog for the whole vault
│   ├── log.md              # chronological operations record
│   ├── dashboard.md        # Dataview dashboard (needs Obsidian + Dataview)
│   ├── _sources/           # one summary per ingested source
│   └── _synthesis/         # cross-topic analyses
└── output/                 # optional scratch space, git-ignored
```

### 2. Confirm the install is healthy

```
/llm-wiki-stack:llm-wiki-status
```

This is the one-command health check. It exercises every hook path — frontmatter validation, wikilink enforcement, `raw/` immutability, the ingest verifier — and reports green or red per path. Green across the board means the four-layer stack is wired correctly and you can start ingesting.

### 3. Drop your first source

Copy a file into `vault/raw/`:

```bash
cp ~/Downloads/some-article.md vault/raw/
```

Images go under `vault/raw/assets/`:

```bash
cp ~/Desktop/diagram.png vault/raw/assets/
```

`raw/` is immutable — the `protect-raw.sh` hook blocks any attempt to rewrite files there, including by the LLM. That immutability is the first structural guarantee in the four-layer stack.

### 4. Run the pipeline

```
/llm-wiki-stack:llm-wiki-ingest-pipeline
```

This is **the default verb**. It chains ingest → verify → lint-fix → synthesize. One command, one clean result.

On a clean run, the pipeline:

1. Reads `vault/CLAUDE.md` (the schema) before reading the source.
2. Writes a source summary to `wiki/_sources/`.
3. Extracts entities and concepts into the correct topic folder (creating the folder and `_index.md` if the topic is new — e.g., `patterns/`, `tools/`).
4. Updates `wiki/index.md` with any new pages.
5. Appends a `## [YYYY-MM-DD] ingest | Source Title` entry to `wiki/log.md`.
6. On `SubagentStop`, runs `verify-ingest.sh` and a lint pass. If either reports drift, the agent halts rather than leaving a half-written wiki.

### 5. Confirm green

Run status one more time:

```
/llm-wiki-stack:llm-wiki-status
```

Green across the board means the source is ingested, frontmatter is valid, cross-references resolve, and indexes are in sync.

That is day 1. You have a vault, a live source, and a green health check.

## Day 7 — the vault grows

By the end of week 1 you have ten or twenty sources and a dozen wiki pages. The loop is now:

1. Drop sources into `vault/raw/` as you encounter them.
2. Run `/llm-wiki-stack:llm-wiki-ingest-pipeline` when you want to pull them in.
3. Ask questions with `/llm-wiki-stack:llm-wiki-query`.

### Ask the vault questions

```
/llm-wiki-stack:llm-wiki-query what does the wiki say about the LLM Wiki pattern?
```

The query skill reads `wiki/index.md`, traverses from the relevant `_index.md` files, and answers in prose with inline `[[wikilink]]` citations. Every claim is auditable — click a wikilink and you land on the cited page. It appends a `## [YYYY-MM-DD] query | …` entry to `wiki/log.md`.

For cross-topic questions or when you want a table or a side-by-side comparison, use the analyst agent:

```
/llm-wiki-stack:llm-wiki-analyst compare [[LLM Wiki Pattern]] and [[Hook-Enforced Guarantees]]
```

The analyst traverses the topic tree, not just a single folder, and produces structured output with citations.

### Run lint-fix weekly

Structural drift is cheap to fix early and expensive to fix late. Once a week, run:

```
/llm-wiki-stack:llm-wiki-lint-fix
```

The agent audits the wiki, repairs what can be repaired automatically (stale indexes, missing `parent`/`path` fields, `sources:` entries that drifted to plain strings), and reports everything it chose not to touch. On `SubagentStop` it re-runs lint; if errors remain, the agent halts so you see them.

### Review `wiki/log.md`

The operations log tells you what happened to the vault this week: every ingest, every query, every lint pass, in date order. Skim it after each ingest run. If a log entry surprises you, read the cited pages — that is the entry point for catching the LLM misinterpreting a source.

### Check the dashboard

Open `vault/wiki/dashboard.md` in Obsidian (with the Dataview plugin). It gives you a live view of:

- every page by type, sorted by `confidence` and `updated`;
- sources that no wiki page cites (orphans);
- the topic tree with page counts per folder;
- pages with non-empty `contradicts:`;
- stale candidates not touched in 30+ days.

See [guide 06](./06-check-the-dashboard.md) for the full dashboard tour.

## Day 30 — synthesis, outputs, and power-user surfaces

After a month the vault has structure of its own. The work shifts from *feeding the vault* to *extracting value from it*.

### Synthesize across topics

When you notice several pages converging on a theme — a recurring contradiction, a cluster of entities that share a pattern, a gap between what you've ingested and what you'd want to know — file a synthesis note:

```
/llm-wiki-stack:llm-wiki-synthesize
```

The skill writes to `wiki/_synthesis/` with `type: synthesis`, a `synthesis_type` of `comparison`, `theme`, `contradiction`, `gap`, or `timeline`, and a `scope:` that lists the wiki pages the synthesis covers. Synthesis notes are wiki content — they carry `sources:`, get cited by queries, and show up in the dashboard.

### Produce outputs

Deliverables — reports, ADRs, briefs, memos — go in `vault/output/`. The directory is git-ignored scratch space: plain markdown, no frontmatter, not tracked by any skill. The analyst agent is the right tool for producing them:

```
/llm-wiki-stack:llm-wiki-analyst produce a 1-page brief on [[LLM Wiki Pattern]] for a new teammate
```

The agent reads the wiki, writes plain markdown to `vault/output/<slug>.md`, and cites every claim with `[[wikilinks]]` back to the wiki page. See [guide 05](./05-export-outputs.md) for the full pattern, including when to convert an output into a navigation index and when to commit an output to git.

### Understand per-folder MOC maintenance

The pipeline maintains per-folder MOCs (`_index.md`) automatically — every ingest updates `children:` and `child_indexes:` in the affected folders. You should not need to edit per-folder MOCs by hand. If you do (to rewrite a summary block at the top, for example):

1. Leave the frontmatter alone. `children:`, `child_indexes:`, and `aliases:` are schema-owned.
2. The `post-wiki-write.sh` hook will remind you to update the parent per-folder MOC if you touched anything structural.

If a per-folder MOC ever drifts, `/llm-wiki-stack:llm-wiki-lint-fix` will catch and repair it.

### Individual skills vs the default pipeline

The pipeline is the default for a reason: it runs ingest → verify → lint-fix → synthesize in one pass and catches mid-run drift via `SubagentStop`. Reach for individual skills when:

- **`/llm-wiki-stack:llm-wiki-ingest`** — you want ingest only, without the follow-on lint-fix or synthesis. Useful for a tight batch you plan to lint separately.
- **`/llm-wiki-stack:llm-wiki-lint`** — read-only audit. Reports errors, warnings, and info items without modifying the wiki. Useful before an export or a reorg.
- **`/llm-wiki-stack:llm-wiki-fix`** — repair without a preceding ingest.
- **`/llm-wiki-stack:llm-wiki-index`** — refresh the vault MOC (`wiki/index.md`) across the whole vault. Distinct from per-folder per-folder MOCs (`_index.md`), which the pipeline owns.
- **`/llm-wiki-stack:llm-wiki-synthesize`** — file a cross-topic synthesis explicitly, rather than letting the pipeline decide whether the run warrants one.
- **`/llm-wiki-stack:obsidian-graph-colors`** — apply per-topic colors to Obsidian's graph view. Run once after a major reorg.

The three Obsidian reference skills — `/llm-wiki-stack:obsidian-markdown`, `/llm-wiki-stack:obsidian-bases`, `/llm-wiki-stack:obsidian-cli` — are reference documentation, not operations. Invoke them when you need to look up callout syntax, Base schemas, or CLI flags.

## Reference guides

Each numbered guide zooms in on one topic. They assume you already did day 1.

| #   | Guide                                                            | When to read it                                                 |
| --- | ---------------------------------------------------------------- | --------------------------------------------------------------- |
| 1   | [Getting started](./01-getting-started.md)                       | Troubleshooting a fresh install; auditing hook wiring           |
| 2   | [Create a new vault](./02-create-new-knowledge-base.md)          | Standing up a second vault, or re-running the wizard            |
| 3   | [Update an existing vault](./03-update-existing.md)              | Deeper detail on ingest behavior and the entity-distribution model |
| 4   | [Review, validate, fix](./04-review-validate-fix.md)             | The three levels of validation and when to use each             |
| 5   | [Export data, create output](./05-export-outputs.md)             | Writing reports, ADRs, and briefs from the vault                |
| 6   | [Check the dashboard](./06-check-the-dashboard.md)               | The Dataview dashboard and what each section surfaces           |
| 7   | [Query the wiki](./07-query-the-wiki.md)                         | Query patterns, challenge mode, and saving answers as synthesis |

## Conventions in these guides

- Slash commands are written in full: `/llm-wiki-stack:<skill-or-agent-name>`.
- Commands in `code fences` are typed inside a Claude Code session in your project directory.
- File paths are relative to your project root (where `vault/` lives) unless noted.
- A **hook** is a script that fires on a tool-call event and blocks, warns, or informs. Hooks come from the plugin; you do not wire them by hand.
- The **schema** is `vault/CLAUDE.md` in your project. The example copy ships at `example-vault/CLAUDE.md` in the plugin source.

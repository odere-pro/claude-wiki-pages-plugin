# Specification

Authoritative description of `llm-wiki-stack`, version `0.1.0`, schema version `1`. This document is reproducibility-grade — every contract an implementer needs is here. The example vault demonstrates the schema; this file defines it.

Terminology follows `docs/VOCABULARY.md`. Where this file and `docs/vault-example/CLAUDE.md` diverge, **this file wins for schema intent** and the example vault is updated to match. Where a user guide and this file diverge, **this file wins** and the guide is corrected.

## 1. Identity

- **Name.** `llm-wiki-stack`.
- **Distribution.** Standalone Claude Code plugin. Installed via same-repo marketplace.
- **License.** Apache 2.0. See `LICENSE` and `NOTICE`.
- **Versioning.** Semantic versioning. `plugin.json` `version` is the product version. `schema_version` in `docs/vault-example/CLAUDE.md` is the vault schema version, independent of product version.
- **Homepage.** `https://github.com/odere-pro/llm-wiki-stack`.

## 2. Configuration

### Vault root resolution

All Layer 4 scripts source `scripts/resolve-vault.sh`, which applies this
four-tier resolution (first match wins):

| Priority | Source                                          | Behaviour                                                                                                                             |
| -------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1        | `LLM_WIKI_VAULT` env var                        | Used as-is (relative or absolute). Explicit override — good for local dev and CI.                                                     |
| 2        | `.claude/llm-wiki-stack/settings.json`          | `current_vault_path` field. Written by `scripts/set-vault.sh` or the plugin on session start.                                        |
| 3        | Auto-detect                                     | Scan up to 4 levels deep for a `CLAUDE.md` declaring `schema_version` whose parent directory also contains `wiki/`. First match wins. |
| 4        | Default                                         | `docs/vault` relative to the project root.                                                                                            |

### `.claude/llm-wiki-stack/settings.json`

Created automatically on `SessionStart` if it does not exist. Contains two
fields — `default_vault_path` is recorded once and never changed; only
`current_vault_path` is mutated when the user changes the vault root.

```json
{
  "default_vault_path": "docs/vault",
  "current_vault_path": "docs/vault"
}
```

To change the active vault call `scripts/set-vault.sh <path>` or set
`current_vault_path` directly in the file. To restore the default, copy
`default_vault_path` back into `current_vault_path`.

```sh
# Priority-1 override — local dev and CI only; does not write settings.json
export LLM_WIKI_VAULT=docs/vault   # explicit relative, same as default
export LLM_WIKI_VAULT=/mnt/shared  # absolute for shared / multi-project vaults

# Priority-2 — persistent per-project setting
bash scripts/set-vault.sh my/project/vault
```

The `--target <path>` CLI flag accepted by `verify-ingest.sh`,
`validate-frontmatter.sh`, and `check-wikilinks.sh` overrides all four tiers
when running those scripts directly (not via hooks).

Claude applies the same resolution when deciding where to read or write vault
files — it need not be told the path explicitly if the vault is already present.

## 3. Problem statement

A Claude Code plugin that turns an Obsidian vault into a maintained, provenance-tracked knowledge base following Karpathy's LLM Wiki pattern. Four-layer stack — Data, Skills, Agents, Orchestration — with hook-enforced boundaries between them. The human curates sources; the LLM maintains the wiki; hooks enforce what neither side can be trusted to enforce on its own.

## 4. Inputs and outputs

### Inputs

- **Sources** (`vault/raw/`) — immutable files the user drops in. Markdown, PDFs, images, transcripts. Mutation blocked by `scripts/protect-raw.sh`.
- **Queries** (`/llm-wiki-stack:llm-wiki-query`) — natural-language questions answered from `vault/wiki/`.
- **Schema overrides** (`vault/CLAUDE.md`) — per-vault schema with `schema_version` field.

### Outputs

- **Wiki pages** (`vault/wiki/`) — LLM-maintained markdown with strict YAML frontmatter and `[[wikilink]]` cross-references.
- **Per-folder MOCs** (`vault/wiki/**/_index.md`) — one per folder, listing children and subfolder MOCs.
- **Source summaries** (`vault/wiki/_sources/`) — one page per ingested source.
- **Synthesis notes** (`vault/wiki/_synthesis/`) — cross-topic analysis.
- **Log** (`vault/wiki/log.md`) — chronological record of operations.
- **Dashboard** (`vault/wiki/dashboard.md`) — Dataview query page, rendered in Obsidian.
- **Status reports** — printed to the terminal by lint and status commands.

## 5. Four-layer stack contracts

### Layer 1 — Data

- **Directories.** `vault/raw/` (immutable), `vault/wiki/` (LLM-maintained), `vault/CLAUDE.md` (schema).
- **Input.** User files in `raw/`.
- **Output.** Wiki pages consumed by Layers 2–3.
- **Invariants enforced by this layer.** File-system separation of sources and wiki.
- **Failure modes caught here.** None — Layer 1 is passive. All enforcement sits in Layer 4.

### Layer 2 — Skills

Thirteen single-responsibility capabilities. Each skill reads `raw/` and writes only to `wiki/` (`llm-wiki-synthesize` writes only to `wiki/_synthesis/`; `llm-wiki-markdown` writes only to `vault/output/`; `obsidian-graph-colors` writes only to `.obsidian/graph.json`). No skill knows about any other skill.

Skills fall into three provenance groups, reflected in `NOTICE` and `THIRD_PARTY_LICENSES.md`:

- **Plugin-authored (`llm-wiki-*` + `obsidian-graph-colors`).** Original work by this plugin. The `obsidian-` prefix marks the target (Obsidian's graph plugin API), not third-party provenance.
- **Third-party MIT (`obsidian-markdown`, `obsidian-bases`, `obsidian-cli`).** From `kepano/obsidian-skills`. Retained under original name and license; attribution preserved.

| Skill                   | Provenance      | Responsibility                                                           |
| ----------------------- | --------------- | ------------------------------------------------------------------------ |
| `llm-wiki`              | plugin-authored | Onboarding wizard. Scaffolds `vault/` from `docs/vault-example/` and orients. |
| `llm-wiki-ingest`       | plugin-authored | Ingests one or more sources into the wiki.                               |
| `llm-wiki-query`        | plugin-authored | Answers a query from the wiki with `[[wikilink]]` citations.             |
| `llm-wiki-lint`         | plugin-authored | Audits the wiki for structural and provenance drift.                     |
| `llm-wiki-fix`          | plugin-authored | Auto-repairs what lint reports.                                          |
| `llm-wiki-status`       | plugin-authored | One-command health check; exercises every hook path.                     |
| `llm-wiki-synthesize`   | plugin-authored | Writes a cross-topic synthesis note.                                     |
| `llm-wiki-index`        | plugin-authored | Generates or refreshes the vault MOC at `wiki/index.md`.                 |
| `llm-wiki-markdown`     | plugin-authored | Renders a wiki query as portable markdown into `vault/output/`.          |
| `obsidian-graph-colors` | plugin-authored | Applies per-topic colors to Obsidian's graph view.                       |
| `obsidian-markdown`     | MIT, kepano     | Obsidian-flavored markdown reference.                                    |
| `obsidian-bases`        | MIT, kepano     | Obsidian Bases (database) reference.                                     |
| `obsidian-cli`          | MIT, kepano     | Obsidian CLI reference.                                                  |

- **Input.** User invocation; schema at `vault/CLAUDE.md`.
- **Output.** Writes to `wiki/` (or its sub-paths) and terminal reports.
- **Invariants enforced here.** Each skill calls Layer 1 reads and Layer 4 writes; it does not bypass either.
- **Failure modes caught here.** A skill misbehaving on a single run shows as bad output for that command; user re-runs with different input.

### Layer 3 — Agents

Five multi-step executors that compose Layer 2 skills.

| Agent                                  | Chains                                                                                              |
| -------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `llm-wiki-stack-orchestrator-agent`    | Probes vault state and dispatches to the wizard skill (`llm-wiki`) or one of three specialists (`ingest`, `curator`, `analyst`). The polish agent runs as a separate post-step after `ingest` or `curator` returns. The user-facing entry. |
| `llm-wiki-stack-ingest-agent`          | ingest → curator → _optimize (opt-in)_ → synthesize. Invoked by the orchestrator on pending sources. |
| `llm-wiki-stack-curator-agent`         | Audits, auto-repairs, gates judgment fixes behind plans, reports unresolved items.                  |
| `llm-wiki-stack-analyst-agent`         | Answers analytical questions requiring traversal of the topic tree (5 modes: query, dashboard, compile, extract, challenge). |
| `llm-wiki-stack-polish-agent`          | Tail-of-write step — graph colors, vault-MOC refresh, per-folder MOC consistency. Runs after ingest or curator returns. |

- **Input.** User invocation; schema.
- **Output.** Agent reports aggregating per-skill output; wiki writes via the chained skills.
- **Invariants enforced here.** Ordering, retries, and completion gates between skills.
- **Failure modes caught here.** Agent misbehavior (half-written wiki after a long run) is caught by Layer 4's `SubagentStop` gates.

### Layer 4 — Orchestration

Hooks, scripts, and path-scoped rules. Defines the contracts Layers 1–3 operate under.

- **Input.** Tool-call lifecycle events (`PreToolUse`, `PostToolUse`, `SubagentStop`, `UserPromptSubmit`, `SessionStart`).
- **Output.** Blocked writes (exit code 2), advisory reminders (printed), session preambles, post-run verification.
- **Invariants enforced here.** Every invariant in this spec.
- **Failure modes caught here.** Frontmatter violations, cross-ref drift, `raw/` mutation, missing indexes, stale provenance.

## 6. Directory layout

```
llm-wiki-stack/                         # plugin source (installed to the user's plugin cache)
├── .claude-plugin/
│   ├── plugin.json                     # product version, description, keywords
│   └── marketplace.json                # same-repo marketplace definition
├── skills/                             # Layer 2 (13 skills)
├── agents/                             # Layer 3 (5 agents)
├── hooks/
│   └── hooks.json                      # Layer 4 hook wiring
├── scripts/                            # Layer 4 hook implementations
├── rules/                              # Layer 4 path-scoped rules
├── docs/vault-example/                      # Layer 1 reference vault + authoritative schema
└── docs/                               # spec, vocabulary, architecture, security, user guides

<user-project>/                         # the user's own project after install
└── vault/
    ├── CLAUDE.md                       # per-vault schema override; declares schema_version
    ├── _templates/
    │   ├── source.md
    │   ├── entity.md
    │   ├── concept.md
    │   ├── synthesis.md
    │   ├── index.md                    # (was moc.md in pre-1 schemas)
    │   └── log.md
    ├── raw/                            # immutable sources; mutation blocked by protect-raw.sh
    │   └── assets/
    ├── wiki/
    │   ├── index.md                    # vault MOC — catalog of every wiki page
    │   ├── log.md                      # operations log
    │   ├── dashboard.md                # Dataview dashboard
    │   ├── _sources/                   # one summary per ingested source
    │   ├── _synthesis/                 # cross-topic syntheses
    │   └── <topic>/                    # topic folder
    │       ├── _index.md               # per-folder MOC (every topic folder has one)
    │       ├── <page>.md               # wiki page (entity or concept)
    │       └── <subtopic>/
    │           ├── _index.md
    │           └── <page>.md
    └── output/                         # optional, git-ignored scratch space; not part of the schema
```

**Depth cap.** Folder nesting inside `wiki/` MUST NOT exceed four levels. `llm-wiki-lint` flags violations.

## 7. Frontmatter schema

Every wiki page carries YAML frontmatter. The `type` field drives every operation — read it first.

### Allowed `type` values (schema_version 1)

`source`, `entity`, `concept`, `synthesis`, `index`, `log`.

Files in `vault/output/` are plain markdown and carry no frontmatter.

### Field registry

| Field             | Type             | Required on                        | Constraints                                                                                                              |
| ----------------- | ---------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `title`           | string           | all                                | Title Case. First entry of `aliases` must match.                                                                         |
| `type`            | enum             | all                                | One of the six allowed values.                                                                                           |
| `aliases`         | list\<string\>   | all                                | Must include `title` as the first entry. Add display variants for wikilink resolution.                                   |
| `parent`          | wikilink         | all except vault MOC               | `"[[Parent Map Title]]"`.                                                                                                |
| `path`            | string           | all wiki pages                     | Folder path relative to `wiki/`. Empty string for root.                                                                  |
| `sources`         | list\<wikilink\> | entity, concept, synthesis         | Every item is `"[[source-note]]"`. Plain strings are a lint error.                                                       |
| `related`         | list\<wikilink\> | entity, concept                    | Symmetric relation; lint repairs drift.                                                                                  |
| `contradicts`     | list\<wikilink\> | concept                            | Typed relation.                                                                                                          |
| `supersedes`      | list\<wikilink\> | concept                            | Typed relation.                                                                                                          |
| `depends_on`      | list\<wikilink\> | concept                            | Typed relation.                                                                                                          |
| `children`        | list\<wikilink\> | index                              | Every wiki page in this folder, by title.                                                                                |
| `child_indexes`   | list\<wikilink\> | index                              | Every subfolder's per-folder MOC. _(Field name retained from schema_version 1; renamed from `child_mocs` at that time.)_ |
| `scope`           | list\<wikilink\> | synthesis                          | The pages the synthesis covers.                                                                                          |
| `synthesis_type`  | enum             | synthesis                          | `comparison`, `theme`, `contradiction`, `gap`, `timeline`.                                                               |
| `source_type`     | enum             | source                             | `article`, `paper`, `policy`, `transcript`, `book`, `video`, `podcast`, `manual`.                                        |
| `source_format`   | enum             | source                             | `text`, `image`. Defaults to `text`. Non-text requires `attachment_path` and `extracted_at`.                             |
| `attachment_path` | string           | source (non-text)                  | Path under `vault/raw/assets/`.                                                                                          |
| `extracted_at`    | date             | source (non-text)                  | `YYYY-MM-DD`.                                                                                                            |
| `url`             | string           | source                             | Canonical URL if the source is online.                                                                                   |
| `author`          | string           | source                             | —                                                                                                                        |
| `publisher`       | string           | source                             | —                                                                                                                        |
| `date_published`  | date             | source                             | `YYYY-MM-DD`.                                                                                                            |
| `date_ingested`   | date             | source                             | `YYYY-MM-DD`.                                                                                                            |
| `entity_type`     | enum             | entity                             | `person`, `organization`, `product`, `tool`, `service`, `standard`, `place`.                                             |
| `tags`            | list\<string\>   | all                                | Free-form; Obsidian tag syntax compatible.                                                                               |
| `created`         | date             | all                                | `YYYY-MM-DD`.                                                                                                            |
| `updated`         | date             | all                                | `YYYY-MM-DD`. Advanced on every write.                                                                                   |
| `update_count`    | integer          | entity, concept                    | Incremented on every ingest pass that touches the page.                                                                  |
| `status`          | enum             | all                                | `active`, `stale`, `superseded`, `draft`. Logs also use `active`.                                                        |
| `confidence`      | float            | entity, concept, synthesis, source | `[0.0, 1.0]`. Confidence discipline rules in §14.                                                                        |

### Canonical examples per `type`

#### source

```yaml
---
title: "Karpathy LLM Wiki Gist"
type: source
source_type: article
source_format: text
url: "https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f"
author: "Andrej Karpathy"
publisher: "GitHub Gist"
date_published: 2026-02-01
date_ingested: 2026-04-18
aliases: ["Karpathy LLM Wiki Gist"]
sources: []
tags: []
created: 2026-04-18
updated: 2026-04-18
status: active
confidence: 1.0
---
```

#### entity

```yaml
---
title: "Claude Code"
type: entity
entity_type: tool
aliases: ["Claude Code", "claude-code"]
parent: "[[Tools — Index]]"
path: "tools"
sources: ["[[karpathy-llm-wiki-gist]]"]
related: ["[[Obsidian]]"]
tags: []
created: 2026-04-18
updated: 2026-04-18
update_count: 1
status: active
confidence: 1.0
---
```

#### concept

```yaml
---
title: "LLM Wiki Pattern"
type: concept
aliases: ["LLM Wiki Pattern", "llm wiki"]
parent: "[[Patterns — Index]]"
path: "patterns"
sources: ["[[karpathy-llm-wiki-gist]]"]
related: ["[[Hook-Enforced Guarantees]]"]
contradicts: []
supersedes: []
depends_on: []
tags: []
created: 2026-04-18
updated: 2026-04-18
update_count: 1
status: active
confidence: 0.9
---
```

#### synthesis

```yaml
---
title: "Why Four Layers"
type: synthesis
synthesis_type: theme
path: "_synthesis"
scope: ["[[LLM Wiki Pattern]]", "[[Hook-Enforced Guarantees]]"]
sources: ["[[karpathy-llm-wiki-gist]]"]
aliases: ["Why Four Layers"]
tags: []
created: 2026-04-18
updated: 2026-04-18
status: active
confidence: 0.8
---
```

#### index

```yaml
---
title: "Patterns — Index"
type: index
aliases: ["Patterns — Index", "patterns", "Patterns"]
parent: "[[Wiki Index]]"
path: "patterns"
children: ["[[LLM Wiki Pattern]]", "[[Hook-Enforced Guarantees]]"]
child_indexes: []
tags: []
created: 2026-04-18
updated: 2026-04-18
---
```

#### log

```yaml
---
title: "Operations Log"
type: log
aliases: ["Operations Log"]
created: 2026-04-18
updated: 2026-04-18
---
```

## 8. MOCs (per-folder and vault)

Every folder under `wiki/` contains exactly one **per-folder MOC** (file: `_index.md`). The **vault MOC** lives at `wiki/index.md` (no underscore prefix). Both carry `type: index` frontmatter — the shared schema value — but play distinct roles.

- **Frontmatter fields** — `title`, `type: index`, `aliases`, `parent` (except the vault MOC), `path`, `children`, `child_indexes`, `tags`, `created`, `updated`.
- **`aliases`** — MUST include the folder's topic name in common display variants (slug, Title Case, abbreviations). This keeps wikilinks resolving by any name.
- **`children`** — every `.md` file in the folder, by title, except the per-folder MOC itself.
- **`child_indexes`** — the per-folder MOC of every direct subfolder.
- **Auto-update contract** — ingest and lint-fix maintain `children` and `child_indexes` on every write to the folder. A page added without its per-folder MOC updated is a lint error.

## 9. Command contracts

Every slash command is `/llm-wiki-stack:<name>`. Each skill contract is a triple: **what must be true before invocation**, **what must be true after**, and **which hooks enforce the gap between them**. Skills are grouped below by the role they play in a session, not by alphabetical order.

### Role A — Top-level entry and bootstrap

#### `wiki`

The user-facing top-level verb. Implemented as `commands/wiki.md` and dispatches to `llm-wiki-stack-orchestrator-agent` (§11). The orchestrator probes vault state and routes to one specialist per invocation.

- **Read.** Filesystem only — vault path resolved via `scripts/resolve-vault.sh`; `vault/CLAUDE.md`; `vault/raw/`; `vault/wiki/log.md`.
- **Write.** Nothing directly. All writes happen inside the dispatched specialist.
- **Exit state.** Final report consolidating the specialist's output. If the wizard ran, the orchestrator parses its `NEXT_STEP:` line to surface the recommended next invocation.
- **Enforced by.** `SessionStart` schema preamble; `PreToolUse` hooks on every write the dispatched specialist performs.

#### `llm-wiki`

The onboarding entry point. Run by the orchestrator on a missing or under-scaffolded vault, or directly by users who want explicit control. Run at most once per new vault under normal use.

- **Read.** `docs/vault-example/` (reference vault); plugin config; the user's project root.
- **Write.** `vault/` scaffolded from `docs/vault-example/`, including `vault/CLAUDE.md` with `schema_version: 1`.
- **Exit state.** `verify-ingest.sh` exits 0 against the new vault. A "you are here" summary prints to the terminal pointing the user at `/llm-wiki-stack:wiki` (the orchestrator chains directly into ingest if `raw/` has files) as the next step.
- **Enforced by.** `SessionStart` schema-reminder preamble fires on first invocation. `PreToolUse` frontmatter validation catches any malformed template copy.

### Role B — Pipeline (orchestrator-driven default)

#### `llm-wiki-stack-ingest-agent` (Layer 3 agent, listed here for parity)

The Layer 3 agent the orchestrator dispatches when `vault/raw/` has unprocessed sources. Full contract in §11; summarized here because its precondition is the default starting point for the power-user skills below. Users typically invoke it via `/llm-wiki-stack:wiki`; direct invocation is supported for scripting.

- **Read.** Files in `vault/raw/` not yet referenced in `wiki/log.md`.
- **Write.** Source summaries in `wiki/_sources/`, new/updated typed pages in `wiki/<topic>/`, maintained per-folder `_index.md`, refreshed `wiki/index.md`, appended `wiki/log.md`, and — when warranted — a synthesis note under `wiki/_synthesis/`.
- **Exit state.** `verify-ingest.sh` clean; `llm-wiki-stack-curator-agent` reports zero errors.
- **Enforced by.** `PreToolUse` (frontmatter, wikilinks, raw immutability, attachment validity) + `PostToolUse` summary + `SubagentStop` ingest and lint gates.

### Role C — Power-user verbs (narrower scope than the pipeline)

#### `llm-wiki-ingest`

The ingest-only portion of the pipeline. Skips lint-fix and synthesis.

- **Read.** Same input set as the pipeline.
- **Write.** Source summaries and typed pages; per-folder MOC upkeep for every folder it touches.
- **Exit state.** `verify-ingest.sh` exits 0; lint may or may not be clean depending on cross-page invariants the pipeline would otherwise repair.
- **Enforced by.** Same `PreToolUse` hooks as the pipeline.

#### `llm-wiki-query`

Answers a question from the wiki.

- **Read.** `vault/wiki/` (all typed pages).
- **Write.** An append-only entry to `wiki/log.md` recording the query. No other writes unless the user accepts the optional offer to file the answer as a synthesis note — in which case the write is delegated to `llm-wiki-synthesize`.
- **Exit state.** The caller receives a synthesized answer; every claim carries one or more `[[wikilink]]` citations; every cited page resolves.
- **Enforced by.** `PreToolUse` rejects any write that uses a markdown link where a wikilink is required.

#### `llm-wiki-lint`

Read-only audit.

- **Read.** `vault/wiki/` plus, when configured, `vault/raw/` for staleness checks.
- **Write.** An append-only entry to `wiki/log.md`. No wiki content mutation.
- **Exit state.** A three-level report (Errors / Warnings / Info) enumerating every lint rule in §12 that fires. Exit code matches severity: 0 = clean or info-only, 1 = warnings, 2 = errors.
- **Enforced by.** None — lint is itself the enforcement mechanism for §12. `PreToolUse` protects the wiki from accidental writes.

#### `llm-wiki-fix`

Applies the repairs `llm-wiki-lint` identified.

- **Read.** Either a just-produced lint report in the conversation context, or a fresh lint pass the skill runs internally.
- **Write.** Idempotent structural repairs: backfilled frontmatter fields, restored wikilink targets, reconciled per-folder MOC `children`/`child_indexes`, corrected `type:` drift.
- **Exit state.** A re-lint shows strictly fewer errors than the input report; warnings and info may still remain. An entry appended to `wiki/log.md`.
- **Enforced by.** `PreToolUse` frontmatter + wikilink + raw immutability checks on every write. `SubagentStop` lint gate if invoked inside an agent chain.

### Role D — Composition

#### `llm-wiki-synthesize`

Produces a cross-topic synthesis note.

- **Read.** A user-selected scope: topics, concepts, or explicit pages from `vault/wiki/`.
- **Write.** A new file under `wiki/_synthesis/` with `type: synthesis`, required `synthesis_type`, populated `scope:` and `sources:`. The vault MOC at `wiki/index.md` is refreshed to include the new note.
- **Exit state.** The new file passes `verify-ingest.sh`. Every entry in its `scope:` resolves to an existing wiki page.
- **Enforced by.** `PreToolUse` frontmatter validator rejects synthesis pages missing `synthesis_type` or `scope:`.

#### `llm-wiki-index`

Refreshes the vault MOC.

- **Read.** The full `vault/wiki/` tree.
- **Write.** `wiki/index.md` only. Per-folder `_index.md` files are owned by the ingest workflow, not by this skill.
- **Exit state.** `wiki/index.md` lists every top-level topic folder and every synthesis note. Ordering is stable across invocations (so repeated runs produce no diff unless the tree changed).
- **Enforced by.** `PreToolUse` frontmatter validation on the single write.

#### `llm-wiki-markdown`

Runs a query and renders the answer as portable, GitHub-flavored markdown.

- **Read.** Same input set as `llm-wiki-query` — schema, vault MOC, per-folder MOCs, candidate typed pages, and pages reached by following `[[wikilinks]]` one hop.
- **Write.** A new file at `vault/output/<slug>.md` carrying the `generated_by`/`source_query`/`generated_at`/`sources` frontmatter, plus an append-only entry to `wiki/log.md` (`## [YYYY-MM-DD] markdown | <summary> → output/<slug>.md`). No writes to `wiki/` content.
- **Exit state.** The output file contains no `[[wikilinks]]` in body prose, no Dataview blocks, and no Obsidian callouts. Every internal link resolves to a real wiki page; every entry in `sources:` resolves.
- **Enforced by.** `verify-output.sh` (advisory) on the new file's frontmatter shape; `PreToolUse` raw-immutability and frontmatter checks on every write.

### Role E — Diagnostics

#### `wiki-doctor`

Environment health check. Implemented as `commands/wiki-doctor.md` wrapping `scripts/doctor.sh`. Read-only; never writes.

- **Read.** Plugin root, `.claude-plugin/plugin.json`, `vault/CLAUDE.md`, `vault/raw/`, `vault/wiki/`, `hooks/hooks.json`, every script referenced from it, `scripts/validate-docs.sh`.
- **Write.** Nothing.
- **Exit state.** Exit code 0–5 and per-check `OK:` / `FAIL[N]:` lines. Codes: `0` healthy; `1` vault path unresolvable; `2` schema_version absent or unsupported; `3` `raw/` unreadable or `wiki/` unwritable; `4` hook script not executable; `5` vocabulary drift.
- **Enforced by.** Read-only by contract; the script never mutates the vault. Tier 1 Bats coverage in `tests/scripts/doctor.bats`.

#### `llm-wiki-status`

One-command health check. Must leave the vault unchanged.

- **Read.** Plugin config; hook files; every script referenced from `hooks/hooks.json`; the vault schema.
- **Write.** Nothing in `vault/`. May write a transient report file under the plugin's scratch path if one is configured.
- **Exit state.** A pass/fail report per hook path: dependency check, `SessionStart` preamble, `PreToolUse` frontmatter block, `PreToolUse` raw-immutability block, `PostToolUse` reminder, `SubagentStop` ingest verifier. Exit code 0 iff every line is green.
- **Enforced by.** The skill asserts its own non-mutation invariant by comparing `git status` before and after.

## 10. Hook catalog

From `hooks/hooks.json`. Every hook is one of: blocking (exit code 2 aborts the tool call), advisory (prints, does not abort), informational (preamble only).

| Trigger                  | Script                    | Mode          | Purpose                                                              |
| ------------------------ | ------------------------- | ------------- | -------------------------------------------------------------------- |
| `SessionStart`           | inline echo               | informational | Reminds the LLM to read `vault/CLAUDE.md` before any wiki operation. |
| `UserPromptSubmit`       | `prompt-guard.sh`         | advisory      | Inspects user prompts for patterns that invite schema violations.    |
| `PreToolUse` Write/Edit  | `validate-frontmatter.sh` | blocking      | Rejects writes with invalid or missing frontmatter fields.           |
| `PreToolUse` Write/Edit  | `check-wikilinks.sh`      | blocking      | Rejects writes that use markdown links where wikilinks are required. |
| `PreToolUse` Write/Edit  | `protect-raw.sh`          | blocking      | Rejects any write under `vault/raw/`.                                |
| `PreToolUse` Write/Edit  | `validate-attachments.sh` | blocking      | Rejects source writes that reference missing attachment files.       |
| `PostToolUse` Write/Edit | `post-wiki-write.sh`      | advisory      | Reminds the LLM to update `_index.md` and `wiki/index.md`.           |
| `PostToolUse` Write/Edit | `post-ingest-summary.sh`  | advisory      | Prints a summary of the ingest operation, if one is in progress.     |
| `SubagentStop`           | `subagent-lint-gate.sh`   | blocking      | Runs a lint check; non-zero aborts the agent completion.             |
| `SubagentStop`           | `subagent-ingest-gate.sh` | blocking      | Runs `verify-ingest.sh`; non-zero aborts.                            |

Planned additions (Phase D):

| Trigger                            | Script             | Mode     | Purpose                                                                |
| ---------------------------------- | ------------------ | -------- | ---------------------------------------------------------------------- |
| `SessionStart`                     | `check-deps.sh`    | blocking | Verifies `jq`, `bash >= 3.2`, hook files readable, scripts executable. |
| `PostToolUse` Write/Edit on `*.md` | `validate-docs.sh` | advisory | Enforces vocabulary.                                                   |

## 11. Agent contracts

### `llm-wiki-stack-orchestrator-agent`

- **Invocation.** Entry point for `/llm-wiki-stack:wiki`. `user-invocable: true`. Single-pass; never recurses.
- **Probes.** `vault_exists`, `schema_version`, `raw_pending` (count of files in `raw/` not referenced in `wiki/log.md`), `last_log_entry` (most recent verb in `wiki/log.md`).
- **Dispatch.** First-match-wins on the table in `agents/llm-wiki-stack-orchestrator-agent.md` Step 2. Routes to: the `llm-wiki` skill (init wizard), `llm-wiki-stack-ingest-agent`, `llm-wiki-stack-curator-agent`, or `llm-wiki-stack-analyst-agent`. Falls through to one clarifying question.
- **Guarantees.** Calls exactly one specialist per invocation. Specialists must not re-probe state; the orchestrator passes `vault_path` explicitly. Never writes to `vault/`.

### `llm-wiki-stack-ingest-agent`

- **Chains.** ingest → curator (wraps verify) → _optimize (opt-in, destructive)_ → synthesize. Optimize is gated behind explicit user confirmation and skipped if no folder exceeds the ≤ 12-children target.
- **Guarantees.** On clean return: every source has a summary; every touched page carries valid frontmatter and updated `sources`; every affected `_index.md` is up to date; `wiki/index.md` and `wiki/log.md` advanced; synthesis note filed if the run warrants one; `verify-ingest.sh` exits 0.
- **Failure policy.** On any `SubagentStop` gate failure, the agent halts and surfaces the unresolved items. It does not retry silently.

### `llm-wiki-stack-curator-agent`

- **Chains.** lint → fix → lint (revalidation).
- **Guarantees.** On clean return: no errors; warnings reported to the user; info items documented. Fix passes are idempotent — running twice does not change the tree. Judgment fixes (restructures, merges) require explicit user approval before any write.

### `llm-wiki-stack-analyst-agent`

- **Chains.** query → (optionally) synthesize.
- **Guarantees.** Answers carry `[[wikilink]]` citations. No hallucinated page titles; every citation resolves. Modes 2 (Dashboard) and 3 (Document Compile) gate writes to `wiki/dashboard.md` and `wiki/_synthesis/`.

### `llm-wiki-stack-polish-agent`

- **Invocation.** Tail-of-write specialist. Fanned out by the orchestrator after every successful ingest or curator run; never invoked directly. `user-invocable: false`.
- **Chains.** graph-colors → vault-MOC refresh → per-folder MOC consistency. Single pass, no destructive ops, idempotent.
- **Guarantees.** On clean return: every top-level topic folder has a graph color group; `wiki/index.md` reflects current per-topic page counts and last-updated dates; every `_index.md` `children:` and `child_indexes:` is appended (never deleted) to match filesystem state. Two consecutive runs against the same vault produce zero diffs.
- **Failure policy.** A failed step prints a `[skip] <step>: <reason>` marker and continues. A polish miss never blocks the upstream specialist's success report.

## 12. Schema versioning

- `docs/vault-example/CLAUDE.md` declares `schema_version: <int>` at the top of its frontmatter.
- `.claude-plugin/plugin.json` declares `supported_schema_versions: [<int>, ...]`.
- `scripts/verify-ingest.sh` reads the vault's `schema_version` and refuses to run if it is not in the supported list. Exit code 1 with a migration hint.
- **Bump rules.**
  - **Minor** — added optional fields, new `type` enum values that older tools ignore gracefully.
  - **Major** — renamed fields, removed fields, changed required-field semantics.
- **Version 1 changes from pre-versioning.** `type: moc` → `type: index`; file `_MOC.md` → `_index.md`; field `child_mocs:` → `child_indexes:`; template `moc.md` → `index.md`.

Older pre-versioning vaults are not migrated in place. The release notes document the manual rename.

## 13. Lint rules

`llm-wiki-lint` scans for:

- **Orphan pages** — no inbound wikilinks. Warning.
- **Dangling wikilinks** — links to non-existent pages. Error.
- **Stale pages** — not updated in 30+ days despite newer related sources existing. Info.
- **Contradictions** — claims conflict across pages on the same topic. Warning.
- **Missing pages** — concepts referenced in prose but lacking their own page. Info.
- **Missing frontmatter fields** — every required field in §6 must be present for the page's `type`. Error.
- **Low confidence** — `confidence < 0.5`. Info.
- **MOC consistency** — every page in a folder appears in its per-folder MOC's `children`; every subfolder appears in `child_indexes`; every per-folder MOC links to its parent. Error (missing) / Warning (drift).
- **MOC aliases** — every per-folder MOC has `aliases` covering the topic name in display variants. Warning.
- **Missing `parent` / `path`** — all pages except the vault MOC. Error.
- **Excessive nesting** — folders deeper than four levels below `wiki/`. Warning.
- **Vault MOC consistency** — `wiki/index.md` references match actual wiki contents. Warning.
- **Confidence discipline** — `confidence ≥ 0.8` with a single source. Warning (schema allows `1.0` only for direct quotes or settled facts from an authoritative source).
- **Plain-string sources** — `sources:` entries that are not `[[wikilinks]]`. Error.
- **Banned frontmatter values** — `type: moc`, references to `_MOC.md`. Error.

## 14. Test contracts

Five tiers, per `docs/VOCABULARY.md` technical terminology.

- **Tier 0 — static checks.** JSON schema on manifests, `shellcheck`, `shfmt`, `markdownlint`, `lychee` (broken links), `gitleaks`, `yq` on skill/agent frontmatter, `scripts/validate-docs.sh`.
- **Tier 1 — shell unit tests.** `bats-core` under `tests/scripts/*.bats`, one per script. Matrix `macos-latest` + `ubuntu-latest`. `kcov` coverage, uploaded to Codecov.
- **Tier 2 — skill and agent smoke tests.** `claude -p` in headless mode. `tests/smoke/fresh-install.sh` asserts a fresh install ingests a fixture source and passes `verify-ingest.sh`. `tests/smoke/skill-schema.sh` asserts each skill's output conforms to the schema (`promptfoo` or `inspect-ai`). Runs on PR and nightly.
- **Tier 3 — release.** `release-please` + `release-drafter` drive conventional-commit-based releases.
- **Tier 4 — adversarial.** Weekly. Prompt-injection corpus replay; `garak` red-team; `osv-scanner` dependency vulnerabilities.

Each tier's assertions are a contract: a PR that breaks a Tier 0–2 assertion does not merge.

## 15. Security model

- **Prompt injection via ingested sources.** The schema is read before the source, not after it. `raw/` is immutable. Frontmatter-bound writes block malicious output shapes. `prompt-guard.sh` inspects user prompts for patterns that invite schema violations.
- **Provenance drift.** Every non-source page has a `sources:` field. `confidence` is lower-bounded by the number of corroborating sources. `llm-wiki-stack-curator-agent` repairs structural drift between pages and their indexes.
- **Vault poisoning.** Ingest is additive. A contradicting source adds to `contradicts:`; it does not silently overwrite.
- **Confidence discipline.** `1.0` only for direct quotes or settled facts from an authoritative source. `≥ 0.8` requires two independent corroborating sources. `≥ 0.6` acceptable for a single authoritative source. Below `0.5` flags for review. Lint enforces the single-source-≥0.8 check.
- **MCP auth.** The plugin exposes no MCP server. If it does in future, scope is limited to the vault path.
- **What it does not defend.** Unsigned provenance. Non-sandboxed hook scripts — hooks run with user privileges. LLM-opinion confidence scores (the model's confidence is not audited; the `confidence:` field is a scoring convention, not a truth signal).

## 16. Non-goals

- Replace legal counsel, compliance review, or professional judgment of source trustworthiness.
- Manage secrets. `.gitignore` excludes standard secret paths but the plugin is not a secrets vault.
- Work without Obsidian-flavored markdown. Plain CommonMark is not targeted.
- Serve as a multi-user collaboration layer. Concurrent writes are out of scope.
- Support vaults not backed by the local filesystem.
- Provide a hosted service.

## 17. Versioning

- This specification follows semantic versioning: `MAJOR.MINOR.PATCH`.
- **Major** — any contract change that could invalidate an existing implementation: removing a section, changing a guarantee, breaking a schema field.
- **Minor** — added sections, added fields, added commands, added hook triggers. Backward-compatible.
- **Patch** — clarifications, typo fixes, example-only changes.
- Every change is logged in `CHANGELOG.md` under a "Spec changes" subsection.

The product version (`plugin.json`) and the spec version are independent. A product patch release may accompany a spec clarification; a product major release normally requires a spec bump as well.

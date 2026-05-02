# 200 — Foundational

> **Audience.** First-time user with Claude Code installed. Basic shell literacy. No prior knowledge of Obsidian, vaults, or the four-layer stack.
>
> **After this playbook.** You have the plugin installed, a scaffolded vault, one ingested source, and one query answered with citations.
>
> **Time.** ~30 minutes.

## Prerequisites

- [Claude Code](https://docs.claude.com/en/docs/claude-code) installed and signed in.
- macOS or Linux shell.
- `git` and `jq` available on your `PATH`.
- An empty project directory you can `cd` into.

A four-layer mental model in one paragraph: the plugin is a stack of **Data → Skills → Agents → Orchestration**. You drop sources into Layer 1's `raw/`. The Layer 3 orchestrator routes them through the right Layer 2 skills. Layer 4 hooks block any write that would violate the schema. You only ever type one slash command — the orchestrator picks what to do. The full picture lives in [`docs/architecture.md`](../architecture.md).

---

## Module 1 — Welcome and the 30-minute promise

### Objectives

- Confirm your environment matches the prerequisites.
- Understand what "the one command" means.

The plugin exposes one verb you need to know:

```
/llm-wiki-stack:wiki
```

That's it. Type it after install — the orchestrator runs the wizard. Type it after dropping a source — the orchestrator runs ingest. Type it with a question — the orchestrator runs the analyst. You don't pick the specialist; the orchestrator does.

> **Note.** The orchestrator's full decision tree is the first module of [300 — Associate](./300-associate.md). For now, just trust it.

### Knowledge check

<details>
<summary>Q: How many slash commands do I need to memorize for daily use?</summary>

One: `/llm-wiki-stack:wiki`. A second one — `/llm-wiki-stack:wiki-doctor` — is for diagnostics. Everything else is a power-user bypass.
</details>

---

## Module 2 — Install the plugin

### Objectives

- Install `llm-wiki-stack` from the marketplace.
- Verify every hook fires green.

> **Lab.** From a Claude Code session, run:
>
> ```text
> /plugin marketplace add odere-pro/llm-wiki-stack
> /plugin install llm-wiki-stack
> ```
>
> Then verify the install:
>
> ```text
> /llm-wiki-stack:wiki-doctor
> ```
>
> Expected first lines:
>
> ```text
> [doctor] vault path resolved: /your/project/docs/vault
> [doctor] schema_version: 1
> [doctor] hooks/hooks.json present: yes
> [doctor] PreToolUse scripts executable: 4/4
> [doctor] PostToolUse scripts executable: 2/2
> [doctor] SubagentStop scripts executable: 2/2
> [doctor] OK
> ```
>
> Exit code: `0`. Any non-zero, see the `FAIL[N]` line and the printed remedy.

If `wiki-doctor` reports a missing tool (`jq`, `bash`, `find`), install it via your package manager and re-run.

### Knowledge check

<details>
<summary>Q: What does <code>wiki-doctor</code> not do?</summary>

It does not write anything. It is read-only by contract — exit codes 0–5 with a printed remedy per failure. Use it any time something feels wrong.
</details>

---

## Module 3 — Scaffold your first vault

### Objectives

- Create a vault from the example.
- Read the vault schema and understand what `raw/` and `wiki/` mean.

> **Lab.** From the same Claude Code session:
>
> ```text
> /llm-wiki-stack:wiki
> ```
>
> The orchestrator probes state. It sees no `vault/CLAUDE.md`. It dispatches to the `llm-wiki` wizard. The wizard:
>
> 1. Copies `docs/vault-example/` into your project as `docs/vault/`.
> 2. Writes the authoritative schema at `docs/vault/CLAUDE.md` (declares `schema_version: 1`).
> 3. Scaffolds `docs/vault/_templates/` and the three top-level wiki files (`index.md`, `log.md`, `dashboard.md`).
> 4. Prints the next three things to do.
>
> List the result:
>
> ```bash
> > tree docs/vault -L 2
> docs/vault
> ├── CLAUDE.md
> ├── _templates
> ├── output
> ├── raw
> │   └── assets
> └── wiki
>     ├── _sources
>     ├── _synthesis
>     ├── dashboard.md
>     ├── index.md
>     └── log.md
> ```

Two directories matter most:

- **`raw/`** is *immutable*. You drop files here. The plugin never modifies them. The `protect-raw.sh` hook blocks any attempt to edit a file under `raw/`.
- **`wiki/`** is *LLM-maintained*. Every page has typed YAML frontmatter and cites at least one source.

> **Note.** The vault schema lives in `docs/vault/CLAUDE.md`. It overrides every skill default. If anything in this playbook disagrees with the schema, the schema wins.

### Knowledge check

<details>
<summary>Q: Can I edit a file under <code>vault/raw/</code>?</summary>

No. The `protect-raw.sh` PreToolUse hook returns exit code 2 on any Edit to a file under `raw/`. To change a source, replace the original file (the hook allows new Writes, just not modifications) and re-run `/llm-wiki-stack:wiki`.
</details>

---

## Module 4 — Your first ingest

### Objectives

- Drop a source into `raw/`.
- Watch the orchestrator route to the ingest pipeline.
- Read the resulting wiki pages.

> **Lab.** Create a tiny markdown source:
>
> ```bash
> > mkdir -p docs/vault/raw/blog
> > cat > docs/vault/raw/blog/foo.md <<'EOF'
> # The LLM Wiki Pattern
>
> Andrej Karpathy described an LLM-maintained wiki in a 2024 gist. The idea:
> the human curates sources, the LLM maintains the wiki. Sources live in
> `raw/`, wiki pages live in `wiki/`. Every page cites its sources.
> EOF
> ```
>
> Now run the orchestrator:
>
> ```text
> /llm-wiki-stack:wiki
> ```
>
> The orchestrator probes: it sees one new file in `raw/blog/` not yet recorded in `wiki/log.md`. It dispatches to `llm-wiki-stack-ingest-agent`. After the ingest agent returns, the orchestrator runs `llm-wiki-stack-polish-agent` to refresh graph colors and indexes.
>
> Inspect the output:
>
> ```bash
> > tree docs/vault/wiki
> docs/vault/wiki
> ├── _sources
> │   └── the-llm-wiki-pattern.md
> ├── _synthesis
> ├── dashboard.md
> ├── index.md
> ├── log.md
> └── patterns
>     ├── _index.md
>     └── llm-wiki-pattern.md
> ```

The ingest agent created two pages:

- **A source summary** — `wiki/_sources/the-llm-wiki-pattern.md` — frontmatter `type: source`, `source_type: article`, plus the URL/author/date if available.
- **A concept page** — `wiki/patterns/llm-wiki-pattern.md` — frontmatter `type: concept`, with `sources: ["[[the-llm-wiki-pattern]]"]` linking back to the source summary.

It also created the topic folder `wiki/patterns/` with a `_index.md`, and appended an entry to `wiki/log.md`:

```markdown
## [2026-05-02] ingest | The LLM Wiki Pattern
```

> **Note.** Every wiki page links to at least one source. That's the provenance contract. Plain strings in `sources:` are a lint error.

### Knowledge check

<details>
<summary>Q: I dropped two files into <code>raw/</code>. Will the orchestrator handle both in one run?</summary>

Yes. The ingest agent batches every unprocessed file (anything not yet recorded in `wiki/log.md`). One `/llm-wiki-stack:wiki` invocation handles the batch.
</details>

<details>
<summary>Q: What runs after the ingest agent finishes?</summary>

The orchestrator dispatches `llm-wiki-stack-polish-agent` as a tail step — graph colors for any new top-level topics, vault MOC refresh, per-folder MOC consistency. Polish is idempotent: a second run produces no diff.
</details>

---

## Module 5 — Read the log and the dashboard

### Objectives

- Find what the LLM did from `wiki/log.md`.
- Open the Dataview dashboard (optional).

> **Lab.** Open `wiki/log.md`:
>
> ```bash
> > cat docs/vault/wiki/log.md
> ```
>
> Every operation produces one entry: `## [YYYY-MM-DD] <verb> | <subject>`. Verbs are `ingest`, `lint`, `fix`, `query`, `synthesis`. The log is append-only and human-audit friendly — scroll it any time you want to know what the plugin has been up to.

The Dashboard is a single Dataview-powered page that surfaces orphans, stale pages, and contradictions at a glance. It lives at `wiki/dashboard.md`. Open it in Obsidian if you have it; in plain markdown view the Dataview blocks render as fenced code, which is fine for reading but not for live counts.

For the dashboard walkthrough, see [`docs/llm-wiki/06-check-the-dashboard.md`](../llm-wiki/06-check-the-dashboard.md).

### Knowledge check

<details>
<summary>Q: Where does the plugin record what it just did?</summary>

`vault/wiki/log.md`. Every ingest, lint, fix, query, and synthesis produces one entry. It is append-only.
</details>

---

## Module 6 — Ask one question

### Objectives

- Run a query through the orchestrator.
- Read an answer with `[[wikilink]]` citations back to source.

> **Lab.** Ask:
>
> ```text
> /llm-wiki-stack:wiki what does the wiki say about the LLM Wiki Pattern?
> ```
>
> The orchestrator detects an analytical verb (`what`) and dispatches to `llm-wiki-stack-analyst-agent`. The analyst traverses from `wiki/index.md` into `wiki/patterns/_index.md`, reads `llm-wiki-pattern.md`, follows the wikilink to the source summary, and returns an answer that looks like:
>
> ```text
> The wiki describes the LLM Wiki Pattern (see [[LLM Wiki Pattern]]) as
> Karpathy's design where the human curates sources and the LLM maintains
> the wiki. Sources live in raw/ and wiki pages live in wiki/. Every page
> cites its sources via the `sources` frontmatter field, with [[wikilinks]]
> back to the originating source summary in [[the-llm-wiki-pattern]].
> ```
>
> Notice the citations: `[[LLM Wiki Pattern]]` is the concept page, `[[the-llm-wiki-pattern]]` is the source summary. The chain `concept → source → raw/` is always traceable.

### Knowledge check

<details>
<summary>Q: Where does an answer's citation chain end?</summary>

At a file under `vault/raw/`. Every wiki citation eventually resolves to immutable raw content. That's the provenance guarantee.
</details>

---

## Module 7 — Day 1 / Week 1 / Month 1

### Objectives

- Plan your first week with the plugin.
- Know which guide to read at each stage.

| Stage | What to do | What to read |
| ----- | ---------- | ------------ |
| **Day 1** (today) | Install. Scaffold. Ingest one source. Ask one question. | This playbook. |
| **Day 2-7** | Add 5–10 more sources. Use `/llm-wiki-stack:wiki` after each batch. Skim `wiki/log.md` daily to confirm what the plugin did. | [`03-update-existing.md`](../llm-wiki/03-update-existing.md) |
| **Week 2** | Run a curator pass: `/llm-wiki-stack:wiki check the wiki for drift`. The orchestrator dispatches the curator. | [`04-review-validate-fix.md`](../llm-wiki/04-review-validate-fix.md) |
| **Week 3** | Ask a synthesis question that crosses topics. The analyst will offer to file a synthesis note. | [`07-query-the-wiki.md`](../llm-wiki/07-query-the-wiki.md) |
| **Month 1** | Compile your first deliverable into `vault/output/` — a brief, an ADR, a report. | [`05-export-outputs.md`](../llm-wiki/05-export-outputs.md) |

If you skip steps and your vault gets weird, run `/llm-wiki-stack:wiki-doctor` first. Then run the curator (`/llm-wiki-stack:wiki check for drift`) to repair what's repairable.

---

## Where to next

- You're operating a vault and want to understand *how* the orchestrator picks specialists, customize the schema, or run two vaults in parallel → **[300 — Associate](./300-associate.md)**.
- You want to read the contracts behind every command → **[`/SPEC.md`](../../SPEC.md)** §§9, 11.
- Something feels off in the docs → **[`docs/risk-report-0.2.0.md`](../risk-report-0.2.0.md)** lists known gaps and follow-up work.

# 300 — Associate

> **Audience.** Completed [200](./200-foundational.md). Operating a real, growing vault (≥10 ingested sources). Comfortable with frontmatter, slash commands, YAML, and JSON.
>
> **After this playbook.** You can route work to any specific specialist agent on purpose, customize the vault schema, run hooks manually for debugging, batch-ingest cleanly, and operate two vaults from one Claude Code session.
>
> **Time.** ~2 hours.

## Prerequisites

- `/llm-wiki-stack:wiki-doctor` exits 0.
- Your vault has at least 10 ingested sources and 20+ wiki pages.
- You can read shell scripts and YAML frontmatter.

---

## Module 1 — The orchestrator decision tree

### Objectives

- Read the orchestrator's dispatch table.
- Predict which specialist runs for a given prompt.
- Recognize the polish-agent's tail-step.

The Layer 3 orchestrator (`llm-wiki-stack-orchestrator-agent`) does exactly one job: **state probe → choose one specialist → fan out → optional polish tail**. It never recurses, never picks two specialists, and never re-routes after a specialist returns.

The full contract is in [`agents/llm-wiki-stack-orchestrator-agent.md`](../../agents/llm-wiki-stack-orchestrator-agent.md) and [`/SPEC.md` §11](../../SPEC.md). The dispatch table summarized:

| Probe result                                                                                  | Specialist | Why |
| --------------------------------------------------------------------------------------------- | ---------- | --- |
| `vault_exists == false` OR `schema_version == ""`                                             | `llm-wiki` skill (init wizard) | Bootstrap before anything else. |
| `raw_pending > 0`                                                                             | `llm-wiki-stack-ingest-agent`  | Process new sources first; later answers benefit from fresh state. |
| `last_log_entry == "ingest"` and lint never ran since                                         | `llm-wiki-stack-curator-agent` | A pending ingest hasn't been audited yet; clean it before doing anything else. |
| Prompt matches an analytical verb (`query`, `ask`, `summarize`, `report`, `compile`, `extract`, `compare`, `challenge`, `dashboard`, or starts with `?`/`what`/`why`/`how`) | `llm-wiki-stack-analyst-agent` | Read-mostly request. |
| Anything else                                                                                 | Ask one clarifying question | Never fan out on ambiguity. |

After a successful `ingest` or `curator` run, the orchestrator runs `llm-wiki-stack-polish-agent` once as a tail step — graph colors, vault MOC refresh, per-folder MOC consistency. Polish is idempotent; running it twice produces no diff. The wizard and analyst do **not** trigger polish.

> **Lab.** Phrase the same goal three different ways. Watch the orchestrator's routing change.
>
> ```text
> /llm-wiki-stack:wiki I added new papers to raw/
> ```
>
> The orchestrator probes — `raw_pending > 0` → ingest agent runs.
>
> ```text
> /llm-wiki-stack:wiki this page has bad wikilinks
> ```
>
> No raw pending; not an analytical verb. Orchestrator asks one clarifying question, then routes to curator.
>
> ```text
> /llm-wiki-stack:wiki compare retrieval vs reranking in the wiki
> ```
>
> Analytical verb (`compare`). Routes to analyst. No polish runs after.

### Knowledge check

<details>
<summary>Q: I want to ask a question, but I have new files in <code>raw/</code>. What does the orchestrator do?</summary>

It dispatches to ingest first — bootstrap before query. Your question is more useful answered against fresh state. After ingest (and polish), run `/llm-wiki-stack:wiki <question>` again to get the analyst.
</details>

<details>
<summary>Q: When does polish *not* run?</summary>

After the wizard (no wiki state to polish), after the analyst (read-mostly), and after any specialist failure (no useful state to operate on).
</details>

---

## Module 2 — Talking to agents directly

### Objectives

- Bypass the orchestrator when you already know the routing.
- Know when bypassing is the wrong call.

The orchestrator's routing decision adds latency. In scripted workflows or batch jobs where you already know the right specialist, you can call the agent directly:

```text
/llm-wiki-stack:llm-wiki-stack-ingest-agent
/llm-wiki-stack:llm-wiki-stack-curator-agent
/llm-wiki-stack:llm-wiki-stack-analyst-agent compare retrieval vs reranking
```

**Don't bypass when:**

- You're a human typing — the orchestrator is faster than your wrong guess.
- The vault state is uncertain (a colleague might have ingested while you were away).
- You want polish to run automatically. Direct agent calls do not trigger the polish tail-step. Run `/llm-wiki-stack:obsidian-graph-colors` and refresh the indexes by hand if you need it.

> **Lab.** Compare the two paths against a fresh-ingest scenario.
>
> Path A — orchestrator:
>
> ```text
> /llm-wiki-stack:wiki
> ```
>
> Logs:
>
> ```text
> [orchestrator] probe: vault=docs/vault, raw_pending=3, last_log=lint
> [orchestrator] dispatch: llm-wiki-stack-ingest-agent
> [orchestrator] tail: llm-wiki-stack-polish-agent
> ```
>
> Path B — direct:
>
> ```text
> /llm-wiki-stack:llm-wiki-stack-ingest-agent
> ```
>
> No probe. No tail. Indexes may drift.

### Knowledge check

<details>
<summary>Q: After a direct ingest-agent call, what do I need to remember?</summary>

Polish does not run. Either run `/llm-wiki-stack:obsidian-graph-colors` and refresh indexes manually, or just use `/llm-wiki-stack:wiki` next time and let the orchestrator do it.
</details>

---

## Module 3 — Hooks under the hood

### Objectives

- Read `hooks/hooks.json` and identify the 10 wired hooks.
- Run two PreToolUse hook scripts manually against fixture payloads.
- Recognize what blocks vs. what only warns.

The Layer 4 hooks are the schema's enforcement boundary. They live in [`hooks/hooks.json`](../../hooks/hooks.json) and call shell scripts in [`scripts/`](../../scripts/). Five trigger types:

| Trigger | Scripts | Mode |
| ------- | ------- | ---- |
| `SessionStart` | `session-start.sh` | Informational (prints vault status) |
| `UserPromptSubmit` | `prompt-guard.sh` | Advisory (warns on raw/-edit phrasing) |
| `PreToolUse` (Write\|Edit) | `validate-frontmatter.sh`, `check-wikilinks.sh`, `protect-raw.sh`, `validate-attachments.sh` | **Blocking** (exit 2 rejects) |
| `PostToolUse` (Write\|Edit) | `post-wiki-write.sh`, `post-ingest-summary.sh` | Advisory (prints reminders) |
| `SubagentStop` | `subagent-lint-gate.sh`, `subagent-ingest-gate.sh` | **Blocking** (rejects bad completions) |

Full table: [`/SPEC.md` §10](../../SPEC.md).

> **Lab.** Drive `validate-frontmatter.sh` directly with a fixture that's missing the `type:` field:
>
> ```bash
> > cat tests/fixtures/json/write-invalid-no-type.json | bash scripts/validate-frontmatter.sh; echo "exit=$?"
> [validate-frontmatter] BLOCK: missing required field 'type' in /tmp/test-project/vault/wiki/topics/no-type.md
> exit=2
> ```
>
> Now drive `protect-raw.sh` against an attempted edit to `raw/`:
>
> ```bash
> > cat tests/fixtures/json/write-to-raw.json | bash scripts/protect-raw.sh; echo "exit=$?"
> [protect-raw] BLOCK: writes to raw/ are forbidden: /tmp/test-project/vault/raw/sample.md
> exit=2
> ```
>
> Both scripts read a JSON tool-call payload on stdin, decide, and exit. Exit code 2 means "reject this tool call." Exit 0 means "allow." Stderr is shown to the user.
>
> **Note.** All hook scripts have matching Bats tests under `tests/scripts/*.bats`. If you're modifying a hook, that's where you add coverage. See the [500 — Expert](./500-expert.md) Module 3 for hook authoring.

### Knowledge check

<details>
<summary>Q: A user tries to edit <code>raw/foo.md</code> in a Claude Code session. What happens?</summary>

The Edit tool call hits the `PreToolUse` hook chain. `protect-raw.sh` matches the path against `raw/`, exits 2, and Claude Code surfaces the block message to the user. The edit never lands.
</details>

<details>
<summary>Q: A subagent finishes an ingest with one half-written wiki page. Does that ship?</summary>

No. The `SubagentStop` hook chain runs `subagent-ingest-gate.sh`, which calls `verify-ingest.sh`. If verify finds drift, the gate exits 2 and the subagent's completion is rejected. The user sees the failure immediately rather than discovering it later.
</details>

---

## Module 4 — Customizing the schema

### Objectives

- Edit the per-vault `vault/CLAUDE.md` to add a new value or field.
- Verify the change takes effect on the next write.
- Understand what *not* to override.

The vault schema lives at `docs/vault/CLAUDE.md` (or wherever your `LLM_WIKI_VAULT` points). It is read at the start of every operation. Skill defaults defer to it. The reference schema is [`docs/vault-example/CLAUDE.md`](../vault-example/CLAUDE.md); your per-vault `CLAUDE.md` may add to it but should not weaken its invariants (`schema_version`, the six allowed `type:` values, the `sources:` requirement on non-source pages).

> **Lab.** Add a custom `entity_type` value for `protocol`. Open `docs/vault/CLAUDE.md` and locate the entity-type enum:
>
> ```yaml
> entity_type: person | organization | product | tool | service | standard | place
> ```
>
> Edit it to include `protocol`:
>
> ```yaml
> entity_type: person | organization | product | tool | service | standard | place | protocol
> ```
>
> Now drop a source mentioning HTTP and ingest:
>
> ```bash
> > echo "HTTP is the foundational web transfer protocol." > docs/vault/raw/web/http.md
> ```
>
> ```text
> /llm-wiki-stack:wiki
> ```
>
> The ingest agent reads your updated schema first, recognizes `entity_type: protocol` as valid, and produces an HTTP entity page with that value. The `validate-frontmatter.sh` hook accepts the write because the schema now allows it.
>
> A typo'd version (`entity_type: protocl`) on the same page would be blocked by the same hook.

**Don't override** `schema_version`, the six allowed `type:` values (`source`, `entity`, `concept`, `synthesis`, `index`, `log`), or the requirement that every non-source page has a `sources:` field with `[[wikilinks]]`. These are enforced by hooks at write time, not just by skills at compose time. See [`docs/adr/ADR-0002-agent-naming-convention.md`](../adr/ADR-0002-agent-naming-convention.md) for naming-related authority chains.

### Knowledge check

<details>
<summary>Q: I want a new page type, <code>policy</code>. Can I add it?</summary>

Not without forking. The six `type:` values are validated by `validate-frontmatter.sh` against a hard list, not against the schema file. Adding a value requires editing the script (see 500 — Expert Module 5 for the fork conversation).
</details>

---

## Module 5 — Batch ingest workflow

### Objectives

- Drop 50 files cleanly.
- Watch ingest → polish → optional curator.
- Recognize when to run the curator manually.

> **Lab.** Stage a batch:
>
> ```bash
> > cp ~/research/papers/*.md docs/vault/raw/papers/
> > cp ~/research/notes/*.md  docs/vault/raw/notes/
> > ls docs/vault/raw/papers docs/vault/raw/notes | wc -l
> 53
> ```
>
> One run handles all of them:
>
> ```text
> /llm-wiki-stack:wiki
> ```
>
> Expected log:
>
> ```text
> [orchestrator] probe: raw_pending=53
> [orchestrator] dispatch: llm-wiki-stack-ingest-agent
> [ingest] processed 53 files: 12 new entities, 28 new concepts, 9 source-only updates
> [ingest] subagent-ingest-gate: verify-ingest.sh OK
> [orchestrator] tail: llm-wiki-stack-polish-agent
> [polish] graph colors: 2 new top-level topics colored; index.md refreshed; 7 _index.md files updated
> ```

After every ~10 ingests (or any time `wiki/log.md` shows three consecutive `ingest` entries with no `lint`), run a curator pass:

```text
/llm-wiki-stack:wiki check the wiki for drift
```

The orchestrator routes to the curator agent (`last_log_entry == "ingest"` triggers the curator branch). It audits, auto-applies safe mechanical fixes, and reports judgment fixes (restructures, merges) for you to plan.

### Knowledge check

<details>
<summary>Q: Why does the curator gate judgment fixes behind plans?</summary>

A merge or restructure that an LLM picks "in the moment" can quietly destroy provenance. The curator splits *mechanical* fixes (it just does them — typos, missing indexes, etc.) from *judgment* fixes (it proposes; you approve). The split is deliberate per [`docs/adr/ADR-0002`](../adr/ADR-0002-agent-naming-convention.md).
</details>

---

## Module 6 — Multi-vault operation

### Objectives

- Switch between two vaults in one session.
- Use the four-tier vault resolution.

The plugin resolves the vault path via [`scripts/resolve-vault.sh`](../../scripts/resolve-vault.sh) using a four-tier order (first match wins):

1. **`LLM_WIKI_VAULT` env var** — explicit override. Wins over everything.
2. **`.claude/llm-wiki-stack/settings.json`** — `current_vault_path` field.
3. **Auto-detect** — scan up to 4 levels for a directory with `CLAUDE.md` (containing `schema_version`) and a `wiki/` sibling.
4. **Default** — `docs/vault`.

> **Note.** Auto-detect only walks four levels deep. If your vault is nested deeper, set `LLM_WIKI_VAULT` explicitly or run `bash scripts/set-vault.sh <path>`.

The lab works against either the env-var or the settings.json path:

> **Lab.** Switch to a second vault for one command:
>
> ```bash
> > LLM_WIKI_VAULT=/path/to/projB/docs/vault claude
> ```
>
> In that session:
>
> ```text
> /llm-wiki-stack:wiki-doctor
> ```
>
> Should report `[doctor] vault path resolved: /path/to/projB/docs/vault`. Run `/llm-wiki-stack:wiki` and it operates on projB. Exit; your default session is unchanged.
>
> To make the switch persistent for this project (no env var needed):
>
> ```bash
> > bash scripts/set-vault.sh /path/to/projB/docs/vault
> ```
>
> This writes `current_vault_path` to `.claude/llm-wiki-stack/settings.json`. The default reset reference (`default_vault_path`) stays at `docs/vault`.

The full resolution contract lives in the [root `CLAUDE.md`](../../CLAUDE.md) "Vault location" section.

### Knowledge check

<details>
<summary>Q: I have two vaults open in two terminals. The plugin's settings.json is shared. How do they not collide?</summary>

The env var (Tier 1) beats settings.json (Tier 2). Set `LLM_WIKI_VAULT` per terminal and each session resolves independently.
</details>

---

## Module 7 — Polish and Obsidian sync

### Objectives

- Know what the polish-agent does and when it runs.
- Decide when to invoke it manually.

The polish-agent (`llm-wiki-stack-polish-agent`) is the tail-of-write step that keeps the Obsidian-side experience in sync. Three things, all idempotent:

1. **Graph colors** — assigns a unique color to every top-level topic folder via `obsidian-graph-colors`. New topics get colors; existing topics are left alone.
2. **Vault MOC** — refreshes `wiki/index.md` with any new pages added by the upstream specialist.
3. **Per-folder MOC consistency** — append-only updates to `wiki/<topic>/_index.md` files for any new children. Never deletes; never reorders.

The orchestrator runs polish after every successful `ingest` or `curator`. Skipped after wizard, analyst, or any specialist failure (see Module 1).

> **Lab.** You did a direct `/llm-wiki-stack:llm-wiki-stack-ingest-agent` call (bypassing the orchestrator). Polish didn't run. Trigger it manually:
>
> ```text
> /llm-wiki-stack:llm-wiki-stack-polish-agent
> ```
>
> Or run just the graph-colors slice:
>
> ```text
> /llm-wiki-stack:obsidian-graph-colors
> ```

The full polish-agent rationale is in [`docs/adr/ADR-0003`](../adr/ADR-0003-polish-agent-and-obsidian-side.md). The user-facing tour is [`docs/llm-wiki/obsidian-experience.md`](../llm-wiki/obsidian-experience.md).

### Knowledge check

<details>
<summary>Q: I ran polish twice in a row. Did anything change the second time?</summary>

No. Polish is idempotent by contract — second run produces zero diffs. If the second run *does* change something, that's a bug worth filing (see [`docs/risk-report-0.2.0.md`](../risk-report-0.2.0.md) — polish has no automated idempotency test yet).
</details>

---

## Where to next

- You want to extend the plugin — add a skill, customize a hook, run the test harness, fork — **[500 — Expert](./500-expert.md)**.
- You're hitting a wall and want known-issue context — **[`docs/risk-report-0.2.0.md`](../risk-report-0.2.0.md)**.
- You want the contracts behind every agent — **[`agents/`](../../agents/)** and **[`/SPEC.md` §11](../../SPEC.md)**.

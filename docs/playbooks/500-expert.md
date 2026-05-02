# 500 — Expert

> **Audience.** Plugin extender or downstream maintainer. Comfortable reading [`/SPEC.md`](../../SPEC.md), shell scripts, and `hooks.json`. Comfortable forking a Claude Code plugin.
>
> **After this playbook.** You can author a custom skill, add a hook with matching tests, run all four test tiers locally, fork the plugin and rename safely, and integrate `/llm-wiki-stack:wiki` headlessly into a CI pipeline.
>
> **Time.** ~half day.

## Prerequisites

- Completed [300 — Associate](./300-associate.md).
- Read [`/SPEC.md`](../../SPEC.md) end-to-end and [`docs/architecture.md`](../architecture.md).
- `bats-core`, `jq`, `shellcheck`, `shfmt`, `markdownlint-cli`, `lychee`, `gitleaks` available locally — `bash tests/install-deps.sh` provisions them.
- A fork of the plugin repo and a Claude Code session pointed at it.

---

## Module 1 — The four-layer model in depth (extension seams)

### Objectives

- Identify the *seams* where extension is supported vs. discouraged.
- Place any new capability you add into the right layer.

The four-layer stack is not just an architecture diagram — it determines where new code goes and what enforces it.

| Layer | Extension seams (good places to add) | Anti-seams (bad places to add) |
| ----- | ------------------------------------ | ------------------------------ |
| **Layer 1 — Data** | New `entity_type` values via `vault/CLAUDE.md` (the schema authority). New top-level topic folders with `_index.md`. | New `type:` values (validators are hard-coded — needs Layer 4 change too). Mutating `raw/` (blocked by hook). |
| **Layer 2 — Skills** | New single-responsibility skill under `skills/`. New `obsidian-*` integrations. | Multi-step flows (those are Layer 3 agents). Direct write-without-validation paths. |
| **Layer 3 — Agents** | New specialist for a missing flow (e.g. `llm-wiki-stack-export-agent`). Extending the orchestrator dispatch table. | Adding state probes to specialists (the orchestrator owns probing — re-probing breaks the contract per [SPEC §11](../../SPEC.md)). |
| **Layer 4 — Orchestration** | New hook on existing trigger (`PreToolUse`, `PostToolUse`, `SubagentStop`). New rule under `rules/`. | A hook that writes to the vault (hooks are gates, not editors). A rule that mutates state (rules are declarative). |

Walk extensions through the layers in order. A new capability that needs all four layers is a major change; one that fits in a single layer is incremental.

### Knowledge check

<details>
<summary>Q: I want a "publish to PDF" capability. What layer(s) does it touch?</summary>

Layer 2 only — a new skill `llm-wiki-pdf-export` reading from `wiki/` and writing to `vault/output/`. No new agent (it's single-responsibility). No new hook (it doesn't write to validated paths). The orchestrator can call it via the analyst's `compile` mode if you want it user-facing without typing the full skill name.
</details>

---

## Module 2 — Authoring a custom skill

### Objectives

- Write a `SKILL.md` matching the canonical anatomy.
- Wire the new skill so the orchestrator (or a user) can invoke it.

The canonical reference: [`skills/llm-wiki-lint/SKILL.md`](../../skills/llm-wiki-lint/SKILL.md). Read it before writing your own — it shows the description style, the When-to-invoke / Reading-contract / Writing-contract sections, and the spec anchors.

> **Lab.** Build `llm-wiki-export-csv` — a skill that lists every entity in the vault as a CSV row with `title,path,sources_count,confidence`. (Slash-command examples below use `/your-plugin:` rather than `/llm-wiki-stack:` because the example skill doesn't ship with this plugin — drop in your own plugin namespace when you adapt it.)
>
> **Step 1.** Create the skill directory:
>
> ```bash
> > mkdir -p skills/llm-wiki-export-csv
> > $EDITOR skills/llm-wiki-export-csv/SKILL.md
> ```
>
> **Step 2.** Author the `SKILL.md`. Mirror the lint skill's frontmatter shape:
>
> ```markdown
> ---
> name: llm-wiki-export-csv
> description: >
>   Export every entity page in vault/wiki/ as a CSV row with
>   title,path,sources_count,confidence. Read-only on the vault; writes
>   exactly one file under vault/output/. Trigger when the user says
>   "export entities to CSV", "give me a CSV of the wiki", or invokes
>   /your-plugin:llm-wiki-export-csv directly.
> allowed-tools: Read Glob Grep Bash Write
> ---
>
> # LLM Wiki — Export CSV
>
> Read every `wiki/**/*.md` with `type: entity`. Emit one CSV row per page.
>
> ## Reading contract
>
> - `vault/CLAUDE.md` — schema (read first, as always).
> - `vault/wiki/**/*.md` — every wiki page; filter by `type: entity`.
>
> ## Writing contract
>
> One file: `vault/output/entities.csv`. Plain UTF-8. Header row first. No
> validation (output/ is unmanaged scratch space).
>
> ## Steps
>
> 1. Resolve the vault path via `scripts/resolve-vault.sh`.
> 2. Glob for `wiki/**/*.md`. Filter to `type: entity` via Grep.
> 3. For each match, extract `title`, `path`, `len(sources)`, `confidence`.
> 4. Write the CSV.
> 5. Print the row count and the output path.
>
> ## Spec anchor
>
> /SPEC.md §5 (skill contract). vault/CLAUDE.md (entity frontmatter).
> ```
>
> **Step 3.** Add the skill name to [`docs/VOCABULARY.md`](../VOCABULARY.md) under the Layer 2 skills table. Run `bash scripts/validate-docs.sh` — vocabulary gate must exit 0.
>
> **Step 4.** Use the skill:
>
> ```text
> /your-plugin:llm-wiki-export-csv
> ```
>
> The skill produces `vault/output/entities.csv`.
>
> **Step 5.** (Optional) Make it orchestrator-routable. The orchestrator dispatches the analyst on `compile` and `extract` verbs. The analyst's `compile` mode can be taught to call your new skill — that lives in [`agents/llm-wiki-stack-analyst-agent.md`](../../agents/llm-wiki-stack-analyst-agent.md). Add a row to its mode table.
>
> **Note.** Skills under `skills/` are loaded automatically by Claude Code on session start — no `hooks.json` change needed. The slash command is the directory name prefixed with `/llm-wiki-stack:`.

### Knowledge check

<details>
<summary>Q: My skill writes to <code>wiki/</code>. Do I need to do anything special?</summary>

No special wiring — the existing `PreToolUse` hooks (`validate-frontmatter.sh`, `check-wikilinks.sh`) will validate every Write. If your skill is producing wiki pages, your `SKILL.md` must teach the LLM the full schema; if your skill produces output that doesn't fit the schema, write it under `vault/output/` instead.
</details>

---

## Module 3 — Adding or customizing a hook

### Objectives

- Read the `hooks/hooks.json` schema.
- Author a `PostToolUse` hook script.
- Write its matching Bats test.

`hooks/hooks.json` is a Claude Code hooks file with five trigger types (`SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `SubagentStop`). Each entry's `command` runs in your shell with `${CLAUDE_PLUGIN_ROOT}` substituted to the installed plugin path. Hook scripts read a JSON payload on stdin (the tool-call data for Pre/Post; the prompt for `UserPromptSubmit`) and exit:

| Exit | Meaning |
| ---- | ------- |
| `0`  | Allow / proceed. Stdout/stderr surfaced to the user. |
| `2`  | **Block** the tool call (Pre) or **reject** the agent's completion (SubagentStop). Stderr is the failure message shown to the user. |
| Other | Treated as `0` with a warning. Don't rely on this. |

> **Lab.** Add a `PostToolUse` hook that appends a one-line write count to `wiki/log.md` after every wiki write.
>
> **Step 1.** Author the script:
>
> ```bash
> > $EDITOR scripts/post-wiki-write-counter.sh
> ```
>
> ```bash
> #!/usr/bin/env bash
> # Appends a one-line counter entry to wiki/log.md after a wiki write.
> set -euo pipefail
> PLUGIN_DIR="${CLAUDE_PLUGIN_ROOT:-$(dirname "$(dirname "$(realpath "$0")")")}"
> # shellcheck source=resolve-vault.sh
> source "${PLUGIN_DIR}/scripts/resolve-vault.sh"
> VAULT="$(resolve_vault)"
> [ -n "$VAULT" ] && [ -d "$VAULT/wiki" ] || exit 0
>
> # Read tool payload from stdin; we only act on Write|Edit to wiki/.
> PAYLOAD="$(cat)"
> FILE_PATH="$(printf '%s' "$PAYLOAD" | jq -r '.tool_input.file_path // empty')"
> case "$FILE_PATH" in
>   *"/wiki/"*) ;;
>   *) exit 0 ;;
> esac
>
> COUNT="$(find "$VAULT/wiki" -name '*.md' | wc -l | tr -d ' ')"
> printf '\n## [%s] write-counter | total wiki pages: %s\n' "$(date +%F)" "$COUNT" >> "$VAULT/wiki/log.md"
> exit 0
> ```
>
> ```bash
> > chmod +x scripts/post-wiki-write-counter.sh
> ```
>
> **Step 2.** Wire it in `hooks/hooks.json` under the existing `PostToolUse` matcher:
>
> ```json
> {
>   "type": "command",
>   "command": "bash ${CLAUDE_PLUGIN_ROOT}/scripts/post-wiki-write-counter.sh"
> }
> ```
>
> **Step 3.** Add a Bats test at `tests/scripts/post-wiki-write-counter.bats`:
>
> ```bash
> #!/usr/bin/env bats
> load '../test_helper/common.bash'
>
> setup() {
>   setup_fixture_vault
> }
>
> teardown() {
>   teardown_fixture_vault
> }
>
> @test "appends counter line on wiki write" {
>   payload="$(jq -n --arg fp "${TEST_VAULT}/wiki/topics/x.md" \
>     '{tool_name:"Write",tool_input:{file_path:$fp,content:"---\ntitle:X\n---\n"}}')"
>   run_hook_with_json "${PLUGIN_ROOT}/scripts/post-wiki-write-counter.sh" "$payload"
>   assert_success
>   assert_file_contains "${TEST_VAULT}/wiki/log.md" "write-counter"
> }
>
> @test "ignores writes outside wiki/" {
>   payload="$(jq -n --arg fp "/tmp/elsewhere.md" \
>     '{tool_name:"Write",tool_input:{file_path:$fp}}')"
>   run_hook_with_json "${PLUGIN_ROOT}/scripts/post-wiki-write-counter.sh" "$payload"
>   assert_success
>   refute_file_contains "${TEST_VAULT}/wiki/log.md" "write-counter"
> }
> ```
>
> **Step 4.** Run it:
>
> ```bash
> > bash tests/run-tests.sh tier1
> ✓ appends counter line on wiki write
> ✓ ignores writes outside wiki/
> ```
>
> **Note.** The `setup_fixture_vault`, `run_hook_with_json`, `assert_success`, and `assert_file_contains` helpers are documented in [`tests/README.md`](../../tests/README.md) and live in `tests/test_helper/common.bash`.

### Knowledge check

<details>
<summary>Q: Why does my hook need to handle <code>FILE_PATH</code> outside <code>wiki/</code>?</summary>

`PostToolUse` matchers (`Write|Edit`) fire for *every* Write or Edit in the session, not just vault writes. Always filter to the path you care about and `exit 0` early on misses, or you'll spam logs with irrelevant work.
</details>

---

## Module 4 — Running the Tier 0–4 test harness

### Objectives

- Provision the dev tools.
- Run each tier locally and read the output.
- Recognize what's deferred.

The test pyramid (per [`/SPEC.md` §14](../../SPEC.md)):

| Tier | Tools | What it covers |
| ---- | ----- | -------------- |
| **0 — Static** | shellcheck, shfmt, markdownlint, lychee, gitleaks, validate-docs | Lint, link-check, secrets, vocabulary gate. Free signal. |
| **1 — Bats unit** | bats-core, jq | Per-script behavior. ~108 tests across `tests/scripts/`. |
| **2 — Smoke** | bash | End-to-end fresh-install + skill-schema scripts. CLI integration stubbed pending Phase E. |
| **3 — Release** | gh, jq | Pre-release readiness checks. Run from CI. |
| **4 — Adversarial** | garak, osv-scanner | Weekly. **Prompt-injection corpus replay is stubbed** pending fixture (per [`docs/security.md`](../security.md) §Limitations). |

> **Lab.** Provision and run:
>
> ```bash
> > bash tests/install-deps.sh
> [install-deps] brew: shellcheck OK
> [install-deps] brew: shfmt OK
> [install-deps] npm: markdownlint-cli OK
> [install-deps] cargo: lychee OK
> [install-deps] OK
>
> > bash tests/run-tests.sh --list
> tier0: shellcheck scripts/*.sh
> tier0: shfmt -d scripts/*.sh
> tier0: markdownlint docs/**/*.md README.md
> tier0: lychee --offline docs/ README.md
> tier0: gitleaks detect
> tier0: bash scripts/validate-docs.sh
> tier1: bats tests/scripts/*.bats
> tier2: bash tests/smoke/fresh-install.sh
> tier2: bash tests/smoke/skill-schema.sh
>
> > bash tests/run-tests.sh tier0
> ... (passes) ...
>
> > bash tests/run-tests.sh tier1
> 108 tests, 0 failures
>
> > bash tests/run-tests.sh tier2
> [smoke] fresh-install.sh: STUB — claude CLI integration deferred to Phase E
> [smoke] skill-schema.sh: STUB — skill invocation deferred to Phase E
> ```
>
> **Deferred.** Tier 4 corpus replay at `.github/workflows/adversarial.yml:52-59` is stubbed pending a prompt-injection corpus fixture. `garak` and `osv-scanner` already run weekly. To contribute a corpus entry, add a payload under `tests/fixtures/adversarial/` and wire the workflow to replay it; scoring (pass/fail thresholds) is the harder follow-up. Tracked in [`docs/risk-report-0.2.0.md`](../risk-report-0.2.0.md) P0.

### Knowledge check

<details>
<summary>Q: Tier 1 fails on a hook I didn't change. What do I do?</summary>

Almost always a fixture or helper drift, not a real regression. Read the failing test's setup/teardown, compare to the fixture under `tests/fixtures/minimal-vault/`, and check `tests/test_helper/common.bash` for any helper that recently changed. If the fixture really did need to change, update the test alongside.
</details>

---

## Module 5 — Forking and rebranding

### Objectives

- Know what's safe to rename when you fork.
- Preserve the schema authority chain.

The plugin is Apache 2.0; forking is fine. Three categories of names:

| Category | Safe to rename? | Why |
| -------- | --------------- | --- |
| Skills (`skills/llm-wiki-*/`) and agents (`agents/llm-wiki-stack-*-agent.md`) | Yes | They're slash-command identifiers. Rename the directory and update the cross-references. The renaming convention is documented in [`docs/adr/ADR-0002`](../adr/ADR-0002-agent-naming-convention.md). |
| Plugin name (`.claude-plugin/plugin.json`, slash-command namespace `llm-wiki-stack:`) | Yes | This is the user-facing identity. Update consistently or `/your-plugin-name:wiki` won't resolve. |
| **Schema authority chain** — `schema_version`, the six `type:` values, `sources:` requirement | **No** | These are validated by `validate-frontmatter.sh` against hard-coded lists. Renaming them silently breaks every existing vault. Editing them is a fork-defining change — write a migration. |

> **Lab.** Pre-fork sweep:
>
> ```bash
> > rg -l 'llm-wiki-stack' --type-add 'plugin:*.{md,json,sh,bats,yaml,yml}' -t plugin | wc -l
> 156
> ```
>
> Most of those lines are either (a) the plugin namespace in slash commands, or (b) the `${CLAUDE_PLUGIN_ROOT}` references that are already plugin-relative. A rename to `my-research-wiki`:
>
> ```bash
> > rg -l 'llm-wiki-stack' . | xargs sed -i.bak 's/llm-wiki-stack/my-research-wiki/g'
> > find . -name '*.bak' -delete
> > bash scripts/validate-docs.sh    # vocabulary gate may need entries renamed too
> > bash tests/run-tests.sh tier0    # confirm nothing else drifted
> ```
>
> Then update `docs/VOCABULARY.md` to register your new identifiers — the gate will block otherwise.

The vocabulary gate is your friend in a fork: it surfaces every term that needs to move together. See [`scripts/validate-docs.sh`](../../scripts/validate-docs.sh) and [`CONTRIBUTING.md`](../../CONTRIBUTING.md).

### Knowledge check

<details>
<summary>Q: Can I add a seventh page <code>type:</code> when I fork?</summary>

Yes, but it's a Layer 4 change too. Add the value to (1) `vault/CLAUDE.md` (schema), (2) `scripts/validate-frontmatter.sh` (the hard-coded validator list), (3) any skills that filter by type, and (4) write a Bats test asserting the new value passes validation. Without all four, your new type either won't validate or will validate inconsistently across runs.
</details>

---

## Module 6 — External pipeline integration

### Objectives

- Run `/llm-wiki-stack:wiki` headlessly from CI.
- Point a CI job at a vault checked out per build.

Claude Code can run non-interactively with `claude --print` (see [Claude Code CLI docs](https://docs.claude.com/en/docs/claude-code/cli-reference)). Combined with `LLM_WIKI_VAULT`, this lets you run the plugin against any vault path on every CI build.

> **Lab.** A GitHub Actions workflow that ingests new docs added in a PR:
>
> ```yaml
> name: Ingest docs into wiki
>
> on:
>   pull_request:
>     paths:
>       - 'research/raw/**'
>
> jobs:
>   ingest:
>     runs-on: ubuntu-latest
>     steps:
>       - uses: actions/checkout@v4
>       - name: Install Claude Code
>         run: npm install -g @anthropic-ai/claude-code
>       - name: Install plugin
>         run: claude --print '/plugin install llm-wiki-stack'
>         env:
>           ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
>       - name: Run orchestrator
>         env:
>           LLM_WIKI_VAULT: ${{ github.workspace }}/research
>           ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
>         run: claude --print '/llm-wiki-stack:wiki'
>       - name: Post log to PR
>         uses: actions/github-script@v7
>         with:
>           script: |
>             const fs = require('fs');
>             const log = fs.readFileSync('research/wiki/log.md', 'utf8');
>             const last = log.split('## [').slice(-1)[0];
>             github.rest.issues.createComment({
>               issue_number: context.issue.number,
>               owner: context.repo.owner,
>               repo: context.repo.repo,
>               body: '## Last ingest\n\n## [' + last,
>             });
> ```
>
> **Note.** The workflow assumes the vault is checked out alongside the PR (your repo doubles as the vault). For a CI job that operates on a separate vault repo, check it out as a second action and point `LLM_WIKI_VAULT` at it.

### Knowledge check

<details>
<summary>Q: Why parse <code>wiki/log.md</code> instead of relying on the slash command's stdout?</summary>

Slash command stdout is conversational and varies by run. `wiki/log.md` is the structured, append-only record of every operation — guaranteed to contain a one-line summary per ingest. Downstream tooling should parse the log, not the prose.
</details>

---

## Module 7 — Contribution loop

### Objectives

- Land a contribution that passes every gate.

The contribution gates, in order:

1. **Vocabulary** — every new term registered in `docs/VOCABULARY.md`. `bash scripts/validate-docs.sh` exits 0.
2. **Tier 0** — `bash tests/run-tests.sh tier0` clean.
3. **Tier 1** — every new script has a `tests/scripts/<name>.bats`. `bash tests/run-tests.sh tier1` clean.
4. **CHANGELOG** — append your change under the unreleased section. Format follows [Keep a Changelog](https://keepachangelog.com).
5. **ADR (when warranted)** — if your change touches the orchestrator dispatch table, the schema authority chain, or any agent's contract, write an ADR under `docs/adr/`. The template is in [`docs/adr/README.md`](../adr/README.md).
6. **Spec sync** — if the change touches a contract documented in `/SPEC.md`, update the spec in the same PR.

The full process is in [`CONTRIBUTING.md`](../../CONTRIBUTING.md).

---

## Deferred and honest gaps

This is the canonical list of things that look done but aren't, as of v0.2.0:

| Gap | Where | Tracked |
| --- | ----- | ------- |
| Tier 4 prompt-injection corpus replay | `.github/workflows/adversarial.yml:52-59` | [`docs/security.md`](../security.md) §Limitations, [`docs/risk-report-0.2.0.md`](../risk-report-0.2.0.md) P0 |
| Tier 2 smoke tests skip without `claude` CLI | `tests/smoke/fresh-install.sh`, `tests/smoke/skill-schema.sh` | Phase E (CLI integration) |
| No orchestrator dispatch tests | `tests/scripts/` (no `orchestrator-agent.bats`) | [`docs/risk-report-0.2.0.md`](../risk-report-0.2.0.md) P0 |
| No polish-agent idempotency test | `tests/scripts/` (no `polish-agent.bats`) | [`docs/risk-report-0.2.0.md`](../risk-report-0.2.0.md) P0 |
| Polish-agent's Obsidian-side surfaces are limited | [`docs/adr/ADR-0003`](../adr/ADR-0003-polish-agent-and-obsidian-side.md) §Limitations | ADR |
| Vault auto-detect walks only 4 levels | [`scripts/resolve-vault.sh`](../../scripts/resolve-vault.sh) | [`docs/risk-report-0.2.0.md`](../risk-report-0.2.0.md) P2 |

Adding a fix? Open the matching risk-report row, write the test, and remove the row in your PR.

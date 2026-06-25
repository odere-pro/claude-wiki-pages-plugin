# tests/scripts — Tier 1 Bats unit tests

This directory holds the Tier 1 Bats unit suite: roughly one `<script>.bats` file per `scripts/*.sh` hook or utility in the plugin. Each file pins the behavior of a single script — its allow path, its block path, and its no-op pass-through — so a regression in any hook turns a test red. Run the whole tier with `bash tests/run-tests.sh tier1` (which calls `bats --recursive tests/scripts/`) or a single file with `bats tests/scripts/<name>.bats`. See [`../README.md`](../README.md) for the full contract and [`../CLAUDE.md`](../CLAUDE.md) for the tier model.

## Conventions

- **Load the helpers.** Every file begins with `load '../test_helper/common'` and calls `_load_helpers` inside `setup`. See [`../test_helper/common.bash`](../test_helper/common.bash) for the assertion, fixture, and hook helpers.
- **Hook JSON on stdin.** The plugin's hooks read a Claude Code tool-call payload from stdin. Tests feed them with `run_hook_with_json <script> <json-file>` (a fixture file under [`../fixtures/json/`](../fixtures/)) or `run_hook_with_json_string <script> <json-string>` for small inline payloads. Both pin `CLAUDE_WIKI_PAGES_VAULT=vault` and populate Bats's `$status` / `$output`.
- **`@test` naming (tests-as-documentation).** Use `@test "<Feature>: <behavior sentence>"` — the user-facing **feature label** leads (not the script name), and the behavior reads as a declarative spec line, e.g. `@test "Firewall: a write outside the active vault is blocked"`. Each file's feature label is fixed by the FEATURE INDEX below. Internal check-IDs (`C1-01`, `P2.2`, …) never lead the title — they move to a trailing `# spec <id>` comment. Running `bats tests/scripts/` then prints a feature spec: top lines name features, indented lines are behavior sentences. The `feature-coverage gate` enforces this convention.
- **PreToolUse blocks via stdout JSON.** The Write/Edit guards exit `0` and signal a block with `"decision":"block"` on stdout; Claude Code reads the JSON. So `assert_success` plus `assert_output_contains '"decision":"block"'` is the standard block assertion — not a non-zero exit.
- **Mutation-resistant.** A test must fail when the script's behavior breaks. Block-cases must use content that genuinely triggers the rule (not just the early-exit guard), and assertions should pin the specific branch — prefer `assert_output_contains "entity_type"` over a generic substring. When in doubt, apply the candidate one-line mutation to the script and confirm the test goes red.
- **Copy-then-mutate.** Tests that touch a vault, a settings file, or a tree copy it into `$BATS_TEST_TMPDIR` first; fixtures stay pristine.

## FEATURE INDEX

The canonical, gate-parsed map from each `.bats` file to the user-facing **feature** it
documents. One row per file — `ls tests/scripts/*.bats` and this table are kept set-equal
by the `feature-coverage gate`, which also reads the `Documents` column to confirm every
inventory feature (hook event, engine verb, skill, agent, command) has ≥1 documenting test.

- **Feature** is the exact leading label every `@test` in that file uses (see the `@test`
  naming convention above).
- **Layer** is the four-layer home: L1 Data · L2 Skills · L3 Agents · L4 Orchestration ·
  Infra (shared plumbing, no single user feature) · Eval (local-model quality harness).
- **Documents** is a comma-list of inventory entities the file pins. Vocabulary: hook
  events (`SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `SubagentStop`,
  `Stop`, `SessionEnd`); engine verbs (bare: `verify`, `lint`, `firewall`, `snapshot`,
  `heal`, `ontology`, `config`, `doctor`, …); skills (`skill:<name>`); agents
  (`agent:<name>`); commands (`cmd:<name>`); `infra`; `eval`.

| `.bats` file | Feature | Layer | Documents |
| --- | --- | --- | --- |
| `firewall.bats` | Firewall | L4 | PreToolUse, firewall |
| `validate-frontmatter.bats` | Frontmatter validation | L4 | PreToolUse, verify |
| `check-wikilinks.bats` | Wikilink format guard | L4 | PreToolUse |
| `protect-raw.bats` | Raw immutability | L4 | PreToolUse |
| `validate-attachments.bats` | Attachment validation | L4 | PreToolUse, verify |
| `enforce-dmi.bats` | DMI enforcement | L4 | PreToolUse, verify |
| `enforce-must-rule.bats` | Must-rule enforcement | L4 | PreToolUse, verify |
| `scope-guard.bats` | Read-scope guard | L4 | PreToolUse |
| `prompt-guard.bats` | Prompt guard | L4 | UserPromptSubmit |
| `session-start.bats` | SessionStart hook | L4 | SessionStart |
| `post-wiki-write.bats` | Wiki-write reminder | L4 | PostToolUse |
| `post-ingest-summary.bats` | Ingest summary | L4 | PostToolUse |
| `subagent-ingest-gate.bats` | Ingest gate | L4 | SubagentStop, agent:ingest |
| `subagent-lint-gate.bats` | Lint gate | L4 | SubagentStop, agent:curator |
| `subagent-commit-gate.bats` | Commit backstop | L4 | SubagentStop |
| `subagent-tree-gate.bats` | Tree gate | L4 | SubagentStop |
| `session-memory.bats` | Durable session memory | L4 | Stop, SessionEnd |
| `stale-memory.bats` | Stale-memory flagging | L4 | skill:lint, skill:curator-fixes |
| `heartbeat.bats` | Heartbeat catch-up | L4 | SessionStart, agent:maintenance |
| `ingest-classification.bats` | Ingest classification | L2 | skill:ingest, skill:ingest-pipeline, agent:ingest |
| `ingest-dedup.bats` | Ingest dedup | L2 | skill:ingest, agent:ingest |
| `ingest-pdf.bats` | Ingest PDF extraction | L2 | skill:ingest, agent:ingest |
| `local-ingest-stub.bats` | Local-model ingest | L2 | skill:ingest, skill:draft |
| `extract-worker-frontmatter.bats` | Extract worker | L3 | agent:extract-worker |
| `expand-records.bats` | Record expansion | L2 | skill:ingest, agent:ingest |
| `query-descent.bats` | Query descent | L2 | skill:query, agent:analyst |
| `retrieval-contract.bats` | Retrieval contract | L2 | skill:search, skill:query, skill:analyst-modes |
| `reachability.bats` | Reachability | L2 | skill:query, search |
| `lint-structural.bats` | Structural lint | L2 | skill:lint, agent:curator |
| `lint-vocabulary.bats` | Vocabulary lint | L2 | skill:lint, agent:curator |
| `lint-ontology.bats` | Ontology lint | L2 | skill:lint, agent:curator |
| `tree-lint.bats` | Tree lint | L2 | skill:lint, agent:curator |
| `strict-tree-reduce.bats` | Strict-tree reduce | L2 | skill:fix, skill:curator-fixes |
| `heal-ghost-links.bats` | Ghost-link healing | L2 | skill:fix, heal |
| `check-duplicate-claims.bats` | Duplicate-claim detection | L2 | skill:lint |
| `fill-gaps.bats` | Fill-gaps | L2 | skill:fill-gaps, cmd:fill-gaps |
| `graph-quality.bats` | Graph quality | L2 | skill:fill-gaps, skill:status |
| `distribute-wiki.bats` | Wiki distribution | L2 | skill:index, skill:synthesize |
| `health-score.bats` | Health score | L2 | skill:status, cmd:doctor |
| `sync-source.bats` | Source sync | L2 | skill:sync |
| `wire-source.bats` | Source wiring | L2 | skill:sync |
| `cross-vault-log.bats` | Cross-vault log | L2 | skill:sync |
| `scaffold-vault.bats` | Vault scaffold | L2 | skill:init, skill:onboarding, agent:onboarding, cmd:onboarding |
| `apply-obsidian-config.bats` | Obsidian config | L2 | skill:obsidian-graph-colors, agent:polish |
| `obsidian-rename.bats` | Backlink-safe rename | L2 | skill:obsidian-cli, agent:polish |
| `ontology-profile.bats` | Ontology profile | L2 | ontology, skill:maintain-contract |
| `lib-page-type.bats` | Page-type library | Infra | infra |
| `offline-draft.bats` | Offline draft | L2 | skill:draft |
| `offline-query.bats` | Offline query | L2 | skill:query |
| `skill-contracts.bats` | Skill contract | L2 | skill:engine-api, skill:markdown, skill:obsidian-bases, skill:obsidian-markdown, skill:obsidian-vault, skill:review, skill:voice |
| `ollama-chat.bats` | Ollama chat | Infra | infra |
| `maintenance-run.bats` | Scheduled maintenance | L4 | agent:maintenance |
| `orchestrator-dispatch.bats` | Orchestrator dispatch | L3 | agent:orchestrator, cmd:wiki |
| `doctor.bats` | Doctor | L4 | cmd:doctor, doctor |
| `verify-ingest.bats` | Verify | L4 | verify |
| `validate-docs.bats` | Glossary gate | L4 | lint |
| `gate-13-no-rag.bats` | NO-RAG invariant | Infra | infra |
| `snapshot.bats` | Snapshot | L4 | snapshot |
| `adr-bun-required-lint-verb.bats` | Bun-required engine | Infra | lint |
| `resolve-vault.bats` | Vault resolution | Infra | infra |
| `json-envelope.bats` | JSON envelope | Infra | infra |
| `config-schema.bats` | Config schema | Infra | config |
| `install-deps.bats` | Dependency install | Infra | infra |
| `check-deps.bats` | Dependency check | Infra | infra |
| `run-tests.bats` | Test runner | Infra | infra |
| `verify-output.bats` | Output verifier | Infra | infra |
| `replay-corpus.bats` | Adversarial replay | Infra | infra |
| `eval-ingest-extract.bats` | Eval driver | Eval | eval |
| `eval-ablation-report.bats` | Ablation report | Eval | eval |
| `eval-compare-ollama.bats` | Ollama comparison | Eval | eval |
| `eval-produce-baseline.bats` | Eval baseline | Eval | eval |
| `eval-produce-ollama-query.bats` | Eval Ollama query | Eval | eval |
| `eval-produce-ollama.bats` | Eval Ollama produce | Eval | eval |
| `eval-query.bats` | Eval query | Eval | eval |

Every `.bats` file has exactly one row; the `feature-coverage gate` fails on any orphan
file or stale row. Most files still map one-to-one to the like-named script in
[`../../scripts/`](../../scripts/).

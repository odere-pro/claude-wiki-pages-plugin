# tests/scripts — Tier 1 Bats unit tests

This directory holds the Tier 1 Bats unit suite: roughly one `<script>.bats` file per `scripts/*.sh` hook or utility in the plugin. Each file pins the behavior of a single script — its allow path, its block path, and its no-op pass-through — so a regression in any hook turns a test red. Run the whole tier with `bash tests/run-tests.sh tier1` (which calls `bats --recursive tests/scripts/`) or a single file with `bats tests/scripts/<name>.bats`. See [`../README.md`](../README.md) for the full contract and [`../CLAUDE.md`](../CLAUDE.md) for the tier model.

## Conventions

- **Load the helpers.** Every file begins with `load '../test_helper/common'` and calls `_load_helpers` inside `setup`. See [`../test_helper/common.bash`](../test_helper/common.bash) for the assertion, fixture, and hook helpers.
- **Hook JSON on stdin.** The plugin's hooks read a Claude Code tool-call payload from stdin. Tests feed them with `run_hook_with_json <script> <json-file>` (a fixture file under [`../fixtures/json/`](../fixtures/)) or `run_hook_with_json_string <script> <json-string>` for small inline payloads. Both pin `CLAUDE_WIKI_PAGES_VAULT=vault` and populate Bats's `$status` / `$output`.
- **`@test` naming.** Use `@test "<script>: <behavior>"` — e.g. `@test "firewall: blocks a write outside the vault"`. The script name leads so a failing test names its subject.
- **PreToolUse blocks via stdout JSON.** The Write/Edit guards exit `0` and signal a block with `"decision":"block"` on stdout; Claude Code reads the JSON. So `assert_success` plus `assert_output_contains '"decision":"block"'` is the standard block assertion — not a non-zero exit.
- **Mutation-resistant.** A test must fail when the script's behavior breaks. Block-cases must use content that genuinely triggers the rule (not just the early-exit guard), and assertions should pin the specific branch — prefer `assert_output_contains "entity_type"` over a generic substring. When in doubt, apply the candidate one-line mutation to the script and confirm the test goes red.
- **Copy-then-mutate.** Tests that touch a vault, a settings file, or a tree copy it into `$BATS_TEST_TMPDIR` first; fixtures stay pristine.

## What each `.bats` exercises

One row per representative test file: the script under test and the hook event (from [`../../hooks/hooks.json`](../../hooks/hooks.json)) or CLI surface it covers.

| `.bats` file | Script under test | Hook event / surface |
| --- | --- | --- |
| `firewall.bats` | `firewall.sh` | PreToolUse (Write\|Edit) — confine writes to the active vault, deny globs, cross-vault confinement |
| `validate-frontmatter.bats` | `validate-frontmatter.sh` | PreToolUse — per-type required-field enforcement from the schema table |
| `check-wikilinks.bats` | `check-wikilinks.sh` | PreToolUse — block `[text](file.md)` markdown links in wiki bodies |
| `protect-raw.bats` | `protect-raw.sh` | PreToolUse — block edits to the immutable `raw/` tree |
| `validate-attachments.bats` | `validate-attachments.sh` | PreToolUse — non-text sources need `attachment_path` + a file on disk |
| `resolve-vault.bats` | `resolve-vault.sh`, `set-vault.sh` | vault resolution + multi-vault registry (add/switch/list/remove) |
| `session-start.bats` | `session-start.sh` | SessionStart — SETUP vs REMINDER, settings.json creation |
| `session-memory.bats` | `session-memory.sh` | Stop / SessionEnd — persist learning as a `source_type: agent-session` source |
| `prompt-guard.bats` | `prompt-guard.sh` | UserPromptSubmit — warn on `raw/` edit intent |
| `post-wiki-write.bats` | `post-wiki-write.sh` | PostToolUse — remind about the per-folder index (folder note, legacy `_index.md`) / index entries |
| `post-ingest-summary.bats` | `post-ingest-summary.sh` | PostToolUse — summarize a source write |
| `subagent-ingest-gate.bats` | `subagent-ingest-gate.sh` | SubagentStop — run `verify-ingest` after the ingest agent |
| `subagent-lint-gate.bats` | `subagent-lint-gate.sh` | SubagentStop — warn on unresolved curator errors |
| `verify-ingest.bats` | `verify-ingest.sh` | `claude-wiki-pages verify` twin — structural vault checks |
| `validate-docs.bats` | `validate-docs.sh` | CI Tier 0 glossary gate — retired-identifier scan over `git ls-files` |
| `config-schema.bats` | (config) | `templates/default.config.json` conforms to `schemas/config.schema.json` |
| `heartbeat.bats` | `heartbeat.sh` | maintenance CATCHUP emission + cooldown |
| `stale-memory.bats` | (session memory) | stale agent-session detection |
| `eval-ingest-extract.bats` | `eval-ingest-extract.sh` | eval-driver fail-closed self-test (see [`../eval/CLAUDE.md`](../eval/CLAUDE.md)) |
| `gate-13-no-rag.bats` | `gates/gate-13-no-rag.sh` | NO-RAG invariant scanner self-test |
| `lint-structural.bats`, `lint-vocabulary.bats`, `lint-ontology.bats` | `lint-*.sh` | curator lint checks |
| `ingest-classification.bats`, `ingest-dedup.bats`, `ingest-pdf.bats` | ingest helpers | classification, dedup, PDF extraction |
| `doctor.bats` | `doctor.sh` | `/claude-wiki-pages:doctor` health check |
| `scaffold-vault.bats` | `scaffold-vault.sh` | onboarding vault scaffold |
| `query-descent.bats`, `retrieval-contract.bats` | retrieval path | descent + retrieval contract (NO-RAG) |
| `check-duplicate-claims.bats` | `check-duplicate-claims.sh` | duplicate-claim detection |
| `install-deps.bats`, `run-tests.bats`, `verify-output.bats` | harness scripts | the test scaffolding itself |

The list above is representative, not exhaustive — `ls tests/scripts/*.bats` is the live index, and most files map one-to-one to the like-named script in [`../../scripts/`](../../scripts/).

# tests — the shell test harness

This is the test layer for the `claude-wiki-pages` plugin. The plugin has no compiled runtime to exercise — every layer of the four-layer stack (Data · Skills · Agents · Orchestration) is shell, YAML, and markdown — so the tests are shell too: [Bats](https://bats-core.readthedocs.io/) for unit tests and plain `bash` for static gates and smoke flows. These are dev-time docs; nothing under `tests/` ships to end-users or is loaded as session context. [`README.md`](./README.md) is the long-form authority for everything here; this file is the orientation map.

The suite doubles as the technical documentation (tests-as-documentation): every test title is a feature-spec sentence, the Bats suite is organized by the user-facing feature inventory via the FEATURE INDEX in [`scripts/CLAUDE.md`](./scripts/CLAUDE.md), and the `feature-coverage` gate ([`gates/gate-14-feature-coverage.sh`](./gates/gate-14-feature-coverage.sh)) keeps it living — it fails CI if a feature has no documenting test or a title breaks the convention.

## Tier model

Tests are organized into tiers by cost and dependency footprint. The default local run is Tier 0 + Tier 1; the heavier tiers are explicit opt-ins.

| Tier | What it is | Where | Runner target |
| --- | --- | --- | --- |
| Tier 0 | Static gates — shellcheck, shfmt, markdownlint, lychee, gitleaks, manifest parse, `validate-docs.sh` (Bun-backed: wraps `engine lint --check docs`, fail-closes without Bun) | repo-wide | `tier0` |
| Tier 1 | Bats unit tests — one `.bats` per `scripts/*.sh` hook or utility | [`scripts/`](./scripts/) | `tier1` |
| Tier 2 | Smoke — end-to-end flows that self-skip without the `claude` CLI | [`smoke/`](./smoke/) | `tier2` |
| Tier 3 | Local-embedding re-ranker — permanently dropped; an empty self-skipping stub | n/a | `tier3` |
| gates | Engine gates — every `gate-NN-*.sh` (bun test, typecheck, eslint, parity, no-absolute-paths, stale-dist, feature-coverage) | [`gates/`](./gates/) | `gates` |
| eval | Local-model ingest-extract quality gate — model-neutral, opt-in | [`eval/`](./eval/) | `eval` |

The CI "gates" job (Tier 1-adjacent, run after Bats) lives in [`gates/`](./gates/) and is driven by [`gates/run-all.sh`](./gates/run-all.sh); it covers the Bun engine surface (`bun test`, typecheck, eslint, parity) that the shell tiers cannot. Run it locally with `bash tests/run-tests.sh gates`, or as part of `bash tests/run-tests.sh all`.

## Running

Two scripts drive every local workflow. Both are idempotent and auto-detect macOS (brew) or Linux (apt).

```bash
bash tests/install-deps.sh           # install all dev/test tools (clones bats helpers)
bash tests/install-deps.sh --check   # report tool status; install nothing
bash tests/install-deps.sh --dry-run # print what would be installed

bash tests/run-tests.sh              # Tier 0 + Tier 1 (the default merge-gating run)
bash tests/run-tests.sh tier0        # static gates only
bash tests/run-tests.sh tier1        # Bats only (bats --recursive tests/scripts/)
bash tests/run-tests.sh tier2        # smoke (self-skips without the claude CLI)
bash tests/run-tests.sh gates        # engine gates (tests/gates/run-all.sh — needs Bun)
bash tests/run-tests.sh eval         # opt-in eval (SKIP without CLAUDE_WIKI_PAGES_EVAL_MODEL)
bash tests/run-tests.sh all          # Tier 0 + Tier 1 + Tier 2 + engine gates
bash tests/run-tests.sh --list all   # print the commands without executing them
```

Run a single Bats file or one test:

```bash
bats tests/scripts/verify-ingest.bats
bats --filter "legacy type: moc" tests/scripts/validate-frontmatter.bats
```

## Shared helpers

Every `.bats` file loads [`test_helper/common.bash`](./test_helper/common.bash) via `load '../test_helper/common'` and calls `_load_helpers` inside `setup`. It supplies:

- **Assertion helpers** — `assert_success`, `assert_status <n>`, `assert_output_empty`, `assert_output_contains`, `refute_output_contains`, plus the generic `assert_contains` and `assert_eq`. Use these instead of raw `[[ … ]]`: Bats enables `set -e`, but a mid-body `[[ … ]]` that returns `1` is silently ignored — only the last command drives the result, so a loose test can pass while broken. The helpers `case`-match and `return 1` with a readable diagnostic, so a red test names exactly what it expected.
- **Fixture helpers** — `setup_fixture_vault` / `teardown_fixture_vault` copy [`fixtures/minimal-vault/`](./fixtures/) to a Bats tmpdir and export `$FIXTURE_VAULT`. `setup_isolated_repo` / `commit_file_in_isolated_repo` build a throwaway git repo for `validate-docs.bats` (that script runs `git ls-files`).
- **Hook helpers** — `run_hook_with_json <script> <json-file>` pipes a JSON tool-call payload to a hook on stdin and populates Bats's `$status` / `$output`. `run_hook_with_json_string` takes an inline JSON string for small payloads.

The Bats assertion libraries `bats-support`, `bats-assert`, and `bats-file` are **not authored here and not checked into git** — `install-deps.sh` and `.github/workflows/ci.yml` clone them into `test_helper/` with `git clone --depth 1`. `common.bash` degrades gracefully when they are absent, falling back to its self-contained in-repo helpers.

## The copy-then-mutate rule

Fixtures are immutable. A test that needs to change a vault, a settings file, or any tree copies it into `$BATS_TEST_TMPDIR` first and mutates the copy — never the source under [`fixtures/`](./fixtures/), `docs/vault-example/`, or `scripts/`. `setup_fixture_vault` exists to enforce exactly this. Tests must be deterministic (no network, no clocks, no wait-loops) and idempotent (all mutation inside `$BATS_TEST_TMPDIR`, cleaned up in `teardown`).

## Where to look

| Doing | Primary source |
| --- | --- |
| Tier definitions, fixtures, adding tests | [`README.md`](./README.md) |
| Bats unit tests, hook conventions | [`scripts/CLAUDE.md`](./scripts/CLAUDE.md) |
| CI gates (engine surface) | [`gates/CLAUDE.md`](./gates/CLAUDE.md) |
| Smoke flows | [`smoke/CLAUDE.md`](./smoke/CLAUDE.md) |
| Local-model quality gate | [`eval/CLAUDE.md`](./eval/CLAUDE.md) |
| Fixtures (vault + JSON payloads) | [`fixtures/CLAUDE.md`](./fixtures/CLAUDE.md) |
| The four-layer architecture | [`../CLAUDE.md`](../CLAUDE.md), [`../docs/architecture.md`](../docs/architecture.md) |

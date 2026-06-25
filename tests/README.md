# Tests

Shell-based test harness for the `claude-wiki-pages` plugin.

This repo has no runtime. Every layer is shell, YAML, and markdown. The
test layer is therefore also shell-based, using [Bats](https://bats-core.readthedocs.io/)
for the unit-test tier and plain `bash` for the smoke tier.

## Layout

```
tests/
├── README.md                  # this file
├── fixtures/
│   ├── minimal-vault/         # ~8-file vault that passes verify-ingest.sh
│   │   ├── CLAUDE.md
│   │   ├── raw/sample.md
│   │   └── wiki/
│   │       ├── index.md
│   │       ├── log.md
│   │       ├── _sources/sample.md
│   │       └── topics/
│   │           ├── _index.md
│   │           └── sample-entity.md
│   └── json/                  # tool-call JSON payloads piped to hooks
│       ├── write-valid-wiki-page.json
│       ├── write-invalid-no-type.json
│       ├── write-invalid-moc-type.json
│       ├── write-invalid-markdown-link.json
│       ├── write-to-raw.json
│       └── write-good.json
├── test_helper/
│   ├── common.bash            # shared Bats helpers (see below)
│   ├── bats-assert/           # cloned by CI, ignored by git
│   ├── bats-file/             # cloned by CI, ignored by git
│   └── bats-support/          # cloned by CI, ignored by git
├── scripts/                   # Bats tests — one .bats file per script
│   ├── check-wikilinks.bats
│   ├── install-deps.bats
│   ├── post-ingest-summary.bats
│   ├── post-wiki-write.bats
│   ├── prompt-guard.bats
│   ├── protect-raw.bats
│   ├── resolve-vault.bats
│   ├── run-tests.bats
│   ├── session-start.bats
│   ├── subagent-ingest-gate.bats
│   ├── subagent-lint-gate.bats
│   ├── validate-attachments.bats
│   ├── validate-docs.bats
│   ├── validate-frontmatter.bats
│   └── verify-ingest.bats
└── smoke/                     # Tier 2 end-to-end smoke scripts
    ├── fresh-install.sh
    ├── skill-schema.sh
    ├── ablation-smoke.sh      # opt-in (eval target) — needs a model + Ollama
    └── promptfoo.yaml
```

## Running locally

### Quick start

Two scripts drive the local workflow:

```bash
bash tests/install-deps.sh       # install all dev and test dependencies
bash tests/run-tests.sh          # run Tier 0 (static) + Tier 1 (Bats)
```

Both are idempotent and detect macOS (brew) or Linux (apt) automatically.

Useful flags:

```bash
bash tests/install-deps.sh --check      # report status; no installs
bash tests/install-deps.sh --dry-run    # print what would be installed

bash tests/run-tests.sh tier0           # just Tier 0 (shellcheck, shfmt, markdownlint, lychee, gitleaks, validate-docs)
bash tests/run-tests.sh tier1           # just Tier 1 (bats --recursive tests/scripts/)
bash tests/run-tests.sh tier2           # Tier 2 smoke (self-skips without `claude` CLI)
bash tests/run-tests.sh all             # all three tiers
bash tests/run-tests.sh --list all      # print the commands without running them
```

### Manual prerequisites (if you prefer to install yourself)

- `bats-core` (the test runner)
- `jq` (used by every hook script and most tests)
- `git` (used by `tests/scripts/validate-docs.bats` for isolated repos)
- `bun` (the engine runtime — Tier 0's `validate-docs.sh` is now a thin wrapper over `engine lint --check docs` and fail-closes without it; also required by several Tier 1 suites)
- Optional Tier 0 tools: `shellcheck`, `shfmt`, `markdownlint-cli2`, `lychee`, `gitleaks`, plus `yq` and `check-jsonschema` via pip.

Install on macOS:

```bash
brew install bats-core jq
```

Install on Linux:

```bash
sudo apt-get install -y bats jq
```

The Bats assertion helpers (`bats-assert`, `bats-support`, `bats-file`) are
**not checked into git**. `.github/workflows/ci.yml` clones them on CI via
`git clone --depth 1 …` into `tests/test_helper/`. `install-deps.sh` does the
same for local runs; for manual setup:

```bash
mkdir -p tests/test_helper
for h in bats-support bats-assert bats-file; do
  [ -d "tests/test_helper/$h" ] \
    || git clone --depth 1 "https://github.com/bats-core/${h}.git" "tests/test_helper/${h}"
done
```

### Run a single Bats file or test

```bash
bats tests/scripts/verify-ingest.bats
bats --filter "legacy type: moc" tests/scripts/validate-frontmatter.bats
```

### Tier 2 smoke — when you have the Claude Code CLI

```bash
bash tests/smoke/fresh-install.sh
bash tests/smoke/skill-schema.sh
```

Both smoke scripts detect Claude Code CLI presence (`command -v claude`).
Without the CLI they print `[SKIP]` and exit 0 — that's the current CI
posture until Phase E wires in a CLI runner. With the CLI present they
run the full end-to-end flow.

### Ablation smoke — when you have a local model (eval target)

```bash
CLAUDE_WIKI_PAGES_EVAL_MODEL=qwen3-coder:30b bash tests/run-tests.sh eval
# or directly:
CLAUDE_WIKI_PAGES_EVAL_MODEL=qwen3-coder:30b bash tests/smoke/ablation-smoke.sh
```

[`smoke/ablation-smoke.sh`](./smoke/ablation-smoke.sh) runs ONE golden case
(`extract-basic`) through both arms of the scaffolding ablation
([ADR-0020](../docs/adr/ADR-0020-scaffolding-ablation-eval.md)) and asserts
the plugin arm ≥ the baseline arm on `schema_validity` and
`claim_source_fidelity`, printing the mini side-by-side table. It self-skips
unless `CLAUDE_WIKI_PAGES_EVAL_MODEL` is set AND the Ollama endpoint answers
the preflight — CI never runs the live path. It is wired into the `eval`
target after the driver self-test.

## Fixtures

### `tests/fixtures/minimal-vault/`

A tiny valid vault. ~8 files total. Every wiki file carries full
schema-compliant frontmatter, sources use `[[wikilink]]` syntax, and the
folder `_index.md` agrees with its folder contents. `verify-ingest.sh`
returns exit 0 on this fixture.

Tests that need to mutate a vault call `setup_fixture_vault()` in
`test_helper/common.bash`, which copies the directory to a Bats tmpdir so
the original fixture stays pristine.

### `tests/fixtures/json/`

Each file is a JSON payload shaped like Claude Code's tool-call input —
the shape hook scripts read from stdin. Tests pipe these into the hook
under test and check stdout / exit code.

- `write-valid-wiki-page.json` — valid `type: entity` write.
- `write-good.json` — a second clean entity write (used by several tests).
- `write-invalid-no-type.json` — frontmatter without a `type:` field.
- `write-invalid-moc-type.json` — banned legacy `type: moc`.
- `write-invalid-markdown-link.json` — wiki body using `[text](file.md)`.
- `write-to-raw.json` — `Edit` to `vault/raw/` (protect-raw.sh should block).

## `test_helper/common.bash`

Shared helpers loaded via `load '../test_helper/common'` at the top of
each `.bats` file.

### Assertion helpers

Use these — not raw `[[ ... ]]` — for any assertion against `$output`.

| Helper                               | Use it for                                              |
| ------------------------------------ | ------------------------------------------------------- |
| `assert_success`                     | `$status` must be `0`                                   |
| `assert_status <n>`                  | `$status` must be exactly `<n>`                         |
| `assert_output_empty`                | `$output` must be empty                                 |
| `assert_output_contains "<needle>"`  | `$output` must contain `<needle>` as a substring        |
| `refute_output_contains "<needle>"`  | `$output` must NOT contain `<needle>`                   |
| `assert_contains "<hay>" "<needle>"` | Generic substring check on any string (e.g., `$out`)    |
| `assert_eq "<actual>" "<expected>"`  | Generic equality check (e.g., `$rc`, captured exit code)|

**Why these exist.** Bash `set -e` (which Bats enables inside tests) does
NOT trigger on a `[[ … ]]` that returns `1` when it appears in the middle
of a test body — only the *last* command drives the test result. A test
shaped like this:

```bash
[ "$status" -eq 0 ]
[[ "$output" == *"expected"* ]]   # silently ignored if it fails
[[ "$output" != *"forbidden"* ]]
```

passes even when the middle assertion is false. The helpers use a `case`
statement plus an explicit `return 1`, which always surfaces the failure
with a readable diagnostic, so a red test tells you exactly what it
expected.

If a test raw-matches against `$output` — `case "$output" in …` or
`[[ "$output" == "$exact" ]]` as the **last** command, that's fine. The
helpers are for the common substring / empty / status checks.

### Fixture and hook helpers

- `setup_fixture_vault` / `teardown_fixture_vault` — copy `minimal-vault`
  to a Bats tmpdir and export `$FIXTURE_VAULT`.
- `setup_isolated_repo` / `teardown_isolated_repo` — build a throwaway
  git repo seeded with the real tree's `scripts/`, `docs/`, `skills/`,
  `agents/`, `.claude-plugin/`, `README.md`, and `CLAUDE.md`. Used only
  by `validate-docs.bats` because that script runs `git ls-files`.
- `commit_file_in_isolated_repo <path> <content>` — write a file and
  commit it inside the isolated repo.
- `run_hook_with_json <script> <json-file>` — pipe a JSON blob to a hook
  script, populating Bats's `$status` and `$output`.
- `run_hook_with_json_string <script> <json-string>` — same, but accepts a
  JSON string directly instead of a file path. Use for small inline payloads
  that don't warrant a fixture file.

## Adding tests

1. Pick an existing `.bats` file to extend, or create a new one at
   `tests/scripts/<script-name>.bats`.
2. Add `load '../test_helper/common'` at the top.
3. Call `_load_helpers` inside `setup`.
4. Name tests by feature: `@test "<Feature>: <behavior sentence>"` — the
   user-facing feature label leads, not the script name, and the behavior reads
   as a spec sentence. Each file's feature label is fixed by the FEATURE INDEX in
   [`scripts/CLAUDE.md`](./scripts/CLAUDE.md); move any check-ID to a trailing
   `# spec <id>` comment. A new `.bats` file also needs a FEATURE INDEX row —
   the `feature-coverage` gate (gate-14) fails CI on a missing row or a
   non-conforming title.
5. Use `run_hook_with_json` or construct stdin inline.
6. Assert with the helpers above — avoid raw `[[ == ]]` in the middle
   of a test body.
7. Clean up any tmpdirs in `teardown` — tests must be idempotent.

### Example

```bash
@test "My hook: a write outside vault/wiki/ is blocked" {
  local json='{"tool_name":"Write","tool_input":{"file_path":"/tmp/elsewhere.md"}}'
  run bash -c "printf '%s' '$json' | bash '$REPO_ROOT/scripts/my-hook.sh'"

  assert_success
  assert_output_contains '"decision":"block"'
  refute_output_contains "something we should never print"
}
```

## Writing mutation-resistant tests

A test is only useful if it fails when the subject under test is broken.
When you add a test, ask:

- **What single-line change to the script would make this behavior wrong?**
  Mentally apply it. If the test still passes, the assertion is too loose.
- **Does the fixture actually trigger the rule?** A "blocks on X" test
  whose fixture doesn't contain X passes even if the blocking logic is
  deleted.
- **Is the early-exit path the only thing being tested?** Tests like
  "ignores non-wiki paths" must use content that *would* trigger the
  validation if it ran — otherwise they only pin the guard, not the rule.
- **Does the assertion pin the specific behavior?** Prefer
  `assert_output_contains "Add [[New Page]]"` over
  `assert_output_contains "index.md"` — the former names the branch.

When in doubt, apply your candidate mutation to the script, run the test,
and confirm it fails before reverting. That's the fastest way to prove
the test earns its place.

## Constraints

- Tests must be deterministic. No network calls, no time-dependent
  assertions, no flaky wait-loops.
- Tests must be idempotent. Mutations happen inside `$BATS_TEST_TMPDIR`.
- Use absolute paths for fixtures: `$MINIMAL_VAULT_SRC`, `$JSON_FIXTURES_DIR`.
- Never mutate files under the real `tests/fixtures/`, `scripts/`, etc.

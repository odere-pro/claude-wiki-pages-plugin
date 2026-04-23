# Tests

Shell-based test harness for the `llm-wiki-stack` plugin.

This repo has no runtime — every layer is shell, YAML, and markdown. The
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
│   ├── post-ingest-summary.bats
│   ├── post-wiki-write.bats
│   ├── prompt-guard.bats
│   ├── protect-raw.bats
│   ├── subagent-ingest-gate.bats
│   ├── subagent-lint-gate.bats
│   ├── validate-attachments.bats
│   ├── validate-docs.bats
│   ├── validate-frontmatter.bats
│   └── verify-ingest.bats
└── smoke/                     # Tier 2 end-to-end smoke scripts
    ├── fresh-install.sh
    ├── skill-schema.sh
    └── promptfoo.yaml
```

## Running locally

### Prerequisites

- `bats-core` (the test runner)
- `jq` (used by every hook script and most tests)
- `git` (used by `tests/scripts/validate-docs.bats` for isolated repos)

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
`git clone --depth 1 …` into `tests/test_helper/`. For local runs:

```bash
mkdir -p tests/test_helper
for h in bats-support bats-assert bats-file; do
  [ -d "tests/test_helper/$h" ] \
    || git clone --depth 1 "https://github.com/bats-core/${h}.git" "tests/test_helper/${h}"
done
```

### Run the whole unit-test tier

```bash
bats --recursive tests/scripts/
```

### Run one file

```bash
bats tests/scripts/verify-ingest.bats
```

### Tier 2 smoke

```bash
bash tests/smoke/fresh-install.sh
bash tests/smoke/skill-schema.sh
```

Both smoke scripts detect Claude Code CLI presence (`command -v claude`).
Without the CLI they print `[SKIP]` and exit 0 — that's the current CI
posture until Phase E wires in a CLI runner. With the CLI present they
run the full end-to-end flow.

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
3. Call `_load_helpers` inside `setup` if the test uses `assert_*`.
4. Name tests descriptively: `@test "<script>: <behavior>"`.
5. Use `run_hook_with_json` or construct stdin inline.
6. Clean up any tmpdirs in `teardown` — tests must be idempotent.

## Constraints

- Tests must be deterministic. No network calls, no time-dependent
  assertions, no flaky wait-loops.
- Tests must be idempotent. Mutations happen inside `$BATS_TEST_TMPDIR`.
- Use absolute paths for fixtures: `$MINIMAL_VAULT_SRC`, `$JSON_FIXTURES_DIR`.
- Never mutate files under the real `example-vault/`, `scripts/`, etc.

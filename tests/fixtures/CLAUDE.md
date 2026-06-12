# tests/fixtures — test inputs

This directory holds the immutable inputs the Bats and smoke tests consume: a clean reference vault and a set of JSON tool-call payloads. Fixtures are never mutated in place — a test that needs to change one copies it into `$BATS_TEST_TMPDIR` first and mutates the copy. The fixture helpers in [`../test_helper/common.bash`](../test_helper/common.bash) exist to enforce exactly that. See [`../README.md`](../README.md) for the full contract and [`../CLAUDE.md`](../CLAUDE.md) for the tier model.

## `minimal-vault/`

The canonical clean fixture vault: a tiny but fully schema-compliant tree (about 8 files) that mirrors the shape of `docs/vault-example/` while keeping every file to the minimum content needed to pass [`../../scripts/verify-ingest.sh`](../../scripts/verify-ingest.sh).

```text
minimal-vault/
├── CLAUDE.md                 # schema header (the authoritative schema is docs/vault-example/CLAUDE.md)
├── raw/sample.md             # immutable source
├── output/example-export.md  # an export sample
└── wiki/
    ├── index.md
    ├── log.md
    ├── _sources/sample.md
    └── topics/
        ├── topics.md
        └── sample-entity.md
```

Every wiki file carries full schema-compliant frontmatter, sources use `[[wikilink]]` syntax, and each folder's index file (the folder note `topics/topics.md`) agrees with its contents, so `verify-ingest.sh` returns `0`. Tests that need to mutate the vault call `setup_fixture_vault`, which copies the tree to a Bats tmpdir and exports `$FIXTURE_VAULT`; the source under `minimal-vault/` stays pristine. Treat it as a test input, not reference documentation — the authoritative schema lives in [`../../docs/vault-example/CLAUDE.md`](../../docs/vault-example/CLAUDE.md).

## `json/`

Each file is a `Write`/`Edit` tool-call payload shaped like Claude Code's hook input — the JSON the PreToolUse hooks read from stdin. Tests pipe these into the hook under test (via `run_hook_with_json`) and assert on stdout and exit code.

| Payload | Shape | What it drives |
| --- | --- | --- |
| `write-valid-wiki-page.json` | valid `type: entity` Write | allow path |
| `write-good.json` | a second clean entity Write | allow path, reused widely |
| `write-invalid-no-type.json` | frontmatter with no `type:` | missing-field block |
| `write-invalid-moc-type.json` | banned legacy `type: moc` | unknown-type block |
| `write-invalid-markdown-link.json` | wiki body using `[text](file.md)` | wikilink block |
| `write-to-raw.json` | `Edit` to `vault/raw/` | `protect-raw.sh` block |

## `adversarial/`

The Tier 4 prompt-injection corpus: `Write`/`Edit` tool-call payloads carrying real injection text, replayed against the full PreToolUse hook chain by [`../adversarial/replay-corpus.sh`](../adversarial/replay-corpus.sh). The filename prefix is the expected verdict — `block-*.json` cases must be blocked (out-of-vault `.ssh`/`.env` writes, edits to an existing `raw/` source, legacy-type frontmatter spoofing, markdown-link smuggling); `allow-*.json` cases pin the structural/semantic boundary (a new `raw/` source containing injection text is allowed by design). `{{VAULT}}` in a payload is substituted with a throwaway copy of `minimal-vault/` at replay time. Self-tested by [`../scripts/replay-corpus.bats`](../scripts/replay-corpus.bats); run weekly by `.github/workflows/adversarial.yml`.

## The immutability rule

Fixtures are read-only inputs. Never edit `minimal-vault/` or `json/` to make a test pass — copy into `$BATS_TEST_TMPDIR`, mutate there, and assert against the copy. Tests stay deterministic (no network, no clocks) and idempotent (all mutation in the tmpdir, cleaned up in `teardown`).

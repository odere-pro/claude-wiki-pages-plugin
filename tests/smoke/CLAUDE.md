# tests/smoke — Tier 2 end-to-end smoke

This directory holds the Tier 2 smoke tests: end-to-end flows that exercise the plugin the way a user would, rather than a single script in isolation. They depend on the Claude Code CLI to run the real flow, so each script self-skips — printing a `[SKIP]` marker and exiting `0` — when `claude` is not on PATH (`command -v claude`). That self-skip is the current CI posture until a CLI runner is wired in; the static assertions that do not need the CLI still run against committed fixtures so the scripts are never total no-ops. Run them with `bash tests/run-tests.sh tier2` or individually. See [`../README.md`](../README.md) for the contract and [`../CLAUDE.md`](../CLAUDE.md) for the tier model.

## Scripts

- [`fresh-install.sh`](./fresh-install.sh) — the clone → onboard → ingest-one-source → verify flow. With the CLI present it runs the real path; without it, the CLI-driven steps are skipped and the local `verify-ingest.sh` call against the prebuilt fixture still runs so the script does real work.
- [`skill-schema.sh`](./skill-schema.sh) — runs each Layer 2 skill (`ingest`, `lint`, `fix`, `synthesize`) and asserts every output file has well-formed YAML frontmatter and a `sources:` field holding `[]` or `[[wikilinks]]`. It copies [`../fixtures/minimal-vault/`](../fixtures/) (mirroring `docs/vault-example/`) into a temp vault to verify schema and skill behavior, so the YAML/`sources` assertions run even when the CLI is absent. Assertions are pure shell + `jq` (no Python).
- [`promptfoo.yaml`](./promptfoo.yaml) — a [promptfoo](https://www.promptfoo.dev/) config stub for asserting semantic properties of skill output; populated when the CLI runner lands.

## Running

```bash
bash tests/smoke/fresh-install.sh   # [SKIP] exit 0 if `claude` is absent
bash tests/smoke/skill-schema.sh
bash tests/run-tests.sh tier2       # both smoke scripts
```

Smoke scripts follow the same discipline as the rest of the harness: copy fixtures into a temp dir then mutate, never touch [`../fixtures/`](../fixtures/) or `docs/vault-example/` in place, and stay deterministic.

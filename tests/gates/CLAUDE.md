# tests/gates — the CI gates job

This directory is the CI "gates" job: a set of focused `gate-NN-*.sh` checks that cover the Bun engine surface and the cross-language invariants the shell tiers cannot. It runs after the Tier 1 Bats suite, driven by [`run-all.sh`](./run-all.sh), which executes every `gate-*.sh` in filename order and exits `0` only when all pass. Most gates need the compiled engine, so CI runs `bun run build` before [`run-all.sh`](./run-all.sh); each engine gate self-skips (prints `SKIP`, exits 0) when `bun`/`npm` is absent so the suite still runs on a bare shell box. See [`../CLAUDE.md`](../CLAUDE.md) for the tier model and [`../../docs/architecture.md`](../../docs/architecture.md) for the engine/bash twin contract.

## Running

```bash
bun run build                  # CI does this first — gates compare against dist/
bash tests/gates/run-all.sh    # run every gate, print a pass/fail summary
bash tests/gates/run-all.sh --list
bash tests/gates/gate-05-verify-parity.sh   # run one gate directly
```

## The gates

One row per gate. Note there are **two `gate-11`** files — `gate-11-eslint.sh` and `gate-11-firewall-parity.sh` — both run; the duplicate number is intentional.

| Gate | Enforces | Failure mode |
| --- | --- | --- |
| `gate-01-engine-tests` | `bun test` passes with the coverage thresholds in `bunfig.toml` | engine test or coverage failure |
| `gate-02-typecheck` | engine type-checks clean (`bun run typecheck`, `tsc --noEmit`) | type error |
| `gate-03-shellcheck` | `scripts/*.sh` and `tests/gates/*.sh` pass shellcheck at warning severity | shellcheck warning/error |
| `gate-04-glossary` | `validate-docs.sh` is clean — no retired identifiers, all slash refs resolve | glossary-gate violation |
| `gate-05-verify-parity` | Bun engine `verify` agrees with bash `verify-ingest.sh` on the reference vault | engine error/warning counts differ from bash |
| `gate-06-no-absolute-paths` | no `/Users/<name>` or `/home/<name>` leaks into shipped artifacts | hard-coded home path in skills/agents/scripts/src/hooks/commands |
| `gate-07-config-schema` | `templates/default.config.json` conforms to `schemas/config.schema.json` | unknown key, bad enum, or parse failure |
| `gate-08-prettier` | engine source + JSON config artifacts are prettier-clean | unformatted `src/**/*.ts` or `schemas`/`templates` JSON |
| `gate-09-npm-pack` | the npm tarball ships only runtime surface (`dist/`, `schemas/`) and excludes the dev surface (`src/`, `site/`, `tests/`) | forbidden path present, or required path absent |
| `gate-10-markdownlint` | markdown lints clean (mirrors CI Tier 0) | bare URL, list-numbering drift, etc. |
| `gate-11-eslint` | engine source passes eslint (`bun run lint`, typescript-eslint) | eslint error |
| `gate-11-firewall-parity` | engine `firewall` matches the checked-in GOLDEN verdict table across the baseline, cross-vault, and symlink-escape matrices (post twin-retirement) | an engine decision-logic change moves a fixture verdict off the golden table |
| `gate-12-stale-dist` | `dist/cli.js`, when present, is at least as new as every `src/**/*.ts` | a contributor forgot `bun run build`; SKIP when `dist/cli.js` absent |
| `gate-13-no-rag` | NO-RAG invariant — the retrieval path imports/calls no embedding, vector, HTTP, or similarity primitive | forbidden token on the retrieval path; grep-only, runs with no bun |

Gate 05 is the engine/bash parity invariant for `verify-ingest.sh` (still a byte-aligned twin). Gate 11-firewall-parity is now a GOLDEN-SNAPSHOT invariant: since firewall-twin-retire (migration-plan.md Phase 3) `firewall.sh` is a thin stdin→engine wrapper with no independent decision logic, so the gate pins the single engine implementation against a checked-in verdict table instead of a second bash implementation. Gate 13 makes "no RAG" a static CI invariant rather than a runtime hope, and ships a `--self-test` that plants forbidden tokens to prove it fails closed.

# src — the deterministic engine

`src/` is the deterministic Bun/TypeScript engine — the "brain" behind the
Layer 4 Orchestration hooks and scripts. It indexes, links, verifies, and
self-heals an Obsidian LLM-Wiki vault with zero network, zero embeddings, and
no ML: same vault in, same report out. It compiles to `dist/cli.js` via
`bun build ./src/cli/cli.ts --outdir ./dist --target bun`, and the bash hooks
shell out to it through [`../scripts/engine.sh`](../scripts/engine.sh). This
tree is dev-time only — it is NOT shipped to end-users and is NOT loaded as
plugin runtime context (see [`../CLAUDE.md`](../CLAUDE.md) for the four-layer
model and the dev-time-vs-runtime split).

## Entry and build

- **Entry** — [`cli/cli.ts`](./cli/cli.ts): a router that parses argv, dispatches
  to a command handler, emits JSON or text, and returns an exit code.
- **Build** — `bun build ./src/cli/cli.ts --outdir ./dist --target bun` writes
  `dist/cli.js`. `engine.sh` runs that prebuilt artifact when present and falls
  back to running `src/cli/cli.ts` directly (Bun executes TypeScript with no
  build step).
- **Rebuild rule** — when `src/` changes, `dist/cli.js` must be rebuilt.
  `tests/gates/gate-12-stale-dist.sh` fails CI when the committed `dist/cli.js`
  no longer matches a fresh build.

## Conventions

- **Immutable data** — never mutate inputs; return new objects (the result model
  in [`core/report.ts`](./core/report.ts) is `Object.freeze`d).
- **`unknown` + narrowing for errors** — no `any`; narrow untrusted input safely.
- **Small modules** — one responsibility per file; commands are thin, primitives
  in `core/` do the work.
- **Colocated tests** — `*.test.ts` next to each module, run with `bun test`.
  Typecheck with `tsc --noEmit`; lint with `eslint "src/**/*.ts"`.

## Shell ↔ TS parity

The bash hooks are the hot path — they decide and verify without spawning Bun on
every tool call. The engine is the full implementation; two bash twins mirror
the latency-critical slices and are pinned byte-for-byte by parity gates:

- `verify` ↔ [`../scripts/verify-ingest.sh`](../scripts/verify-ingest.sh),
  pinned by `tests/gates/gate-05-verify-parity.sh`.
- [`core/firewall.ts`](./core/firewall.ts) ↔
  [`../scripts/firewall.sh`](../scripts/firewall.sh), pinned by
  `tests/gates/gate-11-firewall-parity.sh`.

Globs in the firewall stay "simple" (`*` within a segment, `**` across segments)
deliberately, so the bash and TypeScript matchers agree on every path.

## Subtree map

| Directory                          | Holds                                                          |
| ---------------------------------- | ------------------------------------------------------------- |
| [`cli/`](./cli/CLAUDE.md)          | The argv router — parse, dispatch, emit, exit.                |
| [`commands/`](./commands/CLAUDE.md)| The 10 implemented engine verbs; one handler per subdir.      |
| [`core/`](./core/CLAUDE.md)        | The ~18 primitives: checks, builders, io, parsing, result model. |
| [`data/`](./data/CLAUDE.md)        | Config layering + embedded frontmatter templates.            |
| [`test-helpers/`](./test-helpers/) | The `makeVault` sandbox and shared fixtures for `bun test`.   |

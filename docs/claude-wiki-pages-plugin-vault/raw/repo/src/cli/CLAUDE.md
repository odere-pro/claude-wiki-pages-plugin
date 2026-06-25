# cli — the argv router

[`cli.ts`](./cli.ts) is router-only: it parses `process.argv`, dispatches to a
command handler under [`../commands/`](../commands/CLAUDE.md), emits the result
as JSON or text, and returns an exit code. It holds no domain logic — every
check, repair, and search lives in [`../core/`](../core/CLAUDE.md). The shape is
a four-step pipeline: `parseArgs → dispatch → emit → exitCode`. Tests live in
[`cli.test.ts`](./cli.test.ts), run with `bun test`.

## Pipeline

- **`parseArgs(argv)`** — a single left-to-right scan into a frozen `ParsedArgs`.
  The first bare token is `command`, the second is `sub`; flags are recognised
  anywhere.
- **dispatch** — `main()` matches on `command` and calls the handler, passing
  `target` plus the flags that command honours.
- **`emit(report, json)`** — `--json` prints `JSON.stringify(report, null, 2)`;
  otherwise a command-specific text renderer (the default uses
  [`renderText`](../core/report.ts) from `core/report.ts`).
- **exit code** — `0` ok, `1` problem (errors found / unclean / blocked), `2`
  usage error (missing required flag, unknown command). `verify` returns
  [`exitCode(report)`](../core/report.ts); `doctor` returns `doctorExit` (`3`
  under `--strict` when any check warned or failed).

## Flags

`--json` is universally supported. The rest are command-scoped: `--target
<vault>` (override four-tier resolution), `--fix`, `--strict`, `--write`,
`--file <path>`, `--type <t>`, `--folder <prefix>`, `--tag <t>`, `--graph`,
`--other-vaults <a:b:c>` (colon-separated sibling vault roots for the cross-vault
firewall check), and `--op <id>` / `--label <msg>` (snapshot operation id and
commit-message label).

## Commands

- **Implemented (14)** — `verify`, `fix`, `heal`, `doctor`, `config`, `migrate`,
  `search`, `firewall`, `backlog`, `propose`, `capabilities`, `ontology`,
  `route`, `snapshot`. See [`../commands/CLAUDE.md`](../commands/CLAUDE.md).
- **Planned / declared** — `index`, `link-suggest`. They are listed
  in usage and return a `not-implemented` stub (exit `0`) so the CLI surface is
  stable and discoverable before the later milestones fill them in.

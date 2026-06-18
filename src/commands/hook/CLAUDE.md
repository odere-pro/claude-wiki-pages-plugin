# hook — the PreToolUse stdin gate entry

`hook` is the firewall-adjacent engine entry that consumes a Claude Code
`PreToolUse` tool-call JSON from **stdin** and emits the
`{"decision":"block","reason":…}` contract on **stdout** (migration-plan.md
Phase 3). It is the engine half of the hot-path write gates: the bash hooks in
[`../../../scripts/`](../../../scripts/) become thin wrappers that pipe stdin to
`engine hook --gate <name>`, so the fragile inline `awk`/`jq` parsing is replaced
by a real parser while the hook contract is preserved verbatim.

## Input and flags

- stdin — the PreToolUse payload (`{ tool_name, tool_input: { file_path|file,
  content, old_string, new_string } }`), narrowed at the boundary by
  [`../../core/hook-input.ts`](../../core/hook-input.ts) (untrusted; never trust
  the shape — malformed JSON degrades to an all-empty input, never throws).
- `--gate <name>` — which security gate to run. Required (exit `2` without it).
  Currently: `frontmatter`. `check-wikilinks`, `protect-raw`, `attachments`, and
  `dmi` plug into the same `GATES` table in later units.
- `--target <vault>` — explicit active-vault override; else four-tier resolution.

## Contract (preserved verbatim from the bash hooks)

| Outcome | stdout | exit |
| --- | --- | --- |
| block | `{"decision":"block","reason":…}` | `0` |
| allow | (nothing) | `0` |

The block is signalled by the stdout JSON, not the exit code — matching every
`PreToolUse` hook. (`enforce-dmi`'s hard `exit 2` is preserved by its own gate
when it is wired here.)

## Gates

### frontmatter ([`frontmatter-gate.ts`](./frontmatter-gate.ts))

Replaces the hook mode of `scripts/validate-frontmatter.sh` (the 447-line
awk-YAML parser). The per-page rules live in
[`../../core/frontmatter-validate.ts`](../../core/frontmatter-validate.ts)
(`validateContent`, real `yaml`); this gate adds only the hook wrapping:

1. **Path filter** — gate only markdown under `<vaultName>/wiki/`; else allow.
2. **Edit tool** — block when `old_string` carried a required frontmatter field
   that `new_string` drops.
3. **Write tool** — empty content → allow; else block on the first
   `validateContent` violation (the reason verbatim).

Schema resolution mirrors the bash `_resolve_schema_file`: the vault's
`CLAUDE.md` table when present, else the bundled runtime template
`skills/init/template/CLAUDE.md`. Fail-closed (block) when neither carries a
usable table.

## Fail-closed (the Phase-3 safety upgrade)

Security gates fail **closed**: the bash wrapper checks for Bun before delegating
and, when Bun is absent, emits a block decision with an install-Bun reason for
writes the gate would have validated (markdown under `<vault>/wiki/`) — never
fail-open. This is the explicit upgrade over the old fail-open hook.

## Covered by

- [`hook.test.ts`](./hook.test.ts) — entry-level dispatch + vault resolution.
- [`frontmatter-gate.test.ts`](./frontmatter-gate.test.ts) — the path filter,
  Edit-removal, Write validation, bundled-template fallback, and fail-closed
  table cases.
- [`../../core/hook-input.test.ts`](../../core/hook-input.test.ts) — the
  tolerant boundary parser.
- `tests/scripts/validate-frontmatter.bats` — the bash-wrapper contract,
  including the **Bun-absent fail-closed** path.

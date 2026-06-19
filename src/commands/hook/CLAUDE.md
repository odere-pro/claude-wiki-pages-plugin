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
  The seven gates: `frontmatter`, `firewall`, `check-wikilinks`, `protect-raw`,
  `attachments`, `dmi`, `must-rule`.
- `--target <vault>` — explicit active-vault override; else four-tier resolution.
- `--other-vaults <a:b:c>` — colon-separated sibling registered-vault roots; used
  only by the `firewall` gate (cross-vault confinement). The bash wrapper derives
  them from the registry (or `CLAUDE_WIKI_PAGES_OTHER_VAULTS`), fail-closed.

## Contract (preserved verbatim from the bash hooks)

| Outcome | stdout | stderr | exit |
| --- | --- | --- | --- |
| block (stdout gates) | `{"decision":"block","reason":…}` | — | `0` |
| allow | (nothing) | — | `0` |
| `dmi` hard block | — | two-line `[enforce-dmi] …` | `2` |
| `must-rule` advisory | — | two-line `[enforce-must-rule] …` | `0` |

Most gates signal a block via the stdout JSON, not the exit code — matching every
`PreToolUse` hook. The two exceptions, ported verbatim from their bash twins:
`enforce-dmi` is the lone HARD-block gate (a `[enforce-dmi]` stderr message and
`exit 2`, never the stdout JSON), and `enforce-must-rule` is advisory (a
`[enforce-must-rule]` stderr notice and always `exit 0`).

## Security vs. advisory (fail-closed vs. fail-open)

The bash wrappers degrade deliberately when Bun is absent (migration-plan.md
"Error handling"):

- **Security gates fail CLOSED** — `frontmatter`, `firewall`, `protect-raw`,
  `attachments`, `dmi` BLOCK the write (scoped to the paths each would have
  guarded) with an install-Bun reason. `protect-raw`/`attachments`/`firewall`
  emit the block JSON; `dmi` hard-blocks with `exit 2`.
- **Advisory gates fail OPEN** — `check-wikilinks` and `must-rule` let the write
  through (`exit 0`), since a style/advisory check must never break a write on a
  bare box.

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

### firewall ([`firewall-gate.ts`](./firewall-gate.ts))

Replaces the hook mode of `scripts/firewall.sh` (the inline `decide()` +
`_realpath_physical` glob/symlink logic). The decision authority itself stays in
[`../../core/firewall.ts`](../../core/firewall.ts) (via `firewallCheck`); this
gate adds only the hook wrapping:

1. **Empty file path** → allow (the bash `[ -z "$FILE_PATH" ] && exit 0`).
2. **enforce block** → emit the B03-redacted reason (the active vault BASENAME
   only, never the absolute path): the cross-vault message for a `cross-vault`
   rule, the "confined to the vault … allowPaths" message for every other block.
3. **warn mode** → never blocks (allowed is always true on a boundary hit).

The cross-vault SET (`--other-vaults`) is computed by the bash wrapper from the
registry (or `CLAUDE_WIKI_PAGES_OTHER_VAULTS`), fail-closed, and passed in — the
registry read stays in the bash spine (migration-plan.md "What stays in bash").
Anti-drift is pinned by `tests/gates/gate-11-firewall-parity.sh`, flipped from a
bash-twin comparison to a checked-in GOLDEN verdict table once the bash decision
twin was retired.

### check-wikilinks ([`wikilink-gate.ts`](./wikilink-gate.ts))

Replaces the hook mode of `scripts/check-wikilinks.sh`. ADVISORY (fail-open).
Path filter gates only paths under `<vaultName>/wiki/`. The Write path reproduces
the bash `check_content` VERBATIM — including the `sed '1,/^---$/d'` quirk where a
body with NO `---` frontmatter is stripped entirely and never blocks (an
integration finding: the shared core `hook-wikilink-check.ts` uses
`splitFrontmatter`, which keeps such a body, so the gate keeps the bash semantics
to hold the contract). The Edit path greps `new_string` directly with the
dedicated "Edit introduces …" reason.

### protect-raw ([`protect-raw-gate.ts`](./protect-raw-gate.ts))

Replaces the hook mode of `scripts/protect-raw.sh`. SECURITY (fail-closed). A
faithful bash port: canonicalise the path (symlink/traversal), apply the
PATH-SEGMENT boundary (`<vaultName>/raw/`), the sanctioned agent-session carve-out
(a NEW file under `raw/agent-sessions/` whose FRONTMATTER declares `source_type:
agent-session`), then default-deny (block Edit; block Write overwriting an
existing file; allow a new file). Integration finding: the shared core
`protect-raw-check.ts` decides by ABSOLUTE containment under the resolved vault;
the bats contract pins the segment-glob behaviour, so this gate uses the bash
segment model. Raw immutability is a TEAM-BRIEF §5 non-negotiable.

### attachments ([`attachment-gate.ts`](./attachment-gate.ts))

Replaces the hook mode of `scripts/validate-attachments.sh`. SECURITY
(fail-closed). Only `wiki/_sources/*.md` writes are inspected. The gate
reconstructs the POST-operation content (Write content; Edit = disk content with
`old_string`→`new_string` applied) and runs the core
[`../../core/attachment-check.ts`](../../core/attachment-check.ts): a non-text
`source_format` needs an `attachment_path` that resolves on disk, else block.

### dmi ([`dmi-gate.ts`](./dmi-gate.ts))

Replaces the hook mode of `scripts/enforce-dmi.sh`. SECURITY, HARD block. The
ONLY gate that does not use the stdout block JSON: a SKILL.md adding a
side-effecting verb without `disable-model-invocation: true` yields a two-line
`[enforce-dmi]` STDERR message and `exit 2` (preserved VERBATIM via the core
[`../../core/dmi-check.ts`](../../core/dmi-check.ts) `dmiDecision`'s exit-2
mapping). An empty-content Edit reads the file from disk to scan.

### must-rule ([`must-rule-gate.ts`](./must-rule-gate.ts))

Replaces the hook mode of `scripts/enforce-must-rule.sh`. ADVISORY (fail-open),
NON-BLOCKING. A CLAUDE.md edit adding must/never/always lines yields a two-line
`[enforce-must-rule]` STDERR notice (with the per-line count) and always
`exit 0`, via the core [`../../core/must-rule-check.ts`](../../core/must-rule-check.ts).

## Fail-closed vs. fail-open (the Phase-3 safety upgrade)

Each bash wrapper checks for Bun before delegating. Security gates
(`frontmatter`, `firewall`, `protect-raw`, `attachments`, `dmi`) fail **closed**
— when Bun is absent they BLOCK the write the gate would have guarded (scoped to
that gate's paths) with an install-Bun reason (`dmi` via `exit 2`). Advisory
gates (`check-wikilinks`, `must-rule`) fail **open** — they exit 0 so a missing-Bun
box is never blocked by a style/advisory check.

## Covered by

- [`hook.test.ts`](./hook.test.ts) — entry-level dispatch + vault resolution.
- [`frontmatter-gate.test.ts`](./frontmatter-gate.test.ts),
  [`firewall-gate.test.ts`](./firewall-gate.test.ts),
  [`wikilink-gate.test.ts`](./wikilink-gate.test.ts),
  [`protect-raw-gate.test.ts`](./protect-raw-gate.test.ts),
  [`attachment-gate.test.ts`](./attachment-gate.test.ts),
  [`dmi-gate.test.ts`](./dmi-gate.test.ts),
  [`must-rule-gate.test.ts`](./must-rule-gate.test.ts) — the per-gate decisions.
- [`../../core/hook-input.test.ts`](../../core/hook-input.test.ts) — the
  tolerant boundary parser.
- `tests/scripts/{validate-frontmatter,firewall,check-wikilinks,protect-raw,validate-attachments,enforce-dmi,enforce-must-rule}.bats`
  — each bash-wrapper contract, including the **Bun-absent fail-closed / fail-open**
  path.

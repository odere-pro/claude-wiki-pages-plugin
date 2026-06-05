# firewall — the write-confinement decision authority

`firewall` answers exactly one question — "may an agent write to this path?" — and
it is the single authority that does so. The boundary is: writes are confined to
the resolved vault, plus any `allowPaths` roots, minus any `denyPaths` globs (which
win even inside an allowed root), minus any sibling registered vaults
(`cross-vault`, which `allowPaths` cannot override). Agents and the parity gate
call this engine handler; the latency-critical `PreToolUse` hook
[`../../../scripts/firewall.sh`](../../../scripts/firewall.sh) mirrors the same
logic in bash so writes are gated without a Bun spawn on every tool call. The
handler in [`firewall.ts`](./firewall.ts) loads the policy from config and delegates
the decision to [`../../core/firewall.ts`](../../core/firewall.ts).

## Input and flags

- `claude-wiki-pages firewall --file <path>` — decide whether a write to `<path>`
  is permitted. `--file` is required (exit `2` if absent).
- `--target <vault>` — explicit vault path (the active vault).
- `--other-vaults <a:b:c>` — colon-separated roots of OTHER registered vaults,
  blocked as `cross-vault`.
- `--json` — emit the structured `FirewallReport`.

## Modes

The mode comes from `firewall.mode` in the effective config (see
[`../config/CLAUDE.md`](../config/CLAUDE.md)):

| Mode | Behavior |
| --- | --- |
| `enforce` | Out-of-bounds writes are blocked (`allowed: false`). |
| `warn` | Never blocks — every decision returns `allowed: true`, but `matchedRule` still names the reason. |
| `off` (or `enabled: false`) | Pass-through; always allowed. |

## Decision precedence

`decide` applies rules in a fixed order, first match wins:

```text
deny  >  cross-vault  >  vault  >  allow  >  outside-vault
```

`denyPaths` and `allowPaths` come from config; the active `vault` is always
implicitly allowed; `otherVaults` is the cross-vault set. Deny globs fire even
inside the vault or an allowed root.

## Simple-glob matching + symlink safety

Globs are deliberately "simple" — `*` within a path segment, `**` across segments —
so the bash and TypeScript matchers stay in lock-step (the parity gate
`tests/gates/gate-11-firewall-parity.sh` pins them byte-for-byte). Before any
check, the target and every boundary root are reduced to their PHYSICAL path
(symlinks dereferenced, dangling leaves tolerated), so a symlink inside the vault
pointing at a sibling cannot smuggle a write out. `physicalPath` in
[`../../core/firewall.ts`](../../core/firewall.ts) mirrors `_realpath_physical` in
the bash twin exactly.

## FirewallReport

```ts
interface FirewallReport extends FirewallDecision {
  command: "firewall";
  vault: string;
  file: string;
  // from FirewallDecision:
  allowed: boolean;
  matchedRule: string; // "vault" | "deny:<glob>" | "cross-vault" | "allow:<root>" | "outside-vault" | "off" | "disabled"
  mode: FirewallMode;
}
```

The router prints `ALLOW`/`BLOCK [matchedRule] file (mode=…)` and exits `0` when
allowed, `1` when blocked.

## Edge cases

- A write target that does not yet exist (a new file) is handled — `physicalPath`
  degrades to a lexical resolve when nothing on the path exists.
- `warn` mode is advisory: `allowed` is always `true`, but `matchedRule` still
  reports the boundary that would have fired under `enforce`.
- A deny glob beats an allow root for the same path; `allowPaths` cannot
  re-open a denied or cross-vault location.

## Covered by

- [`../../core/firewall.test.ts`](../../core/firewall.test.ts) — precedence,
  simple-glob matching, symlink dereference, and the cross-vault block.

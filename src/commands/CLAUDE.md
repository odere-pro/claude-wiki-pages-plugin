# commands — the engine verbs

Each subdirectory is one engine verb dispatched by
[`../cli/cli.ts`](../cli/CLAUDE.md): `<cmd>/<cmd>.ts` exports a pure handler that
resolves the vault, does its work through [`../core/`](../core/CLAUDE.md)
primitives, and returns its own typed report. Commands stay thin — they compose
core checks and builders; they do not reimplement them. The canonical output
schema is the shared `Report` / `Finding` model in
[`../core/report.ts`](../core/report.ts); `verify` returns it directly, and the
other commands return a command-specific report type rendered uniformly by the
router. Run a verb as `claude-wiki-pages <cmd>`; add `--json` for the structured
form an agent consumes. Each `<cmd>/` carries its own `CLAUDE.md` with the local
contract.

## The ten implemented commands

| Command    | Purpose                                                      | Report type      |
| ---------- | ----------------------------------------------------------- | ---------------- |
| `verify`   | Deterministic vault integrity check (CHECK 0–5).            | `Report`         |
| `fix`      | Idempotent repair of safe structural drift.                 | `FixReport`      |
| `heal`     | Git-bounded `verify → fix → re-verify` self-heal loop.      | `HealReport`     |
| `doctor`   | Environment + vault health check (D01–D10).                 | `DoctorReport`   |
| `config`   | Show or validate the effective layered config.             | `ConfigReport`   |
| `migrate`  | Upgrade a vault's `schema_version` (additive, git-bounded). | `MigrateReport`  |
| `search`   | Deterministic full-text + frontmatter search over `wiki/`.  | `SearchReport`   |
| `firewall` | Decide whether a write to `--file` is permitted.            | `FirewallReport` |
| `backlog`  | Probe outstanding maintenance (pending raw, days since lint). | `BacklogReport`  |
| `propose`  | Review / approve / reject drafted pages in `_proposed/`.   | `ProposeReport`  |

## Conventions

- A handler takes an options object (`{ target?, ... }`) and returns a frozen
  report; the router owns all stdout and exit-code mapping.
- Vault resolution always goes through [`resolveVault`](../core/vault.ts) so
  `--target` and the four-tier default behave identically everywhere.
- Mutating verbs (`fix`, `heal`, `migrate`, `propose`) are idempotent and
  git-bounded — a checkpoint commit makes every change reversible with
  `git revert`.

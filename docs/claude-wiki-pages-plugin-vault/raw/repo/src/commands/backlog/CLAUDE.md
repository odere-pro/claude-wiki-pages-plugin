# backlog — outstanding-maintenance probe

`backlog` is the deterministic "what maintenance is outstanding?" probe: it reports
how many raw sources are still unprocessed and how long since the last lint, so the
heartbeat ([`../../../scripts/heartbeat.sh`](../../../scripts/heartbeat.sh)) and the
maintenance agent can decide whether to run the loop. It is read-only and reuses
the orchestrator's `raw_pending` definition, preferring the schema-v2 source
manifest when present so detection is O(rows) instead of re-deriving from the log.
The handler in [`backlog.ts`](./backlog.ts) reads the log and the manifest through
[`../../core/manifest.ts`](../../core/manifest.ts).

## Input and flags

- `claude-wiki-pages backlog` — probe the resolved vault.
- `--target <vault>` — explicit vault path.
- `--json` — emit the structured `BacklogReport`.

`lintEveryDays` (default 7) and `today` are injectable on the programmatic API;
the wall clock and config supply the defaults.

## How "pending" is detected

`backlog` prefers the manifest, falling back to a log-scan:

- Manifest path: parse `wiki/_sources/manifest.md` and take rows with
  `status === pending` (the manifest is built by
  [`../../core/manifest.ts`](../../core/manifest.ts), reused via
  `MANIFEST_RELATIVE` and `listRawFiles`).
- Fallback path: a raw file is processed when a source summary with the same stem
  exists under `wiki/_sources/` — the same rule the manifest generator uses — so
  the two definitions never disagree.

`lastIngest` and `lastLint` are the most recent `## [YYYY-MM-DD] <verb>` dates in
`wiki/log.md`; `daysSinceLint` is whole days from `today` to `lastLint`.

## Feeding the maintenance loop

`needsCatchup` is the single signal the heartbeat/maintenance loop reads. It is
true when any of:

- `pendingRaw.length > 0` — unprocessed raw sources exist.
- `daysSinceLint >= lintEveryDays` — lint is stale.
- `lastLint === null` and there is something to lint (`pendingRaw` non-empty or a
  prior ingest exists) — never linted but work has happened.

## Wired-source changes

When `wired_sources` records exist in `.claude/claude-wiki-pages/settings.json`
(see `scripts/wire-source.sh`), `backlog` also reports `wiredChanges`: per
wired source, the count of docs changed since its `lastSyncedCommit`
(`git diff --name-only`, filtered by the record's include/exclude globs using
the ONE glob dialect exported from [`../../core/firewall.ts`](../../core/firewall.ts)).
This is informational only — sync is manual by design, so wired changes never
flip `needsCatchup`; the heartbeat surfaces them as a `SYNC:` notice instead.
`wiredChanges` is `null` when no wired sources are registered.

## BacklogReport

```ts
interface BacklogReport {
  command: "backlog";
  vault: string;
  pendingRaw: readonly string[]; // vault-relative raw paths not yet ingested
  lastIngest: string | null;     // ISO date or null
  lastLint: string | null;
  daysSinceLint: number | null;  // null when never linted
  needsCatchup: boolean;
  wiredChanges: readonly { name: string; changed: number }[] | null;
}
```

The router prints the pending-raw count and list, last-ingest and last-lint dates,
and the catch-up verdict. Exit code is always `0` — `backlog` reports state, it
does not gate.

## Edge cases

- A vault with no `wiki/log.md` reports `never` for both dates and falls back to
  the source-stem scan for pending raw.
- A manifest with zero data rows is treated as absent, triggering the fallback.
- `raw/assets/`, dotfiles, and `.gitkeep` are excluded from the raw-file scan, so
  binary attachments never count as pending sources.

## Covered by

- [`backlog.test.ts`](./backlog.test.ts) — pending detection from manifest and from
  the fallback scan, lint-staleness thresholds, and the `needsCatchup` logic.

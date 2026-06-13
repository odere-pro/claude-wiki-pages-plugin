# ADR-0026: Bounded map-only parallel extract + host-owned scheduled upkeep

- **Status:** Accepted
- **Date:** 2026-06-13
- **Builds on:** PR #29 (string-identity alias/title resolver), [ADR-0024](./ADR-0024-host-project-intake.md) (recursive `backlog`-driven enumeration), [ADR-0018](./ADR-0018-offline-policy-and-degraded-mode-routing.md) (the `route` degrade single-home), [ADR-0010](./ADR-0010-durable-memory-carve-out.md) (the `_proposed/` review gate)
- **Supersedes-with-conditions:** [ADR-0001](./ADR-0001-four-layer-orchestrator.md) — narrows the ingest specialist's INTERNAL execution only (map-phase fan-out below the orchestrator's one-fan-out rule); the orchestrator dispatch contract (exactly one Task per invocation) is UNCHANGED. Conditions: default `maxParallelExtract=1` byte-identical; workers read-only (Read,Glob,Grep); single sequential checkpointed writer owns all dedup and the sole `wiki/log.md` append.
- **Anchor:** §5 (Layer 3 — Agents: orchestrator/ingest/maintenance specialists), §6 (Layer 1 — `raw/` immutability; `wiki/log.md` ordering)
- **Roadmap:** `tmp/plan/wiki-perf-scheduling-roadmap.md` (Decisions D1–D18)

## Context

Two measured pains, both grounded in a single observed `/wiki` session that
enriched 37 pages and added 402 backlinks in one long sequential subagent run
(~25 min wall-clock; multi-million-token burn; user screenshot 2026-06-13):

1. **Ingest is single-threaded where it need not be.** The orchestrator fans
   out exactly **one** `Task` per invocation
   (`agents/claude-wiki-pages-orchestrator-agent.md:27,77`); the ingest agent
   reads + extracts + writes every source strictly sequentially in that one
   subagent. The **read+extract** half is embarrassingly parallel; the **write**
   half (dedup, create-vs-update, `log.md` append) is not and must stay serial
   to preserve determinism and ordered provenance.

2. **Upkeep only happens when a human runs `/wiki`.** `scripts/heartbeat.sh`
   recommends but never invokes; `docs/automation.md` makes a plugin-created
   system cron a non-goal; the verified Claude Code `CronCreate` durable state
   lives in `.claude/scheduled_tasks.json` **outside the vault firewall**, so
   the plugin cannot own it. There is a `claude-wiki-pages-maintenance-agent`
   and a backlog probe, but no hands-off execution path.

Both must extend existing mechanisms without weakening a single §5
non-negotiable. A nicer feature buys no exception: determinism, structural
provenance, raw immutability, git-checkpoint rollback, ordered `wiki/log.md`,
single active vault, and DRY single-sourcing all hold unchanged.

## Decision

### Part A — Bounded map-only parallel EXTRACT (the perf win)

**A1. Parallelism lives INSIDE the already-selected ingest specialist, below
the orchestrator's one-fan-out rule.** The orchestrator still dispatches exactly
one `Task` per invocation; the ingest agent is the one that may fan out to
extract workers. The orchestrator contract
(`agents/claude-wiki-pages-orchestrator-agent.md`) is **unchanged**. (D1)

**A2. The extract worker is a SEPARATE, read-only agent file**
(`agents/claude-wiki-pages-extract-worker-agent.md`, new) whose `tools:` line is
exactly `Read, Glob, Grep` — no `Write`, no `Edit`, no `Bash`. "Workers cannot
write" is a tool-capability invariant enforced by a Tier-1 grep gate, not a
prose promise. Bash is dropped deliberately: a read-only extractor needs no
shell, and Bash can reach git or redirect to disk. (D2)

**A3. Extraction runs BEFORE the Step 1.4 plan gate.** The plan/merge-map
enumerates merged entities, so it must be fed by the parallel extraction. The
order is: extract → reconcile → Step 1.4 plan (human-approved) → sequential
write. The mandatory plan gate (Step 1.4) and the destructive Optimize gate
(Step 3) are untouched by parallelism; there is no `autoApprovePlan`. (D3, D4)

**A4. A typed EXTRACT envelope is the only thing a worker returns.** Each worker
returns `{sourceSummary, keyClaims[], entities[], concepts[], predicates[]}`
keyed to the 9 page classes and the closed enums of
`docs/vault-example/CLAUDE.md`, with claim-level `source`/`quote`/`derived`/
`confidence` so provenance survives the fan-out. The envelope carries
**extracted content only** — never a create/update verdict. Out-of-enum
candidates route to `_proposed/` with a logged reason, never written with a
guessed heading. (D5 input contract; A3 in the roadmap)

**A5. A SINGLE sequential writer owns ALL dedup/coalesce.** One writer applies
payloads in stable canonical-title / `.pendingRaw[]` order, reusing the **PR-#29
string-identity alias/title resolver** to canonicalize — never similarity, never
vectors (this is simultaneously the NO-RAG guard and the determinism mechanism).
Coalesce rule: union `sources`/`related`; `max()` confidence per the reinforce
rule; `derived:true` only if **all** contributors are derived; one page per
canonical entity; `update_count` incremented exactly once. The single writer is
the **only** appender to `wiki/log.md`. (D5, D8)

**A6. One opt-in knob: `maintenance.maxParallelExtract`.** It extends the
existing `maintenance` config block (alongside `maxPerRun`); default **1**, min
1, max 8. Default 1 is byte-identical to today. Out-of-range values **clamp** to
`[1,8]` in the schema + a `config.test.ts` range case (clamp, not fail-loud, so
a fat-fingered value degrades to sequential rather than disabling ingest). We
chose `maintenance.*` over a new `ingest.*` object on KISS/YAGNI: one additive
leaf, no new top-level surface, the same block already homes `maxPerRun`. (D6,
D7)

**A7. Degrade-to-sequential reuses the existing `route` single-home.** The
`route`/`backlog --json` surface emits
`parallelExtract:{requested,effective,reason}`. `effective` is **never >1** in
any degraded tier: `local`/`blocked`/offline/unset → `effective=1` with a reason
naming the cause; only a `claude` route yields `effective>1`. No parallel
decision mechanism is introduced. (D10)

**A8. The ship-gate is mechanical, not asserted.** Four invariants + a
determinism replay test gate the merge: (1) default-1 byte-identical golden-diff
on the reference vault; (2) the worker-frontmatter grep gate (no
Write/Edit/Bash); (3) one `snapshot pre` + one writer = one revertible unit;
(4) the single writer is the only `log.md` appender. The replay test runs at
`=1` vs `=4` with **shuffled** worker returns and asserts empty `git diff`,
identical `log.md` source order, and identical `lint-structural.sh` output.
Nothing in Theme A merges without this green. (D8)

### Part B — Host-owned scheduled upkeep

**B1. The scheduling mechanism is ONE thin host-owned helper wrapping the
EXISTING headless `/wiki` recipe — no plugin-created cron, no second write
path.** `scripts/maintenance-run.sh` (new) resolves exactly one vault, runs the
maintenance loop, and writes no cron and no vault content itself. Durable
scheduling is the **host's** OS/cloud cron invoking this helper. The plugin ships
no durable routine: `CronCreate` is session-only / 7-day-expiry / REPL-idle-only
and its durable state sits outside the firewall, so it is documented as a
session convenience with both limits stated, never the advertised path. (D11,
D12)

**B2. One unattended contract, one flag: `maintenance.unattended` (boolean,
default false).** Its semantics are a strict **subset** of the interactive
pipeline: (a) HARD-SKIP Step 3 Optimize (report "restructure needed, run
interactively"); (b) new/uncertain authoring routes to `_proposed/`, **never**
auto-promoted; (c) deterministic mechanical heal still applies directly to
`wiki/` (revertible); (d) a non-trivial topic-tree plan ABORTS cleanly to
backlog with an `ingest-aborted` log entry; (e) bounded by `maxPerRun`. There is
no `autoApprovePlan` and no `autoPromoteDrafts` setting — a negative test proves
their absence. (D13)

**B3. The uncertainty discriminator is the schema's own boundary, hard-wired.**
`derived:true` OR `confidence<0.8` routes a page to `_proposed/`. This is wired
to the schema's single-source-≥0.8 definition, not a new tunable; there is no
`autoPromoteConfidenceFloor` knob to lower the guard. (D14)

**B4. Scheduled wired-source SYNC is a separate, default-OFF opt-in:
`maintenance.syncWiredOnRun` (default false).** The default scheduled run touches
**no network**. With it on, `sync-source.sh` pulls only already-registered
remotes and writes new immutable `raw/wired/` siblings — never overwriting
`raw/`. (D15)

**B5. The ship-gate is auditability.** After an unattended run a human can answer
"what changed and can I undo it" from durable artifacts alone: one ordered
`wiki/log.md` entry tagged scheduled/autonomous with source count + the pre-run
snapshot SHA; every change inside one `snapshot pre..post` revertible range;
uncertain output in `_proposed/`. **Falsifier:** if a scheduled run can promote a
draft to `wiki/` without review, the feature is BLOCKED. (D16)

### Adopted open-question defaults (greenlit; recorded here)

- **OQ-1 — speed target ≥30% faster on K≥20 sources.** This is a documented
  goal, **NOT a CI gate**. The CI guarantee is byte-identical-at-default plus the
  read-only-worker invariant; the wall-clock floor is recorded and reported, not
  enforced as a merge gate.
- **OQ-5 — worker failure = SKIP-AND-BACKLOG.** A failed/timed-out/garbage
  worker does not abort the batch: the writer applies the validated extracts,
  reports the failed source as unprocessed backlog, and the single snapshot-post
  contains exactly the applied subset. Matches today's 25-cap-then-backlog
  semantics and preserves forward progress while staying single-checkpoint
  revertible.
- **OQ-6 — the scheduled `/wiki` routes to the maintenance-agent** (`maxPerRun`
  bound, default 10), **not** the ingest-agent's 25-source cap, when fired
  headless.
- **OQ-7 — "non-trivial topic-tree plan"** = any run that would CREATE a new
  top-level topic folder or MOVE/RENAME existing pages. The unattended path
  auto-approves only a **pure additive** plan into existing folders; anything
  non-trivial is a clean abort with an `ingest-aborted` log entry.

## Alternatives considered

- **A new `parallel-ingest-agent` or orchestrator-level fan-out.** Rejected
  (D1): forks the one-fan-out dispatch contract and re-implements ingest.
- **Reuse the ingest-agent in an "extract-only mode."** Rejected (D2): a
  subagent's tools are fixed by frontmatter, so a per-Task "mode" cannot strip
  the agent's Write/Edit — the un-racy guarantee would be prose, not mechanical.
- **Granting workers Bash.** Rejected (D2): breaks the "cannot write" claim
  (Bash reaches git and disk).
- **Any fuzzy/similarity merge in the writer.** Rejected (D5): violates NO-RAG
  and destroys determinism. String-identity only.
- **A new `ingest.*` config object + ADR for the parallel knob.** Deferred (D6):
  more surface than one knob warrants now. Revisit if a second ingest-only knob
  (e.g. `checkpointEveryNSources`, P2-A1) lands — at which point an `ingest.*`
  object + its own ADR is justified, and that ADR revisits this D6 tie.
- **A prompt-level clamp on `maxParallelExtract`.** Rejected (D7): unfalsifiable;
  the clamp lives in the schema + `config.test.ts`.
- **A `maintenance.schedule` cron-string config key.** Rejected (D11): the plugin
  has nothing that can durably consume/honor a cron string it owns.
- **In-session `CronCreate` as the advertised durable path.** Demoted (D12):
  session-only / 7-day-expiry / REPL-idle-only; documented as a convenience, not
  the supported mechanism.
- **A tunable `autoPromoteConfidenceFloor`.** Rejected (D14): YAGNI surface that
  invites a user to lower the safety guard.
- **Network sync in the default scheduled run.** Rejected (D15): the default run
  touches no network; sync is a separate, acknowledged grant.
- **An extract-cache under `vault/output/_extract-cache/`.** Vetoed (D18): a
  second source of extracted content, provenance-divergence + stale-cache risk,
  optimizing an unmeasured retry path. The existing log/manifest-based resume
  (`backlog --json` dedup) already re-extracts only never-written sources.

## Consequences

- Bounded parallelism speeds the read half of a large source drop while the
  write half stays serial — output is byte-identical at the default, and the
  feature is gated by a mechanical replay test rather than a wall-clock claim.
- A new read-only agent file is added (Layer 3); its no-write guarantee is
  enforced by tool frontmatter + a grep gate, not convention.
- Two new `maintenance.*` config leaves (`maxParallelExtract`, `unattended`) and
  one (`syncWiredOnRun`) land lockstep across the three SHAPE/DEFAULTS files
  (`config.ts` + `schema` + `default.config.json`) with `config.test.ts` cases.
  The `config.ts` mirror is NOT gate-checked — it is hand-verified in the same
  change.
- Hands-off upkeep becomes possible via host cron → `scripts/maintenance-run.sh`,
  staying opt-in, OFF by default, bounded, checkpointed, and review-gated. No
  scheduled run can promote a draft to `wiki/`.
- The orchestrator one-fan-out invariant, the `route` degrade single-home, the
  `_proposed/` review channel, and the PR-#29 resolver are all reused, not
  forked.

## Revisit when

- A second ingest-only knob is needed (e.g. `checkpointEveryNSources`): promote
  both Theme-A knobs into a new `ingest.*` object + a successor ADR (revisits D6).
- Re-extraction cost is MEASURED as the retry bottleneck: reopen the extract-cache
  with a cache-hit byte-identical test + a sha-invalidation test (revisits D18).
- A corrupt wired-source pull needs a quarantine-fraction halt threshold (OQ-4,
  the deferred P2-B1 fail-closed ontology guard).
- The measured speedup never approaches the OQ-1 goal on real corpora: re-evaluate
  whether the parallel path earns its surface at all.

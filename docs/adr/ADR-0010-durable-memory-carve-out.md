# ADR-0010: Durable-memory carve-out — a fenced, frontmatter-gated agent-session write under `raw/`

- **Status:** Accepted
- **Date:** 2026-06-05
- **SPEC anchor:** §4/§6 (Data layer, hooks), §7 (provenance); Brief §5 (raw is immutable; the carve-out must be sanctioned, not ad-hoc), §6 (one `_proposed/` channel); decisions #4, #5

## Context

Durable memory needs an agent to persist a session learning so the next session can build on it (decision #4). The structural constraint is the hard one: `raw/` is append-only and hook-protected — `scripts/protect-raw.sh` blocks every `Edit` to an existing file and every `Write` that would overwrite one, keeping the source content immutable (`rules/raw-immutable.md`). Brief §5 permits exactly one exception for this feature, and only as a **sanctioned, narrowly scoped carve-out designed with the Architect**, never an ad-hoc immutability bypass.

Two failure shapes had to be designed out. First, **provenance laundering**: if an agent could write a conclusion straight into `wiki/` as a `derived: true` page with no real source, the §7 invariant "every claim traces to `raw/` via `sources`" would be silently broken. Second, **a carve-out that widens**: a permission scoped too loosely (a marker matched anywhere in the file, a fence that admits adjacent paths) becomes a general raw-write hole. The second hazard is not hypothetical — during adversarial review a body-marker smuggle was caught, where a file declared `source_type: paper` in its frontmatter and repeated `source_type: agent-session` in its body to try to slip through. The carve-out had to be tightened to frontmatter scope in response. The design below is what shipped and was verified fail-closed across 14+ adversarial vectors by both QA-adversarial and the PM.

## Decision

Permit exactly one automated write under `raw/`, fenced and frontmatter-gated, and route the learning back into the wiki only through the existing review gate.

**1. The sanctioned carve-out (`scripts/protect-raw.sh:54-112`).** `protect-raw.sh` permits a `Write` to a **new** file whose canonical path falls under `*/<vault>/raw/agent-sessions/` **and** whose **YAML frontmatter** declares `source_type: agent-session`. The marker test is scoped to the frontmatter block only: an `extract_frontmatter` awk helper (`scripts/protect-raw.sh:89-96`) prints only the lines strictly between the first `---` and the next `---`, and requires the opening fence to be line 1 (`NR==1` guard), so a body line of the same shape never reaches the anchored grep `^source_type:[[:space:]]*agent-session[[:space:]]*$` (`scripts/protect-raw.sh:102`). Everything else fails closed:

- `Edit` under `raw/` — including under `agent-sessions/` — stays blocked (`scripts/protect-raw.sh:115-118`); a written session file is itself immutable.
- `Write` overwriting any existing `raw/` file stays blocked (`scripts/protect-raw.sh:121-124`); a re-run cannot mutate a prior learning.
- A new file inside the fence **without** a frontmatter marker is blocked (`scripts/protect-raw.sh:106-109`); the body-only marker, a frontmatter `source_type: paper`, or no frontmatter at all (`extract_frontmatter` prints nothing) all fail.
- The marker is exact: a suffix (`agent-session-evil`) or a case variant (`Agent-Session`) does not match the anchored pattern.
- A new file directly under `raw/` (outside `agent-sessions/`) gets no special power from the marker — it falls through to the ordinary human-source allow path, so dropping a real source into `raw/` is unaffected.
- A traversal (`raw/agent-sessions/../sources/x.md`) is canonicalized before the fence test (`scripts/protect-raw.sh:24-35`, `pwd -P`), so it resolves out of the fence and is blocked; the default-deny on an unresolved vault name (`scripts/protect-raw.sh:37-50`) keeps the fence from degenerating.

**2. No provenance laundering (§7).** The learning is written as a **real `type: source` file** carrying `source_type: agent-session` — a primary source artifact, not a `derived: true` wiki page. It enters the wiki only through the **one** `_proposed/` review gate (`src/commands/propose/propose.ts`): it is ingested into a `_proposed/wiki/...` draft and promoted by `propose approve` under a git checkpoint, at which point the promoted page cites the agent-session source in its `sources`. There is no path where an agent writes an unsourced conclusion. The carve-out produces a source; conclusions are still earned through ingest and review.

**3. Schema (`docs/vault-example/CLAUDE.md:88,355`).** The `source_type` enum gained `agent-session`. This is the right field — `source_type` is the "what kind of source is this" axis, and the glossary already defines `agent-session source` in those terms. The addition is additive and migration-safe: it widens a closed enum with one new permitted value, changing no existing page and adding no field, valid under `schema_version` 1 and 2 (no `migrate` needed).

**4. Trigger (decision #5).** The write hangs off **real `Stop` and `SessionEnd` hooks**, both running `scripts/session-memory.sh` (`hooks/hooks.json:99-115`). `SubagentStop` is deliberately **not** used for this — it stays the curator-lint hook (`hooks/hooks.json:85`). The hook is **idempotent per session id** (the filename embeds the session id; a second fire finds the file present and no-ops, with the overwrite block as a backstop) and **lazy**: it writes and commits the raw source only. Ingest into `_proposed/` is deferred to the next pass, where the orchestrator's state probe (ADR-0001) detects the new raw file and chains ingest. The shutdown hook stays fast — write plus commit, no full ingest at session end.

**5. Reversible and confined.** The write is git-committed using the engine's bookkeeping identity (`src/core/git.ts:42-46`, via `commit`/`ensureRepo`), so the durable-memory write-back is reversible like every other structural write (decision #4). And via S3 (ADR-0009) the write is firewall-confined to the active vault — a session learning can only land in the vault that is active, never a sibling.

**6. No TS twin.** `protect-raw.sh` is bash-only; there is no `src/core/` raw module, so the carve-out carries **no gate-11-style parity burden** (unlike the firewall twins). Its correctness is pinned by Bats and adversarial tests rather than a cross-language parity gate.

## Alternatives considered

- **A general `raw/` write bypass for agents.** Rejected — it is the ad-hoc immutability bypass Brief §5 forbids. A single fenced subpath with a frontmatter marker grants exactly the one sanctioned write and fails closed on everything else; raw immutability holds for every existing file and every other path.
- **Write the learning straight to `wiki/` as a `derived: true` page with no source.** Rejected — it launders provenance: a conclusion with no traceable origin in `raw/` violates §7. The "session learnings as unsourced `derived: true`" path stays cut; the learning is a real source that earns its wiki page through review.
- **Promote the learning into `wiki/` directly, bypassing `_proposed/`.** Rejected — it forks a second write channel and skips human-in-the-loop review, contradicting Brief §6 (one `_proposed/` channel). The agent-session source flows through the same `propose approve` gate as any draft.
- **Trigger on `SubagentStop`.** Rejected by decision #5: `SubagentStop` fires per sub-agent, not at session end, and is already the curator-lint hook. Real `Stop`/`SessionEnd` hooks are the correct session-boundary signal.
- **Match the `source_type: agent-session` marker anywhere in the file.** Rejected — this is the exact smuggle adversarial review caught (frontmatter `source_type: paper` plus a body `source_type: agent-session` line). The check is frontmatter-scoped via `extract_frontmatter`, so only the declared frontmatter type can open the fence.

## Consequences

**Positive.**

- Raw immutability holds everywhere except one fenced, frontmatter-gated, new-file-only write. Edit, overwrite, out-of-fence, no-frontmatter, body-only marker, suffix, case, and traversal all fail closed — verified across 14+ adversarial vectors.
- Provenance stays structural: the learning is a primary source, and the page that results cites it in `sources`. No unsourced conclusion can enter the wiki.
- One write channel, one review gate, one git history. Durable memory reuses the `_proposed/` gate and the git identity rather than forking parallel mechanisms; every write-back is reversible and confined to the active vault.
- The shutdown trigger is cheap and idempotent — a session id keys the file, the hook self-checks, and the overwrite block backstops it, so a session cannot double-write.

**Negative.**

- **The fence is a permanent narrow surface to defend.** Any future change to `protect-raw.sh` must preserve the frontmatter-scoped marker and the new-file-only constraint, or the smuggle reopens. Mitigated by the adversarial Bats suite that asserts each blocked vector and would fail on a regression.
- **No TS twin means the guard exists only in bash.** A consumer that bypasses the PreToolUse hook (calling the engine directly) does not get the carve-out's enforcement. Accepted: raw writes go through the tool surface the hook guards, and the engine's own writes target `wiki/`/`_proposed/`, not `raw/agent-sessions/`.
- **Lazy ingest defers the learning's appearance in the wiki** to the next pass. Accepted as the KISS tradeoff: it keeps the shutdown hook fast and routes the learning through the normal ingest→review flow rather than forcing a full ingest at session end.

## Revisit when

- The carve-out needs to admit a source kind beyond `agent-session` (e.g. a second automated writer). Outcome: a new ADR that widens the fence or the marker set deliberately, with its own adversarial vectors — never a loosening of the frontmatter-scoped check in place.
- The session-scratch handoff convention changes (how the in-session learning reaches `session-memory.sh`). Outcome: update the hook and its tests, keeping the write itself fenced, frontmatter-gated, idempotent, and git-committed.
- `Stop`/`SessionEnd` semantics change in the harness, or a single combined session-end signal emerges. Outcome: re-point the trigger to the canonical event and re-verify the per-session-id idempotency.

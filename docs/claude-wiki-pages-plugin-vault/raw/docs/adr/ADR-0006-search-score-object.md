# ADR-0006: One search score object — `score` + `matched[]` on `SearchHit`

- **Status:** Accepted
- **Date:** 2026-06-05
- **SPEC anchor:** §4 (efficient retrieval), §6 (Layer 4 — engine); Brief §6 (one score object)

## Context

`search` (`src/commands/search/search.ts`) ranks wiki pages by a transparent, fixed-weight keyword score and returns each hit as a `[[wikilink]]` so citations resolve. The headline `SearchHit.score` told a consumer *how relevant* a page was but not *why* — which signal fired, on which query term, for how many points. Three roadmap consumers need the "why":

1. **C1 budget-aware MOC descent** (`skills/query/SKILL.md`) decides how far down a topic tree to pull pages under a context budget. It needs to read the ranking and apply a cut-off — without computing a second ranking of its own.
2. **Tier-2 wiki-native recall** (synonym/stem expansion, ADR-0007) adds new ways a page can match. Each must be *visible* in the breakdown so a synonym-matched hit's lower rank is explainable, not mysterious.
3. **R2 graph traversal** (ADR-0008) surfaces structurally-adjacent pages. Each graph reach must also be attributable.

Without a single, shared score object, each of these would either re-derive its own relevance number (a second ranker — the failure Brief §6 forbids) or fly blind on an opaque scalar. The roadmap routes all of them through **one** object: `score` plus a structured `matched[]` breakdown, emitted once by `search`, read by everyone else. The risk to manage is twofold — keep the breakdown *honest* (it must fully account for the score, or it is decorative) and keep it *out of the verify-parity surface* (the human text renderer is line-for-line pinned to the bash verifiers by gate-05, and `SearchHit` rendering must not perturb that).

## Decision

Add one additive field to `SearchHit` — `matched: readonly MatchComponent[]` — and make it the single shared score object. `MatchComponent` is the atom of the breakdown (`src/commands/search/search.ts`):

```text
MatchComponent { channel; term; hits; points }
SearchHit { title; wikilink; file; type; score; snippet; matched }
```

- **`channel`** is a closed union naming the signal that fired: `title-phrase | title-term | alias-term | tag-term | body-term | synonym-term | stem-term | graph-edge` (`src/commands/search/search.ts:42-50`). `alias-term` is reserved (a future alias/title split); `synonym-term`/`stem-term` are emitted by Tier-2 (ADR-0007); `graph-edge` by R2 (ADR-0008).
- **`term`** carries the original query term that fired the component (empty for the whole-phrase channel); `hits` is the pre-cap match count; `points` is the post-weight contribution.
- **The hard invariant:** `score === matched.reduce((s, m) => s + m.points, 0)` (`src/commands/search/search.ts:71`). Every `score +=` in the scoring loop is paired with one `components.push(...)`, so the breakdown fully accounts for the score by construction. This is what makes it honest rather than decorative.
- **Determinism / ordering:** components are sorted by a total order — points descending, then a fixed channel precedence (`CHANNEL_ORDER`, `src/commands/search/search.ts:146-155`), then term lexicographically. The channel precedence lists exact channels first, then synonym, then stem, then `graph-edge` last (weakest), so a tie resolves toward the stronger signal. Same vault + same query → byte-identical `matched[]`.
- **JSON-only.** `matched[]` is emitted in the engine's JSON output and is **never** printed in `search`'s human text path. It is structurally outside gate-05's surface: that gate pins `renderText(Report)` (`src/core/report.ts`) to the bash verifiers, and `SearchHit` is a separate model with its own JSON stdout path in `src/cli/cli.ts` — it has no bash twin and `renderText` never sees it. So the breakdown cannot break verify-parity.

Consumers read this one object and never mint a competing one:

- **C1** reads `score` (the rank key) and `matched[]` (for cut-off explanation), and takes a **score-ordered prefix under a budget** — it may drop pages below a threshold but must not re-weight `points` or reorder by a new key. It consumes the ranking; it does not produce a second one.
- **Tier-2 and R2** *augment* the same object: they append components on their channels at strictly lower fixed weights, and the `score === sum(points)` invariant continues to hold.

## Alternatives considered

- **A flat `matched: Record<channel, number>` map (channel → points).** Rejected. It collapses the *term* dimension: a consumer could see "title-term: 5" but not *which* query term hit the title versus which only appeared in the body. C1's tie-aware inclusion and R3's agent-facing explanation both need per-term attribution. An array of `{channel, term, hits, points}` is the minimal shape that explains every point *and* is deterministically orderable, and it mirrors the existing `Finding[]` pattern in `src/core/report.ts`.
- **Let each consumer compute its own relevance score.** Rejected outright — it is the "second source of truth / second ranker" failure Brief §6 exists to prevent. Two subsystems would disagree on "most relevant" the first time a weight changed. One ranker (`search`), one weight table, one breakdown shape; everyone else filters and explains using it.
- **Render `matched[]` in the human text output too (a compact form).** Rejected as the default. A per-component dump is noise for a human skimming a ranked list, and — more importantly — routing it anywhere near `src/core/report.ts:renderText` risks the gate-05 line-for-line parity. If an on-demand human form is ever wanted, the right surface is an explicit `--explain` flag on `search`, never the default render.
- **A separate parallel `breakdown` object keyed by hit id, outside `SearchHit`.** Rejected. It splits the hit from its explanation across two structures that must be kept in sync — a needless second source of truth. The breakdown belongs on the hit it explains.

## Consequences

**Positive.**

- One score object. C1's descent, Tier-2's recall, and R2's graph all read and extend the same `score` + `matched[]`. A weight or channel change happens in one place (`src/commands/search/search.ts`) and every consumer follows.
- The breakdown is honest by construction: `score === sum(points)` is a single testable assertion that catches any future double-count or orphan-point regression.
- It stays out of the verify-parity blast radius. `matched[]` lives on `SearchHit`, which `renderText` never touches, so gate-05 is untouched — the JSON-only discipline is structural, not a fragile suppression.
- The closed `channel` union with a fixed `CHANNEL_ORDER` makes ties deterministic and reserves slots (`alias-term`, and later `graph-edge`) so downstream items widen the union additively instead of churning it.

**Negative.**

- **`matched[]` is now load-bearing for downstream cut-offs.** C1 and R3 depend on its shape and on the `score === sum(points)` invariant; a change that drops the pairing of `score +=` with a `components.push` would silently break them. Mitigated by the invariant test (every hit: score equals the sum of its component points) that gates the engine.
- **A union to maintain.** Each recall lever adds a channel value. Accepted: additions are a union widening plus one `CHANNEL_ORDER` entry — no field change, no consumer break — and the ordering rule fixes where a new channel sits relative to the others.
- **`hits` semantics vary slightly by channel** (occurrence count for body, `1` for title/tag, and later hop-distance for `graph-edge`). Mitigated by documenting the per-channel meaning at the channel site so a reader does not assume occurrence-count everywhere.

## Revisit when

- A consumer needs a signal the breakdown cannot express (e.g. position-in-document weighting). Outcome: add a `MatchComponent` field additively and update the invariant test, rather than introducing a parallel structure.
- The channel union grows past comfortable readability. Outcome: group channels (exact / expansion / structural) behind a `kind` discriminator while keeping the single object.
- A second retrieval surface emerges that wants the score object without the rest of `SearchHit`. Outcome: factor a `Scored` interface (`score` + `matched`) that both `SearchHit` and the new surface implement, preserving the single-object contract.

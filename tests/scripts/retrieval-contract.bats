#!/usr/bin/env bats
# Tests for R3 — agent-vs-human retrieval contract.
#
# Both skills/search/SKILL.md and skills/query/SKILL.md must explicitly document:
#
#   R3-S-01  search SKILL.md names the agent path: `search --json` is the
#            machine-actionable contract; agents consume `score` + full `matched[]`
#            breakdown (every channel) + `[[wikilink]]` for citation.
#   R3-S-02  search SKILL.md states the agent path is deterministic:
#            same query + vault + lexicon → byte-identical output.
#   R3-S-03  search SKILL.md names the human path: the text render (without
#            --json) produces a clean ranked list of `[[wikilinks]]` with scores.
#   R3-S-04  search SKILL.md states that `matched[]` is JSON-only — never emitted
#            in the human text render.
#   R3-S-05  search SKILL.md states the "one score object" invariant: both paths
#            read the SAME ranking; neither path re-ranks.
#
#   R3-Q-01  query SKILL.md names the agent path: C1 reads `search --json` output
#            (score + matched[] + wikilink) for budget-aware MOC descent.
#   R3-Q-02  query SKILL.md states the no-re-rank invariant (already C1-03, but
#            the R3 contract must name it as the "one score object" shared
#            between the agent and human paths).
#   R3-Q-03  query SKILL.md states that the human path renders the ranked list
#            without `matched[]`.
#   R3-Q-04  query SKILL.md references that both paths read the SAME score —
#            only the consumption form differs (structured vs rendered).
#
# All tests grep the Markdown skill files directly — no engine or vault needed.

load '../test_helper/common'

SEARCH_SKILL="$REPO_ROOT/skills/search/SKILL.md"
QUERY_SKILL="$REPO_ROOT/skills/query/SKILL.md"

# ---------------------------------------------------------------------------
# R3-S-01: agent path named in search SKILL.md
# ---------------------------------------------------------------------------

@test "R3-S-01: search SKILL.md names the agent path (search --json + matched[] + wikilink)" {
  # Must mention the agent path explicitly
  run grep -iE "agent path|agent.path" "$SEARCH_SKILL"
  assert_success
  # Must tie the agent path to --json (case-insensitive for heading/body)
  run grep -iE "agent.{0,40}--json|--json.{0,40}agent" "$SEARCH_SKILL"
  assert_success
  # Must mention matched[] in the agent path context (case-insensitive)
  run grep -iE "agent.{0,80}matched|matched.{0,80}agent" "$SEARCH_SKILL"
  assert_success
}

# ---------------------------------------------------------------------------
# R3-S-02: deterministic claim in search SKILL.md
# ---------------------------------------------------------------------------

@test "R3-S-02: search SKILL.md states the agent path is deterministic (same query+vault+lexicon)" {
  # "deterministic" or "byte-identical" must appear in the R3 section context
  run grep -iE "determin|byte.identical" "$SEARCH_SKILL"
  assert_success
  # Specifically for the R3 contract: same query → same ranking
  run grep -iE "same query|same.+vault|same.+lexicon" "$SEARCH_SKILL"
  assert_success
}

# ---------------------------------------------------------------------------
# R3-S-03: human path named in search SKILL.md
# ---------------------------------------------------------------------------

@test "R3-S-03: search SKILL.md names the human path (clean ranked list without --json)" {
  # Must mention the human path
  run grep -iE "human path|human.path" "$SEARCH_SKILL"
  assert_success
  # Human path = text render (ranked list)
  run grep -iE "human.{0,80}ranked|ranked.{0,80}human|human.{0,80}text|text.{0,80}render" "$SEARCH_SKILL"
  assert_success
}

# ---------------------------------------------------------------------------
# R3-S-04: matched[] is JSON-only in search SKILL.md
# ---------------------------------------------------------------------------

@test "R3-S-04: search SKILL.md states matched[] is JSON-only (never in human render)" {
  # "JSON-only" must be present
  run grep -iE "json.only|JSON-only" "$SEARCH_SKILL"
  assert_success
  # And it must state matched[] is not shown to humans
  run grep -iE "matched.{0,60}(never|not|no).{0,60}(human|render|text)|human.{0,60}(never|not|no).{0,60}matched" "$SEARCH_SKILL"
  assert_success
}

# ---------------------------------------------------------------------------
# R3-S-05: one score object — neither path re-ranks in search SKILL.md
# ---------------------------------------------------------------------------

@test "R3-S-05: search SKILL.md states the one-score-object invariant (same ranking, neither re-ranks)" {
  # Must mention one score object or single score
  run grep -iE "one score|single score|one.score.object|same.ranking|same ranking" "$SEARCH_SKILL"
  assert_success
  # Must explicitly state neither path re-ranks
  run grep -iE "neither.{0,40}re.rank|re.rank.{0,40}neither|does not re.rank|no re.rank|never re.rank" "$SEARCH_SKILL"
  assert_success
}

# ---------------------------------------------------------------------------
# R3-Q-01: agent path named in query SKILL.md
# ---------------------------------------------------------------------------

@test "R3-Q-01: query SKILL.md names the agent path (C1 reads search --json: score+matched[]+wikilink)" {
  # C1 must be tied to search --json
  run grep -E "search.*--json|--json" "$QUERY_SKILL"
  assert_success
  # Agent path or C1 must read matched[]
  run grep -iE "agent.{0,80}path|agent path" "$QUERY_SKILL"
  assert_success
  # matched[] must be mentioned as something C1 reads
  run grep -iE "matched" "$QUERY_SKILL"
  assert_success
}

# ---------------------------------------------------------------------------
# R3-Q-02: no-re-rank / one score object in query SKILL.md
# ---------------------------------------------------------------------------

@test "R3-Q-02: query SKILL.md states the one-score-object no-re-rank invariant" {
  # Already partially covered by C1-03 in query-descent.bats, but R3 contract
  # must explicitly connect it to "one score object" shared between paths.
  run grep -iE "one.score.object|one score object|same score|shared.*score|score.*shared" "$QUERY_SKILL"
  assert_success
  # no-re-rank must be stated
  run grep -iE "no.re.rank|never re.rank|not re.rank|does not re.rank" "$QUERY_SKILL"
  assert_success
}

# ---------------------------------------------------------------------------
# R3-Q-03: human path (no matched[]) in query SKILL.md
# ---------------------------------------------------------------------------

@test "R3-Q-03: query SKILL.md states the human path renders ranked list without matched[]" {
  # Human path mentioned
  run grep -iE "human path|human.path" "$QUERY_SKILL"
  assert_success
  # Human path does not include matched[]
  run grep -iE "human.{0,80}(not|no|never|without).{0,40}matched|matched.{0,80}(not|no|never).{0,40}human" "$QUERY_SKILL"
  assert_success
}

# ---------------------------------------------------------------------------
# R3-Q-04: both paths read the same score in query SKILL.md
# ---------------------------------------------------------------------------

@test "R3-Q-04: query SKILL.md states both paths read the same score (one ranking, two forms)" {
  # "both paths" or equivalent phrasing
  run grep -iE "both paths|both.path|one ranking|same ranking|same score" "$QUERY_SKILL"
  assert_success
  # The distinction: agent gets structured form, human gets rendered form
  run grep -iE "structured.{0,40}(form|output)|rendered.{0,40}(form|output)|(agent|human).{0,40}(structured|rendered)" "$QUERY_SKILL"
  assert_success
}

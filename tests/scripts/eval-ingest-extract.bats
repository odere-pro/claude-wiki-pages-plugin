#!/usr/bin/env bats
# Tests for scripts/eval-ingest-extract.sh — the local-model quality-gate eval
# driver for the `ingest-extract` tier (docs/plan/0003-local-model-quality-gate.md).
#
# This builds the MEASUREMENT APPARATUS only. It is MODEL-NEUTRAL: nothing here
# wires up Ollama or any local model, makes a network call, or flips a default.
# Scoring is EXACT STRUCTURAL comparison to a checked-in gold reference — never
# embeddings/vector/similarity (§5 NO-RAG absolute).
#
# Behavior under test (mirrors the gate-13 --self-test fail-closed contract):
#   - --self-test PASSES a known-good candidate that meets the calibrated bar.
#   - --self-test FAILS (exit non-zero) when a planted-bad candidate is NOT
#     caught: respectively a fabricated sourced claim, claims dropped below the
#     0.97 fidelity bar, and schema-invalid frontmatter.
#   - Any internal grep/scoring error is FATAL (rc>=2), never swallowed — the
#     gate must not be able to fail-open the way gate-13 originally did.
#   - --score on the known-good case against its own gold reference verdicts PASS.
#   - --score on the provenance-trap candidate that fabricates a sourced claim
#     verdicts FAIL on the zero-fabrication floor regardless of the aggregate.
#   - The eval path scores AS EMITTED — no auto-repair/fix/heal first.
#
# TDD: these tests were authored BEFORE the driver existed (RED). The first run
# fails because scripts/eval-ingest-extract.sh is absent; implementing the
# driver + fixtures turns them GREEN.

load '../test_helper/common'

setup() {
  _load_helpers
  DRIVER="$REPO_ROOT/scripts/eval-ingest-extract.sh"
  CASES="$REPO_ROOT/tests/eval/ingest-extract/cases"
}

# ---------------------------------------------------------------------------
# The driver exists and is executable (the RED → GREEN boundary).
# ---------------------------------------------------------------------------

@test "eval-ingest-extract: driver script exists" {
  [ -f "$DRIVER" ]
}

# ---------------------------------------------------------------------------
# Self-test mode: the driver proves its own enforcement is live (fail-closed).
# Mirrors gate-13 --self-test.
# ---------------------------------------------------------------------------

@test "eval-ingest-extract: --self-test passes (planted-bad candidates are all caught)" {
  run bash "$DRIVER" --self-test
  assert_success
  assert_output_contains "fabricated sourced claim is caught"
  assert_output_contains "dropped claims are caught"
  assert_output_contains "schema-invalid frontmatter is caught"
  assert_output_contains "known-good candidate passes"
  assert_output_contains "self-test passed"
}

# ---------------------------------------------------------------------------
# The model step is NOT required to build or test the apparatus.
# --self-test must run with no local model configured.
# ---------------------------------------------------------------------------

@test "eval-ingest-extract: --self-test needs no configured local model" {
  run env -u CLAUDE_WIKI_PAGES_EVAL_MODEL bash "$DRIVER" --self-test
  assert_success
  assert_output_contains "self-test passed"
}

# ---------------------------------------------------------------------------
# Fixtures exist: at least one good case and one provenance-trap case.
# ---------------------------------------------------------------------------

@test "eval-ingest-extract: golden-set good case fixture exists with gold scorecard" {
  [ -f "$CASES/extract-basic/input.md" ]
  [ -d "$CASES/extract-basic/expected/wiki" ]
  [ -f "$CASES/extract-basic/expected.scores.json" ]
}

@test "eval-ingest-extract: provenance-trap case fixture exists with gold scorecard" {
  [ -f "$CASES/provenance-trap/input.md" ]
  [ -d "$CASES/provenance-trap/expected/wiki" ]
  [ -f "$CASES/provenance-trap/expected.scores.json" ]
}

# ---------------------------------------------------------------------------
# --score on a candidate that equals its gold reference verdicts PASS.
# (The gold reference IS, by construction, a perfect extraction.)
# ---------------------------------------------------------------------------

@test "eval-ingest-extract: --score of the gold reference against itself PASSES the bar" {
  run bash "$DRIVER" --score "$CASES/extract-basic/expected" --gold "$CASES/extract-basic/expected"
  assert_success
  assert_output_contains "PASS"
}

@test "eval-ingest-extract: --score emits a JSON scorecard with the four rates" {
  run bash "$DRIVER" --score "$CASES/extract-basic/expected" --gold "$CASES/extract-basic/expected" --json
  assert_success
  # The four calibrated rates must all be present as JSON keys.
  assert_output_contains "schema_validity"
  assert_output_contains "claim_source_fidelity"
  assert_output_contains "frontmatter_field_accuracy"
  assert_output_contains "dedup_correctness"
  assert_output_contains "fabricated_sourced_claims"
  assert_output_contains "verdict"
  # It must be parseable JSON with a pass verdict.
  echo "$output" | jq -e '.verdict == "pass"'
}

# ---------------------------------------------------------------------------
# Zero-fabrication floor: a candidate that INVENTS a sourced claim FAILS the
# tier even though every other rate is perfect. This is the provenance-trap.
# ---------------------------------------------------------------------------

@test "eval-ingest-extract: a candidate fabricating a sourced claim FAILS on the zero-fabrication floor" {
  run bash "$DRIVER" --score "$CASES/provenance-trap/candidate-fabricates" --gold "$CASES/provenance-trap/expected" --json
  # Non-zero verdict exit (1) — failed the tier.
  assert_status 1
  assert_output_contains "fabricated"
  echo "$output" | jq -e '.verdict == "fail"'
  echo "$output" | jq -e '.fabricated_sourced_claims >= 1'
}

# ---------------------------------------------------------------------------
# Dropped claims below the 0.97 fidelity bar FAIL the tier.
# ---------------------------------------------------------------------------

@test "eval-ingest-extract: a candidate dropping claims below 0.97 fidelity FAILS" {
  run bash "$DRIVER" --score "$CASES/provenance-trap/candidate-drops" --gold "$CASES/provenance-trap/expected" --json
  assert_status 1
  echo "$output" | jq -e '.verdict == "fail"'
  echo "$output" | jq -e '.claim_source_fidelity < 0.97'
}

# ---------------------------------------------------------------------------
# FINDING 1 regression — the latent comm/locale fail-open of the FABRICATION
# FLOOR. candidate-order-divergent plants a lowercase-initial, order-divergent
# fabricated quote that would have aborted GNU comm on CI (en_US.UTF-8,
# case-insensitive collation) and — with the old `|| true` swallow — silently
# zeroed the floor. The order/locale-independent set diff must catch it under
# ANY locale.
# ---------------------------------------------------------------------------

@test "eval-ingest-extract: order-divergent fixture exists (the Finding-1 regression case)" {
  [ -f "$CASES/provenance-trap/candidate-order-divergent/wiki/tools/obsidian.md" ]
}

@test "eval-ingest-extract: order-divergent fabrication is caught under C locale (floor holds)" {
  run env LC_ALL=C bash "$DRIVER" --score "$CASES/provenance-trap/candidate-order-divergent" --gold "$CASES/provenance-trap/expected" --json
  assert_status 1
  echo "$output" | jq -e '.verdict == "fail"'
  echo "$output" | jq -e '.fabricated_sourced_claims >= 1'
}

@test "eval-ingest-extract: order-divergent fabrication is caught under en_US.UTF-8 (CI-divergent collation) — the pre-fix repro now fails closed" {
  run env LC_ALL=en_US.UTF-8 bash "$DRIVER" --score "$CASES/provenance-trap/candidate-order-divergent" --gold "$CASES/provenance-trap/expected" --json
  assert_status 1
  echo "$output" | jq -e '.verdict == "fail"'
  echo "$output" | jq -e '.fabricated_sourced_claims >= 1'
}

# ---------------------------------------------------------------------------
# EMPTY-GOLD / DEGENERATE-INPUT regression — the second floor fail-open.
# count_set_diff once misclassified ALL of file_a into b[] when file_b (the gold)
# was empty (the FNR==NR empty-first-file bug), silently zeroing the fabrication
# count; combined with the den==0 ratio free-pass, an empty gold GUARANTEED a
# pass. Fixed by (a) an explicit getline load of set B and (b) a fatal empty-gold
# guard in score_candidate. These tests lock both down.
# ---------------------------------------------------------------------------

# Build a claimless gold ($EMPTY_GOLD) by copying the real gold and stripping
# every source_quotes block. Also build an empty-claim candidate ($EMPTY_CAND).
_make_degenerate_vaults() {
  EMPTY_GOLD="$(mktemp -d "${BATS_TEST_TMPDIR:-/tmp}/empty-gold.XXXXXX")"
  EMPTY_CAND="$(mktemp -d "${BATS_TEST_TMPDIR:-/tmp}/empty-cand.XXXXXX")"
  cp -R "$CASES/provenance-trap/expected/." "$EMPTY_GOLD/"
  cp -R "$CASES/provenance-trap/expected/." "$EMPTY_CAND/"
  local v f
  for v in "$EMPTY_GOLD" "$EMPTY_CAND"; do
    while IFS= read -r f; do
      awk '
        /^source_quotes:/ { print "source_quotes: []"; instq = 1; next }
        instq { if ($0 ~ /^[A-Za-z_]/) { instq = 0 } else { next } }
        { print }
      ' "$f" >"$f.tmp" && mv "$f.tmp" "$f"
    done < <(find "$v/wiki" -name '*.md' -type f)
  done
  export EMPTY_GOLD EMPTY_CAND
}

_teardown_degenerate_vaults() {
  [ -n "${EMPTY_GOLD:-}" ] && rm -rf "$EMPTY_GOLD"
  [ -n "${EMPTY_CAND:-}" ] && rm -rf "$EMPTY_CAND"
  unset EMPTY_GOLD EMPTY_CAND
}

@test "eval-ingest-extract: count_set_diff counts ALL of file_a when file_b (gold) is empty (the empty-first-file bug)" {
  # Unit test of the helper: empty file_b, file_a has 2 distinct lines.
  # only_a (the fabricated count) MUST be 2, never 0.
  local a b
  a="$(mktemp "${BATS_TEST_TMPDIR:-/tmp}/csd-a.XXXXXX")"
  b="$(mktemp "${BATS_TEST_TMPDIR:-/tmp}/csd-b.XXXXXX")"
  printf 'line one\nline two\n' >"$a"
  : >"$b" # empty file_b (the gold)
  run bash -c "source '$DRIVER'; count_set_diff only_a '$a' '$b'"
  assert_success
  assert_output "2"
  # both/only_b sanity on the same empty-B input.
  run bash -c "source '$DRIVER'; count_set_diff both '$a' '$b'"
  assert_output "0"
}

@test "eval-ingest-extract: count_set_diff collapses duplicate lines (distinct-set semantics)" {
  local a b
  a="$(mktemp "${BATS_TEST_TMPDIR:-/tmp}/csd-a.XXXXXX")"
  b="$(mktemp "${BATS_TEST_TMPDIR:-/tmp}/csd-b.XXXXXX")"
  printf 'x\nx\n' >"$a"
  : >"$b"
  run bash -c "source '$DRIVER'; count_set_diff only_a '$a' '$b'"
  assert_output "1"
}

@test "eval-ingest-extract: DECISIVE REPRO — a fabricating candidate vs an empty-claim gold FAILS CLOSED (die rc 2) under C locale" {
  _make_degenerate_vaults
  run env LC_ALL=C bash "$DRIVER" --score "$CASES/provenance-trap/candidate-fabricates" --gold "$EMPTY_GOLD"
  _teardown_degenerate_vaults
  # Must die (rc 2) — NOT pass (rc 0). This is the regression that fail-opened.
  assert_status 2
  refute_output_contains "PASS"
  assert_output_contains "no sourced claims"
}

@test "eval-ingest-extract: DECISIVE REPRO — fabricating candidate vs empty-claim gold FAILS CLOSED under en_US.UTF-8 too" {
  _make_degenerate_vaults
  run env LC_ALL=en_US.UTF-8 bash "$DRIVER" --score "$CASES/provenance-trap/candidate-fabricates" --gold "$EMPTY_GOLD"
  _teardown_degenerate_vaults
  assert_status 2
  refute_output_contains "PASS"
}

@test "eval-ingest-extract: an empty-claim candidate vs a real gold FAILS (all gold dropped, not a silent pass)" {
  _make_degenerate_vaults
  run bash "$DRIVER" --score "$EMPTY_CAND" --gold "$CASES/provenance-trap/expected" --json
  _teardown_degenerate_vaults
  assert_status 1
  echo "$output" | jq -e '.verdict == "fail"'
  echo "$output" | jq -e '.claim_source_fidelity == 0'
  echo "$output" | jq -e '.dropped_claims == .gold_claims'
}

@test "eval-ingest-extract: empty candidate AND empty gold both → die rc 2 (no silent pass on degenerate-both)" {
  _make_degenerate_vaults
  run bash "$DRIVER" --score "$EMPTY_CAND" --gold "$EMPTY_GOLD"
  _teardown_degenerate_vaults
  assert_status 2
  refute_output_contains "PASS"
}

# ---------------------------------------------------------------------------
# Schema-invalid frontmatter (as emitted) FAILS schema-validity.
# The eval path must NOT auto-repair before scoring.
# ---------------------------------------------------------------------------

@test "eval-ingest-extract: a candidate with schema-invalid frontmatter FAILS schema-validity (no auto-repair)" {
  run bash "$DRIVER" --score "$CASES/provenance-trap/candidate-bad-schema" --gold "$CASES/provenance-trap/expected" --json
  assert_status 1
  echo "$output" | jq -e '.verdict == "fail"'
  echo "$output" | jq -e '.schema_validity < 0.98'
}

# ---------------------------------------------------------------------------
# Fail-closed on internal error: an unreadable/garbage candidate path must NOT
# silently verdict PASS. A missing candidate is a usage error (rc 2), never a
# fail-open pass.
# ---------------------------------------------------------------------------

@test "eval-ingest-extract: a missing candidate path is a fatal usage error, never a fail-open pass" {
  run bash "$DRIVER" --score "$REPO_ROOT/tests/eval/ingest-extract/does-not-exist" --gold "$CASES/extract-basic/expected"
  assert_status 2
  refute_output_contains "PASS"
}

# ---------------------------------------------------------------------------
# The driver and its fixtures contain ZERO embedding/vector/fetch/similarity
# tokens on the scoring path (§5 NO-RAG). Exact structural comparison only.
# ---------------------------------------------------------------------------

@test "eval-ingest-extract: scoring path has no embedding/vector/fetch/similarity tokens" {
  # Code lines only (strip comments) so prose like 'never vector similarity' in
  # a docstring does not trip this; real code must be clean.
  run grep -nE 'fetch\(|embedding|[^a-z]vector|cosine|similarity|\.embed\(' "$DRIVER"
  # Filter out comment-only lines (leading # after the line:col prefix).
  local hits
  hits="$(printf '%s\n' "$output" | grep -vE '^[0-9]+:[[:space:]]*#' || true)"
  if [ -n "$hits" ]; then
    printf 'forbidden NO-RAG token on scoring path:\n%s\n' "$hits" >&2
    return 1
  fi
}

# ---------------------------------------------------------------------------
# Usage / help.
# ---------------------------------------------------------------------------

@test "eval-ingest-extract: --help prints usage and exits 0" {
  run bash "$DRIVER" --help
  assert_success
  assert_output_contains "ingest-extract"
  assert_output_contains "--self-test"
  assert_output_contains "--score"
  assert_output_contains "--stamp"
  assert_output_contains "--verify-artifact"
}

# ---------------------------------------------------------------------------
# FINDING 3 — the rounding edge. meets_ratio compares on raw counts via exact
# integer cross-multiplication, so a value strictly below a bar can NEVER round
# onto it. Sourcing the driver loads the pure helper without running main
# (BASH_SOURCE guard). 0.96999 must FAIL the 0.97 bar even though printf %.4f
# rounds it to "0.9700"; exact 0.97 must PASS.
# ---------------------------------------------------------------------------

@test "eval-ingest-extract: meets_ratio rejects a strictly-below value that would round onto the bar (Finding 3)" {
  run bash -c "source '$DRIVER'; meets_ratio 96999 100000 0.97"
  assert_status 1
}

@test "eval-ingest-extract: meets_ratio accepts an exactly-on-bar value" {
  run bash -c "source '$DRIVER'; meets_ratio 97 100 0.97"
  assert_success
}

@test "eval-ingest-extract: the old printf rounding would have displayed 0.96999 as 0.9700 (the bug being prevented)" {
  # Proves the display rounds up — which is WHY the verdict must use raw counts.
  run bash -c "source '$DRIVER'; ratio 96999 100000"
  assert_output_contains "0.9700"
}

# ---------------------------------------------------------------------------
# Model-neutrality guard: the driver wires up NO local model and NO network.
# It must not reference ollama/curl/wget/http on any executable line.
# ---------------------------------------------------------------------------

@test "eval-ingest-extract: driver wires up no local model and no network (model-neutral)" {
  run grep -niE 'ollama|curl |wget |http://|https://|nc -|/api/' "$DRIVER"
  local hits
  hits="$(printf '%s\n' "$output" | grep -vE '^[0-9]+:[[:space:]]*#' || true)"
  if [ -n "$hits" ]; then
    printf 'model/network reference on an executable line:\n%s\n' "$hits" >&2
    return 1
  fi
}

# ---------------------------------------------------------------------------
# FINDING 2 — the measured-run artifact (PM condition #3), enforced in CODE.
# --stamp emits the metric block + thresholds stamped with model_id,
# golden_set_sha (git tree id of the golden set), and a UTC timestamp.
# --verify-artifact re-derives the sha, re-runs --score, and asserts the
# recorded verdict + metrics reproduce — failing closed on any drift or missing
# field. The golden_set_sha is a committed tree id, so these run inside a
# throwaway COMMITTED repo containing the driver, its script deps, src/core, and
# the golden set (mirrors setup_isolated_repo).
# ---------------------------------------------------------------------------

# Build a committed isolated repo and export $EVAL_REPO. Skips the test if bun is
# unavailable (the driver needs it to extract claim pairs).
_setup_eval_artifact_repo() {
  if ! command -v bun >/dev/null 2>&1; then
    skip "bun not available — artifact stamping needs the frontmatter parser"
  fi
  EVAL_REPO="$(mktemp -d "${BATS_TEST_TMPDIR:-/tmp}/eval-artifact.XXXXXX")"
  mkdir -p "$EVAL_REPO/scripts" "$EVAL_REPO/src" "$EVAL_REPO/tests/eval" \
    "$EVAL_REPO/skills/init/template"
  cp "$REPO_ROOT/scripts/eval-ingest-extract.sh" \
    "$REPO_ROOT/scripts/verify-ingest.sh" \
    "$REPO_ROOT/scripts/validate-frontmatter.sh" \
    "$REPO_ROOT/scripts/resolve-vault.sh" "$EVAL_REPO/scripts/"
  cp -R "$REPO_ROOT/src/core" "$EVAL_REPO/src/"
  # validate-frontmatter.sh falls back to the bundled runtime schema template
  # (skills/init/template/CLAUDE.md) for its required-fields table when a target
  # vault has none (ADR-0014 §A.6). Mirror the real runtime layout (scripts/ and
  # skills/ are siblings under the plugin root) so the fallback resolves here.
  cp "$REPO_ROOT/skills/init/template/CLAUDE.md" "$EVAL_REPO/skills/init/template/"
  # The engine frontmatter parser imports the 'yaml' package; let bun resolve it
  # from the real node_modules via a symlink (no install in the test).
  if [ -d "$REPO_ROOT/node_modules" ]; then
    ln -s "$REPO_ROOT/node_modules" "$EVAL_REPO/node_modules"
  fi
  cp -R "$REPO_ROOT/tests/eval/ingest-extract" "$EVAL_REPO/tests/eval/"
  (
    cd "$EVAL_REPO" || exit 1
    git init -q
    git config user.email test@example.com
    git config user.name Test
    git config commit.gpgsign false
    git config tag.gpgsign false
    git config core.hooksPath /dev/null
    git add -A
    git commit -q -m init
  )
  export EVAL_REPO
}

_teardown_eval_artifact_repo() {
  if [ -n "${EVAL_REPO:-}" ] && [ -d "$EVAL_REPO" ]; then
    rm -rf "$EVAL_REPO"
  fi
  unset EVAL_REPO
}

@test "eval-ingest-extract: --stamp emits a complete measured-run artifact (model_id + golden_set_sha + recorded_at)" {
  _setup_eval_artifact_repo
  local good="tests/eval/ingest-extract/cases/extract-basic/expected"
  run bash -c "cd '$EVAL_REPO' && bash scripts/eval-ingest-extract.sh --stamp --score '$good' --gold '$good' --model-id 'ollama:test-llama'"
  _teardown_eval_artifact_repo

  assert_success
  # All required artifact fields must be present and non-null.
  echo "$output" | jq -e '.model_id == "ollama:test-llama"'
  echo "$output" | jq -e '.golden_set_sha | type == "string" and (. | length) >= 7'
  echo "$output" | jq -e '.recorded_at | test("^[0-9]{4}-[0-9]{2}-[0-9]{2}T")'
  echo "$output" | jq -e '.verdict == "pass"'
  echo "$output" | jq -e 'has("schema_validity") and has("thresholds")'
}

@test "eval-ingest-extract: --stamp picks up the model id from CLAUDE_WIKI_PAGES_EVAL_MODEL" {
  _setup_eval_artifact_repo
  local good="tests/eval/ingest-extract/cases/extract-basic/expected"
  run bash -c "cd '$EVAL_REPO' && CLAUDE_WIKI_PAGES_EVAL_MODEL='env:model-x' bash scripts/eval-ingest-extract.sh --stamp --score '$good' --gold '$good'"
  _teardown_eval_artifact_repo

  assert_success
  echo "$output" | jq -e '.model_id == "env:model-x"'
}

@test "eval-ingest-extract: --stamp without a model id fails closed (rc 2)" {
  _setup_eval_artifact_repo
  local good="tests/eval/ingest-extract/cases/extract-basic/expected"
  run bash -c "cd '$EVAL_REPO' && env -u CLAUDE_WIKI_PAGES_EVAL_MODEL bash scripts/eval-ingest-extract.sh --stamp --score '$good' --gold '$good'"
  _teardown_eval_artifact_repo

  assert_status 2
  assert_output_contains "model-id"
}

@test "eval-ingest-extract: --stamp fails closed when the golden set is uncommitted (no fail-open artifact)" {
  # The golden set must be present in the working tree (so scoring can run) but
  # NOT in HEAD (so golden_set_sha cannot be derived) — then --stamp must die
  # (rc 2) and emit NO partial JSON. Build a sandbox and remove the golden set
  # from HEAD while keeping the working-tree files, rather than relying on the
  # real repo's commit state (the golden set IS committed once the gate ships,
  # which is exactly the external-binding the gate requires).
  _setup_eval_artifact_repo
  local good="tests/eval/ingest-extract/cases/extract-basic/expected"
  run bash -c "
    cd '$EVAL_REPO' &&
    git rm -r --cached --quiet tests/eval/ingest-extract &&
    git commit -q -m 'uncommit golden set' &&
    bash scripts/eval-ingest-extract.sh --stamp --score '$good' --gold '$good' --model-id 'm'
  "
  _teardown_eval_artifact_repo

  assert_status 2
  refute_output_contains "{"
}

@test "eval-ingest-extract: --verify-artifact reproduces a freshly stamped artifact (exit 0)" {
  _setup_eval_artifact_repo
  local good="tests/eval/ingest-extract/cases/extract-basic/expected"
  run bash -c "
    cd '$EVAL_REPO' &&
    bash scripts/eval-ingest-extract.sh --stamp --score '$good' --gold '$good' --model-id 'm' > artifact.json &&
    bash scripts/eval-ingest-extract.sh --verify-artifact artifact.json
  "
  _teardown_eval_artifact_repo

  assert_success
  assert_output_contains "VERIFY OK"
  # Provenance caveat must be stated honestly in the output (MEDIUM finding).
  assert_output_contains "model_id and recorded_at are operator-asserted"
}

@test "eval-ingest-extract: --verify-artifact does NOT cross-check model_id (operator-asserted; bound by committing) — documented limitation" {
  # Editing model_id still verifies OK because a model-neutral driver cannot
  # reconstruct it by re-scoring. This is the honest limitation; the note in the
  # output and the README state it, and committing the artifact binds it.
  _setup_eval_artifact_repo
  local good="tests/eval/ingest-extract/cases/extract-basic/expected"
  run bash -c "
    cd '$EVAL_REPO' &&
    bash scripts/eval-ingest-extract.sh --stamp --score '$good' --gold '$good' --model-id 'orig:model' > a.json &&
    jq '.model_id = \"relabelled:model\"' a.json > relabel.json &&
    bash scripts/eval-ingest-extract.sh --verify-artifact relabel.json
  "
  _teardown_eval_artifact_repo

  # It still verifies OK (the quality evidence reproduces) AND prints the caveat.
  assert_success
  assert_output_contains "VERIFY OK"
  assert_output_contains "operator-asserted"
}

@test "eval-ingest-extract: --verify-artifact fails closed on a tampered verdict" {
  _setup_eval_artifact_repo
  local good="tests/eval/ingest-extract/cases/extract-basic/expected"
  run bash -c "
    cd '$EVAL_REPO' &&
    bash scripts/eval-ingest-extract.sh --stamp --score '$good' --gold '$good' --model-id 'm' > a.json &&
    jq '.verdict = \"fail\"' a.json > bad.json &&
    bash scripts/eval-ingest-extract.sh --verify-artifact bad.json
  "
  _teardown_eval_artifact_repo

  [ "$status" -ne 0 ]
  assert_output_contains "does not reproduce"
}

@test "eval-ingest-extract: --verify-artifact fails closed on golden_set_sha drift" {
  _setup_eval_artifact_repo
  local good="tests/eval/ingest-extract/cases/extract-basic/expected"
  run bash -c "
    cd '$EVAL_REPO' &&
    bash scripts/eval-ingest-extract.sh --stamp --score '$good' --gold '$good' --model-id 'm' > a.json &&
    jq '.golden_set_sha = \"deadbeefdeadbeef\"' a.json > drift.json &&
    bash scripts/eval-ingest-extract.sh --verify-artifact drift.json
  "
  _teardown_eval_artifact_repo

  [ "$status" -ne 0 ]
  assert_output_contains "drift"
}

@test "eval-ingest-extract: --verify-artifact fails closed on a missing required field" {
  _setup_eval_artifact_repo
  local good="tests/eval/ingest-extract/cases/extract-basic/expected"
  run bash -c "
    cd '$EVAL_REPO' &&
    bash scripts/eval-ingest-extract.sh --stamp --score '$good' --gold '$good' --model-id 'm' > a.json &&
    jq 'del(.model_id)' a.json > nomodel.json &&
    bash scripts/eval-ingest-extract.sh --verify-artifact nomodel.json
  "
  _teardown_eval_artifact_repo

  [ "$status" -ne 0 ]
  assert_output_contains "missing required field"
}

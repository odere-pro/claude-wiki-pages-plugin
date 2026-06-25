#!/bin/bash
# eval-ingest-extract-selftest.sh — self-test capability for the ingest-extract
# quality-gate eval driver.
#
# SOURCEABLE (not executable). Source this file after defining the scoring
# helpers (score_candidate, _strip_source_quotes is defined here). Provides:
#
#   run_self_test   — the load-bearing fail-closed proof; mirrors gate-13.
#   _strip_source_quotes <vault> — synthesize a claimless gold (self-test only).
#
# The self-test proves the driver (a) PASSES a known-good fixture meeting the
# bar, and (b) FAILS the planted-bad fixtures: a fabricated sourced claim,
# dropped claims below 0.97, and schema-invalid frontmatter. Any case behaving
# wrong → the self-test FAILS (exit 1). Internal scoring errors die() with
# exit 2.
#
# Dependencies (must be defined before this file is sourced):
#   score_candidate, die, ROOT (the repo root).

# run_self_test — the load-bearing fail-closed proof; mirrors gate-13 --self-test.
run_self_test() {
  local cases="$ROOT/tests/eval/ingest-extract/cases"
  local good="$cases/extract-basic/expected"
  local trap_dir="$cases/provenance-trap"
  local ok=0

  # The good fixture must PASS. score_candidate returns 0 on pass.
  if score_candidate "$good" "$good" text >/dev/null 2>&1; then
    echo "SELF-TEST OK: known-good candidate passes the bar"
  else
    echo "SELF-TEST FAIL: known-good candidate did NOT pass (false negative)"
    ok=1
  fi

  # candidate-fabricates must FAIL on the zero-fabrication floor.
  if score_candidate "$trap_dir/candidate-fabricates" "$trap_dir/expected" text >/dev/null 2>&1; then
    echo "SELF-TEST FAIL: fabricated sourced claim was NOT caught (gate fails open)"
    ok=1
  else
    echo "SELF-TEST OK: fabricated sourced claim is caught"
  fi

  # candidate-drops must FAIL on claim<->source fidelity < 0.97.
  if score_candidate "$trap_dir/candidate-drops" "$trap_dir/expected" text >/dev/null 2>&1; then
    echo "SELF-TEST FAIL: dropped claims were NOT caught"
    ok=1
  else
    echo "SELF-TEST OK: dropped claims are caught"
  fi

  # candidate-bad-schema must FAIL on schema-validity (scored AS EMITTED).
  if score_candidate "$trap_dir/candidate-bad-schema" "$trap_dir/expected" text >/dev/null 2>&1; then
    echo "SELF-TEST FAIL: schema-invalid frontmatter was NOT caught"
    ok=1
  else
    echo "SELF-TEST OK: schema-invalid frontmatter is caught"
  fi

  # Finding-1 regression: candidate-order-divergent plants a lowercase-initial,
  # order-divergent fabricated quote that would have aborted GNU comm on CI and
  # silently zeroed the FLOOR pre-fix. The order/locale-independent diff must
  # catch it regardless of platform — and it must STILL catch it under a
  # case-insensitive UTF-8 locale (the divergent CI collation), so we re-run that
  # case pinned to en_US.UTF-8 too. (If that locale is absent the score still
  # runs; the diff itself is locale-independent.)
  if score_candidate "$trap_dir/candidate-order-divergent" "$trap_dir/expected" text >/dev/null 2>&1; then
    echo "SELF-TEST FAIL: order-divergent fabricated claim was NOT caught (latent comm fail-open)"
    ok=1
  else
    echo "SELF-TEST OK: order-divergent fabricated claim is caught"
  fi
  if LC_ALL=en_US.UTF-8 score_candidate "$trap_dir/candidate-order-divergent" "$trap_dir/expected" text >/dev/null 2>&1; then
    echo "SELF-TEST FAIL: order-divergent fabrication NOT caught under en_US.UTF-8 (CI-locale fail-open)"
    ok=1
  else
    echo "SELF-TEST OK: order-divergent fabrication caught under en_US.UTF-8 locale"
  fi

  # Empty-gold regression: a claimless gold once silently zeroed the FLOOR (the
  # count_set_diff empty-first-file bug + the den==0 ratio free-pass). Build a
  # claimless gold at runtime and assert scoring the fabricating candidate against
  # it DIES (rc 2) — never passes — under BOTH locales. A die (rc 2) is the
  # required fail-closed behavior; a pass (rc 0) is the fail-open we must prevent.
  local empty_gold rc
  empty_gold="$(mktemp -d "${TMPDIR:-/tmp}/eval-empty-gold.XXXXXX")" || die "mktemp failed"
  # shellcheck disable=SC2064
  trap "rm -rf '$empty_gold'" RETURN
  cp -R "$trap_dir/expected/." "$empty_gold/"
  # Strip every source_quotes block in the copied gold → claimless gold.
  _strip_source_quotes "$empty_gold"
  local loc
  for loc in C en_US.UTF-8; do
    # Run in a SUBSHELL: score_candidate dies via `exit 2` on a rejected gold,
    # which would otherwise terminate this whole self-test. The subshell captures
    # that as its own rc so the loop can assert it. The `|| rc=$?` guard is
    # required under `set -e` (inherited from the sourcing driver): without it the
    # expected non-zero subshell exit would abort the self-test instead of being
    # asserted.
    rc=0
    (LC_ALL="$loc" score_candidate "$trap_dir/candidate-fabricates" "$empty_gold" text) >/dev/null 2>&1 || rc=$?
    if [ "$rc" -eq 2 ]; then
      echo "SELF-TEST OK: empty-claim gold is rejected (die rc=2) under ${loc}"
    else
      echo "SELF-TEST FAIL: empty-claim gold scored rc=${rc} (not die) under ${loc} — floor fail-open"
      ok=1
    fi
  done

  if [ "$ok" -eq 0 ]; then
    echo "OK: eval-ingest-extract self-test passed (gate is live, fail-closed, model-neutral)"
  else
    echo "FAIL: eval-ingest-extract self-test FAILED — the gate is not enforcing"
  fi
  return "$ok"
}

# Strip every `source_quotes:` block from each wiki page under <vault>, replacing
# it with an empty list. Used only by the self-test to synthesize a claimless
# gold. Pure sed/awk; no model, no network. Block form:
#   source_quotes:
#     - source: ...
#       quote: ...
# becomes `source_quotes: []`. Lines until the next top-level key (e.g. derived:)
# are removed.
_strip_source_quotes() {
  local vault="$1" f
  while IFS= read -r f; do
    awk '
      /^source_quotes:/ {
        print "source_quotes: []"
        instq = 1
        next
      }
      instq {
        # Consume the indented list items; stop at the next top-level key.
        if ($0 ~ /^[A-Za-z_]/) { instq = 0 } else { next }
      }
      { print }
    ' "$f" >"$f.tmp" && mv "$f.tmp" "$f"
  done < <(find "$vault/wiki" -name '*.md' -type f)
}

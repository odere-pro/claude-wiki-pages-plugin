#!/bin/bash
# eval-ingest-extract-artifact.sh — measured-run artifact management for the
# ingest-extract quality-gate eval driver.
#
# SOURCEABLE (not executable). Source this file after the scoring helpers are
# defined. Provides:
#
#   golden_set_sha    — compute the git tree-id of the committed golden set.
#   stamp_artifact    — emit a reproducible evidence artifact (PM condition #3).
#   verify_artifact   — re-derive sha + re-score to prove a recorded artifact
#                       reproduces exactly.
#
# The reproducible evidence a future default-flip must attach: the metric block
# + thresholds, stamped with the model id, the golden-set commit sha, and a UTC
# timestamp. `--stamp` emits it; `--verify-artifact` re-derives the sha and
# re-runs the score to prove the recorded verdict + metrics reproduce.
#
# Dependencies (must be defined before this file is sourced):
#   score_candidate, die, ROOT (the repo root).

# Compute the golden-set commit sha — the git tree object id of
# tests/eval/ingest-extract recorded in HEAD. This is the ONLY git invocation in
# the driver and it lives only on this artifact code path. It is `git rev-parse`
# ONLY — strictly READ-ONLY, no index/working-tree/object mutation.
#
# The value is the tree id of the committed golden set: it changes whenever any
# golden-set file changes (after commit), which is exactly what "the sha the
# golden set was scored against" must capture, and it is what a real default-flip
# cites and the PM re-runs against. The same call runs at stamp time and verify
# time, so they always agree.
#
# Fatal (exit 2) if git is unavailable OR the golden set is not yet committed —
# you cannot produce reproducible evidence against an uncommitted golden set, so
# this fails CLOSED with a clear "commit the golden set first" message rather
# than emitting an artifact that cannot be reproduced.
# Prints the sha on stdout and returns 0 on success; on failure it prints a
# diagnostic to stderr and RETURNS NON-ZERO (it does NOT exit). Because this runs
# inside a command substitution, an `exit` here would only end the subshell and
# leave the caller with an empty value — itself a fail-open. So callers MUST use
# `sha=$(golden_set_sha) || die ...` to fail closed in the parent shell.
golden_set_sha() {
  command -v git >/dev/null 2>&1 || {
    printf 'golden_set_sha: git is required\n' >&2
    return 1
  }
  local sha
  sha=$(cd "$ROOT" && git rev-parse --verify --quiet "HEAD:tests/eval/ingest-extract" 2>/dev/null) || {
    printf 'golden_set_sha: cannot resolve HEAD:tests/eval/ingest-extract — commit the golden set first\n' >&2
    return 1
  }
  [ -n "$sha" ] || {
    printf 'golden_set_sha: resolved empty\n' >&2
    return 1
  }
  printf '%s' "$sha"
}

# Emit a stamped artifact JSON for a scored candidate/gold pair.
# Required: candidate, gold, model_id. The verdict exit of the underlying score
# is preserved in the artifact's "verdict" field but --stamp itself exits 0 on a
# successfully-emitted artifact (emitting is not the gate; the recorded verdict
# is the evidence). Internal errors die() (exit 2).
stamp_artifact() {
  local candidate="$1" gold="$2" model_id="$3" input_file="${4:-}"
  [ -n "$candidate" ] || die "--stamp requires --score <candidate>"
  [ -n "$gold" ] || die "--stamp requires --gold <gold>"
  [ -n "$model_id" ] || die "--stamp requires --model-id <id> or CLAUDE_WIKI_PAGES_EVAL_MODEL"
  [ -d "$candidate" ] || die "candidate vault not found: $candidate"
  [ -d "$gold" ] || die "gold vault not found: $gold"

  local sha recorded_at score_json
  # Fail CLOSED in THIS shell if the sha cannot be derived (a command-sub `die`
  # would only exit the subshell and leave $sha empty — a fail-open).
  sha="$(golden_set_sha)" || die "cannot stamp: golden-set sha unavailable (commit the golden set first)"
  recorded_at="$(date -u +%FT%TZ)"
  # Capture the scorecard JSON. score_candidate returns 0/1 (verdict) and only
  # die()s on internal error; either verdict yields a valid scorecard to stamp.
  score_json="$(score_candidate "$candidate" "$gold" json "$input_file")" || true
  [ -n "$score_json" ] || die "scoring produced no scorecard to stamp"
  printf '%s' "$score_json" | jq -e . >/dev/null 2>&1 || die "scorecard is not valid JSON; cannot stamp"

  # Record the candidate/gold/input paths relative to ROOT when possible so the
  # artifact is portable and --verify-artifact can re-score the same inputs.
  # input_path is "" when scored under the strict legacy definition (no --input);
  # recording it pins WHICH floor definition produced the verdict (ADR-0017).
  local cand_rel gold_rel input_rel=""
  cand_rel="${candidate#"$ROOT"/}"
  gold_rel="${gold#"$ROOT"/}"
  [ -n "$input_file" ] && input_rel="${input_file#"$ROOT"/}"

  printf '%s' "$score_json" | jq \
    --arg model_id "$model_id" \
    --arg golden_set_sha "$sha" \
    --arg recorded_at "$recorded_at" \
    --arg candidate_path "$cand_rel" \
    --arg gold_path "$gold_rel" \
    --arg input_path "$input_rel" \
    '. + {
      model_id: $model_id,
      golden_set_sha: $golden_set_sha,
      recorded_at: $recorded_at,
      candidate_path: $candidate_path,
      gold_path: $gold_path,
      input_path: $input_path
    }' || die "jq failed to stamp artifact"
}

# Verify a stamped artifact reproduces. Reads <file>, asserts all required fields
# are present, re-derives the current golden-set sha and asserts it matches the
# recorded one, re-runs --score on the recorded candidate/gold, and asserts the
# recorded verdict + the gated metric values reproduce EXACTLY. Any mismatch or
# missing field is a nonzero exit (fail-closed). Exit 0 only on full reproduction.
#
# Scope of the proof (stated honestly): this is tamper-evident on the QUALITY
# EVIDENCE — the metrics, the verdict, and the golden-set sha all re-derive from
# the committed golden set. It does NOT cross-check model_id or recorded_at:
# those are operator-asserted labels a model-neutral driver cannot reconstruct by
# re-scoring. They are bound EXTERNALLY by committing the artifact to the
# default-flip change (governance rule), which makes them immutable + auditable.
verify_artifact() {
  local file="$1"
  [ -n "$file" ] || die "--verify-artifact requires a file path"
  [ -f "$file" ] || die "artifact file not found: $file"
  jq -e . "$file" >/dev/null 2>&1 || die "artifact is not valid JSON: $file"

  # 1. Required fields must all be present and non-null.
  local required="model_id golden_set_sha recorded_at candidate_path gold_path verdict schema_validity claim_source_fidelity frontmatter_field_accuracy dedup_correctness fabricated_sourced_claims"
  local f
  for f in $required; do
    if [ "$(jq -r --arg k "$f" 'has($k) and (.[$k] != null)' "$file")" != "true" ]; then
      printf 'VERIFY FAIL: artifact missing required field: %s\n' "$f" >&2
      return 1
    fi
  done

  # 2. The recorded golden-set sha must match the current one (the PM re-runs
  #    against that exact sha; a drifted golden set invalidates the evidence).
  local recorded_sha current_sha
  recorded_sha="$(jq -r '.golden_set_sha' "$file")"
  current_sha="$(golden_set_sha)" || die "cannot verify: golden-set sha unavailable (commit the golden set first)"
  if [ "$recorded_sha" != "$current_sha" ]; then
    printf 'VERIFY FAIL: golden_set_sha drift — artifact=%s current=%s\n' "$recorded_sha" "$current_sha" >&2
    return 1
  fi

  # 3. Re-run the score on the recorded inputs and assert reproduction.
  local cand gold
  cand="$ROOT/$(jq -r '.candidate_path' "$file")"
  gold="$ROOT/$(jq -r '.gold_path' "$file")"
  [ -d "$cand" ] || {
    printf 'VERIFY FAIL: recorded candidate_path no longer exists: %s\n' "$cand" >&2
    return 1
  }
  [ -d "$gold" ] || {
    printf 'VERIFY FAIL: recorded gold_path no longer exists: %s\n' "$gold" >&2
    return 1
  }
  # ADR-0017: when the artifact records an input_path, the re-score must use the
  # SAME floor definition the verdict was produced under. A recorded-but-missing
  # input file fails closed (the evidence is no longer reproducible).
  local input_rel input_abs=""
  input_rel="$(jq -r '.input_path // ""' "$file")"
  if [ -n "$input_rel" ]; then
    input_abs="$ROOT/$input_rel"
    [ -r "$input_abs" ] || {
      printf 'VERIFY FAIL: recorded input_path no longer readable: %s\n' "$input_abs" >&2
      return 1
    }
  fi
  local fresh
  fresh="$(score_candidate "$cand" "$gold" json "$input_abs")" || true
  [ -n "$fresh" ] || die "re-score produced no scorecard during --verify-artifact"

  # Compare the recorded verdict + each gated metric (and the ADR-0017
  # over-citation count when recorded) to the fresh score.
  local extra_keys=""
  jq -e 'has("over_citation")' "$file" >/dev/null 2>&1 && extra_keys="over_citation"
  local key rec cur
  for key in verdict schema_validity claim_source_fidelity frontmatter_field_accuracy dedup_correctness fabricated_sourced_claims $extra_keys; do
    rec="$(jq -rc --arg k "$key" '.[$k]' "$file")"
    cur="$(printf '%s' "$fresh" | jq -rc --arg k "$key" '.[$k]')"
    if [ "$rec" != "$cur" ]; then
      printf 'VERIFY FAIL: %s does not reproduce — artifact=%s fresh=%s\n' "$key" "$rec" "$cur" >&2
      return 1
    fi
  done

  printf 'VERIFY OK: artifact reproduces (sha %s, verdict %s, model %s)\n' \
    "$current_sha" "$(jq -r '.verdict' "$file")" "$(jq -r '.model_id' "$file")"
  # Honest provenance caveat: this proves the METRICS + VERDICT + GOLDEN-SET-SHA
  # reproduce (tamper-evident on the quality evidence). model_id and recorded_at
  # are operator-asserted labels a model-neutral driver structurally cannot
  # cross-check by re-scoring; they are bound EXTERNALLY by committing this
  # artifact to the default-flip change (the git commit makes them immutable and
  # auditable, per the governance rule).
  printf 'NOTE: model_id and recorded_at are operator-asserted (bound by committing this artifact), not verified by re-score.\n'
  return 0
}

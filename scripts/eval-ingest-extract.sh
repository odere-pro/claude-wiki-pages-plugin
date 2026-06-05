#!/bin/bash
# eval-ingest-extract.sh — local-model quality-gate eval driver for the
# `ingest-extract` capability tier.
#
# Spec: docs/plan/0003-local-model-quality-gate.md (ratified design + the PM's
# calibrated bar). This script is the MEASUREMENT APPARATUS only. It is
# MODEL-NEUTRAL: it does NOT wire up Ollama or any local model, makes NO network
# call, and flips NO default. The Claude-first default for ingest-extract is
# unchanged; this only *measures* a candidate extraction so the PM can decide.
#
# §5 NO-RAG ABSOLUTE: scoring is EXACT STRUCTURAL comparison of candidate output
# to a checked-in gold reference — counts and ratios, never embeddings, vectors,
# cosine, or similarity. There is no "produce" step here: this driver scores
# already-emitted candidate output. Producing candidate output from a model is a
# separate, model-specific step the PM runs; this driver never invokes a model.
#
# Reuse, not a parallel verifier:
#   - schema-validity  : scripts/verify-ingest.sh + scripts/validate-frontmatter.sh
#                        run against the candidate AS EMITTED (no fix/heal first).
#   - claim<->source   : src/core/frontmatter.ts parseFrontmatter (via a bun
#                        one-shot) to extract source_quotes {source, quote} pairs,
#                        diffed against the gold pairs. No new YAML parser.
#
# The calibrated, PM-ratified bar (ingest-extract tier ONLY):
#   - schema-validity            >= 0.98   (scored AS EMITTED — no auto-repair)
#   - claim<->source fidelity    >= 0.97
#   - frontmatter-field accuracy >= 0.90
#   - two-pass dedup correctness >= 0.90
#   - zero fabricated sourced claims — a FIXED, NON-TUNABLE FLOOR: a single
#     invented sourced claim FAILS the tier regardless of the aggregate.
#
# Exit codes:
#   0  verdict PASS (candidate clears the bar)
#   1  verdict FAIL (candidate misses a threshold or trips the fabrication floor)
#   2  usage / internal error — FATAL, never swallowed. The gate must never be
#      able to fail-open the way gate-13 originally did, so any scoring error is
#      a loud non-zero exit, never a silent pass.
#
# Usage:
#   scripts/eval-ingest-extract.sh --score <candidate-vault> --gold <gold-vault> [--json]
#   scripts/eval-ingest-extract.sh --self-test
#   scripts/eval-ingest-extract.sh --stamp --score <candidate> --gold <gold> \
#       [--model-id <id>]            # emit a measured-run artifact (model id +
#                                    # golden-set sha + UTC timestamp)
#   scripts/eval-ingest-extract.sh --verify-artifact <artifact.json>
#                                    # re-derive sha, re-score, assert reproduction
#   scripts/eval-ingest-extract.sh --help
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# ── Calibrated thresholds (the PM-ratified bar). Pinned as constants so there is
# one source of truth and the verdict is a single deterministic pass/fail. ──────
readonly THRESH_SCHEMA_VALIDITY="0.98"
readonly THRESH_CLAIM_FIDELITY="0.97"
readonly THRESH_FIELD_ACCURACY="0.90"
readonly THRESH_DEDUP="0.90"
# The fabrication floor is a hard 0 — a fixed, non-tunable FLOOR, not a dial.
readonly FABRICATION_FLOOR=0

# Meaningful frontmatter fields scored for field-accuracy (per spec §2.2): the
# classification/placement fields plus presence-and-correctness of sources.
readonly SCORED_FIELDS="type entity_type source_type title parent path sources"

usage() {
  sed -n '2,47p' "$0" | sed 's/^# \?//'
}

# ── small utilities ────────────────────────────────────────────────────────────
die() {
  # Fatal usage/internal error: exit 2 so the gate fails closed, never open.
  printf 'eval-ingest-extract: ERROR: %s\n' "$1" >&2
  exit 2
}

# Run verify-ingest.sh + validate-frontmatter.sh against a vault AS EMITTED and
# report whether it is schema-clean (0 = clean, 1 = has error findings). No
# fix/heal is ever run first — the candidate is scored exactly as the model
# emitted it, per the calibrated bar.
vault_is_schema_clean() {
  local vault="$1"
  local vrc frc
  bash "$ROOT/scripts/verify-ingest.sh" --target "$vault" >/dev/null 2>&1
  vrc=$?
  bash "$ROOT/scripts/validate-frontmatter.sh" --target "$vault" >/dev/null 2>&1
  frc=$?
  # Either checker erroring out internally (rc >= 2) is fatal, not a pass.
  if [ "$vrc" -ge 2 ] || [ "$frc" -ge 2 ]; then
    die "schema checker errored internally (verify rc=$vrc, frontmatter rc=$frc) on $vault"
  fi
  if [ "$vrc" -eq 0 ] && [ "$frc" -eq 0 ]; then
    return 0
  fi
  return 1
}

# Extract the canonical set of source_quotes {source, quote} pairs from every
# wiki page under <vault>/wiki, one per line as `source<TAB>quote`, sorted.
# Reuses src/core/frontmatter.ts (the engine's battle-tested YAML parser) via a
# bun one-shot rather than a second YAML parser — exact structural extraction,
# no similarity. When bun is unavailable this is FATAL (the eval cannot score
# claim fidelity without parsing), never a silent pass.
extract_claim_pairs() {
  local vault="$1"
  local wiki="$vault/wiki"
  [ -d "$wiki" ] || die "no wiki/ directory under candidate/gold vault: $vault"
  command -v bun >/dev/null 2>&1 || die "bun is required to extract claim pairs (frontmatter parser); install bun (see bun.sh)"

  # The bun one-shot imports parseFrontmatter and prints `source\tquote` lines.
  # It performs EXACT extraction — no embedding, no vector, no similarity.
  # A dynamic import() takes the engine module path from the env (ESM static
  # specifiers must be literals; the path is computed, so import() is required).
  WIKI_DIR="$wiki" ROOT_DIR="$ROOT" bun -e '
    import { readdirSync, statSync, readFileSync } from "node:fs";
    import { join } from "node:path";
    const { parseFrontmatter } = await import(process.env.ROOT_DIR + "/src/core/frontmatter.ts");
    const wiki = process.env.WIKI_DIR;
    function walk(dir) {
      let out = [];
      for (const e of readdirSync(dir)) {
        const p = join(dir, e);
        if (statSync(p).isDirectory()) out = out.concat(walk(p));
        else if (e.endsWith(".md")) out.push(p);
      }
      return out;
    }
    const lines = [];
    for (const f of walk(wiki)) {
      const fm = parseFrontmatter(readFileSync(f, "utf8"));
      const sq = fm["source_quotes"];
      if (!Array.isArray(sq)) continue;
      for (const item of sq) {
        if (item && typeof item === "object") {
          const src = String(item.source ?? "");
          const quote = String(item.quote ?? "");
          if (src !== "" || quote !== "") lines.push(src + "\t" + quote);
        }
      }
    }
    lines.sort();
    process.stdout.write(lines.join("\n"));
  ' 2>/dev/null
  local rc=$?
  [ "$rc" -ne 0 ] && die "claim-pair extraction failed (bun rc=$rc) on $vault"
  return 0
}

# Extract the set of page-bearing wiki file paths (relative to wiki/), excluding
# bookkeeping files, sorted. Used for dedup correctness (did the candidate
# produce the gold set of pages — no spurious duplicates, no missed merges).
extract_page_paths() {
  local vault="$1"
  local wiki="$vault/wiki"
  [ -d "$wiki" ] || die "no wiki/ directory under vault: $wiki"
  # LC_ALL=C: deterministic byte sort, independent of the ambient locale. The
  # downstream diff (count_set_diff) is order-independent anyway, but a stable
  # byte order keeps emitted artifacts reproducible across platforms.
  local f rel base
  while IFS= read -r f; do
    base="$(basename "$f" .md)"
    case "$base" in
      index | log | dashboard | manifest) continue ;;
    esac
    rel="${f#"$wiki"/}"
    printf '%s\n' "$rel"
  done < <(find "$wiki" -name '*.md' -type f | LC_ALL=C sort) | LC_ALL=C sort
}

# Extract a scalar frontmatter field value from a single file (first match,
# quotes stripped). Empty when absent. Mirrors the verifier's _fm_field idiom.
fm_scalar() {
  local file="$1" field="$2" line
  line=$(sed -n '/^---$/,/^---$/p' "$file" | grep -m1 -E "^${field}:[[:space:]]" || true)
  [ -z "$line" ] && return 0
  printf '%s' "$line" | sed "s/^${field}:[[:space:]]*//" | tr -d "\"'"
}

# Count lines in a value safely (0 for empty string).
count_lines() {
  if [ -z "$1" ]; then
    printf '0'
  else
    printf '%s\n' "$1" | grep -c .
  fi
}

# Format a fraction num/den to 4 decimals; den==0 yields 1.0000 (nothing to get
# wrong scores perfectly). Uses awk for float math (bash is integer-only).
ratio() {
  local num="$1" den="$2"
  awk -v n="$num" -v d="$den" 'BEGIN { if (d == 0) { printf "1.0000" } else { printf "%.4f", n / d } }'
}

# Return 0 when value >= threshold (float compare via awk), else 1.
# Used for already-computed rates (e.g. the schema cap) where no raw counts
# exist. For count-derived metrics use meets_ratio instead to avoid rounding.
meets() {
  awk -v v="$1" -v t="$2" 'BEGIN { exit (v + 0 >= t + 0) ? 0 : 1 }'
}

# Return 0 when num/den >= bar, computed EXACTLY on the RAW counts — never the
# rounded display string. Avoids the rounding edge where e.g. 0.969957 prints as
# "0.9700" and would falsely clear a 0.97 bar. The comparison cross-multiplies
# integers: n/d >= t  <=>  n * SCALE >= round(t * SCALE) * d, with SCALE large
# enough that every bar (0.98 / 0.97 / 0.90) is an exact integer multiple. No
# division, no rounding of the ratio, so a value strictly below the bar can never
# round onto it. den == 0 means "nothing to score" → meets the bar (1.0).
meets_ratio() {
  awk -v n="$1" -v d="$2" -v t="$3" '
    BEGIN {
      if (d + 0 == 0) { exit 0 }                 # empty set scores perfectly
      SCALE = 1000000
      tnum = int(t * SCALE + 0.5)                # bar as an exact integer
      lhs = (n + 0) * SCALE                       # n/d, numerator side, exact
      rhs = tnum * (d + 0)                         # bar * d, exact
      exit (lhs >= rhs) ? 0 : 1
    }'
}

# Print the smaller of two floats (4 decimals).
min_ratio() {
  awk -v a="$1" -v b="$2" 'BEGIN { printf "%.4f", (a + 0 < b + 0) ? a : b }'
}

# Order-independent, locale-independent set difference over whole lines.
# Usage: count_set_diff <only_a|only_b|both> <file_a> <file_b>
#   only_a -> count of lines present in A but NOT in B (e.g. fabricated)
#   only_b -> count of lines present in B but NOT in A (e.g. dropped)
#   both   -> count of lines present in BOTH (e.g. matched)
#
# Deliberately NO `comm` and NO `sort`: comm requires sorted input and GNU comm
# aborts when its sort-order check disagrees with the locale's collation. The
# producer here (a bun `.sort()`, UTF-16 code-unit order) and a locale-sensitive
# `comm` on CI (en_US.UTF-8, case-insensitive) DIVERGE, so comm could abort and a
# swallowed error would silently zero the fabrication FLOOR. An awk
# associative-array diff compares by exact line key, so order and locale are
# irrelevant and there is nothing to swallow. awk's own exit status is checked by
# the caller; any awk failure is fatal (never a silent 0).
#
# Set B is loaded with an EXPLICIT getline loop in BEGIN — NOT the `FNR==NR`
# two-file idiom. `FNR==NR` is unsafe when the FIRST file is empty: awk reads
# zero records from it, so the first record of the SECOND file still satisfies
# `FNR==NR` and every line of A is misclassified into B[] → only_a (the
# fabricated count) wrongly returns 0. That bug fail-opened the floor against an
# empty gold. The getline loop makes an empty B unambiguous: zero entries in b[],
# so every line of A is correctly counted in only_a.
count_set_diff() {
  local op="$1" file_a="$2" file_b="$3"
  awk -v op="$op" -v file_b="$file_b" '
    BEGIN {
      # Explicitly load set B (distinct lines). An empty/zero-line file_b yields
      # an empty b[] — never a misclassification of A.
      while ((getline line < file_b) > 0) b[line] = 1
      close(file_b)
    }
    # Stream file_a (the only positional arg), classifying each DISTINCT line once.
    !seen_a[$0]++ {
      if ($0 in b) both++
      else only_a++
    }
    END {
      # only_b: distinct lines in B never seen in A.
      for (k in b) if (!(k in seen_a)) only_b++
      if (op == "only_a") print only_a + 0
      else if (op == "only_b") print only_b + 0
      else if (op == "both") print both + 0
      else { print "BADOP" > "/dev/stderr"; exit 3 }
    }
  ' "$file_a"
}

# ── core scoring ───────────────────────────────────────────────────────────────
# score_candidate <candidate-vault> <gold-vault> <emit: json|text>
# Prints the scorecard to stdout and RETURNS the verdict exit code:
#   0 = pass, 1 = fail. Internal errors die() with exit 2 (never fail-open).
score_candidate() {
  local candidate="$1" gold="$2" emit="$3"
  [ -d "$candidate" ] || die "candidate vault not found: $candidate"
  [ -d "$gold" ] || die "gold vault not found: $gold"

  # ── Metric 1: schema-validity (AS EMITTED, no auto-repair) ───────────────────
  # Per-page: a page is schema-valid iff it survives the plugin's own checkers.
  # We score the candidate vault as a whole (verify-ingest is vault-level) and
  # derive a per-page rate from validate-frontmatter, which reports per file.
  local fm_total fm_bad schema_validity
  # validate-frontmatter --target prints one OK:/ERROR: line per wiki file. Its
  # output is ANSI-colored (e.g. "\033[0;32mOK:    pandoc.md\033[0m"), so strip
  # escape sequences before counting; match the per-file tag anywhere on the line
  # rather than anchored at column 0. The trailing "Errors:   N" summary line is
  # NOT a per-file line and is excluded by requiring whitespace after the tag.
  local fm_out fm_clean
  fm_out=$(bash "$ROOT/scripts/validate-frontmatter.sh" --target "$candidate" 2>/dev/null || true)
  fm_clean=$(printf '%s\n' "$fm_out" | sed $'s/\033\\[[0-9;]*m//g')
  # Per-file lines name a "<file>.md"; the trailing summary ("OK: All frontmatter
  # valid" / "Errors:   N") does not, so requiring ".md" on the line counts files
  # only — never the summary.
  fm_total=$(printf '%s\n' "$fm_clean" | grep -E '(OK:|ERROR:)' | grep -c '\.md' || true)
  fm_bad=$(printf '%s\n' "$fm_clean" | grep -E 'ERROR:' | grep -c '\.md' || true)
  if [ "$fm_total" -eq 0 ]; then
    die "schema scoring found no wiki pages under candidate: $candidate"
  fi
  # Per-field rate from validate-frontmatter (scored AS EMITTED — no fix/heal).
  local fm_good schema_unclean=0
  fm_good=$((fm_total - fm_bad))
  schema_validity=$(ratio "$fm_good" "$fm_total")
  # A vault-level verify-ingest error (e.g. broken index / missing-sources /
  # dangling provenance) also counts against schema-validity even when every
  # per-field check passes. If the vault is not schema-clean overall, take the
  # MINIMUM of the per-field rate and a below-bar ceiling (0.9700 < 0.98 bar) so
  # such a candidate can never score at/above the bar — and a per-field rate that
  # is already lower is preserved, never inflated. The schema_unclean flag tells
  # the verdict the bar is unmet regardless of the per-field count ratio.
  if ! vault_is_schema_clean "$candidate"; then
    schema_validity=$(min_ratio "$schema_validity" "0.9700")
    schema_unclean=1
  fi

  # ── Metrics 3 + fabrication floor: claim<->source fidelity ───────────────────
  # Compare candidate source_quotes pairs to gold pairs (exact structural set
  # diff). Fabricated = candidate pair NOT in gold. Dropped = gold pair NOT in
  # candidate. Fidelity = correctly-reproduced gold pairs / gold pairs.
  local cand_pairs gold_pairs
  cand_pairs="$(extract_claim_pairs "$candidate")"
  gold_pairs="$(extract_claim_pairs "$gold")"

  local gold_total fabricated dropped matched fidelity
  gold_total=$(count_lines "$gold_pairs")

  # Empty-gold guard (FATAL). A gold with ZERO sourced claims makes the
  # fabrication floor and the fidelity rate structurally uncomputable: there is
  # nothing for a candidate's claims to match, and the den==0 ratio would
  # otherwise free-pass as 1.0. A structurally-uncomparable gold must be REJECTED
  # (rc 2), never scored "perfect" — mirroring the fm_total==0 guard above. This
  # is belt-and-suspenders with the count_set_diff empty-first-file fix: even a
  # correct diff cannot make a claimless gold a valid bar.
  if [ "$gold_total" -eq 0 ]; then
    die "gold has no sourced claims (source_quotes) — cannot score claim<->source fidelity or the fabrication floor against an empty gold: $gold"
  fi

  # Write each pair set to a temp file (blank lines stripped so an empty set is a
  # truly empty file). The diff is computed by count_set_diff — an order- and
  # locale-independent awk set diff. NO comm, NO sort: see count_set_diff for why
  # comm + a swallowed error could silently zero the fabrication FLOOR on CI.
  #   fabricated: pairs in candidate but NOT in gold (the FLOOR input).
  #   dropped:    gold pairs missing from candidate.
  #   matched:    pairs in both (fidelity numerator).
  local tmp_c tmp_g
  tmp_c="$(mktemp "${TMPDIR:-/tmp}/eval-cand.XXXXXX")" || die "mktemp failed"
  tmp_g="$(mktemp "${TMPDIR:-/tmp}/eval-gold.XXXXXX")" || die "mktemp failed"
  # shellcheck disable=SC2064  # expand paths now for the cleanup trap.
  trap "rm -f '$tmp_c' '$tmp_g'" RETURN
  printf '%s\n' "$cand_pairs" | sed '/^$/d' >"$tmp_c"
  printf '%s\n' "$gold_pairs" | sed '/^$/d' >"$tmp_g"

  # Capture each count and FAIL CLOSED (die, exit 2) on any awk error — a scoring
  # error must NEVER become a silent 0 that lets a fabrication through.
  fabricated=$(count_set_diff only_a "$tmp_c" "$tmp_g") || die "claim-pair set diff (fabricated) failed"
  dropped=$(count_set_diff only_b "$tmp_c" "$tmp_g") || die "claim-pair set diff (dropped) failed"
  matched=$(count_set_diff both "$tmp_c" "$tmp_g") || die "claim-pair set diff (matched) failed"
  # Defensive: counts must be non-negative integers; anything else is fatal.
  case "${fabricated}${dropped}${matched}" in
    *[!0-9]*) die "claim-pair diff produced a non-integer count (fab=$fabricated drop=$dropped match=$matched)" ;;
  esac
  fidelity=$(ratio "$matched" "$gold_total")

  # ── Metric 2: frontmatter-field accuracy ─────────────────────────────────────
  # Over the pages present in BOTH candidate and gold (by relative path), compare
  # each scored field's value. accuracy = matching fields / compared fields.
  local field_total=0 field_ok=0
  local rel cf gf field cval gval
  while IFS= read -r rel; do
    [ -z "$rel" ] && continue
    cf="$candidate/wiki/$rel"
    gf="$gold/wiki/$rel"
    [ -f "$cf" ] || continue
    [ -f "$gf" ] || continue
    for field in $SCORED_FIELDS; do
      gval="$(fm_scalar "$gf" "$field")"
      # Only score fields the gold actually carries (presence is the contract).
      [ -z "$gval" ] && continue
      cval="$(fm_scalar "$cf" "$field")"
      field_total=$((field_total + 1))
      if [ "$cval" = "$gval" ]; then
        field_ok=$((field_ok + 1))
      fi
    done
  done < <(extract_page_paths "$gold")
  local field_accuracy
  field_accuracy=$(ratio "$field_ok" "$field_total")

  # ── Metric 4: two-pass dedup correctness ─────────────────────────────────────
  # Did the candidate produce exactly the gold set of page paths? Spurious
  # duplicates (extra paths) and missed merges (missing paths) both count.
  local cand_paths gold_paths dedup_total dedup_ok
  cand_paths="$(extract_page_paths "$candidate")"
  gold_paths="$(extract_page_paths "$gold")"
  local tmp_cp tmp_gp
  tmp_cp="$(mktemp "${TMPDIR:-/tmp}/eval-cp.XXXXXX")" || die "mktemp failed"
  tmp_gp="$(mktemp "${TMPDIR:-/tmp}/eval-gp.XXXXXX")" || die "mktemp failed"
  # shellcheck disable=SC2064
  trap "rm -f '$tmp_c' '$tmp_g' '$tmp_cp' '$tmp_gp'" RETURN
  printf '%s\n' "$cand_paths" | sed '/^$/d' >"$tmp_cp"
  printf '%s\n' "$gold_paths" | sed '/^$/d' >"$tmp_gp"
  dedup_total=$(grep -c . "$tmp_gp" || true)
  # Empty gold page-set guard (FATAL). A gold with ZERO scoreable pages makes
  # dedup correctness uncomputable and the den==0 ratio would free-pass; reject
  # it (rc 2) rather than scoring "perfect". Belt-and-suspenders with the
  # count_set_diff empty-first-file fix (which keeps the extras penalty correct).
  if [ "$dedup_total" -eq 0 ]; then
    die "gold has no scoreable wiki pages — cannot score dedup correctness against an empty gold: $gold"
  fi
  # Correct paths = gold paths also present in candidate (no missed merges); we
  # subtract spurious extras so a candidate that adds duplicates is penalised.
  # Same order/locale-independent awk set diff — no comm, fatal on error.
  local present extras
  present=$(count_set_diff both "$tmp_cp" "$tmp_gp") || die "page-path set diff (present) failed"
  extras=$(count_set_diff only_a "$tmp_cp" "$tmp_gp") || die "page-path set diff (extras) failed"
  case "${present}${extras}" in
    *[!0-9]*) die "page-path diff produced a non-integer count (present=$present extras=$extras)" ;;
  esac
  dedup_ok=$((present - extras))
  [ "$dedup_ok" -lt 0 ] && dedup_ok=0
  local dedup_correctness
  dedup_correctness=$(ratio "$dedup_ok" "$dedup_total")

  # ── Verdict: ALL thresholds must hold AND the fabrication floor must be 0 ─────
  # Each threshold is checked on the RAW counts via meets_ratio (exact cross-
  # multiplication) — NOT the rounded display string — so a value strictly below
  # a bar can never round onto it (Finding 3). Schema additionally fails whenever
  # the vault is not schema-clean overall (schema_unclean), independent of the
  # per-field count ratio.
  local verdict="pass" reasons=""
  if [ "$schema_unclean" -eq 1 ] || ! meets_ratio "$fm_good" "$fm_total" "$THRESH_SCHEMA_VALIDITY"; then
    verdict="fail"
    reasons="${reasons}schema_validity ${schema_validity} < ${THRESH_SCHEMA_VALIDITY}; "
  fi
  if ! meets_ratio "$matched" "$gold_total" "$THRESH_CLAIM_FIDELITY"; then
    verdict="fail"
    reasons="${reasons}claim_source_fidelity ${fidelity} < ${THRESH_CLAIM_FIDELITY}; "
  fi
  if ! meets_ratio "$field_ok" "$field_total" "$THRESH_FIELD_ACCURACY"; then
    verdict="fail"
    reasons="${reasons}frontmatter_field_accuracy ${field_accuracy} < ${THRESH_FIELD_ACCURACY}; "
  fi
  if ! meets_ratio "$dedup_ok" "$dedup_total" "$THRESH_DEDUP"; then
    verdict="fail"
    reasons="${reasons}dedup_correctness ${dedup_correctness} < ${THRESH_DEDUP}; "
  fi
  # The hard, non-tunable floor: any fabricated sourced claim fails the tier
  # regardless of the aggregate rates above.
  if [ "$fabricated" -gt "$FABRICATION_FLOOR" ]; then
    verdict="fail"
    reasons="${reasons}fabricated_sourced_claims ${fabricated} > ${FABRICATION_FLOOR} (FLOOR); "
  fi
  [ -z "$reasons" ] && reasons="all thresholds met and zero fabricated sourced claims"

  # ── Emit scorecard ───────────────────────────────────────────────────────────
  if [ "$emit" = "json" ]; then
    # jq builds well-formed JSON (the same envelope style as the engine verify).
    jq -n \
      --arg verdict "$verdict" \
      --argjson schema_validity "$schema_validity" \
      --argjson claim_source_fidelity "$fidelity" \
      --argjson frontmatter_field_accuracy "$field_accuracy" \
      --argjson dedup_correctness "$dedup_correctness" \
      --argjson fabricated_sourced_claims "$fabricated" \
      --argjson dropped_claims "$dropped" \
      --argjson gold_claims "$gold_total" \
      --arg tier "ingest-extract" \
      --arg reasons "$reasons" \
      --argjson thresholds "{\"schema_validity\":$THRESH_SCHEMA_VALIDITY,\"claim_source_fidelity\":$THRESH_CLAIM_FIDELITY,\"frontmatter_field_accuracy\":$THRESH_FIELD_ACCURACY,\"dedup_correctness\":$THRESH_DEDUP,\"fabricated_sourced_claims_floor\":$FABRICATION_FLOOR}" \
      '{
        tier: $tier,
        verdict: $verdict,
        schema_validity: $schema_validity,
        claim_source_fidelity: $claim_source_fidelity,
        frontmatter_field_accuracy: $frontmatter_field_accuracy,
        dedup_correctness: $dedup_correctness,
        fabricated_sourced_claims: $fabricated_sourced_claims,
        dropped_claims: $dropped_claims,
        gold_claims: $gold_claims,
        thresholds: $thresholds,
        reasons: $reasons
      }' || die "jq failed to render scorecard"
  else
    printf 'tier:                        ingest-extract\n'
    printf 'schema_validity:             %s  (bar >= %s)\n' "$schema_validity" "$THRESH_SCHEMA_VALIDITY"
    printf 'claim_source_fidelity:       %s  (bar >= %s)\n' "$fidelity" "$THRESH_CLAIM_FIDELITY"
    printf 'frontmatter_field_accuracy:  %s  (bar >= %s)\n' "$field_accuracy" "$THRESH_FIELD_ACCURACY"
    printf 'dedup_correctness:           %s  (bar >= %s)\n' "$dedup_correctness" "$THRESH_DEDUP"
    printf 'fabricated_sourced_claims:   %s  (FLOOR == %s)\n' "$fabricated" "$FABRICATION_FLOOR"
    printf 'dropped_claims:              %s / %s gold claims\n' "$dropped" "$gold_total"
    printf 'reasons:                     %s\n' "$reasons"
    if [ "$verdict" = "pass" ]; then
      printf 'verdict:                     PASS\n'
    else
      printf 'verdict:                     FAIL\n'
    fi
  fi

  [ "$verdict" = "pass" ] && return 0
  return 1
}

# ── self-test (the load-bearing fail-closed proof; mirrors gate-13 --self-test) ─
# Proves the driver (a) PASSES a known-good fixture meeting the bar, and (b)
# FAILS the planted-bad fixtures: a fabricated sourced claim, dropped claims
# below 0.97, and schema-invalid frontmatter. Any case behaving wrong → the
# self-test FAILS (exit 1). Internal scoring errors die() with exit 2.
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
    # that as its own rc so the loop can assert it.
    (LC_ALL="$loc" score_candidate "$trap_dir/candidate-fabricates" "$empty_gold" text) >/dev/null 2>&1
    rc=$?
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

# ── measured-run artifact (PM condition #3) ────────────────────────────────────
# The reproducible evidence a future default-flip must attach: the metric block +
# thresholds, stamped with the model id, the golden-set commit sha, and a UTC
# timestamp. `--stamp` emits it; `--verify-artifact` re-derives the sha and
# re-runs the score to prove the recorded verdict + metrics reproduce.

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
  local candidate="$1" gold="$2" model_id="$3"
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
  score_json="$(score_candidate "$candidate" "$gold" json)" || true
  [ -n "$score_json" ] || die "scoring produced no scorecard to stamp"
  printf '%s' "$score_json" | jq -e . >/dev/null 2>&1 || die "scorecard is not valid JSON; cannot stamp"

  # Record the candidate/gold paths relative to ROOT when possible so the
  # artifact is portable and --verify-artifact can re-score the same inputs.
  local cand_rel gold_rel
  cand_rel="${candidate#"$ROOT"/}"
  gold_rel="${gold#"$ROOT"/}"

  printf '%s' "$score_json" | jq \
    --arg model_id "$model_id" \
    --arg golden_set_sha "$sha" \
    --arg recorded_at "$recorded_at" \
    --arg candidate_path "$cand_rel" \
    --arg gold_path "$gold_rel" \
    '. + {
      model_id: $model_id,
      golden_set_sha: $golden_set_sha,
      recorded_at: $recorded_at,
      candidate_path: $candidate_path,
      gold_path: $gold_path
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
  local fresh
  fresh="$(score_candidate "$cand" "$gold" json)" || true
  [ -n "$fresh" ] || die "re-score produced no scorecard during --verify-artifact"

  # Compare the recorded verdict + each gated metric to the fresh score.
  local key rec cur
  for key in verdict schema_validity claim_source_fidelity frontmatter_field_accuracy dedup_correctness fabricated_sourced_claims; do
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

# ── entry point ────────────────────────────────────────────────────────────────
main() {
  local mode="" candidate="" gold="" emit="text" model_id="" artifact=""
  while [ "$#" -gt 0 ]; do
    case "$1" in
      -h | --help)
        usage
        exit 0
        ;;
      --self-test)
        mode="self-test"
        shift
        ;;
      --score)
        # Sets the candidate; mode defaults to "score" unless --stamp set it.
        [ -z "$mode" ] && mode="score"
        candidate="${2:-}"
        shift 2 || die "--score requires a candidate vault path"
        ;;
      --gold)
        gold="${2:-}"
        shift 2 || die "--gold requires a gold vault path"
        ;;
      --json)
        emit="json"
        shift
        ;;
      --stamp)
        mode="stamp"
        shift
        ;;
      --model-id)
        model_id="${2:-}"
        shift 2 || die "--model-id requires a value"
        ;;
      --verify-artifact)
        mode="verify-artifact"
        artifact="${2:-}"
        shift 2 || die "--verify-artifact requires a file path"
        ;;
      *) die "unknown argument: $1 (try --help)" ;;
    esac
  done

  # Default the model id from the env when not given on the flag.
  [ -z "$model_id" ] && model_id="${CLAUDE_WIKI_PAGES_EVAL_MODEL:-}"

  case "$mode" in
    self-test)
      run_self_test
      exit $?
      ;;
    score)
      [ -n "$candidate" ] || die "--score requires a candidate vault path"
      [ -n "$gold" ] || die "--score requires --gold <gold-vault>"
      score_candidate "$candidate" "$gold" "$emit"
      exit $?
      ;;
    stamp)
      [ -n "$candidate" ] || die "--stamp requires --score <candidate-vault>"
      [ -n "$gold" ] || die "--stamp requires --gold <gold-vault>"
      stamp_artifact "$candidate" "$gold" "$model_id"
      exit $?
      ;;
    verify-artifact)
      verify_artifact "$artifact"
      exit $?
      ;;
    *)
      usage
      die "no mode selected (use --score, --stamp, --verify-artifact, or --self-test)"
      ;;
  esac
}

# Run main only when executed directly, not when sourced (so unit tests can load
# pure helpers like meets_ratio without triggering a mode dispatch).
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
  main "$@"
fi

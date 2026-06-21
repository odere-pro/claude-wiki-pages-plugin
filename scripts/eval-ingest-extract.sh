#!/bin/bash
# eval-ingest-extract.sh — local-model quality-gate eval driver for the
# `ingest-extract` capability tier.
#
# Spec: docs/adr/ADR-0011-local-model-quality-gate.md (ratified design + the PM's
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
#       [--input <raw-input.md>]     # ADR-0017: partition extra claim pairs into
#                                    # over-citation (verbatim in input, reported)
#                                    # vs fabricated (invented, the FLOOR)
#   scripts/eval-ingest-extract.sh --self-test
#   scripts/eval-ingest-extract.sh --stamp --score <candidate> --gold <gold> \
#       [--model-id <id>]            # emit a measured-run artifact (model id +
#                                    # golden-set sha + UTC timestamp)
#   scripts/eval-ingest-extract.sh --verify-artifact <artifact.json>
#                                    # re-derive sha, re-score, assert reproduction
#   scripts/eval-ingest-extract.sh --help
set -euo pipefail

# Use BASH_SOURCE[0] (not $0) so ROOT resolves correctly both when the script
# is executed directly AND when it is sourced by a Bats test (source '$DRIVER').
# When $0 is the bare shell invocation ("bash"), dirname gives "." and ROOT
# lands one level too high; BASH_SOURCE[0] is always the path of this file.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# H13: source the single canonical normalize_ws implementation (DRY).
# Both eval-ingest-extract.sh and eval-query.sh previously carried divergent
# copies; the shared helper is the only definition now.
# shellcheck source=eval-normalize-ws.sh
source "${ROOT}/scripts/eval-normalize-ws.sh"

# Facade: source focused sub-modules so this file owns only utilities + data
# extraction + scoring + CLI routing. Self-test and artifact management live in
# their own files with clearly-bounded responsibilities (SRP / high-cohesion).
# shellcheck source=eval-ingest-extract-selftest.sh
source "${ROOT}/scripts/eval-ingest-extract-selftest.sh"
# shellcheck source=eval-ingest-extract-artifact.sh
source "${ROOT}/scripts/eval-ingest-extract-artifact.sh"

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
  # Print the header comment block (everything up to `set -euo pipefail`) —
  # pattern-bounded so header edits never silently truncate the help text.
  sed -n '2,/^set -euo/p' "$0" | sed '$d' | sed 's/^# \?//'
}

# ── small utilities ────────────────────────────────────────────────────────────
die() {
  # Fatal usage/internal error: exit 2 so the gate fails closed, never open.
  printf 'eval-ingest-extract: ERROR: %s\n' "$1" >&2
  exit 2
}

# _parse_kv <kv_string> <allowed_key> [<allowed_key> ...]
# Safe key=value binder: replaces `eval "$_score_out"` throughout score_candidate.
# Iterates over space-separated "key=value" tokens in <kv_string>, validates each
# key against the explicit allow-list of caller-declared variable names, and assigns
# via printf -v.  Any key NOT in the allow-list causes a fatal die() — the gate
# cannot fail-open on unexpected output.  Values are numeric/float strings only;
# they are never interpolated into a shell command, so no injection surface exists.
_parse_kv() {
  local kv_string="$1"
  shift
  local allowed_keys="$*"
  local token key val
  for token in $kv_string; do
    key="${token%%=*}"
    val="${token#*=}"
    # Validate key against the caller-supplied allow-list (exact word match).
    case " $allowed_keys " in
      *" $key "*) printf -v "$key" '%s' "$val" ;;
      *) die "_parse_kv: unexpected key '${key}' in scorer output (allowed: ${allowed_keys})" ;;
    esac
  done
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

# C10: consolidated scalar frontmatter field extractor, named _fm_field to
# match the identical helper in verify-ingest.sh (DRY — the former _fm_field
# was a near-duplicate). Extracts the first occurrence of <field>: from the
# YAML frontmatter of <file>, strips quotes, returns empty when absent.
_fm_field() {
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
    # print_only_a: emit each distinct A-only LINE (for downstream
    # classification, ADR-0017) instead of a count.
    op == "print_only_a" && !($0 in b) && seen_a[$0] == 1 { print }
    END {
      # only_b: distinct lines in B never seen in A.
      for (k in b) if (!(k in seen_a)) only_b++
      if (op == "only_a") print only_a + 0
      else if (op == "only_b") print only_b + 0
      else if (op == "both") print both + 0
      else if (op == "print_only_a") { } # lines already streamed above
      else { print "BADOP" > "/dev/stderr"; exit 3 }
    }
  ' "$file_a"
}

# ── ADR-0017: verbatim partition of extra claim pairs ──────────────────────────
# normalize_ws is sourced from eval-normalize-ws.sh above (H13 DRY fix).
# The function collapses every whitespace run (incl. newlines from hard-wrapped
# input files) to a single space — exact comparison after normalization, never
# similarity (§5 NO-RAG holds).

# ── M04/M05: per-metric sub-functions ─────────────────────────────────────────
# score_candidate was a 265-line monolith. Each of the four metrics is now its
# own function with a clearly-bounded responsibility. score_candidate delegates
# to them and assembles the scorecard. _compute_verdict and _emit_scorecard
# own the verdict-assembly and output-formatting steps respectively.
# Callers and self-test are unchanged.

# _score_schema <candidate>
# Metric 1: schema-validity scored AS EMITTED (no auto-repair). Populates four
# named output variables by printing "fm_total=N fm_good=N schema_validity=... schema_unclean=N".
# Callers parse the output via _parse_kv (key-allow-list) to bind variables safely.
# Fails closed (die) if no wiki pages found or if a checker errors internally.
_score_schema() {
  local candidate="$1"
  # validate-frontmatter --target prints one OK:/ERROR: line per wiki file.
  # ANSI escape sequences are stripped before counting (colored output).
  local fm_out fm_clean fm_total fm_bad fm_good schema_validity schema_unclean=0
  fm_out=$(bash "$ROOT/scripts/validate-frontmatter.sh" --target "$candidate" 2>/dev/null || true)
  fm_clean=$(printf '%s\n' "$fm_out" | sed $'s/\033\\[[0-9;]*m//g')
  # Require ".md" on the line to count files only (not the trailing summary line).
  fm_total=$(printf '%s\n' "$fm_clean" | grep -E '(OK:|ERROR:)' | grep -c '\.md' || true)
  fm_bad=$(printf '%s\n' "$fm_clean" | grep -E 'ERROR:' | grep -c '\.md' || true)
  [ "$fm_total" -eq 0 ] && die "schema scoring found no wiki pages under candidate: $candidate"
  fm_good=$((fm_total - fm_bad))
  schema_validity=$(ratio "$fm_good" "$fm_total")
  # A vault-level verify-ingest error also caps the rate below the bar.
  if ! vault_is_schema_clean "$candidate"; then
    schema_validity=$(min_ratio "$schema_validity" "0.9700")
    schema_unclean=1
  fi
  printf 'fm_total=%s fm_good=%s schema_validity=%s schema_unclean=%s' \
    "$fm_total" "$fm_good" "$schema_validity" "$schema_unclean"
}

# _score_claims <candidate> <gold> <tmp_c> <tmp_g> <input_file>
# Metric 3 + fabrication floor: claim<->source fidelity.
# Populates: gold_total fabricated dropped matched fidelity over_citation.
# tmp_c / tmp_g are caller-provided temp file paths (for cross-metric reuse).
_score_claims() {
  local candidate="$1" gold="$2" tmp_c="$3" tmp_g="$4" input_file="${5:-}"
  local cand_pairs gold_pairs gold_total fabricated dropped matched fidelity over_citation=0
  cand_pairs="$(extract_claim_pairs "$candidate")"
  gold_pairs="$(extract_claim_pairs "$gold")"
  gold_total=$(count_lines "$gold_pairs")
  # Empty-gold guard: a claimless gold makes the floor and fidelity structurally
  # uncomputable; reject (die/exit 2) rather than scoring "perfect".
  [ "$gold_total" -eq 0 ] && die "gold has no sourced claims (source_quotes) — cannot score claim<->source fidelity or the fabrication floor against an empty gold: $gold"
  printf '%s\n' "$cand_pairs" | sed '/^$/d' >"$tmp_c"
  printf '%s\n' "$gold_pairs" | sed '/^$/d' >"$tmp_g"
  fabricated=$(count_set_diff only_a "$tmp_c" "$tmp_g") || die "claim-pair set diff (fabricated) failed"
  dropped=$(count_set_diff only_b "$tmp_c" "$tmp_g") || die "claim-pair set diff (dropped) failed"
  matched=$(count_set_diff both "$tmp_c" "$tmp_g") || die "claim-pair set diff (matched) failed"
  case "${fabricated}${dropped}${matched}" in
    *[!0-9]*) die "claim-pair diff produced a non-integer count (fab=$fabricated drop=$dropped match=$matched)" ;;
  esac
  fidelity=$(ratio "$matched" "$gold_total")
  # ADR-0017 partition: over-citation vs fabrication.
  if [ -n "$input_file" ] && [ "$fabricated" -gt 0 ]; then
    local norm_input extra_lines pair quote norm_quote refab=0
    norm_input=$(normalize_ws <"$input_file") || die "input normalization failed: $input_file"
    [ -n "$norm_input" ] || die "--input file is empty: $input_file"
    extra_lines=$(count_set_diff print_only_a "$tmp_c" "$tmp_g") || die "claim-pair set diff (print_only_a) failed"
    while IFS= read -r pair; do
      [ -z "$pair" ] && continue
      quote="${pair#*$'\t'}"
      norm_quote=$(printf '%s' "$quote" | normalize_ws) || die "quote normalization failed"
      if [ -n "$norm_quote" ]; then
        case "$norm_input" in
          *"$norm_quote"*) over_citation=$((over_citation + 1)) ;;
          *) refab=$((refab + 1)) ;;
        esac
      else
        refab=$((refab + 1))
      fi
    done <<<"$extra_lines"
    [ $((over_citation + refab)) -eq "$fabricated" ] ||
      die "ADR-0017 partition mismatch: $over_citation over-cited + $refab fabricated != $fabricated extra pairs"
    fabricated="$refab"
  fi
  printf 'gold_total=%s fabricated=%s dropped=%s matched=%s fidelity=%s over_citation=%s' \
    "$gold_total" "$fabricated" "$dropped" "$matched" "$fidelity" "$over_citation"
}

# _score_fields <candidate> <gold>
# Metric 2: frontmatter-field accuracy over pages in BOTH candidate and gold.
# accuracy = matching fields / compared fields.
_score_fields() {
  local candidate="$1" gold="$2"
  local field_total=0 field_ok=0 rel cf gf field cval gval
  while IFS= read -r rel; do
    [ -z "$rel" ] && continue
    cf="$candidate/wiki/$rel"
    gf="$gold/wiki/$rel"
    [ -f "$cf" ] || continue
    [ -f "$gf" ] || continue
    for field in $SCORED_FIELDS; do
      gval="$(_fm_field "$gf" "$field")"
      [ -z "$gval" ] && continue
      cval="$(_fm_field "$cf" "$field")"
      field_total=$((field_total + 1))
      [ "$cval" = "$gval" ] && field_ok=$((field_ok + 1))
    done
  done < <(extract_page_paths "$gold")
  local field_accuracy
  field_accuracy=$(ratio "$field_ok" "$field_total")
  printf 'field_total=%s field_ok=%s field_accuracy=%s' "$field_total" "$field_ok" "$field_accuracy"
}

# _score_dedup <candidate> <gold> <tmp_cp> <tmp_gp>
# Metric 4: two-pass dedup correctness.
# tmp_cp / tmp_gp are caller-provided temp file paths.
_score_dedup() {
  local candidate="$1" gold="$2" tmp_cp="$3" tmp_gp="$4"
  local cand_paths gold_paths dedup_total dedup_ok present extras
  cand_paths="$(extract_page_paths "$candidate")"
  gold_paths="$(extract_page_paths "$gold")"
  printf '%s\n' "$cand_paths" | sed '/^$/d' >"$tmp_cp"
  printf '%s\n' "$gold_paths" | sed '/^$/d' >"$tmp_gp"
  dedup_total=$(grep -c . "$tmp_gp" || true)
  [ "$dedup_total" -eq 0 ] && die "gold has no scoreable wiki pages — cannot score dedup correctness against an empty gold: $gold"
  present=$(count_set_diff both "$tmp_cp" "$tmp_gp") || die "page-path set diff (present) failed"
  extras=$(count_set_diff only_a "$tmp_cp" "$tmp_gp") || die "page-path set diff (extras) failed"
  case "${present}${extras}" in
    *[!0-9]*) die "page-path diff produced a non-integer count (present=$present extras=$extras)" ;;
  esac
  dedup_ok=$((present - extras))
  [ "$dedup_ok" -lt 0 ] && dedup_ok=0
  local dedup_correctness
  dedup_correctness=$(ratio "$dedup_ok" "$dedup_total")
  printf 'dedup_total=%s dedup_ok=%s dedup_correctness=%s' "$dedup_total" "$dedup_ok" "$dedup_correctness"
}

# _compute_verdict <schema_unclean> <fm_good> <fm_total> <matched> <gold_total>
#                  <field_ok> <field_total> <dedup_ok> <dedup_total>
#                  <fabricated> <schema_validity> <fidelity> <field_accuracy>
#                  <dedup_correctness>
# Applies all five pass/fail checks against the calibrated thresholds and the
# fabrication floor. Prints "verdict=<pass|fail> reasons=<...>" for eval.
# All comparisons use the raw counts via meets_ratio (exact cross-multiplication)
# — NOT the rounded display string — so a value strictly below a bar can never
# round onto it. Schema additionally fails when schema_unclean=1.
_compute_verdict() {
  local schema_unclean="$1" fm_good="$2" fm_total="$3"
  local matched="$4" gold_total="$5"
  local field_ok="$6" field_total="$7"
  local dedup_ok="$8" dedup_total="$9"
  local fabricated="${10}"
  local schema_validity="${11}" fidelity="${12}" field_accuracy="${13}" dedup_correctness="${14}"

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
  printf 'verdict=%s reasons=%s' "$verdict" "$reasons"
}

# _emit_scorecard <emit: json|text> <verdict> <reasons> <schema_validity>
#                 <fidelity> <field_accuracy> <dedup_correctness>
#                 <fabricated> <over_citation> <dropped> <gold_total>
# Formats and prints the scorecard in the requested format (json via jq, or
# plain text). Never decides the verdict — only presents the already-computed
# results. Fails closed (die) on jq failure.
_emit_scorecard() {
  local emit="$1" verdict="$2" reasons="$3"
  local schema_validity="$4" fidelity="$5" field_accuracy="$6" dedup_correctness="$7"
  local fabricated="$8" over_citation="$9" dropped="${10}" gold_total="${11}"

  if [ "$emit" = "json" ]; then
    # jq builds well-formed JSON (the same envelope style as the engine verify).
    jq -n \
      --arg verdict "$verdict" \
      --argjson schema_validity "$schema_validity" \
      --argjson claim_source_fidelity "$fidelity" \
      --argjson frontmatter_field_accuracy "$field_accuracy" \
      --argjson dedup_correctness "$dedup_correctness" \
      --argjson fabricated_sourced_claims "$fabricated" \
      --argjson over_citation "$over_citation" \
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
        over_citation: $over_citation,
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
    printf 'over_citation:               %s  (verbatim-in-input extras; not floored — ADR-0017)\n' "$over_citation"
    printf 'dropped_claims:              %s / %s gold claims\n' "$dropped" "$gold_total"
    printf 'reasons:                     %s\n' "$reasons"
    if [ "$verdict" = "pass" ]; then
      printf 'verdict:                     PASS\n'
    else
      printf 'verdict:                     FAIL\n'
    fi
  fi
}

# ── core scoring ───────────────────────────────────────────────────────────────
# score_candidate <candidate-vault> <gold-vault> <emit: json|text> [input-file]
# Prints the scorecard to stdout and RETURNS the verdict exit code:
#   0 = pass, 1 = fail. Internal errors die() with exit 2 (never fail-open).
#
# Template-method structure (M04/M05/M14): this function is the orchestrating
# skeleton. Each step — input validation, temp-file setup, four metric scores,
# verdict assembly, and scorecard emit — is delegated to a focused sub-function.
# score_candidate owns only the sequencing and shared temp-file lifecycle.
score_candidate() {
  # ── M14: named inputs (replacing 4 bare positional strings) ──────────────────
  local sc_candidate="$1" # vault path of the candidate under evaluation
  local sc_gold="$2"      # vault path of the checked-in gold reference
  local sc_emit="$3"      # output format: "json" or "text"
  local sc_input="${4:-}" # optional raw input file (ADR-0017 partition)
  [ -d "$sc_candidate" ] || die "candidate vault not found: $sc_candidate"
  [ -d "$sc_gold" ] || die "gold vault not found: $sc_gold"
  if [ -n "$sc_input" ] && [ ! -r "$sc_input" ]; then
    die "--input file not readable: $sc_input"
  fi

  # Temp files shared between claim-diff and dedup; cleaned up on RETURN.
  local tmp_c tmp_g tmp_cp tmp_gp
  tmp_c="$(mktemp "${TMPDIR:-/tmp}/eval-cand.XXXXXX")" || die "mktemp failed"
  tmp_g="$(mktemp "${TMPDIR:-/tmp}/eval-gold.XXXXXX")" || die "mktemp failed"
  tmp_cp="$(mktemp "${TMPDIR:-/tmp}/eval-cp.XXXXXX")" || die "mktemp failed"
  tmp_gp="$(mktemp "${TMPDIR:-/tmp}/eval-gp.XXXXXX")" || die "mktemp failed"
  # shellcheck disable=SC2064
  trap "rm -f '$tmp_c' '$tmp_g' '$tmp_cp' '$tmp_gp'" RETURN

  # ── M14: named metric results (replacing 8 bare locals) ──────────────────────
  # Each _score_* helper runs in a subshell (command substitution).  When the
  # helper calls die() the subshell exits 2, but the outer script would NOT see
  # that exit code if we inlined eval "$(...)".  The two-step capture pattern
  # below ensures a non-zero exit from any helper is re-raised in the outer
  # scope via die(), keeping the fail-closed contract (exit 2, never open).
  # _parse_kv replaces eval: it binds ONLY the explicitly allow-listed keys
  # (numeric/float) — no shell execution of captured output.
  local _score_out

  # Metric 1 — schema-validity
  local fm_total fm_good schema_validity schema_unclean
  _score_out=$(_score_schema "$sc_candidate") || die "schema scoring failed (see error above)"
  _parse_kv "$_score_out" fm_total fm_good schema_validity schema_unclean

  # Metric 3 + fabrication floor — claim<->source fidelity
  local gold_total fabricated dropped matched fidelity over_citation
  _score_out=$(_score_claims "$sc_candidate" "$sc_gold" "$tmp_c" "$tmp_g" "$sc_input") ||
    die "claim scoring failed (see error above)"
  _parse_kv "$_score_out" gold_total fabricated dropped matched fidelity over_citation

  # Metric 2 — frontmatter-field accuracy
  local field_total field_ok field_accuracy
  _score_out=$(_score_fields "$sc_candidate" "$sc_gold") || die "field scoring failed (see error above)"
  _parse_kv "$_score_out" field_total field_ok field_accuracy

  # Metric 4 — two-pass dedup correctness
  local dedup_total dedup_ok dedup_correctness
  _score_out=$(_score_dedup "$sc_candidate" "$sc_gold" "$tmp_cp" "$tmp_gp") || die "dedup scoring failed (see error above)"
  _parse_kv "$_score_out" dedup_total dedup_ok dedup_correctness

  # ── Verdict: delegate to _compute_verdict ────────────────────────────────────
  local verdict reasons
  _score_out=$(_compute_verdict \
    "$schema_unclean" "$fm_good" "$fm_total" \
    "$matched" "$gold_total" \
    "$field_ok" "$field_total" \
    "$dedup_ok" "$dedup_total" \
    "$fabricated" \
    "$schema_validity" "$fidelity" "$field_accuracy" "$dedup_correctness") ||
    die "verdict computation failed (see error above)"
  verdict="${_score_out#verdict=}"
  verdict="${verdict%% *}"
  reasons="${_score_out#*reasons=}"

  # ── Emit scorecard: delegate to _emit_scorecard ───────────────────────────────
  _emit_scorecard "$sc_emit" "$verdict" "$reasons" \
    "$schema_validity" "$fidelity" "$field_accuracy" "$dedup_correctness" \
    "$fabricated" "$over_citation" "$dropped" "$gold_total"

  [ "$verdict" = "pass" ] && return 0
  return 1
}

# ── self-test and artifact management ─────────────────────────────────────────
# Both capabilities are sourced from focused companion files (facade split):
#   eval-ingest-extract-selftest.sh  — run_self_test + _strip_source_quotes
#   eval-ingest-extract-artifact.sh  — golden_set_sha + stamp_artifact + verify_artifact
# Sourced above (after eval-normalize-ws.sh); see those files for the implementations.

# ── entry point ────────────────────────────────────────────────────────────────
main() {
  local mode="" candidate="" gold="" emit="text" model_id="" artifact="" input_file=""
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
      --input)
        # ADR-0017: the case's raw input; partitions extra claim pairs into
        # over-citation (verbatim in input) vs fabricated (floor).
        input_file="${2:-}"
        shift 2 || die "--input requires a raw-input file path"
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
      score_candidate "$candidate" "$gold" "$emit" "$input_file"
      exit $?
      ;;
    stamp)
      [ -n "$candidate" ] || die "--stamp requires --score <candidate-vault>"
      [ -n "$gold" ] || die "--stamp requires --gold <gold-vault>"
      stamp_artifact "$candidate" "$gold" "$model_id" "$input_file"
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

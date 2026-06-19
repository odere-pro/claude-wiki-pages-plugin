#!/bin/bash
# Gate 05 — the Bun engine `verify` agrees with bash verify-ingest.sh on the
# reference vault (the parity invariant that keeps the TS port honest), plus a
# GOLDEN-SNAPSHOT anti-drift check on `engine verify --json`.
#
# Rows:
#   1. verify-ingest.sh vs engine verify  (the byte-aligned twin; reference vault).
#   2. engine verify --json == checked-in GOLDEN errors,warnings on BOTH fixtures
#      (tests/fixtures/reference-vault + tests/fixtures/minimal-vault).
#
# Row 2 history: it used to compare `validate-frontmatter.sh --json` against
# `engine verify --json`. Since frontmatter-cli-retire (tmp/migration-plan.md
# "What is left" #2) validate-frontmatter.sh's CLI `--json` path is a THIN
# wrapper over `engine hook --gate frontmatter --cli` — so that comparison
# became engine==engine (vacuous). The row is now a GOLDEN-SNAPSHOT: the engine's
# verify counts on the two fixtures are pinned to a checked-in table, preserving
# the anti-drift protection without two implementations (the same flip applied to
# gate-11-firewall-parity after firewall-twin-retire).
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT" || exit 2
if ! command -v bun >/dev/null 2>&1; then
  echo "SKIP: bun not installed"
  exit 0
fi

FAIL=0

# ── Row 1: verify-ingest.sh vs engine verify (reference vault) ───────────────
VAULT="tests/fixtures/reference-vault"
bash_counts="$(bash scripts/verify-ingest.sh --target "$VAULT" 2>&1 | grep -E '^(Errors|Warnings):' | grep -oE '[0-9]+' | paste -sd, -)"
eng_counts="$(bun src/cli/cli.ts verify --target "$VAULT" --json 2>/dev/null | bun -e 'const r=JSON.parse(await Bun.stdin.text());process.stdout.write(`${r.errors},${r.warnings}`)')"

if [ "$bash_counts" = "$eng_counts" ]; then
  echo "OK row1: engine == verify-ingest.sh ($eng_counts)"
else
  echo "FAIL row1: verify-ingest.sh=$bash_counts engine=$eng_counts"
  FAIL=1
fi

# ── Row 2: GOLDEN-SNAPSHOT — engine verify --json on both fixtures ────────────
# The checked-in golden "errors,warnings" pair for each fixture. Both fixtures
# are maintained clean (0 errors, 0 warnings) so any new engine check that moves
# a verdict on them turns this gate red — the anti-drift guarantee. Update these
# goldens deliberately (in the same commit as the check change) when intended.
golden_for() {
  case "$1" in
    "tests/fixtures/reference-vault") echo "0,0" ;;
    "tests/fixtures/minimal-vault") echo "0,0" ;;
    *) echo "UNKNOWN" ;;
  esac
}

check_golden() {
  local fixture="$1" golden actual
  golden="$(golden_for "$fixture")"
  actual="$(bun src/cli/cli.ts verify --target "$fixture" --json 2>/dev/null | bun -e '
const r = JSON.parse(await Bun.stdin.text());
process.stdout.write(`${r.errors || 0},${r.warnings || 0}`);
')"
  if [ "$actual" = "$golden" ]; then
    echo "OK row2: engine verify --json == golden ($actual) on $fixture"
  else
    echo "FAIL row2: engine verify --json=$actual golden=$golden on $fixture"
    FAIL=1
  fi
}

check_golden "tests/fixtures/reference-vault"
check_golden "tests/fixtures/minimal-vault"

if [ "$FAIL" -eq 0 ]; then
  exit 0
fi
exit 1

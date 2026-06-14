#!/bin/bash
# Gate 05 — the Bun engine `verify` agrees with bash verify-ingest.sh on the
# reference vault (the parity invariant that keeps the TS port honest).
#
# Rows:
#   1. verify-ingest.sh vs engine verify  (original row)
#   2. validate-frontmatter.sh --json vs engine verify --json  (P3.5 parity row)
#      Both rows run on the minimal-vault fixture (tests/fixtures/minimal-vault)
#      which is clean and produces 0 errors / 0 warnings on both paths.
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

# ── Row 2: validate-frontmatter.sh --json vs engine verify --json ────────────
# Both are run against the minimal-vault fixture (tests/fixtures/minimal-vault),
# which is guaranteed clean (0 errors, 0 warnings).  The parity check compares
# the count of error-severity findings and warn-severity findings extracted from
# each JSON output so the two tools agree field-for-field on that fixture.
#
# Extraction uses python3 (available everywhere bun is available; no jq needed
# on this side since validate-frontmatter.sh emits json via bash/printf).
FIXTURE="tests/fixtures/minimal-vault"

fm_json="$(bash scripts/validate-frontmatter.sh --target "$FIXTURE" --json 2>/dev/null)"
eng_json="$(bun src/cli/cli.ts verify --target "$FIXTURE" --json 2>/dev/null)"

fm_counts="$(printf '%s' "$fm_json" | python3 -c "
import json, sys
data = json.load(sys.stdin)
findings = data.get('findings', [])
errors  = sum(1 for f in findings if f.get('severity') == 'error')
warnings = sum(1 for f in findings if f.get('severity') == 'warn')
print(str(errors) + ',' + str(warnings))
")"

eng_fm_counts="$(printf '%s' "$eng_json" | python3 -c "
import json, sys
data = json.load(sys.stdin)
# engine verify --json returns top-level errors/warnings counts
errors   = data.get('errors', 0)
warnings = data.get('warnings', 0)
print(str(errors) + ',' + str(warnings))
")"

if [ "$fm_counts" = "$eng_fm_counts" ]; then
  echo "OK row2: validate-frontmatter.sh --json == engine verify --json ($fm_counts) on minimal-vault"
else
  echo "FAIL row2: validate-frontmatter.sh --json=$fm_counts engine verify --json=$eng_fm_counts"
  FAIL=1
fi

if [ "$FAIL" -eq 0 ]; then
  exit 0
fi
exit 1

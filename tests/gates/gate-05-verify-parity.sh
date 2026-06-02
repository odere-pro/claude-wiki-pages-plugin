#!/bin/bash
# Gate 05 — the Bun engine `verify` agrees with bash verify-ingest.sh on the
# reference vault (the parity invariant that keeps the TS port honest).
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT" || exit 2
if ! command -v bun >/dev/null 2>&1; then
  echo "SKIP: bun not installed"
  exit 0
fi

VAULT="docs/vault-example"
bash_counts="$(bash scripts/verify-ingest.sh --target "$VAULT" 2>&1 | grep -E '^(Errors|Warnings):' | grep -oE '[0-9]+' | paste -sd, -)"
eng_counts="$(bun src/cli/cli.ts verify --target "$VAULT" --json 2>/dev/null | bun -e 'const r=JSON.parse(await Bun.stdin.text());process.stdout.write(`${r.errors},${r.warnings}`)')"

if [ "$bash_counts" = "$eng_counts" ]; then
  echo "OK: engine == bash ($eng_counts)"
  exit 0
fi
echo "FAIL: bash=$bash_counts engine=$eng_counts"
exit 1

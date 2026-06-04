#!/bin/bash
# Gate 11 — the bash firewall hook (scripts/firewall.sh) agrees with the engine
# `firewall check` on a fixed set of paths. Keeps the hot-path bash twin honest.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT" || exit 2
if ! command -v bun >/dev/null 2>&1; then
  echo "SKIP: bun not installed"
  exit 0
fi

VAULT="docs/vault-example"
VABS="$ROOT/$VAULT"

# Representative paths: inside vault, outside, deny-glob hits, nested.
PATHS=(
  "$VABS/wiki/index.md"
  "$VABS/wiki/tools/x.md"
  "$VABS/.env"
  "$VABS/wiki/.git/config"
  "/etc/passwd"
  "/tmp/scratch.md"
  "$ROOT/docs/vault-example-backup/x.md"
)

fail=0
for p in "${PATHS[@]}"; do
  # Reduce each verdict to ALLOW|BLOCK + rule (drop the trailing "(mode=…)").
  b=$(bash scripts/firewall.sh --file "$p" --target "$VAULT" 2>/dev/null | sed 's/ (mode=.*//')
  e=$(bun src/cli/cli.ts firewall --file "$p" --target "$VAULT" 2>/dev/null | sed 's/ (mode=.*//')
  if [ "$b" != "$e" ]; then
    echo "FAIL: $p"
    echo "  bash:   $b"
    echo "  engine: $e"
    fail=1
  fi
done

if [ "$fail" -eq 0 ]; then
  echo "OK: bash firewall == engine firewall (${#PATHS[@]} paths)"
  exit 0
fi
exit 1

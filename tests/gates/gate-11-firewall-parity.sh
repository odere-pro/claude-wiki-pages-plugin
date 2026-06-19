#!/bin/bash
# Gate 11 — firewall verdict GOLDEN-SNAPSHOT (post-twin-retirement).
#
# History: this gate used to compare the bash hook twin (scripts/firewall.sh CLI
# mode) against the engine `firewall` command byte-for-byte. firewall-twin-retire
# (migration-plan.md Phase 3) retired the bash decision twin — scripts/firewall.sh
# is now a thin stdin→engine wrapper with no independent decide() logic. With only
# ONE implementation left there is nothing to compare it against, so the gate
# flips from "bash == engine" to "engine == checked-in GOLDEN verdict table on the
# fixtures". This keeps the anti-drift protection (any change to the engine's
# decision logic that moves a verdict turns the gate red) WITHOUT a second
# implementation to maintain.
#
# The golden verdicts below were proven equivalent to the retired bash twin in the
# firewall-twin-retire dual-run (engine == bash, 9/9 hook-mode + the full
# CLI-mode matrix green) BEFORE the twin was retired — see the unit's IMPL report.
#
# Each verdict is reduced to "ALLOW|BLOCK [rule]" (the trailing "(mode=…)" is
# dropped) and compared to the golden expectation.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT" || exit 2
if ! command -v bun >/dev/null 2>&1; then
  echo "SKIP: bun not installed"
  exit 0
fi

VAULT="tests/fixtures/reference-vault"
VABS="$ROOT/$VAULT"

fail=0

# eng_verdict <file> [--other-vaults <colon>] — engine verdict, mode stripped.
eng_verdict() {
  bun src/cli/cli.ts firewall "$@" 2>/dev/null | sed 's/ (mode=.*//'
}

# check_golden <label> <actual> <expected>
check_golden() {
  local label="$1" actual="$2" expected="$3"
  if [ "$actual" != "$expected" ]; then
    echo "FAIL golden [$label]:"
    echo "  expected: $expected"
    echo "  engine:   $actual"
    fail=1
  fi
}

# ── Baseline matrix (golden) ──────────────────────────────────────────────────
# file path | golden verdict (rule class)
BASELINE=(
  "$VABS/wiki/index.md|ALLOW [vault]"
  "$VABS/wiki/tools/x.md|ALLOW [vault]"
  "$VABS/.env|BLOCK [deny:**/.env]"
  "$VABS/wiki/.git/config|BLOCK [deny:**/.git/config]"
  "/etc/passwd|BLOCK [outside-vault]"
  "/tmp/scratch.md|BLOCK [outside-vault]"
  "$ROOT/tests/fixtures/reference-vault-backup/x.md|BLOCK [outside-vault]"
)
base_count=0
for row in "${BASELINE[@]}"; do
  IFS='|' read -r p expected <<<"$row"
  a=$(eng_verdict --file "$p" --target "$VAULT")
  # Strip the file path the engine echoes after the rule (keep ALLOW/BLOCK [rule]).
  a=$(printf '%s' "$a" | sed "s| ${p}\$||")
  check_golden "baseline $(basename "$p")" "$a" "$expected"
  base_count=$((base_count + 1))
done

# ── S3 cross-vault confinement matrix (golden) ────────────────────────────────
SIBLING_DIR="$(mktemp -d)"
trap 'rm -rf "$SIBLING_DIR"' EXIT
CROSS=(
  "$VABS/wiki/active.md|ALLOW [vault]"
  "$SIBLING_DIR/wiki/page.md|BLOCK [cross-vault]"
  "$SIBLING_DIR/.env|BLOCK [deny:**/.env]"
  "/etc/hostname|BLOCK [outside-vault]"
)
cross_count=0
for row in "${CROSS[@]}"; do
  IFS='|' read -r p expected <<<"$row"
  a=$(eng_verdict --file "$p" --target "$VAULT" --other-vaults "$SIBLING_DIR")
  a=$(printf '%s' "$a" | sed "s| ${p}\$||")
  check_golden "cross-vault $(basename "$p")" "$a" "$expected"
  cross_count=$((cross_count + 1))
done

# ── F1 symlink-escape matrix (golden) ─────────────────────────────────────────
# A symlink INSIDE the active vault pointing at a sibling/outside must be
# dereferenced to its PHYSICAL location by the engine, yielding the golden verdict.
SYM_ROOT="$(mktemp -d)"
trap 'rm -rf "$SIBLING_DIR" "$SYM_ROOT"' EXIT
SYM_ACTIVE="$SYM_ROOT/active"
SYM_SIBLING="$SYM_ROOT/sibling"
SYM_OUTSIDE="$SYM_ROOT/outside"
mkdir -p "$SYM_ACTIVE/wiki" "$SYM_SIBLING/wiki" "$SYM_OUTSIDE"
ln -s "$SYM_SIBLING" "$SYM_ACTIVE/wiki/link-to-sibling"
ln -s "$SYM_SIBLING/wiki/leaf.md" "$SYM_ACTIVE/wiki/leaf.md"
ln -s "$SYM_OUTSIDE" "$SYM_ACTIVE/wiki/link-to-outside"

SYM=(
  "$SYM_ACTIVE/wiki/real.md|ALLOW [vault]"
  "$SYM_ACTIVE/wiki/link-to-sibling/wiki/x.md|BLOCK [cross-vault]"
  "$SYM_ACTIVE/wiki/leaf.md|BLOCK [cross-vault]"
  "$SYM_ACTIVE/wiki/link-to-sibling/.env|BLOCK [deny:**/.env]"
  "$SYM_ACTIVE/wiki/link-to-outside/x.md|BLOCK [outside-vault]"
)
sym_count=0
for row in "${SYM[@]}"; do
  IFS='|' read -r p expected <<<"$row"
  a=$(eng_verdict --file "$p" --target "$SYM_ACTIVE" --other-vaults "$SYM_SIBLING")
  a=$(printf '%s' "$a" | sed "s| ${p}\$||")
  check_golden "symlink $(basename "$p")" "$a" "$expected"
  sym_count=$((sym_count + 1))
done

total=$((base_count + cross_count + sym_count))
if [ "$fail" -eq 0 ]; then
  echo "OK: engine firewall == golden verdict table (${base_count} baseline + ${cross_count} cross-vault + ${sym_count} symlink-escape = $total total)"
  exit 0
fi
exit 1

#!/bin/bash
# Gate 11 — the bash firewall hook (scripts/firewall.sh) agrees with the engine
# `firewall check` on a fixed set of paths. Keeps the hot-path bash twin honest.
#
# Also validates the S3 cross-vault confinement matrix: both twins must produce
# identical verdicts for active-vault writes, sibling-vault writes, deny globs
# inside a sibling, and outside-all paths.
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

# ── S3 cross-vault confinement matrix ────────────────────────────────────────
# Set up a temporary sibling vault to exercise the cross-vault rule in both
# twins. The TS engine receives otherVaults via --other-vaults; the bash hook
# reads CLAUDE_WIKI_PAGES_OTHER_VAULTS.
SIBLING_DIR="$(mktemp -d)"
trap 'rm -rf "$SIBLING_DIR"' EXIT

CROSS_MATRIX=(
  # [file path]                          [expected ALLOW/BLOCK] [expected rule substring]
  "$VABS/wiki/active.md"                 "ALLOW"                "vault"
  "$SIBLING_DIR/wiki/page.md"            "BLOCK"                "cross-vault"
  "$SIBLING_DIR/.env"                    "BLOCK"                "deny"
  "/etc/hostname"                        "BLOCK"                "outside"
)

i=0
while [ $i -lt ${#CROSS_MATRIX[@]} ]; do
  p="${CROSS_MATRIX[$i]}"
  expected_verdict="${CROSS_MATRIX[$((i+1))]}"
  expected_rule="${CROSS_MATRIX[$((i+2))]}"
  i=$((i+3))

  # bash twin: pass sibling as env var
  b=$(CLAUDE_WIKI_PAGES_OTHER_VAULTS="$SIBLING_DIR" \
      bash scripts/firewall.sh --file "$p" --target "$VAULT" 2>/dev/null | \
      sed 's/ (mode=.*//')
  # TS engine twin: pass sibling via --other-vaults flag
  e=$(bun src/cli/cli.ts firewall --file "$p" --target "$VAULT" \
      --other-vaults "$SIBLING_DIR" 2>/dev/null | \
      sed 's/ (mode=.*//')

  # Both must produce the same verdict
  if [ "$b" != "$e" ]; then
    echo "FAIL cross-vault parity: $p"
    echo "  bash:   $b"
    echo "  engine: $e"
    fail=1
    continue
  fi

  # Verdict must match expected
  case "$b" in
    "${expected_verdict}"*) ;;
    *)
      echo "FAIL cross-vault verdict: $p — expected $expected_verdict, got $b"
      fail=1
      ;;
  esac

  # Rule substring must appear
  case "$b" in
    *"${expected_rule}"*) ;;
    *)
      echo "FAIL cross-vault rule: $p — expected rule containing '$expected_rule', got $b"
      fail=1
      ;;
  esac
done

# ── F1 symlink-escape matrix ─────────────────────────────────────────────────
# A symlink INSIDE the active vault pointing at a sibling (or outside) must be
# dereferenced to its PHYSICAL location by BOTH twins, yielding identical
# verdicts. Uses a throwaway active vault so we can plant real symlinks.
SYM_ROOT="$(mktemp -d)"
trap 'rm -rf "$SIBLING_DIR" "$SYM_ROOT"' EXIT
SYM_ACTIVE="$SYM_ROOT/active"
SYM_SIBLING="$SYM_ROOT/sibling"
SYM_OUTSIDE="$SYM_ROOT/outside"
mkdir -p "$SYM_ACTIVE/wiki" "$SYM_SIBLING/wiki" "$SYM_OUTSIDE"
ln -s "$SYM_SIBLING" "$SYM_ACTIVE/wiki/link-to-sibling"       # dir symlink -> sibling
ln -s "$SYM_SIBLING/wiki/leaf.md" "$SYM_ACTIVE/wiki/leaf.md"  # leaf symlink -> sibling file
ln -s "$SYM_OUTSIDE" "$SYM_ACTIVE/wiki/link-to-outside"       # dir symlink -> outside

SYM_MATRIX=(
  # [file path]                                          [expected ALLOW/BLOCK] [rule substring]
  "$SYM_ACTIVE/wiki/real.md"                             "ALLOW"                "vault"
  "$SYM_ACTIVE/wiki/link-to-sibling/wiki/x.md"           "BLOCK"                "cross-vault"
  "$SYM_ACTIVE/wiki/leaf.md"                             "BLOCK"                "cross-vault"
  "$SYM_ACTIVE/wiki/link-to-sibling/.env"                "BLOCK"                "deny"
  "$SYM_ACTIVE/wiki/link-to-outside/x.md"                "BLOCK"                "outside"
)

i=0
while [ $i -lt ${#SYM_MATRIX[@]} ]; do
  p="${SYM_MATRIX[$i]}"
  expected_verdict="${SYM_MATRIX[$((i + 1))]}"
  expected_rule="${SYM_MATRIX[$((i + 2))]}"
  i=$((i + 3))

  # Both twins: active vault = SYM_ACTIVE, other vaults = SYM_SIBLING.
  b=$(CLAUDE_WIKI_PAGES_OTHER_VAULTS="$SYM_SIBLING" \
    bash scripts/firewall.sh --file "$p" --target "$SYM_ACTIVE" 2>/dev/null |
    sed 's/ (mode=.*//')
  e=$(bun src/cli/cli.ts firewall --file "$p" --target "$SYM_ACTIVE" \
    --other-vaults "$SYM_SIBLING" 2>/dev/null |
    sed 's/ (mode=.*//')

  if [ "$b" != "$e" ]; then
    echo "FAIL symlink-escape parity: $p"
    echo "  bash:   $b"
    echo "  engine: $e"
    fail=1
    continue
  fi

  case "$b" in
    "${expected_verdict}"*) ;;
    *)
      echo "FAIL symlink-escape verdict: $p — expected $expected_verdict, got $b"
      fail=1
      ;;
  esac
  case "$b" in
    *"${expected_rule}"*) ;;
    *)
      echo "FAIL symlink-escape rule: $p — expected rule containing '$expected_rule', got $b"
      fail=1
      ;;
  esac
done

cross_count=$((${#CROSS_MATRIX[@]} / 3))
sym_count=$((${#SYM_MATRIX[@]} / 3))
total=$((${#PATHS[@]} + cross_count + sym_count))
if [ "$fail" -eq 0 ]; then
  echo "OK: bash firewall == engine firewall (${#PATHS[@]} baseline + ${cross_count} cross-vault + ${sym_count} symlink-escape = $total total)"
  exit 0
fi
exit 1

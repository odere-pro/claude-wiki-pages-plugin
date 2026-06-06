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
  "$VABS/wiki/active.md" "ALLOW" "vault"
  "$SIBLING_DIR/wiki/page.md" "BLOCK" "cross-vault"
  "$SIBLING_DIR/.env" "BLOCK" "deny"
  "/etc/hostname" "BLOCK" "outside"
)

i=0
while [ $i -lt ${#CROSS_MATRIX[@]} ]; do
  p="${CROSS_MATRIX[$i]}"
  expected_verdict="${CROSS_MATRIX[$((i + 1))]}"
  expected_rule="${CROSS_MATRIX[$((i + 2))]}"
  i=$((i + 3))

  # bash twin: pass sibling as env var
  b=$(CLAUDE_WIKI_PAGES_OTHER_VAULTS="$SIBLING_DIR" \
    bash scripts/firewall.sh --file "$p" --target "$VAULT" 2>/dev/null |
    sed 's/ (mode=.*//')
  # TS engine twin: pass sibling via --other-vaults flag
  e=$(bun src/cli/cli.ts firewall --file "$p" --target "$VAULT" \
    --other-vaults "$SIBLING_DIR" 2>/dev/null |
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
ln -s "$SYM_SIBLING" "$SYM_ACTIVE/wiki/link-to-sibling"      # dir symlink -> sibling
ln -s "$SYM_SIBLING/wiki/leaf.md" "$SYM_ACTIVE/wiki/leaf.md" # leaf symlink -> sibling file
ln -s "$SYM_OUTSIDE" "$SYM_ACTIVE/wiki/link-to-outside"      # dir symlink -> outside

SYM_MATRIX=(
  # [file path]                                          [expected ALLOW/BLOCK] [rule substring]
  "$SYM_ACTIVE/wiki/real.md" "ALLOW" "vault"
  "$SYM_ACTIVE/wiki/link-to-sibling/wiki/x.md" "BLOCK" "cross-vault"
  "$SYM_ACTIVE/wiki/leaf.md" "BLOCK" "cross-vault"
  "$SYM_ACTIVE/wiki/link-to-sibling/.env" "BLOCK" "deny"
  "$SYM_ACTIVE/wiki/link-to-outside/x.md" "BLOCK" "outside"
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

# ── PM.2 fail-closed registry fixtures (OQ-9) ─────────────────────────────────
# Four fixtures that prove both twins agree on fail-closed behaviour.
# Parity contract for fixtures (a) and (b): when _vaults_read exits non-zero,
# firewall.sh internally makes OTHER_VAULTS contain the active vault root, which
# blocks all writes (cross-vault fires before the vault allow). The TS twin is
# driven with --other-vaults set to the active vault path to match that contract.
# Fixture (c): no vaults key → tier-4 fallback, active vault ALLOWED. Both twins.
# Fixture (d): 3-vault registry, no CLAUDE_WIKI_PAGES_OTHER_VAULTS → non-active
#              vaults BLOCKED, active ALLOWED. Both twins read/derive from registry.

FC_TMP="$(mktemp -d)"
trap 'rm -rf "$SIBLING_DIR" "$SYM_ROOT" "$FC_TMP"' EXIT
FC_ACTIVE="$FC_TMP/active"
FC_V2="$FC_TMP/vault2"
FC_V3="$FC_TMP/vault3"
mkdir -p "$FC_ACTIVE/wiki" "$FC_V2/wiki" "$FC_V3/wiki"
FC_SETTINGS_DIR="$FC_TMP/.claude/claude-wiki-pages"
mkdir -p "$FC_SETTINGS_DIR"
FC_SETTINGS="$FC_SETTINGS_DIR/settings.json"

fc_fail=0
fc_count=0

_fc_check() {
  # $1=label $2=bash_verdict $3=ts_verdict $4=expected (ALLOW|BLOCK)
  local label="$1" bash_v="$2" ts_v="$3" expected="$4"
  fc_count=$((fc_count + 1))
  if [ "$bash_v" != "$ts_v" ]; then
    echo "FAIL PM.2 parity [$label]: bash='$bash_v' ts='$ts_v'"
    fc_fail=$((fc_fail + 1))
    fail=1
    return
  fi
  case "$bash_v" in
    "${expected}"*) ;;
    *)
      echo "FAIL PM.2 verdict [$label]: expected $expected, got '$bash_v'"
      fc_fail=$((fc_fail + 1))
      fail=1
      ;;
  esac
}

# ── Fixture (a): malformed JSON in vaults → active vault BLOCKED ───────────────
printf '{"default_vault_path":"%s","current_vault_path":"%s","vaults":[INVALID}' \
  "$FC_ACTIVE" "$FC_ACTIVE" >"$FC_SETTINGS"

# Bash twin: settings file has malformed JSON; no CLAUDE_WIKI_PAGES_OTHER_VAULTS.
# _vaults_read must exit non-zero → firewall.sh must fail-closed → BLOCK.
b_a=$(CLAUDE_WIKI_PAGES_SETTINGS_FILE="$FC_SETTINGS" \
  bash "$ROOT/scripts/firewall.sh" --file "$FC_ACTIVE/wiki/page.md" \
  --target "$FC_ACTIVE" 2>/dev/null | sed 's/ (mode=.*//')
# TS twin: parity contract — pass active vault as an other-vault so cross-vault fires.
e_a=$(bun "$ROOT/src/cli/cli.ts" firewall \
  --file "$FC_ACTIVE/wiki/page.md" --target "$FC_ACTIVE" \
  --other-vaults "$FC_ACTIVE" 2>/dev/null | sed 's/ (mode=.*//')

_fc_check "malformed-JSON active-blocked (bash)" "$b_a" "BLOCK [cross-vault] $FC_ACTIVE/wiki/page.md" "BLOCK"
_fc_check "malformed-JSON active-blocked (ts)" "$e_a" "BLOCK [cross-vault] $FC_ACTIVE/wiki/page.md" "BLOCK"

# ── Fixture (b): current_vault_path ∉ vaults[] → active vault BLOCKED ──────────
printf '{"default_vault_path":"%s","current_vault_path":"%s","vaults":[{"path":"%s","name":"other"}]}' \
  "$FC_ACTIVE" "$FC_ACTIVE" "$FC_V2" >"$FC_SETTINGS"

b_b=$(CLAUDE_WIKI_PAGES_SETTINGS_FILE="$FC_SETTINGS" \
  bash "$ROOT/scripts/firewall.sh" --file "$FC_ACTIVE/wiki/page.md" \
  --target "$FC_ACTIVE" 2>/dev/null | sed 's/ (mode=.*//')
e_b=$(bun "$ROOT/src/cli/cli.ts" firewall \
  --file "$FC_ACTIVE/wiki/page.md" --target "$FC_ACTIVE" \
  --other-vaults "$FC_ACTIVE" 2>/dev/null | sed 's/ (mode=.*//')

_fc_check "not-in-vaults active-blocked (bash)" "$b_b" "BLOCK [cross-vault] $FC_ACTIVE/wiki/page.md" "BLOCK"
_fc_check "not-in-vaults active-blocked (ts)" "$e_b" "BLOCK [cross-vault] $FC_ACTIVE/wiki/page.md" "BLOCK"

# ── Fixture (c): no vaults key → tier-4 fallback, active vault ALLOWED ─────────
printf '{"default_vault_path":"%s","current_vault_path":"%s"}' \
  "$FC_ACTIVE" "$FC_ACTIVE" >"$FC_SETTINGS"

b_c=$(CLAUDE_WIKI_PAGES_SETTINGS_FILE="$FC_SETTINGS" \
  bash "$ROOT/scripts/firewall.sh" --file "$FC_ACTIVE/wiki/page.md" \
  --target "$FC_ACTIVE" 2>/dev/null | sed 's/ (mode=.*//')
e_c=$(bun "$ROOT/src/cli/cli.ts" firewall \
  --file "$FC_ACTIVE/wiki/page.md" --target "$FC_ACTIVE" \
  2>/dev/null | sed 's/ (mode=.*//')

_fc_check "no-vaults-key fallback (bash)" "$b_c" "ALLOW [vault] $FC_ACTIVE/wiki/page.md" "ALLOW"
_fc_check "no-vaults-key fallback (ts)" "$e_c" "ALLOW [vault] $FC_ACTIVE/wiki/page.md" "ALLOW"

# ── Fixture (d): N=3 vaults, no env override → non-active BLOCKED, active ALLOWED
printf '{"default_vault_path":"%s","current_vault_path":"%s","vaults":[{"path":"%s","name":"active"},{"path":"%s","name":"v2"},{"path":"%s","name":"v3"}]}' \
  "$FC_ACTIVE" "$FC_ACTIVE" "$FC_ACTIVE" "$FC_V2" "$FC_V3" >"$FC_SETTINGS"

# bash: non-active vault write BLOCKED (no env var — reads from registry)
b_d_block=$(CLAUDE_WIKI_PAGES_SETTINGS_FILE="$FC_SETTINGS" \
  bash "$ROOT/scripts/firewall.sh" --file "$FC_V2/wiki/page.md" \
  --target "$FC_ACTIVE" 2>/dev/null | sed 's/ (mode=.*//')
# TS: pass the two non-active vaults as other-vaults
e_d_block=$(bun "$ROOT/src/cli/cli.ts" firewall \
  --file "$FC_V2/wiki/page.md" --target "$FC_ACTIVE" \
  --other-vaults "$FC_V2:$FC_V3" 2>/dev/null | sed 's/ (mode=.*//')

_fc_check "3-vault non-active blocked" "$b_d_block" "$e_d_block" "BLOCK"

# bash: active vault write ALLOWED
b_d_allow=$(CLAUDE_WIKI_PAGES_SETTINGS_FILE="$FC_SETTINGS" \
  bash "$ROOT/scripts/firewall.sh" --file "$FC_ACTIVE/wiki/page.md" \
  --target "$FC_ACTIVE" 2>/dev/null | sed 's/ (mode=.*//')
e_d_allow=$(bun "$ROOT/src/cli/cli.ts" firewall \
  --file "$FC_ACTIVE/wiki/page.md" --target "$FC_ACTIVE" \
  --other-vaults "$FC_V2:$FC_V3" 2>/dev/null | sed 's/ (mode=.*//')

_fc_check "3-vault active allowed" "$b_d_allow" "$e_d_allow" "ALLOW"

# Proof: __FAIL_CLOSED__ token never reaches registry_other_vaults stdout.
# Source resolve-vault.sh and call registry_other_vaults with the malformed
# settings file — its stdout must contain only vault paths (no sentinel token).
printf '{"default_vault_path":"%s","current_vault_path":"%s","vaults":[INVALID}' \
  "$FC_ACTIVE" "$FC_ACTIVE" >"$FC_SETTINGS"
rov_stdout=$(CLAUDE_WIKI_PAGES_SETTINGS_FILE="$FC_SETTINGS" \
  bash -c "source '$ROOT/scripts/resolve-vault.sh'; registry_other_vaults" 2>/dev/null || true)
if printf '%s' "$rov_stdout" | grep -q '__FAIL_CLOSED__'; then
  echo "FAIL PM.2 invariant: __FAIL_CLOSED__ token leaked into registry_other_vaults stdout"
  fc_fail=$((fc_fail + 1))
  fail=1
fi

total=$((${#PATHS[@]} + cross_count + sym_count + fc_count))
if [ "$fail" -eq 0 ]; then
  echo "OK: bash firewall == engine firewall (${#PATHS[@]} baseline + ${cross_count} cross-vault + ${sym_count} symlink-escape + ${fc_count} PM.2-fail-closed = $total total)"
  exit 0
fi
exit 1

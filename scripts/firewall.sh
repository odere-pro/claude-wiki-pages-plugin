#!/bin/bash
# PreToolUse: confines Write/Edit to the resolved vault (+ firewall.allowPaths),
# minus firewall.denyPaths. The hot-path bash twin of `engine firewall check`;
# tests/gates/gate-11-firewall-parity.sh pins the two together.
#
# Hook mode: reads tool JSON from stdin, emits {"decision":"block",...} on a
# rejected out-of-vault write. CLI mode (--file <path> [--target <vault>]) prints
# ALLOW/BLOCK and exits 0/1 — used by the parity gate.
#
# Decided entirely in bash (no Bun spawn per write). Globs are simple (`*`/`**`)
# to stay in lock-step with core/firewall.ts.
#
# shellcheck source=resolve-vault.sh
source "$(dirname "$0")/resolve-vault.sh"
# shellcheck source=lib-validate-gate.sh
source "$(dirname "$0")/lib-validate-gate.sh"

# B01 / strict mode: set -euo pipefail so any unset variable or failing command
# aborts the script rather than silently expanding to empty.
# The sourceable libs are loaded BEFORE strict mode is enabled — they are
# designed to omit set -euo pipefail so they do not mutate the caller's options
# (see scripts/CLAUDE.md "Sourceable vs. executable"). Strict mode here governs
# only the operational code that follows — the arg-parsing loop, the decide()
# function, and the hook/CLI dispatch blocks where an unset $VAULT_ABS must be
# caught explicitly rather than silently expanding to empty.
set -euo pipefail
VAULT=$(resolve_vault)

CLI_FILE=""
CLI_MODE=0
JSON_MODE=0
while [ $# -gt 0 ]; do
  case "$1" in
    --target)
      VAULT="${2%/}"
      shift 2
      ;;
    --file)
      CLI_FILE="$2"
      CLI_MODE=1
      shift 2
      ;;
    --json)
      JSON_MODE=1
      shift
      ;;
    *) shift ;;
  esac
done

# Other registered vault roots for cross-vault confinement (one per line).
# DEFAULT: derived from the registry itself (vaults[] minus current_vault_path)
# so the cross-vault rule is active in the real PreToolUse hook with no env var.
# OVERRIDE: CLAUDE_WIKI_PAGES_OTHER_VAULTS (colon-separated) wins when set — used
# by the parity gate and for explicit control. registry_other_vaults is
# read-only (never mutates settings — the firewall hook must not write).
#
# Fail-closed (ADR-0016 N4): when registry_other_vaults exits non-zero (malformed
# JSON or current_vault_path ∉ vaults[]), the __FAIL_CLOSED__ state is engaged:
# OTHER_VAULTS is set to the active vault path so the cross-vault check fires for
# every write — including to the active vault — yielding ZERO writable roots.
# The __FAIL_CLOSED__ token is scoped entirely inside this script; it is NEVER
# emitted from registry_other_vaults into the path-list stdout contract (N4).
__FAIL_CLOSED__=0
if [ -n "${CLAUDE_WIKI_PAGES_OTHER_VAULTS:-}" ]; then
  OTHER_VAULTS=$(printf '%s\n' "$CLAUDE_WIKI_PAGES_OTHER_VAULTS" | tr ':' '\n')
else
  # B01: with set -e active, a failing $(registry_other_vaults) would abort the
  # script before the exit-code check. Capture via || rc=$? to keep set -e but
  # still handle the fail-closed case explicitly.
  _ov_rc=0
  OTHER_VAULTS=$(registry_other_vaults) || _ov_rc=$?
  if [ "$_ov_rc" -ne 0 ]; then
    __FAIL_CLOSED__=1
    # Use the active vault path as a sentinel OTHER_VAULT so cross-vault fires
    # for every write, including to the active vault — zero writable roots.
    OTHER_VAULTS="$VAULT"
  fi
fi

# ── config (project overrides user; defaults when absent) ───────────────────────
PROJECT_CFG=".claude/claude-wiki-pages.json"
USER_CFG="${CLAUDE_CONFIG_DIR:-$HOME/.config}/claude-wiki-pages/config.json"

cfg_scalar() { # $1 = jq path; echoes first defined value across project, then user
  local filter="$1" val=""
  [ -f "$PROJECT_CFG" ] && val=$(jq -r "${filter} // empty" "$PROJECT_CFG" 2>/dev/null)
  if [ -z "$val" ] && [ -f "$USER_CFG" ]; then
    val=$(jq -r "${filter} // empty" "$USER_CFG" 2>/dev/null)
  fi
  printf '%s' "$val"
}

cfg_array() { # $1 = jq path; echoes array items (one per line) from project, else user
  local filter="$1" out=""
  if [ -f "$PROJECT_CFG" ] && jq -e "${filter}" "$PROJECT_CFG" >/dev/null 2>&1; then
    out=$(jq -r "${filter}[]?" "$PROJECT_CFG" 2>/dev/null)
  elif [ -f "$USER_CFG" ] && jq -e "${filter}" "$USER_CFG" >/dev/null 2>&1; then
    out=$(jq -r "${filter}[]?" "$USER_CFG" 2>/dev/null)
  fi
  printf '%s' "$out"
}

ENABLED=$(cfg_scalar '.firewall.enabled')
[ -z "$ENABLED" ] && ENABLED="true"
MODE=$(cfg_scalar '.firewall.mode')
[ -z "$MODE" ] && MODE="enforce"

ALLOW_PATHS=$(cfg_array '.firewall.allowPaths')
DENY_PATHS=$(cfg_array '.firewall.denyPaths')
if [ -z "$DENY_PATHS" ]; then
  DENY_PATHS=$'**/.ssh/**\n**/.aws/**\n**/.env\n**/.git/config'
fi

# ── helpers ─────────────────────────────────────────────────────────────────────
glob_to_regex() { # mirror core/firewall.ts globToRegExp: ** -> .*, * -> [^/]*
  local glob="$1" re="" i c n
  n=${#glob}
  for ((i = 0; i < n; i++)); do
    c="${glob:i:1}"
    if [ "$c" = "*" ]; then
      if [ "${glob:i+1:1}" = "*" ]; then
        re+=".*"
        i=$((i + 1))
      else
        re+="[^/]*"
      fi
    elif [[ "$c" == [\\^\$.\|\?\+\(\)\[\]\{\}] ]]; then
      re+="\\$c"
    else
      re+="$c"
    fi
  done
  printf '^%s$' "$re"
}

is_under() { # $1 = path, $2 = root
  case "$1" in
    "$2" | "$2"/*) return 0 ;;
    *) return 1 ;;
  esac
}

matches() { # $1 = path, $2 = entry (glob if it contains *, else dir prefix)
  case "$2" in
    *'*'*)
      local re
      re=$(glob_to_regex "$2")
      [[ "$1" =~ $re ]]
      ;;
    *) is_under "$1" "$2" ;;
  esac
}

# Lexical normalizer mirroring node:path resolve()'s "." / ".." / "//" collapse.
# Pure string; does not touch the filesystem. resolve() collapses ".." BEFORE
# any symlink deref, so _realpath_physical normalizes first to stay byte-parity.
_normalize() {
  local p="$1"
  case "$p" in
    /*) ;;
    *) p="$(pwd)/$p" ;;
  esac
  local IFS='/'
  local seg
  local -a out=()
  for seg in $p; do
    case "$seg" in
      "" | ".") ;;
      "..")
        if [ "${#out[@]}" -gt 0 ]; then
          unset 'out[${#out[@]}-1]'
        fi
        ;;
      *) out+=("$seg") ;;
    esac
  done
  local result="/"
  local i
  for i in "${out[@]}"; do
    result="${result}${i}/"
  done
  [ "$result" != "/" ] && result="${result%/}"
  printf '%s' "$result"
}

# Reduce a path to its PHYSICAL location: dereference symlinks (including a
# dangling leaf and symlinked ancestors) while tolerating a non-existent tail
# (the write target may be a new file). Mirrors physicalPath() in
# src/core/firewall.ts byte-for-byte. When nothing on the path exists yet
# (e.g. a fictional test root), this degrades to a lexical resolution.
#
# Strategy: lexically normalize "." / ".." first (matching resolve()); peel the
# non-existent (or non-symlink-leaf) tail until we reach an existing-or-symlink
# component; deref leaf symlinks iteratively (dangling allowed, peeling any newly
# missing tail each round); resolve the surviving component's physical dir with
# `pwd -P`; re-attach the peeled tail.
_realpath_physical() {
  local target
  target="$(_normalize "$1")"
  local tail=""
  # Walk up to the longest existing-or-symlink ancestor. A dangling symlink
  # fails -e but must still be dereferenced, so test -L too.
  while [ ! -e "$target" ] && [ ! -L "$target" ] && [ "$target" != "/" ] && [ "$target" != "." ]; do
    tail="$(basename "$target")${tail:+/}$tail"
    target="$(dirname "$target")"
  done
  # B04: named constant for the symlink-loop guard. POSIX allows at most 8 levels
  # of symlink indirection; Linux raises this to 40 (MAXSYMLINKS in limits.h).
  # We mirror the kernel ceiling so the loop terminates on any real filesystem
  # while still catching artificially deep chains in adversarial inputs.
  local _SYMLINK_LOOP_MAX=40
  # Iteratively dereference leaf symlinks (dangling allowed).
  local guard=0
  while [ -L "$target" ] && [ "$guard" -lt "$_SYMLINK_LOOP_MAX" ]; do
    local link
    link="$(readlink "$target")"
    case "$link" in
      /*) target="$link" ;;
      *) target="$(dirname "$target")/$link" ;;
    esac
    guard=$((guard + 1))
    while [ ! -e "$target" ] && [ ! -L "$target" ] && [ "$target" != "/" ] && [ "$target" != "." ]; do
      tail="$(basename "$target")${tail:+/}$tail"
      target="$(dirname "$target")"
    done
  done
  # Resolve the physical directory of the surviving component.
  local phys
  if [ -d "$target" ]; then
    phys="$(cd "$target" 2>/dev/null && pwd -P)"
  else
    phys="$(cd "$(dirname "$target")" 2>/dev/null && pwd -P)/$(basename "$target")"
  fi
  [ -z "$phys" ] && phys="$target"
  if [ -n "$tail" ]; then
    printf '%s/%s' "$phys" "$tail"
  else
    printf '%s' "$phys"
  fi
}

# Returns: "allow <rule>" or "block <rule>"
decide() {
  local raw_file="$1"
  # Reduce to the PHYSICAL path (resolves ".." AND dereferences symlinks) so a
  # symlink inside the active vault that points at a sibling cannot smuggle a
  # write out. Mirrors physicalPath() in src/core/firewall.ts.
  local file
  file=$(_realpath_physical "$raw_file")
  [ -z "$file" ] && file="$raw_file"

  if [ "$ENABLED" != "true" ]; then
    echo "allow disabled"
    return
  fi
  if [ "$MODE" = "off" ]; then
    echo "allow off"
    return
  fi
  local entry
  while IFS= read -r entry; do
    [ -z "$entry" ] && continue
    if matches "$file" "$entry"; then
      [ "$MODE" = "warn" ] && echo "allow deny:${entry}" || echo "block deny:${entry}"
      return
    fi
  done <<<"$DENY_PATHS"

  # Cross-vault: writes to a sibling registered vault are blocked even if that
  # vault is also listed in allowPaths.  Mirrors src/core/firewall.ts exactly.
  # Precedence: deny > cross-vault > vault > allowPaths > outside-vault.
  # Each sibling root is reduced to its physical path so $file (also physical)
  # is compared in the same namespace.
  if [ -n "$OTHER_VAULTS" ]; then
    local ov ov_abs
    while IFS= read -r ov; do
      [ -z "$ov" ] && continue
      ov_abs=$(_realpath_physical "$ov")
      [ -z "$ov_abs" ] && ov_abs="$ov"
      if is_under "$file" "$ov_abs"; then
        [ "$MODE" = "warn" ] && echo "allow cross-vault" || echo "block cross-vault"
        return
      fi
    done <<<"$OTHER_VAULTS"
  fi

  if is_under "$file" "$VAULT_ABS"; then
    echo "allow vault"
    return
  fi
  while IFS= read -r entry; do
    [ -z "$entry" ] && continue
    if matches "$file" "$entry"; then
      echo "allow allow:${entry}"
      return
    fi
  done <<<"$ALLOW_PATHS"

  [ "$MODE" = "warn" ] && echo "allow outside-vault" || echo "block outside-vault"
}

# ── Early arg validation: --json requires --file ─────────────────────────────
if [ "$JSON_MODE" -eq 1 ] && [ "$CLI_MODE" -eq 0 ]; then
  exit 2
fi

# Resolve the vault to its PHYSICAL absolute path (pwd -P dereferences symlinks)
# so it is compared in the same namespace as the physical write target. If it
# does not exist, firewall cannot meaningfully confine to it (e.g. pre-scaffold)
# — allow and exit.
# B01: with set -e active, a failing $(cd ...) would abort the script. Use || true
# so the assignment always succeeds (empty VAULT_ABS is handled by the next check).
VAULT_ABS=$(cd "$VAULT" 2>/dev/null && pwd -P) || true
if [ -z "$VAULT_ABS" ]; then
  if [ "$JSON_MODE" -eq 1 ]; then
    printf '{"findings":[]}\n'
    exit 0
  fi
  [ "$CLI_MODE" -eq 1 ] && echo "ALLOW [no-vault] $CLI_FILE (mode=$MODE)"
  exit 0
fi

# ── CLI mode ────────────────────────────────────────────────────────────────────

if [ "$CLI_MODE" -eq 1 ]; then
  read -r verdict rule <<<"$(decide "$CLI_FILE")"
  if [ "$JSON_MODE" -eq 1 ]; then
    if [ "$verdict" = "allow" ]; then
      printf '{"findings":[]}\n'
      exit 0
    fi
    # Blocked: emit a Finding-shaped envelope using jq (firewall keeps its existing jq).
    msg=$(printf 'firewall: write blocked by %s rule for path: %s (mode=%s)' "$rule" "$CLI_FILE" "$MODE")
    jq -cn --arg sev "error" --arg check "firewall" --arg msg "$msg" --arg file "$CLI_FILE" \
      '{"findings":[{"severity":$sev,"check":$check,"message":$msg,"file":$file}]}'
    exit 1
  fi
  if [ "$verdict" = "allow" ]; then
    echo "ALLOW [$rule] $CLI_FILE (mode=$MODE)"
    exit 0
  fi
  echo "BLOCK [$rule] $CLI_FILE (mode=$MODE)"
  exit 1
fi

# ── hook mode (stdin) ─────────────────────────────────────────────────────────────
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.file // empty')
[ -z "$FILE_PATH" ] && exit 0

read -r verdict rule <<<"$(decide "$FILE_PATH")"
if [ "$verdict" = "block" ]; then
  # B03: redact the absolute vault path (which contains the username) from the
  # user-facing reason. Emit only the basename of the active vault so the message
  # is useful without exposing internal filesystem paths.
  _vault_display=$(basename "$VAULT_ABS")
  if [ "$rule" = "cross-vault" ]; then
    _reason="firewall: writes are confined to the active vault (${_vault_display}/); target belongs to a different registered vault. Blocked by cross-vault rule. Switch vaults first to write there."
  else
    _reason="firewall: writes are confined to the vault (${_vault_display}/). Blocked by ${rule}. Add the path to firewall.allowPaths to permit it."
  fi
  # B02: use emit_block_decision (jq --arg) — never interpolate into a shell
  # string. jq escapes backslash/newline/tab/C0 control chars automatically.
  emit_block_decision "$_reason"
elif [ "$rule" = "outside-vault" ] || [[ "$rule" == deny:* ]] || [ "$rule" = "cross-vault" ]; then
  # warn mode: advise on stderr, do not block
  echo "firewall (warn): ${FILE_PATH} is outside the vault ($rule)" >&2
fi
exit 0

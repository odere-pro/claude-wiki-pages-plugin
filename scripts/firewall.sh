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

# shellcheck source=resolve-vault.sh
source "$(dirname "$0")/resolve-vault.sh"
VAULT=$(resolve_vault)

CLI_FILE=""
CLI_MODE=0
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
    *) shift ;;
  esac
done

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

# Returns: "allow <rule>" or "block <rule>"
decide() {
  local file="$1"
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

# Resolve the vault to an absolute path; if it does not exist, firewall cannot
# meaningfully confine to it (e.g. pre-scaffold) — allow and exit.
VAULT_ABS=$(cd "$VAULT" 2>/dev/null && pwd)
if [ -z "$VAULT_ABS" ]; then
  [ "$CLI_MODE" -eq 1 ] && echo "ALLOW [no-vault] $CLI_FILE (mode=$MODE)"
  exit 0
fi

# ── CLI mode ────────────────────────────────────────────────────────────────────
if [ "$CLI_MODE" -eq 1 ]; then
  read -r verdict rule <<<"$(decide "$CLI_FILE")"
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
  reason="firewall: writes are confined to the vault ($VAULT_ABS). Blocked by ${rule}. Add the path to firewall.allowPaths to permit it."
  escaped=$(printf '%s' "$reason" | sed 's/"/\\"/g')
  echo "{\"decision\":\"block\",\"reason\":\"${escaped}\"}"
elif [ "$rule" = "outside-vault" ] || [[ "$rule" == deny:* ]]; then
  # warn mode: advise on stderr, do not block
  echo "firewall (warn): ${FILE_PATH} is outside the vault ($rule)" >&2
fi
exit 0

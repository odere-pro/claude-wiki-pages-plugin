#!/bin/bash
# PreToolUse: blocks edits to existing files in <vault>/raw/ (sources are immutable)
# Vault resolved via CLAUDE_WIKI_PAGES_VAULT, auto-detection, or default (docs/vault)
# Allows Write to NEW files (adding sources), blocks Edit to existing files
set -euo pipefail

# shellcheck source=resolve-vault.sh
source "$(dirname "$0")/resolve-vault.sh"
VAULT=$(resolve_vault)
VAULT_NAME=$(basename "${VAULT}")

INPUT=$(cat)
TOOL=$(echo "${INPUT}" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "${INPUT}" | jq -r '.tool_input.file_path // .tool_input.file // empty')

# No target path — nothing to guard.
[ -n "${FILE_PATH}" ] || exit 0

# Canonicalize before the boundary check so a traversal (raw/../..) or a symlink
# cannot slip past the glob. The target may not exist yet (Write of a new source),
# so resolve the directory and re-append the basename instead of requiring the
# whole path to exist. Runs in this command-substitution subshell, so the `cd`
# does not affect the caller.
canonicalize() {
  local target="$1" dir base resolved
  dir=$(dirname "${target}")
  base=$(basename "${target}")
  if cd "${dir}" 2>/dev/null; then
    resolved=$(pwd -P)
    printf '%s/%s\n' "${resolved}" "${base}"
  else
    printf '%s\n' "${target}"
  fi
}
CANONICAL_PATH=$(canonicalize "${FILE_PATH}")

# Default-deny: if the vault name cannot be resolved, do NOT let the boundary glob
# degenerate to */ /raw/* (which would silently match nothing and disable the gate).
# Fall back to guarding any */raw/* segment instead.
if [ -n "${VAULT_NAME}" ]; then
  case "${CANONICAL_PATH}" in
    */"${VAULT_NAME}"/raw/*) ;;
    *) exit 0 ;;
  esac
else
  case "${CANONICAL_PATH}" in
    */raw/*) ;;
    *) exit 0 ;;
  esac
fi

LABEL="${VAULT_NAME:-vault}/raw/"

# ── Sanctioned agent-session carve-out ──────────────────────────────────────
# PERMIT: Write to a NEW file whose canonical path falls under
#   */<vault>/raw/agent-sessions/
# AND whose FRONTMATTER block declares "source_type: agent-session"
# (anchored match: ^source_type:[[:space:]]*agent-session[[:space:]]*$).
#
# The marker check is scoped to the YAML frontmatter block only — the lines
# between the first `---` and the next `---`. A body line of the same shape does
# NOT grant fence entry, so a file whose frontmatter source_type is `paper`
# (or absent, or that has no frontmatter at all) cannot smuggle itself in by
# repeating the marker in its body.
#
# Everything else remains blocked:
#   - Edit under raw/ (including agent-sessions/) → still blocked below.
#   - Write overwriting any existing raw/ file → still blocked below.
#   - Write of a new file directly under raw/ (not in agent-sessions/) → falls
#     through to the existing new-source allow path (human sources unaffected).
#   - New file INSIDE the fence WITHOUT a frontmatter marker → blocked here
#     (fence is agent-session-only; the carve-out cannot be widened by a body
#     line or a non-agent-session source_type).
AGENT_SESSIONS_FENCE=""
if [ -n "${VAULT_NAME}" ]; then
  case "${CANONICAL_PATH}" in
    */"${VAULT_NAME}"/raw/agent-sessions/*) AGENT_SESSIONS_FENCE="1" ;;
  esac
else
  case "${CANONICAL_PATH}" in
    */raw/agent-sessions/*) AGENT_SESSIONS_FENCE="1" ;;
  esac
fi

# Extract only the leading YAML frontmatter block from content: the lines
# strictly between the first `---` (which must be the very first line) and the
# next `---`. Prints nothing when there is no frontmatter, so a body-only marker
# never reaches the grep. NR==1 guard ensures the opening fence is line 1.
extract_frontmatter() {
  awk '
    NR==1 && $0 !~ /^---[[:space:]]*$/ { exit }   # no opening fence on line 1
    NR==1 { infm=1; next }                        # consume the opening ---
    infm && $0 ~ /^---[[:space:]]*$/ { exit }      # closing fence ends the block
    infm { print }
  '
}

if [ "${TOOL}" = "Write" ] && [ -n "${AGENT_SESSIONS_FENCE}" ] && [ ! -f "${CANONICAL_PATH}" ]; then
  # Inside the fence, new file: require source_type: agent-session in FRONTMATTER.
  CONTENT=$(echo "${INPUT}" | jq -r '.tool_input.content // empty')
  FRONTMATTER=$(printf '%s\n' "${CONTENT}" | extract_frontmatter)
  if printf '%s\n' "${FRONTMATTER}" | grep -qE '^source_type:[[:space:]]*agent-session[[:space:]]*$'; then
    # Frontmatter marker present, new file, correct fence: PERMIT.
    exit 0
  else
    # Inside fence but frontmatter marker absent: block (fence is
    # agent-session-only; a body line of the same shape does not count).
    echo "{\"decision\":\"block\",\"reason\":\"Files under ${LABEL}agent-sessions/ must declare 'source_type: agent-session' in their YAML frontmatter (not just the body). This is the sanctioned carve-out for durable memory — use it only for agent-session sources.\"}"
    exit 0
  fi
fi
# ── End agent-session carve-out ──────────────────────────────────────────────

# Block Edit (modifying existing files). Allow Write (could be new source).
if [ "${TOOL}" = "Edit" ]; then
  echo "{\"decision\":\"block\",\"reason\":\"${LABEL} is immutable. Source files must not be modified after ingestion. Note corrections in the wiki page instead.\"}"
  exit 0
fi

# For Write, block if file already exists (overwriting a source)
if [ "${TOOL}" = "Write" ] && [ -f "${CANONICAL_PATH}" ]; then
  echo "{\"decision\":\"block\",\"reason\":\"Cannot overwrite existing source in ${LABEL}. Sources are immutable once added.\"}"
  exit 0
fi

exit 0

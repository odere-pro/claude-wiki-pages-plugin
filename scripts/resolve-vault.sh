#!/bin/bash
# Sourceable helper — defines resolve_vault(), init_vault_settings(), set_vault_path().
# Do NOT execute directly; source it from other scripts.
#
# Resolution order (first match wins):
#   1. CLAUDE_WIKI_PAGES_VAULT env var           — explicit override; good for local dev & CI.
#      (LLM_WIKI_VAULT is honoured as a deprecated fallback for one minor.)
#   2. .claude/claude-wiki-pages/settings.json      — persistent per-project vault path.
#   3. Auto-detect                               — find a dir with CLAUDE.md (schema_version) + wiki/
#   4. Default                                   — docs/vault
#
# All hook scripts source this file so vault resolution is consistent
# and can be tested in one place.
#
# Test override: export CLAUDE_WIKI_PAGES_SETTINGS_FILE=<path> before sourcing to redirect
# the settings file (prevents tests from touching the real project .claude/ dir).
#
# NOTE on strict mode: this file is *sourced*, not executed, so it deliberately does
# NOT run `set -euo pipefail` — doing so would mutate the calling shell's options and
# could abort unrelated callers on their first non-zero command. The functions below
# fail closed on their own (guarded writes, `2>/dev/null`, explicit returns); callers
# that need strict mode set it themselves before sourcing.

CLAUDE_WIKI_PAGES_DEFAULT_VAULT="docs/vault"
CLAUDE_WIKI_PAGES_SETTINGS="${CLAUDE_WIKI_PAGES_SETTINGS_FILE:-.claude/claude-wiki-pages/settings.json}"

resolve_vault() {
  # Self-heal: ensure settings.json exists on every resolution. SessionStart
  # is the primary creation path, but it may miss (plugin reinstall mid-session,
  # resumed sessions). Any hook that resolves the vault also reifies settings.
  init_vault_settings

  # 1. Explicit env var — used as-is (relative or absolute).
  #    LLM_WIKI_VAULT is the deprecated pre-1.0 name, still read as a fallback.
  local env_vault="${CLAUDE_WIKI_PAGES_VAULT:-${LLM_WIKI_VAULT:-}}"
  if [ -n "$env_vault" ]; then
    echo "$env_vault"
    return
  fi

  # 2. Settings file current_vault_path
  if [ -f "$CLAUDE_WIKI_PAGES_SETTINGS" ]; then
    local path
    path=$(awk -F'"' '/"current_vault_path"/{print $4}' "$CLAUDE_WIKI_PAGES_SETTINGS")
    if [ -n "$path" ]; then
      echo "$path"
      return
    fi
  fi

  # 3. Auto-detect: search up to 4 levels for a CLAUDE.md that declares
  #    schema_version alongside a wiki/ sibling directory.
  #    The two-signal check (frontmatter marker + wiki/ dir) avoids false
  #    positives from unrelated CLAUDE.md files in the project.
  local claude_md dir
  while IFS= read -r claude_md; do
    dir=$(dirname "$claude_md")
    if grep -q 'schema_version' "$claude_md" 2>/dev/null && [ -d "$dir/wiki" ]; then
      echo "$dir"
      return
    fi
  done < <(find . -maxdepth 4 -name "CLAUDE.md" 2>/dev/null | sort)

  # 4. Default
  echo "$CLAUDE_WIKI_PAGES_DEFAULT_VAULT"
}

# Create settings.json with default values if it does not yet exist.
# Fails gracefully: warns to stderr and returns without crashing if the
# directory cannot be created or the file cannot be written.
init_vault_settings() {
  [ -f "$CLAUDE_WIKI_PAGES_SETTINGS" ] && return
  if ! mkdir -p "$(dirname "$CLAUDE_WIKI_PAGES_SETTINGS")" 2>/dev/null; then
    printf '[claude-wiki-pages] WARN: cannot create settings directory — vault path will not persist across sessions\n' >&2
    return
  fi
  local content
  content=$(printf '{\n  "default_vault_path": "%s",\n  "current_vault_path": "%s"\n}\n' \
    "$CLAUDE_WIKI_PAGES_DEFAULT_VAULT" "$CLAUDE_WIKI_PAGES_DEFAULT_VAULT")
  if ! printf '%s' "$content" >"$CLAUDE_WIKI_PAGES_SETTINGS" 2>/dev/null; then
    printf '[claude-wiki-pages] WARN: cannot write settings.json — vault path will not persist across sessions\n' >&2
  fi
}

# Update current_vault_path in settings.json (no jq dependency).
# Calls init_vault_settings first so the file is always present.
# Fails gracefully: warns to stderr if the write cannot be completed.
set_vault_path() {
  local new_path="$1"
  init_vault_settings
  local tmp="${CLAUDE_WIKI_PAGES_SETTINGS}.tmp"
  if ! awk -v path="$new_path" '
    /"current_vault_path"/ { sub(/"current_vault_path"[[:space:]]*:[[:space:]]*"[^"]*"/, "\"current_vault_path\": \"" path "\"") }
    { print }
  ' "$CLAUDE_WIKI_PAGES_SETTINGS" >"$tmp" 2>/dev/null; then
    printf '[claude-wiki-pages] WARN: cannot update settings.json\n' >&2
    rm -f "$tmp" 2>/dev/null
    return 0
  fi
  if ! mv "$tmp" "$CLAUDE_WIKI_PAGES_SETTINGS" 2>/dev/null; then
    printf '[claude-wiki-pages] WARN: cannot save settings.json\n' >&2
    rm -f "$tmp" 2>/dev/null
    return 0
  fi
}

# ── Multi-vault registry helpers ─────────────────────────────────────────────
#
# Registry shape and invariant are documented in docs/operations.md
# ("Multi-vault registry" section) — that is the single canonical reference.
# Summary: {default_vault_path, current_vault_path, vaults:[{path,name}]}.
# Invariant: current_vault_path MUST equal one vaults[].path.
# Backfill: any operation that reads the registry adds current_vault_path to
# vaults[] if the key is missing, keeping old settings files migration-safe.

# Internal: read the vaults array from settings.json using python3.
# Prints lines of "path|name" pairs; prints nothing if no vaults key.
#
# Fail-closed contract (ADR-0016 N4/N5):
#   - Exit 1 (with stderr WARN) on malformed JSON.
#   - Exit 1 (with stderr WARN) when current_vault_path is present in the JSON
#     but is NOT a member of vaults[].path — invariant violation.
#   - Exit 0 and print nothing when the vaults key is entirely absent; this is
#     a valid legacy/fresh single-vault project (tier-4 default-fallback intact).
_vaults_read() {
  [ -f "$CLAUDE_WIKI_PAGES_SETTINGS" ] || return 0
  python3 - "$CLAUDE_WIKI_PAGES_SETTINGS" <<'PYEOF'
import json, sys

settings_file = sys.argv[1]
try:
    data = json.load(open(settings_file))
except Exception as exc:
    sys.stderr.write(
        "[claude-wiki-pages] WARN: registry malformed (cannot parse %s: %s)"
        " — all writes blocked until repaired\n" % (settings_file, exc)
    )
    sys.exit(1)

# No vaults key — valid legacy project; tier-4 fallback applies.
if "vaults" not in data:
    sys.exit(0)

vaults = data.get("vaults", [])
current = data.get("current_vault_path", "")

# Check invariant: current_vault_path must be a member of vaults[].path.
if current and not any(v.get("path", "") == current for v in vaults):
    sys.stderr.write(
        "[claude-wiki-pages] WARN: registry inconsistent"
        " (current_vault_path '%s' is not in vaults[])"
        " — all writes blocked until repaired\n" % current
    )
    sys.exit(1)

for v in vaults:
    print(v.get("path", "") + "|" + v.get("name", ""))
PYEOF
}

# Internal: rewrite the full settings.json with a new vaults array.
# $1 = python3 list literal of {"path":…,"name":…} dicts as a JSON string
# Preserves default_vault_path and current_vault_path exactly as-is.
_vaults_write() {
  local new_vaults_json="$1"
  local tmp="${CLAUDE_WIKI_PAGES_SETTINGS}.tmp"
  python3 - "$CLAUDE_WIKI_PAGES_SETTINGS" "$new_vaults_json" >"$tmp" 2>/dev/null <<'PYEOF'
import json, sys
try:
    data = json.load(open(sys.argv[1]))
except Exception:
    data = {}
data["vaults"] = json.loads(sys.argv[2])
print(json.dumps(data, indent=2))
PYEOF
  if [ $? -ne 0 ] || [ ! -s "$tmp" ]; then
    printf '[claude-wiki-pages] WARN: cannot update vaults registry\n' >&2
    rm -f "$tmp" 2>/dev/null
    return 1
  fi
  mv "$tmp" "$CLAUDE_WIKI_PAGES_SETTINGS" 2>/dev/null
}

# Internal: backfill vaults[] from current_vault_path if the key is missing.
# Migration-safe: old settings files without vaults are valid.
_vaults_backfill() {
  init_vault_settings
  if ! python3 - "$CLAUDE_WIKI_PAGES_SETTINGS" 2>/dev/null <<'PYEOF'; then
import json, sys
data = json.load(open(sys.argv[1]))
sys.exit(0 if "vaults" in data else 1)
PYEOF
    # vaults key absent — backfill from current_vault_path
    local cur
    cur=$(awk -F'"' '/"current_vault_path"/{print $4}' "$CLAUDE_WIKI_PAGES_SETTINGS")
    [ -z "$cur" ] && cur="$CLAUDE_WIKI_PAGES_DEFAULT_VAULT"
    local json
    json=$(printf '[{"path":"%s","name":"main"}]' "$cur")
    _vaults_write "$json" 2>/dev/null || true
  fi
}

# vault_add <path> [name]: idempotent; append {path,name} to vaults[].
# Does NOT change current_vault_path (add ≠ switch).
vault_add() {
  local new_path="$1"
  local new_name="${2:-$(basename "$new_path")}"
  init_vault_settings
  _vaults_backfill

  # Check if already present (idempotent)
  local existing
  existing=$(_vaults_read | awk -F'|' -v p="$new_path" '$1==p{print "yes"}')
  if [ "$existing" = "yes" ]; then
    return 0
  fi

  # Build updated array
  local current_json
  current_json=$(
    python3 - "$CLAUDE_WIKI_PAGES_SETTINGS" 2>/dev/null <<'PYEOF'
import json, sys
data = json.load(open(sys.argv[1]))
print(json.dumps(data.get("vaults", [])))
PYEOF
  )
  local new_entry
  new_entry=$(printf '{"path":"%s","name":"%s"}' "$new_path" "$new_name")
  local updated_json
  updated_json=$(
    python3 - "$current_json" "$new_entry" 2>/dev/null <<'PYEOF'
import json, sys
lst = json.loads(sys.argv[1])
entry = json.loads(sys.argv[2])
lst.append(entry)
print(json.dumps(lst))
PYEOF
  )
  _vaults_write "$updated_json"
}

# vault_remove <path|name>: deregisters a vault from the registry.
# Invariants:
#   - Refuses if it would empty the registry (min-one).
#   - Refuses to remove the active vault (switch first).
#   - NEVER deletes the vault directory on disk (deregister only).
vault_remove() {
  local target="$1"
  init_vault_settings
  _vaults_backfill

  local active
  active=$(awk -F'"' '/"current_vault_path"/{print $4}' "$CLAUDE_WIKI_PAGES_SETTINGS")

  # Resolve target to a path (match by path or name)
  local resolved_path
  resolved_path=$(_vaults_read | awk -F'|' -v t="$target" '$1==t || $2==t {print $1; exit}')
  if [ -z "$resolved_path" ]; then
    printf '[claude-wiki-pages] ERROR: vault "%s" is not registered\n' "$target" >&2
    return 1
  fi

  # Refuse to remove the active vault
  if [ "$resolved_path" = "$active" ]; then
    printf '[claude-wiki-pages] ERROR: "%s" is the active vault; switch first, then remove\n' "$resolved_path" >&2
    return 1
  fi

  # Refuse to empty the registry (min-one invariant)
  local count
  count=$(_vaults_read | wc -l | tr -d ' ')
  if [ "${count:-0}" -le 1 ]; then
    printf '[claude-wiki-pages] ERROR: cannot remove the last vault (min-one invariant); switch first to another vault, then remove\n' >&2
    return 1
  fi

  # Build filtered array (exclude resolved_path)
  local current_json
  current_json=$(
    python3 - "$CLAUDE_WIKI_PAGES_SETTINGS" 2>/dev/null <<'PYEOF'
import json, sys
data = json.load(open(sys.argv[1]))
print(json.dumps(data.get("vaults", [])))
PYEOF
  )
  local filtered_json
  filtered_json=$(
    python3 - "$current_json" "$resolved_path" 2>/dev/null <<'PYEOF'
import json, sys
lst = json.loads(sys.argv[1])
path = sys.argv[2]
lst = [v for v in lst if v.get("path") != path]
print(json.dumps(lst))
PYEOF
  )
  _vaults_write "$filtered_json"
}

# vault_switch <path|name>: set current_vault_path to a REGISTERED vault.
# Refuses if the target is not in the registry (no implicit add).
vault_switch() {
  local target="$1"
  init_vault_settings
  _vaults_backfill

  # Resolve to a registered path
  local resolved_path
  resolved_path=$(_vaults_read | awk -F'|' -v t="$target" '$1==t || $2==t {print $1; exit}')
  if [ -z "$resolved_path" ]; then
    printf '[claude-wiki-pages] ERROR: vault "%s" is not registered; use vault_add first\n' "$target" >&2
    return 1
  fi

  # Use the ONE writer: set_vault_path
  set_vault_path "$resolved_path"
}

# vault_list: print the registry, marking the active vault with *.
# Emits a WARN to stderr when the registry is inconsistent (malformed JSON or
# current_vault_path ∉ vaults[]) so `set-vault.sh list` surfaces the problem
# (ADR-0016 N5). Consistent with the fail-closed invariant: a WARN here tells
# the operator why writes are blocked.
vault_list() {
  init_vault_settings
  _vaults_backfill

  local active
  active=$(awk -F'"' '/"current_vault_path"/{print $4}' "$CLAUDE_WIKI_PAGES_SETTINGS")

  # Check registry consistency via _vaults_read (which enforces the invariant).
  # Run it once to detect any remaining inconsistency after backfill and warn.
  # Use || true so set -e in the caller (set-vault.sh) does not abort the
  # script when _vaults_read exits non-zero — we want to print the WARN and
  # still show whatever entries are available.
  local vaults_out rc
  rc=0
  vaults_out=$(_vaults_read) || rc=$?
  if [ "$rc" -ne 0 ]; then
    printf '[claude-wiki-pages] WARN: registry is inconsistent — run `set-vault.sh switch <path>` to repair, or edit settings.json manually\n' >&2
  fi

  local path name marker
  while IFS='|' read -r path name; do
    [ -z "$path" ] && continue
    if [ "$path" = "$active" ]; then
      marker="*"
    else
      marker=" "
    fi
    printf '%s %-40s  %s\n' "$marker" "$path" "$name"
  done <<<"$vaults_out"
}

# registry_other_vaults: print the registered vault roots EXCEPT the active one
# (current_vault_path), one path per line. Used by the firewall hook to derive
# its cross-vault confinement set from the registry itself, so the cross-vault
# rule fires in the real PreToolUse hook with no env var required. Read-only:
# does NOT backfill or otherwise mutate settings (the firewall hook must never
# write). Prints nothing when there is no registry or only the active vault.
#
# Fail-closed contract (ADR-0016 N4): propagates _vaults_read's exit code.
# A non-zero exit means the registry is untrustworthy (malformed JSON or
# current_vault_path ∉ vaults[]). The caller (firewall.sh) maps this to
# zero writable roots — even the active vault is blocked.
registry_other_vaults() {
  [ -f "$CLAUDE_WIKI_PAGES_SETTINGS" ] || return 0
  local active vaults_output rc
  active=$(awk -F'"' '/"current_vault_path"/{print $4}' "$CLAUDE_WIKI_PAGES_SETTINGS")
  # $() captures stdout only; _vaults_read stderr (WARN messages) flows through
  # to our caller's stderr naturally. Capture exit code after the subshell.
  vaults_output=$(_vaults_read)
  rc=$?
  if [ $rc -ne 0 ]; then
    return $rc
  fi
  printf '%s\n' "$vaults_output" | awk -F'|' -v active="$active" '$1 != "" && $1 != active {print $1}'
}

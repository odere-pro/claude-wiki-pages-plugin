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
#
# Pre-switch health-check gate (PM.4):
#   - Exit 1 if the resolved path does not exist on disk (names the missing path).
#   - Exit 1 if the resolved path has no CLAUDE.md that contains schema_version
#     (the vault is not schema-valid).
#   - WARN (but allow) if the resolved path lacks a wiki/ directory — the vault
#     is schema-valid but not yet scaffolded; run /claude-wiki-pages:init to fix.
#
# Decision: a missing wiki/ is a WARN-with-remediation, not a hard block, because
# the vault directory and CLAUDE.md are present and the schema is valid. Blocking
# would prevent /claude-wiki-pages:init from being the natural next step in context.
# A missing vault directory or schema marker is always a hard block (exit 1).
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

  # Health check 1: directory must exist
  if [ ! -d "$resolved_path" ]; then
    printf '[claude-wiki-pages] ERROR: vault directory "%s" does not exist on disk — switch aborted\n' "$resolved_path" >&2
    return 1
  fi

  # Health check 2: CLAUDE.md with schema_version must be present
  if ! grep -q 'schema_version' "$resolved_path/CLAUDE.md" 2>/dev/null; then
    printf '[claude-wiki-pages] ERROR: vault "%s" has no CLAUDE.md with schema_version — not a valid vault; switch aborted\n' "$resolved_path" >&2
    return 1
  fi

  # Health check 3: wiki/ directory should exist (WARN only — allows switch)
  if [ ! -d "$resolved_path/wiki" ]; then
    printf '[claude-wiki-pages] WARN: vault "%s" has no wiki/ directory — vault is not yet scaffolded; run /claude-wiki-pages:init to complete setup\n' "$resolved_path" >&2
  fi

  # Use the ONE writer: set_vault_path
  set_vault_path "$resolved_path"
}

# vault_list: print the registry, marking the active vault with *.
# Emits a WARN to stderr when the registry is inconsistent (malformed JSON or
# current_vault_path ∉ vaults[]) so `set-vault.sh list` surfaces the problem
# (ADR-0016 N5). Consistent with the fail-closed invariant: a WARN here tells
# the operator why writes are blocked.
#
# With --status flag (opt-in, PM.4): adds two extra awk-parseable columns:
#   raw-pending  — count of files under <vault>/raw/ (pending ingestion)
#   last-op      — last log.md entry as "VERB YYYY-MM-DD" (or "-" if absent)
# Bare list never reads log.md so it stays fast and works even when log.md
# is absent. Output format (both modes):
#   MARKER  PATH                                      NAME     [RAW  LAST-OP]
# Field 1 = marker (*|' '), field 2 = path — awk-parseable with default FS.
vault_list() {
  local show_status=0
  if [ "${1:-}" = "--status" ]; then
    show_status=1
  fi

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

    if [ "$show_status" -eq 1 ]; then
      # Count pending raw/ files (0 if raw/ absent)
      local raw_count=0
      if [ -d "$path/raw" ]; then
        raw_count=$(find "$path/raw" -maxdepth 1 -type f 2>/dev/null | wc -l | tr -d ' ')
      fi

      # Last log.md operation: extract last "## [YYYY-MM-DD] VERB" heading
      local last_op="-"
      local log_file="$path/wiki/log.md"
      if [ -f "$log_file" ]; then
        last_op=$(awk '/^## \[[0-9]/ && NF >= 3 { verb=$3; date=substr($2,2,10); last=verb " " date } END { print (last != "" ? last : "-") }' "$log_file")
      fi

      # Awk-parseable format: field 1 = marker (* or .), field 2 = path.
      # Non-active uses '.' so field positions are stable for 'awk {print $2}'.
      local awk_marker="$marker"
      [ "$marker" = " " ] && awk_marker="."
      printf '%s %-40s  %-20s  raw:%-4s  %s\n' "$awk_marker" "$path" "$name" "$raw_count" "$last_op"
    else
      printf '%s %-40s  %s\n' "$marker" "$path" "$name"
    fi
  done <<<"$vaults_out"
}

# vault_cross_log: read-time audit roll-up across all registered vaults (PM.3).
#
# Semi-public reader: called by `set-vault.sh cross-vault-log`. Enumerates vaults
# via _vaults_read directly (ADR-0016 N8 — no registry_all_vaults wrapper).
#
# Behaviour:
#   - On malformed/inconsistent registry (_vaults_read exits non-zero): emits its
#     OWN "registry malformed" status to stderr + exits non-zero with zero entries.
#     Never emits __FAIL_CLOSED__ (that token is firewall-internal, ADR-0016 Part A).
#   - For each registered vault: folds wiki/log.md level-2 headings
#     (## [DATE] verb | detail) into the output, vault-tagged with [name].
#   - A vault with no wiki/log.md is skipped with a stderr WARN (not a hard error).
#   - Entries are emitted date-sorted across vaults.
#   - $1 = --last N (optional): limits entries collected per vault before sorting.
#
# NO-LEDGER invariant: this function creates no file; running it twice leaves
# every vault's wiki/ working tree byte-identical.
vault_cross_log() {
  local last_n=0

  # Parse --last N
  if [ "${1:-}" = "--last" ]; then
    if [ -z "${2:-}" ] || ! printf '%s' "${2:-}" | grep -qE '^[0-9]+$'; then
      printf '[claude-wiki-pages] ERROR: --last requires a positive integer\n' >&2
      return 1
    fi
    last_n="$2"
  elif [ -n "${1:-}" ]; then
    printf '[claude-wiki-pages] ERROR: unknown argument: %s\n' "$1" >&2
    return 1
  fi

  # Read all registered vaults. On non-zero exit (malformed or inconsistent
  # registry) report our own read-time status — do NOT emit __FAIL_CLOSED__.
  # Capture only stdout; stderr (WARN messages) flows through to our caller's
  # stderr naturally, matching the pattern used by registry_other_vaults.
  # Use `|| rc=$?` to prevent set -e in the caller from aborting on failure
  # before we can capture the exit code and emit our own diagnostic.
  local vaults_out rc
  rc=0
  vaults_out=$(_vaults_read) || rc=$?
  if [ "$rc" -ne 0 ]; then
    # Emit our own status; the WARN from _vaults_read already went to stderr.
    printf '[claude-wiki-pages] ERROR: registry malformed or inconsistent — cannot produce roll-up\n' >&2
    return 1
  fi

  if [ -z "$vaults_out" ]; then
    # No vaults key — nothing to roll up; exit 0 (valid fresh project).
    return 0
  fi

  # Collect entries from each vault into a temp accumulator.
  # Each line: DATE<TAB>VAULTNAME<TAB>HEADING
  local all_entries=""

  while IFS='|' read -r vault_path vault_name; do
    [ -z "$vault_path" ] && continue
    local log_file="$vault_path/wiki/log.md"
    if [ ! -f "$log_file" ]; then
      printf '[claude-wiki-pages] WARN: no wiki/log.md for vault "%s" (%s) — skipping\n' \
        "$vault_name" "$vault_path" >&2
      continue
    fi

    # Extract level-2 headings of the form: ## [DATE] ...
    # $2 is the bracketed date token "[YYYY-MM-DD]"; substr strips the brackets.
    # Output lines: DATE<TAB>vault_name<TAB>full_heading_line
    local vault_entries
    vault_entries=$(awk -v name="$vault_name" '
      /^## \[[0-9]/ && NF >= 2 {
        date = substr($2, 2, 10)
        print date "\t" name "\t" $0
      }
    ' "$log_file")

    if [ -z "$vault_entries" ]; then
      continue
    fi

    # Apply --last N limit per vault (keep the last N lines by date = tail)
    if [ "$last_n" -gt 0 ]; then
      vault_entries=$(printf '%s\n' "$vault_entries" | tail -n "$last_n")
    fi

    if [ -n "$all_entries" ]; then
      all_entries="${all_entries}
${vault_entries}"
    else
      all_entries="$vault_entries"
    fi
  done <<<"$vaults_out"

  if [ -z "$all_entries" ]; then
    return 0
  fi

  # Sort all entries by date (field 1), then emit with vault tag prepended.
  printf '%s\n' "$all_entries" | sort -t "$(printf '\t')" -k1,1 |
    awk -F'\t' '{ print "[" $2 "] " $3 }'
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

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
#
# B06: multi-vault registry CRUD extracted to lib-vault-registry.sh (SRP / high-cohesion).
#      Wired-source CRUD extracted to lib-wired-source.sh. This file is now the thin
#      resolution core + settings I/O, sourcing both libs so every public function name
#      that callers depend on remains stable.

# PATH hardening: hook shells can arrive with a stripped PATH (the harness
# passes whatever environment it has, which may omit the standard tool dirs).
# When that happens `python3` and `sort` silently vanish, tier 2 and tier 3
# fall through, and resolution lands on the tier-4 default — the
# silent-wrong-vault bug. Sourced-safe form: do NOT mutate the caller's PATH
# (this file is sourced by every hook script; a global prepend would change
# the CALLER's own tool resolution — e.g. re-introduce /usr/bin/jq into a
# deliberately curated sandbox PATH). Instead compute a hardened lookup PATH
# once and apply it per-invocation (PATH=… cmd) to the tools resolution
# depends on. Prepend the standard dirs only when /usr/bin is absent, so a
# caller-curated ordering (shims first) keeps precedence.
_CLAUDE_WIKI_PAGES_TOOL_PATH="$PATH"
case ":$PATH:" in
  *:/usr/bin:*) ;;
  *) _CLAUDE_WIKI_PAGES_TOOL_PATH="/usr/bin:/bin:/usr/sbin:/sbin:$PATH" ;;
esac

CLAUDE_WIKI_PAGES_DEFAULT_VAULT="docs/vault"
CLAUDE_WIKI_PAGES_SETTINGS="${CLAUDE_WIKI_PAGES_SETTINGS_FILE:-.claude/claude-wiki-pages/settings.json}"

# Slugify a string into a directory-name-safe form: lowercase, every run of
# non-alphanumerics collapses to a single "-", leading/trailing "-" trimmed.
# Usage: slugify <string>
slugify() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]\{1,\}/-/g; s/^-//; s/-$//'
}

# Default path for a NEW vault: docs/<project-root-slug>-vault. Obsidian
# displays the vault's FOLDER name, so "my-project/" scaffolds
# docs/my-project-vault and shows up as "my-project-vault" instead of every
# project's vault reading as a generic "vault". Used by the init wizard when
# the user names no path and no vault exists yet; resolution tier 4 (the
# read-side default for EXISTING vaults) stays docs/vault for back-compat.
# Falls back to docs/vault when the slug comes out empty.
default_new_vault_path() {
  local slug
  slug=$(slugify "$(basename "$(pwd)")")
  if [ -z "$slug" ]; then
    echo "$CLAUDE_WIKI_PAGES_DEFAULT_VAULT"
    return 0
  fi
  echo "docs/${slug}-vault"
}

# Internal: extract a top-level string field from a JSON file using python3.
# Line-independent: works on compact (single-line) and multi-line/indented JSON.
# Usage: _settings_get_field <file> <field_name>
# Prints the field value on stdout, or nothing if the field is absent or not a string.
# Exits 0 on success (including absent field); exits non-zero only on parse error.
#
# Degraded mode: when python3 cannot run — missing from PATH, or resolvable but
# broken (exec failure 126/127 in a PATH-degraded hook shell) — fall back to
# the grep/sed extractor below and emit ONE stderr WARN. Without this fallback
# a missing python3 is indistinguishable from "field absent" and tier 2
# silently falls through (the silent-wrong-vault bug). Python parse errors
# (malformed JSON, exit 1) keep their current behavior: they are a real error,
# not a missing-tool condition.
_settings_get_field() {
  local settings_file="$1"
  local field_name="$2"
  # L03 / Architect ruling (document — accepted golden-hammer): python3 is the
  # deliberate JSON-correct parser for settings / registry / wired-source records.
  # jq is not assumed present in hook shells. Flat top-level string reads have the
  # grep/sed fallback (_settings_get_field_degraded) below; nested arrays and
  # objects deliberately do NOT — they require a real JSON parser to avoid
  # silent-wrong-vault bugs from malformed output. This is an accepted trade-off,
  # not to be flattened to shell builtins. The degraded fallback (with a stderr
  # WARN) handles hook shells where python3 itself is unavailable.
  if PATH="$_CLAUDE_WIKI_PAGES_TOOL_PATH" command -v python3 >/dev/null 2>&1; then
    local out rc
    out=$(
      PATH="$_CLAUDE_WIKI_PAGES_TOOL_PATH" python3 - "$settings_file" "$field_name" 2>/dev/null <<'PYEOF'
import json, sys
try:
    data = json.load(open(sys.argv[1]))
except Exception:
    sys.exit(1)
val = data.get(sys.argv[2], "")
if isinstance(val, str):
    print(val)
PYEOF
    )
    rc=$?
    # 126/127 = python3 resolved by `command -v` but could not actually run
    # (broken shim / stripped PATH at exec time) — fall through to the
    # degraded parser. Any other code is python3's own verdict (0 = ok,
    # 1 = malformed JSON) and is passed through unchanged.
    if [ "$rc" -ne 126 ] && [ "$rc" -ne 127 ]; then
      if [ -n "$out" ]; then printf '%s\n' "$out"; fi
      return "$rc"
    fi
  fi
  printf '[claude-wiki-pages] WARN: python3 unavailable — using degraded settings parser\n' >&2
  _settings_get_field_degraded "$settings_file" "$field_name"
}

# Internal: pure grep/sed fallback for _settings_get_field — TOP-LEVEL STRING
# fields only. Sound here because the settings file is flat JSON written by
# this same script family; handles both compact ({"k":"v"}) and indented
# ("k": "v") layouts. head -n1 keeps the first match should a value ever
# repeat. Prints nothing when the field is absent; exits 1 when the file is
# missing (mirrors the python parser's only hard-error path it can detect).
_settings_get_field_degraded() {
  local settings_file="$1"
  local field_name="$2"
  [ -f "$settings_file" ] || return 1
  # Subshell so the hardened lookup PATH never leaks to the caller.
  (
    PATH="$_CLAUDE_WIKI_PAGES_TOOL_PATH"
    grep -o "\"${field_name}\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" "$settings_file" 2>/dev/null |
      head -n 1 |
      sed 's/^"[^"]*"[[:space:]]*:[[:space:]]*"//; s/"$//'
  )
}

resolve_vault() {
  # Self-heal: ensure settings.json exists on every resolution. SessionStart
  # is the primary creation path, but it may miss (plugin reinstall mid-session,
  # resumed sessions). Any hook that resolves the vault also reifies settings.
  init_vault_settings

  # 1. Explicit env var — used as-is (relative or absolute). This is tier 1, an
  #    explicit operator / CI override (see CLAUDE.md "Vault location"), so it is
  #    trusted input and returned verbatim — preserving relative-path overrides
  #    and exact byte-parity with src/core/vault.ts (the TS twin returns it as-is).
  #    M32: traversal confinement is enforced at WRITE time by firewall.sh and
  #    protect-raw.sh (the actual security boundary), not at resolution time.
  #    Canonicalizing here broke the verbatim contract and was non-portable
  #    (GNU `realpath -m` resolves a relative value to absolute; BSD realpath has
  #    no -m), which is why it diverged between Linux CI and macOS.
  #    LLM_WIKI_VAULT is the deprecated pre-1.0 name, still read as a fallback.
  local env_vault="${CLAUDE_WIKI_PAGES_VAULT:-${LLM_WIKI_VAULT:-}}"
  if [ -n "$env_vault" ]; then
    echo "$env_vault"
    return
  fi

  # 2. Settings file current_vault_path
  if [ -f "$CLAUDE_WIKI_PAGES_SETTINGS" ]; then
    local path
    path=$(_settings_get_field "$CLAUDE_WIKI_PAGES_SETTINGS" "current_vault_path")
    if [ -n "$path" ]; then
      echo "$path"
      return
    fi
  fi

  # 3. Auto-detect: search up to 4 levels for a CLAUDE.md that declares
  #    schema_version alongside a wiki/ sibling directory.
  #    The two-signal check (frontmatter marker + wiki/ dir) avoids false
  #    positives from unrelated CLAUDE.md files in the project.
  #    Resilience: `sort` only orders candidates for determinism. In a
  #    PATH-degraded shell where sort is missing or broken, fall back to the
  #    unsorted find output instead of letting a dead `find | sort` pipe
  #    silently demote resolution to the tier-4 default.
  local claude_md dir candidates sorted
  candidates=$(find . -maxdepth 4 -name "CLAUDE.md" 2>/dev/null)
  if PATH="$_CLAUDE_WIKI_PAGES_TOOL_PATH" command -v sort >/dev/null 2>&1 &&
    sorted=$(printf '%s\n' "$candidates" | PATH="$_CLAUDE_WIKI_PAGES_TOOL_PATH" sort 2>/dev/null); then
    candidates="$sorted"
  fi
  while IFS= read -r claude_md; do
    [ -z "$claude_md" ] && continue
    dir=$(dirname "$claude_md")
    if grep -q 'schema_version' "$claude_md" 2>/dev/null && [ -d "$dir/wiki" ]; then
      echo "$dir"
      return
    fi
  done <<<"$candidates"

  # 4. Default.
  # Invariant (silent-wrong-vault guard): reaching this tier while a settings
  # file EXISTS with a non-empty current_vault_path would mean tier 2 failed
  # to read a value the user explicitly set. _settings_get_field makes that
  # unreachable — when python3 cannot run it falls back to the degraded
  # grep/sed parser (with a stderr WARN), so a readable settings value always
  # resolves at tier 2. Only a truly absent settings file or an empty
  # current_vault_path can land here.
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
  # M30: awk -v path="$new_path" then sub() replacement is unsafe when path
  # contains '&' or '\' — awk interprets those as regex back-references in the
  # replacement string. Use python3 (the consistent JSON writer already used
  # throughout this file) to set current_vault_path safely via argv, not the
  # awk replacement string. Fall back to the awk writer only when python3 is
  # unavailable (graceful degradation consistent with _settings_get_field).
  if PATH="$_CLAUDE_WIKI_PAGES_TOOL_PATH" command -v python3 >/dev/null 2>&1; then
    if ! PATH="$_CLAUDE_WIKI_PAGES_TOOL_PATH" python3 - \
      "$CLAUDE_WIKI_PAGES_SETTINGS" "$new_path" >"$tmp" 2>/dev/null <<'PYEOF'; then
import json, sys
try:
    data = json.load(open(sys.argv[1]))
except Exception:
    data = {}
data["current_vault_path"] = sys.argv[2]
print(json.dumps(data, indent=2))
PYEOF
      printf '[claude-wiki-pages] WARN: cannot update settings.json\n' >&2
      rm -f "$tmp" 2>/dev/null
      return 0
    fi
  else
    # Degraded path: python3 unavailable — fall back to awk sed-replacement.
    # Paths with '&' or '\' may not round-trip correctly; a stderr WARN is
    # emitted. In hook shells this is already known-degraded (M30 accepted risk).
    printf '[claude-wiki-pages] WARN: python3 unavailable for settings write — using degraded awk writer (paths with & or \\ may not persist correctly)\n' >&2
    if ! awk -v path="$new_path" '
      /"current_vault_path"/ { sub(/"current_vault_path"[[:space:]]*:[[:space:]]*"[^"]*"/, "\"current_vault_path\": \"" path "\"") }
      { print }
    ' "$CLAUDE_WIKI_PAGES_SETTINGS" >"$tmp" 2>/dev/null; then
      printf '[claude-wiki-pages] WARN: cannot update settings.json\n' >&2
      rm -f "$tmp" 2>/dev/null
      return 0
    fi
  fi
  if ! mv "$tmp" "$CLAUDE_WIKI_PAGES_SETTINGS" 2>/dev/null; then
    printf '[claude-wiki-pages] WARN: cannot save settings.json\n' >&2
    rm -f "$tmp" 2>/dev/null
    return 0
  fi
}

# ── Source the extracted concern libs ────────────────────────────────────────
# B06: registry and wired-source helpers live in focused libs. They depend on
# the functions and variables defined above (_settings_get_field, init_vault_settings,
# set_vault_path, CLAUDE_WIKI_PAGES_SETTINGS, CLAUDE_WIKI_PAGES_DEFAULT_VAULT)
# which must be defined before the libs are sourced.
# shellcheck source=lib-vault-registry.sh
# B08: use ${BASH_SOURCE[0]%/*} instead of $(dirname ...) so this source line
# works in hardened shells with a stripped PATH (dirname is an external command
# that may be absent from /nonexistent-bin). ${BASH_SOURCE[0]%/*} is a pure
# bash built-in string substitution with no external command dependency.
source "${BASH_SOURCE[0]%/*}/lib-vault-registry.sh"
# shellcheck source=lib-wired-source.sh
source "${BASH_SOURCE[0]%/*}/lib-wired-source.sh"

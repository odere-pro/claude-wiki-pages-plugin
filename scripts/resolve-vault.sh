#!/bin/bash
# Sourceable helper — defines resolve_vault(), init_vault_settings(), set_vault_path().
# Do NOT execute directly; source it from other scripts.
#
# Resolution order (first match wins):
#   1. LLM_WIKI_VAULT env var                    — explicit override; good for local dev & CI.
#   2. .claude/llm-wiki-stack/settings.json      — persistent per-project vault path.
#   3. Auto-detect                               — find a dir with CLAUDE.md (schema_version) + wiki/
#   4. Default                                   — docs/vault
#
# All hook scripts source this file so vault resolution is consistent
# and can be tested in one place.
#
# Test override: export LLM_WIKI_SETTINGS_FILE=<path> before sourcing to redirect
# the settings file (prevents tests from touching the real project .claude/ dir).

LLM_WIKI_DEFAULT_VAULT="docs/vault"
LLM_WIKI_SETTINGS="${LLM_WIKI_SETTINGS_FILE:-.claude/llm-wiki-stack/settings.json}"

resolve_vault() {
  # Self-heal: ensure settings.json exists on every resolution. SessionStart
  # is the primary creation path, but it may miss (plugin reinstall mid-session,
  # resumed sessions). Any hook that resolves the vault also reifies settings.
  init_vault_settings

  # 1. Explicit env var — used as-is (relative or absolute)
  if [ -n "${LLM_WIKI_VAULT:-}" ]; then
    echo "$LLM_WIKI_VAULT"
    return
  fi

  # 2. Settings file current_vault_path
  if [ -f "$LLM_WIKI_SETTINGS" ]; then
    local path
    path=$(awk -F'"' '/"current_vault_path"/{print $4}' "$LLM_WIKI_SETTINGS")
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
  echo "$LLM_WIKI_DEFAULT_VAULT"
}

# Create settings.json with default values if it does not yet exist.
# Fails gracefully: warns to stderr and returns without crashing if the
# directory cannot be created or the file cannot be written.
init_vault_settings() {
  [ -f "$LLM_WIKI_SETTINGS" ] && return
  if ! mkdir -p "$(dirname "$LLM_WIKI_SETTINGS")" 2>/dev/null; then
    printf '[llm-wiki-stack] WARN: cannot create settings directory — vault path will not persist across sessions\n' >&2
    return
  fi
  local content
  content=$(printf '{\n  "default_vault_path": "%s",\n  "current_vault_path": "%s"\n}\n' \
    "$LLM_WIKI_DEFAULT_VAULT" "$LLM_WIKI_DEFAULT_VAULT")
  if ! printf '%s' "$content" >"$LLM_WIKI_SETTINGS" 2>/dev/null; then
    printf '[llm-wiki-stack] WARN: cannot write settings.json — vault path will not persist across sessions\n' >&2
  fi
}

# Update current_vault_path in settings.json (no jq dependency).
# Calls init_vault_settings first so the file is always present.
# Fails gracefully: warns to stderr if the write cannot be completed.
set_vault_path() {
  local new_path="$1"
  init_vault_settings
  local tmp="${LLM_WIKI_SETTINGS}.tmp"
  if ! awk -v path="$new_path" '
    /"current_vault_path"/ { sub(/"current_vault_path"[[:space:]]*:[[:space:]]*"[^"]*"/, "\"current_vault_path\": \"" path "\"") }
    { print }
  ' "$LLM_WIKI_SETTINGS" >"$tmp" 2>/dev/null; then
    printf '[llm-wiki-stack] WARN: cannot update settings.json\n' >&2
    rm -f "$tmp" 2>/dev/null
    return 0
  fi
  if ! mv "$tmp" "$LLM_WIKI_SETTINGS" 2>/dev/null; then
    printf '[llm-wiki-stack] WARN: cannot save settings.json\n' >&2
    rm -f "$tmp" 2>/dev/null
    return 0
  fi
}

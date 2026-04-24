#!/usr/bin/env bash
# Validate .claude-plugin/plugin.json and .claude-plugin/marketplace.json
# against the minimal shape the plugin loader cares about. Replaces the
# previous check-jsonschema (Python) step — jq is already in the shell
# toolchain, so this keeps CI Python-free.
#
# Exit 0 on success. Exit 1 on any validation failure (one diagnostic per
# violation is printed to stderr).
#
# This is not a general JSON-schema engine — it hard-codes the few rules
# the published schemas under .github/schemas/*.schema.json assert:
#   required keys, type, regex pattern, minLength, minItems, nested
#   required+properties, array item shape. Anthropic has not published a
#   canonical schema yet; once they do, swap this script for the canonical
#   validator and delete the .github/schemas/ copies.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLUGIN_JSON="${1:-$REPO_ROOT/.claude-plugin/plugin.json}"
MARKETPLACE_JSON="${2:-$REPO_ROOT/.claude-plugin/marketplace.json}"

errors=0

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  errors=$((errors + 1))
}

# assert_required <file> <jq-path> <human-name>
#   Fails if the jq path is missing or null.
assert_required() {
  local file="$1" path="$2" name="$3"
  if ! jq -e "$path != null" "$file" >/dev/null 2>&1; then
    fail "$file: required field missing — $name"
  fi
}

# assert_type <file> <jq-path> <expected-type>
#   expected-type ∈ string|number|integer|boolean|object|array.
assert_type() {
  local file="$1" path="$2" expected="$3"
  local actual
  actual=$(jq -r "$path | type" "$file" 2>/dev/null || echo "error")
  if [ "$expected" = "integer" ]; then
    # jq reports "number" for integers; narrow by floor-equality.
    if [ "$actual" != "number" ] || ! jq -e "$path == ($path | floor)" "$file" >/dev/null 2>&1; then
      fail "$file: $path must be integer, got $actual"
    fi
  elif [ "$actual" != "$expected" ]; then
    fail "$file: $path must be $expected, got $actual"
  fi
}

# assert_pattern <file> <jq-path> <regex> <human-name>
#   Uses bash =~ against the extracted string.
assert_pattern() {
  local file="$1" path="$2" regex="$3" name="$4"
  local value
  value=$(jq -r "$path // empty" "$file")
  if [ -z "$value" ]; then
    return 0 # absent — caught by assert_required if required
  fi
  if ! [[ "$value" =~ $regex ]]; then
    fail "$file: $name ($value) does not match pattern $regex"
  fi
}

# assert_min_length <file> <jq-path> <min> <human-name>
assert_min_length() {
  local file="$1" path="$2" min="$3" name="$4"
  local len
  len=$(jq -r "$path // \"\" | length" "$file")
  if [ "$len" -lt "$min" ]; then
    fail "$file: $name length $len < minimum $min"
  fi
}

# assert_min_items <file> <jq-path> <min> <human-name>
assert_min_items() {
  local file="$1" path="$2" min="$3" name="$4"
  local n
  n=$(jq -r "$path // [] | length" "$file")
  if [ "$n" -lt "$min" ]; then
    fail "$file: $name count $n < minItems $min"
  fi
}

# assert_unique <file> <jq-path> <human-name>
assert_unique() {
  local file="$1" path="$2" name="$3"
  local uniq total
  uniq=$(jq -r "$path // [] | unique | length" "$file")
  total=$(jq -r "$path // [] | length" "$file")
  if [ "$uniq" != "$total" ]; then
    fail "$file: $name contains duplicates ($total entries, $uniq unique)"
  fi
}

# assert_parses <file>
#   jq . <file> — catches malformed JSON first so downstream assertions
#   do not cascade with confusing errors.
assert_parses() {
  local file="$1"
  if [ ! -f "$file" ]; then
    fail "$file: not found"
    return 1
  fi
  if ! jq . "$file" >/dev/null 2>&1; then
    fail "$file: not valid JSON"
    return 1
  fi
}

# ── plugin.json ──────────────────────────────────────────────────────────────
validate_plugin() {
  local f="$1"
  assert_parses "$f" || return

  assert_required "$f" '.name' 'name'
  assert_required "$f" '.version' 'version'
  assert_required "$f" '.description' 'description'
  assert_required "$f" '.author' 'author'
  assert_required "$f" '.license' 'license'

  assert_type "$f" '.name' string
  assert_type "$f" '.version' string
  assert_type "$f" '.description' string
  assert_type "$f" '.author' object
  assert_type "$f" '.license' string

  assert_pattern "$f" '.name' '^[a-z][a-z0-9-]*$' 'name'
  assert_pattern "$f" '.version' '^[0-9]+\.[0-9]+\.[0-9]+' 'version'
  assert_min_length "$f" '.description' 10 'description'

  assert_required "$f" '.author.name' 'author.name'
  assert_required "$f" '.author.email' 'author.email'
  assert_type "$f" '.author.name' string
  assert_type "$f" '.author.email' string
  assert_pattern "$f" '.author.email' '^[^@]+@[^@]+\.[^@]+$' 'author.email (looks like an email)'

  # supported_schema_versions: array of positive integers.
  if jq -e '.supported_schema_versions != null' "$f" >/dev/null 2>&1; then
    assert_type "$f" '.supported_schema_versions' array
    assert_min_items "$f" '.supported_schema_versions' 1 'supported_schema_versions'
    if ! jq -e '.supported_schema_versions | all(type == "number" and . == (. | floor) and . >= 1)' "$f" >/dev/null 2>&1; then
      fail "$f: supported_schema_versions must be integers >= 1"
    fi
  fi

  # keywords: ≤ 20 unique, kebab-case lowercase.
  if jq -e '.keywords != null' "$f" >/dev/null 2>&1; then
    assert_type "$f" '.keywords' array
    assert_unique "$f" '.keywords' 'keywords'
    local kn
    kn=$(jq -r '.keywords | length' "$f")
    if [ "$kn" -gt 20 ]; then
      fail "$f: keywords exceeds maxItems 20 (got $kn)"
    fi
    if ! jq -e '.keywords | all(type == "string" and test("^[a-z][a-z0-9-]*$"))' "$f" >/dev/null 2>&1; then
      fail "$f: every keyword must match ^[a-z][a-z0-9-]*\$"
    fi
  fi
}

# ── marketplace.json ─────────────────────────────────────────────────────────
validate_marketplace() {
  local f="$1"
  assert_parses "$f" || return

  assert_required "$f" '.name' 'name'
  assert_required "$f" '.owner' 'owner'
  assert_required "$f" '.plugins' 'plugins'

  assert_type "$f" '.name' string
  assert_type "$f" '.owner' object
  assert_type "$f" '.plugins' array

  assert_pattern "$f" '.name' '^[a-z][a-z0-9-]*$' 'name'

  assert_required "$f" '.owner.name' 'owner.name'
  assert_required "$f" '.owner.url' 'owner.url'
  assert_type "$f" '.owner.name' string
  assert_type "$f" '.owner.url' string

  assert_min_items "$f" '.plugins' 1 'plugins'

  # Each plugin entry must have name/source/version, all strings.
  local n i
  n=$(jq -r '.plugins | length' "$f")
  for ((i = 0; i < n; i++)); do
    local p=".plugins[$i]"
    assert_required "$f" "$p.name" "plugins[$i].name"
    assert_required "$f" "$p.source" "plugins[$i].source"
    assert_required "$f" "$p.version" "plugins[$i].version"
    assert_type "$f" "$p.name" string
    assert_type "$f" "$p.source" string
    assert_type "$f" "$p.version" string
  done
}

validate_plugin "$PLUGIN_JSON"
validate_marketplace "$MARKETPLACE_JSON"

if [ "$errors" -gt 0 ]; then
  printf '\n%d manifest violation(s) found.\n' "$errors" >&2
  exit 1
fi

printf 'OK: %s\n' "$PLUGIN_JSON"
printf 'OK: %s\n' "$MARKETPLACE_JSON"

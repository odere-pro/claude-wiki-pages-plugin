#!/usr/bin/env bash
# tests/smoke/skill-schema.sh — Tier 2 smoke test.
#
# Runs each Layer 2 skill (ingest, lint, fix, synthesize) against the
# vault-example fixture and asserts that every output file has:
#   - well-formed YAML frontmatter (opens and closes with `---`, keys are
#     `<word>:` shape)
#   - a `sources:` field holding either `[]` or a list of `[[wikilinks]]`
#
# The two assertion helpers are pure shell + `jq` — no Python. We parse the
# narrow subset of YAML we actually use (inline arrays and block lists)
# with awk, matching how scripts/verify-ingest.sh extracts the same field.
#
# As with fresh-install.sh, the `claude -p` steps are stubbed until Phase E.
# The YAML/sources assertions run against the already-committed
# tests/fixtures/minimal-vault/ so the script validates the checking logic
# even when the CLI is absent.
#
# See /SPEC.md §14.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# -- Guard: skill execution needs the CLI; assertions do not. -----------------

if ! command -v claude >/dev/null 2>&1; then
  echo "[SKIP] Claude Code CLI not available — skill-schema smoke test stubbed"
  exit 0
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "[FAIL] jq not found. Install with: brew install jq  (or: apt install jq)"
  exit 1
fi

echo "[smoke] claude: $(command -v claude)"
echo "[smoke] jq:     $(command -v jq)"

# yaml_frontmatter_ok <file> — exit 0 iff <file>'s frontmatter block is
# well-formed: opens with `---`, closes with `---`, and every non-blank
# non-list/continuation line is `<key>: <value>` or `<key>:`. This covers
# the frontmatter shape the skills emit; it is not a general YAML parser.
yaml_frontmatter_ok() {
  local f="$1"
  awk '
    BEGIN { in_fm = 0; closed = 0 }
    NR == 1 && $0 != "---" { print "[yaml_frontmatter_ok] " FILENAME ": missing opening ---"; exit 1 }
    NR == 1 { in_fm = 1; next }
    in_fm && /^---$/ { closed = 1; exit }
    in_fm {
      # Blank lines OK.
      if ($0 ~ /^[[:space:]]*$/) next
      # Continuation of a folded/block scalar (starts with spaces) OK.
      if ($0 ~ /^[[:space:]]+/) next
      # List marker at top level would be malformed frontmatter — skip.
      if ($0 ~ /^-[[:space:]]/) next
      # Otherwise the line must be `<key>:` or `<key>: <value>`. Split into
      # two patterns so BSD awk (macOS) accepts the regex syntax.
      if (!($0 ~ /^[A-Za-z_][A-Za-z0-9_-]*:$/ || \
            $0 ~ /^[A-Za-z_][A-Za-z0-9_-]*:[[:space:]]/)) {
        print "[yaml_frontmatter_ok] " FILENAME ": bad line: " $0
        exit 1
      }
    }
    END {
      if (!closed) { print "[yaml_frontmatter_ok] " FILENAME ": no closing ---"; exit 1 }
    }
  ' "$f"
}

# sources_entries <file> — print one sources entry per line. Empty output
# when the field is absent or `[]`. Handles inline (`sources: ["[[A]]"]`)
# and block (`sources:\n  - "[[A]]"`) forms. Mirrors the parser in
# scripts/verify-ingest.sh so both stay in sync.
sources_entries() {
  local f="$1"
  awk '
    /^sources:/ {
      if ($0 ~ /\[/) {
        line = $0
        sub(/^sources:[[:space:]]*\[/, "", line)
        sub(/\][[:space:]]*$/, "", line)
        n = split(line, items, ",")
        for (i = 1; i <= n; i++) {
          gsub(/^[[:space:]"'\'']+|[[:space:]"'\'']+$/, "", items[i])
          if (items[i] != "") print items[i]
        }
        next
      }
      while ((getline line) > 0) {
        if (line !~ /^[[:space:]]*-/) break
        gsub(/^[[:space:]]*-[[:space:]]*"?/, "", line)
        gsub(/"?[[:space:]]*$/, "", line)
        if (line != "") print line
      }
    }
  ' "$f"
}

# -- Stage 1: run each skill against the example vault. -----------------------

TMP_VAULT="$(mktemp -d -t skill-schema-smoke.XXXXXX)"
trap 'rm -rf "$TMP_VAULT"' EXIT
cp -R "$REPO_ROOT/docs/vault-example/." "$TMP_VAULT/"
echo "[smoke] Scratch vault: $TMP_VAULT"

# STUB: invoke each skill via `claude -p`. Fill in during Phase E.
#   claude -p /llm-wiki-stack:llm-wiki-ingest    --vault "$TMP_VAULT" ...
#   claude -p /llm-wiki-stack:llm-wiki-lint      --vault "$TMP_VAULT" ...
#   claude -p /llm-wiki-stack:llm-wiki-fix       --vault "$TMP_VAULT" ...
#   claude -p /llm-wiki-stack:llm-wiki-synthesize --vault "$TMP_VAULT" ...
#   claude -p /llm-wiki-stack:llm-wiki-markdown  --vault "$TMP_VAULT" ...
echo "[smoke] (STUB) run ingest/lint/fix/synthesize/markdown skills against $TMP_VAULT"

# -- Stage 2: schema assertions. ----------------------------------------------

# Every wiki page must have well-formed YAML frontmatter.
fail=0
while IFS= read -r f; do
  if ! yaml_frontmatter_ok "$f"; then
    echo "[smoke] FAIL: frontmatter malformed in $f"
    fail=$((fail + 1))
  fi
done < <(find "$TMP_VAULT/wiki" -name '*.md' -type f)

if [ "$fail" -gt 0 ]; then
  echo "[smoke] FAIL: $fail file(s) with malformed frontmatter"
  exit 1
fi

# Every wiki page's `sources:` field must be [] or [[wikilink]]-shaped.
bad=0
while IFS= read -r f; do
  base="$(basename "$f")"
  case "$base" in
    index.md | log.md | dashboard.md | _index.md) continue ;;
  esac
  sources=$(sources_entries "$f")

  # Empty or absent sources are allowed on source notes themselves.
  [ -z "$sources" ] && continue

  # Every non-empty entry must look like [[...]].
  while IFS= read -r entry; do
    [ -z "$entry" ] && continue
    if [[ "$entry" != \[\[*\]\] ]]; then
      echo "[smoke] FAIL: $f has non-wikilink source entry: $entry"
      bad=$((bad + 1))
    fi
  done <<<"$sources"
done < <(find "$TMP_VAULT/wiki" -name '*.md' -type f)

if [ "$bad" -gt 0 ]; then
  echo "[smoke] FAIL: $bad source entry violation(s)"
  exit 1
fi

# -- Stage 3: portable-markdown contract for files under output/. -------------
#
# The `llm-wiki-markdown` skill writes here; we audit its output shape with
# the dedicated verify-output.sh helper. Empty or absent output/ is allowed.
if ! bash "$REPO_ROOT/scripts/verify-output.sh" "$TMP_VAULT"; then
  echo "[smoke] FAIL: vault/output/ violates the portable-markdown contract"
  exit 1
fi

echo "[smoke] PASS: wiki frontmatter, sources, and output/ contract all valid"
exit 0

#!/usr/bin/env bash
# tests/smoke/skill-schema.sh — Tier 2 smoke test.
#
# Runs each Layer 2 skill (ingest, lint, fix, synthesize) against the
# example-vault fixture and asserts that every output file has:
#   - valid YAML frontmatter (parseable via `yq`)
#   - a `sources:` field holding either `[]` or a list of `[[wikilinks]]`
#
# As with fresh-install.sh, the `claude -p` steps are stubbed until Phase E.
# The YAML/sources assertions run against the already-committed
# tests/fixtures/minimal-vault/ so the script validates the checking logic
# even when the CLI is absent.
#
# See docs/SPECIFICATION.md §13.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# -- Guard: skill execution needs the CLI; assertions do not. -----------------

if ! command -v claude >/dev/null 2>&1; then
  echo "[SKIP] Claude Code CLI not available — skill-schema smoke test stubbed"
  exit 0
fi

# -- Tooling dependency check. ------------------------------------------------

if ! command -v yq >/dev/null 2>&1; then
  echo "[FAIL] yq not found. Install with: pip install yq"
  exit 1
fi

echo "[smoke] yq: $(command -v yq)"
echo "[smoke] claude: $(command -v claude)"

# -- Stage 1: run each skill against the example vault. -----------------------

TMP_VAULT="$(mktemp -d -t skill-schema-smoke.XXXXXX)"
trap 'rm -rf "$TMP_VAULT"' EXIT
cp -R "$REPO_ROOT/example-vault/." "$TMP_VAULT/"
echo "[smoke] Scratch vault: $TMP_VAULT"

# STUB: invoke each skill via `claude -p`. Fill in during Phase E.
#   claude -p /llm-wiki-stack:llm-wiki-ingest --vault "$TMP_VAULT" ...
#   claude -p /llm-wiki-stack:llm-wiki-lint   --vault "$TMP_VAULT" ...
#   claude -p /llm-wiki-stack:llm-wiki-fix    --vault "$TMP_VAULT" ...
#   claude -p /llm-wiki-stack:llm-wiki-synthesize    --vault "$TMP_VAULT" ...
echo "[smoke] (STUB) run ingest/lint/fix/synthesize skills against $TMP_VAULT"

# -- Stage 2: schema assertions. ----------------------------------------------

# Every wiki page must have valid YAML frontmatter.
fail=0
while IFS= read -r f; do
  # Extract frontmatter between first pair of --- lines.
  fm_file="$(mktemp)"
  awk 'NR==1 && /^---$/{n++; next} /^---$/{exit} n{print}' "$f" >"$fm_file"
  if ! yq --yaml-output '.' "$fm_file" >/dev/null 2>&1; then
    echo "[smoke] FAIL: frontmatter not parseable in $f"
    fail=$((fail + 1))
  fi
  rm -f "$fm_file"
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
    index.md|log.md|dashboard.md|_index.md) continue ;;
  esac
  # Pull the sources field via yq from the extracted frontmatter.
  fm_file="$(mktemp)"
  awk 'NR==1 && /^---$/{n++; next} /^---$/{exit} n{print}' "$f" >"$fm_file"
  sources=$(yq --raw-output '.sources // empty | if type == "array" then .[] else . end' "$fm_file" 2>/dev/null || true)
  rm -f "$fm_file"

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

echo "[smoke] PASS: all wiki pages have valid frontmatter and [[wikilink]] sources"
exit 0

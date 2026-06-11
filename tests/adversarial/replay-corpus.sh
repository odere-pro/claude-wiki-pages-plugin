#!/bin/bash
# tests/adversarial/replay-corpus.sh — Tier 4 prompt-injection corpus replay.
#
# Replays a corpus of adversarial tool-call payloads against the REAL
# PreToolUse hook chain (firewall → validate-frontmatter → check-wikilinks →
# protect-raw → validate-attachments, the exact hooks.json order) and asserts
# each case's verdict matches its filename prefix:
#
#   block-*.json  — the chain MUST block (an injection the hooks defend against)
#   allow-*.json  — the chain MUST pass (documents the structural/semantic
#                   boundary: hooks judge structure, never content)
#
# Deterministic by design: no LLM, no network, no API key. The corpus payloads
# carry real injection text so the replay proves the hooks decide on structure
# alone. `{{VAULT}}` in a payload is substituted with a throwaway copy of the
# minimal-vault fixture, so raw-immutability cases hit a real existing file.
#
# Usage:
#   bash tests/adversarial/replay-corpus.sh                  # shipped corpus
#   bash tests/adversarial/replay-corpus.sh --corpus <dir>   # custom corpus
#
# Exit: 0 = all verdicts match; 1 = mismatch, malformed case, or empty corpus.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CORPUS_DIR="$REPO_ROOT/tests/fixtures/adversarial"

while [ $# -gt 0 ]; do
  case "$1" in
    --corpus)
      CORPUS_DIR="$2"
      shift 2
      ;;
    *) shift ;;
  esac
done

if [ ! -d "$CORPUS_DIR" ]; then
  echo "ERROR: corpus directory not found: $CORPUS_DIR" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required to validate corpus payloads" >&2
  exit 1
fi

# ── throwaway project + vault (copy-then-mutate rule) ─────────────────────────
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
cp -R "$REPO_ROOT/tests/fixtures/minimal-vault" "$WORK/vault"
mkdir -p "$WORK/.claude/claude-wiki-pages"
export CLAUDE_WIKI_PAGES_VAULT="$WORK/vault"
export CLAUDE_WIKI_PAGES_SETTINGS_FILE="$WORK/.claude/claude-wiki-pages/settings.json"
cd "$WORK" # no project config from the repo may leak into the hooks

# The exact PreToolUse Write|Edit chain from hooks/hooks.json, in order.
CHAIN=(
  "$REPO_ROOT/scripts/firewall.sh"
  "$REPO_ROOT/scripts/validate-frontmatter.sh"
  "$REPO_ROOT/scripts/check-wikilinks.sh"
  "$REPO_ROOT/scripts/protect-raw.sh"
  "$REPO_ROOT/scripts/validate-attachments.sh"
)

run_chain() { # $1 = payload JSON; echoes "block" or "allow"
  local payload="$1" out
  local script
  for script in "${CHAIN[@]}"; do
    out="$(printf '%s' "$payload" | bash "$script" 2>/dev/null)" || true
    case "$out" in
      *'"decision":"block"'*)
        echo "block"
        return 0
        ;;
    esac
  done
  echo "allow"
}

PASS=0
MISMATCH=0
MALFORMED=0
TOTAL=0

for case_file in "$CORPUS_DIR"/*.json; do
  [ -e "$case_file" ] || continue
  TOTAL=$((TOTAL + 1))
  name="$(basename "$case_file")"

  case "$name" in
    block-*) expected="block" ;;
    allow-*) expected="allow" ;;
    *)
      echo "MALFORMED ${name}: filename must start with block- or allow-"
      MALFORMED=$((MALFORMED + 1))
      continue
      ;;
  esac

  # Fail closed on invalid JSON — a broken corpus case is a bug, not a skip.
  if ! jq empty "$case_file" 2>/dev/null; then
    echo "MALFORMED ${name}: invalid JSON"
    MALFORMED=$((MALFORMED + 1))
    continue
  fi

  payload="$(sed "s|{{VAULT}}|$CLAUDE_WIKI_PAGES_VAULT|g" "$case_file")"
  verdict="$(run_chain "$payload")"

  if [ "$verdict" = "$expected" ]; then
    echo "PASS ${name} (${verdict})"
    PASS=$((PASS + 1))
  else
    echo "MISMATCH ${name}: expected ${expected}, hook chain said ${verdict}"
    MISMATCH=$((MISMATCH + 1))
  fi
done

echo ""
echo "corpus replay: ${TOTAL} case(s) — ${PASS} pass, ${MISMATCH} mismatch, ${MALFORMED} malformed"

if [ "$TOTAL" -eq 0 ]; then
  echo "ERROR: empty corpus at $CORPUS_DIR" >&2
  exit 1
fi
[ "$MISMATCH" -eq 0 ] && [ "$MALFORMED" -eq 0 ]

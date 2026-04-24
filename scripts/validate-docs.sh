#!/bin/bash
# scripts/validate-docs.sh — vocabulary gate per docs/VOCABULARY.md
#
# Checks:
#   1. Banned strings (second-brain, second brain, vault-synthesize, vault-index)
#      do not appear outside the explicit allowlist. These terms were retired
#      from the vocabulary in schema version 1; their replacements are the
#      `llm-wiki-*` skill names.
#   2. Discoverability-register terms ("knowledge management", "agent harness",
#      "LLM Wiki Stack", "raw material") do not leak into technical surfaces.
#   3. Layer references are capitalized ("Layer 1", "Data layer", etc.).
#   4. Slash commands in docs carry the /llm-wiki-stack: namespace prefix.
#   5. Every /llm-wiki-stack:<name> reference resolves to a real skill or agent.
#
# Exit 0 = clean. Exit 1 = violations. Exit 2 = setup error (not in repo root).

set -uo pipefail

ROOT="${1:-.}"
cd "$ROOT" || {
  echo "ERROR: cannot cd to $ROOT" >&2
  exit 2
}

# Must run from repo root — git ls-files drives file discovery.
if ! git rev-parse --show-toplevel >/dev/null 2>&1; then
  echo "ERROR: not a git repo (run from repo root)" >&2
  exit 2
fi

# ─── Exemption lists ─────────────────────────────────────────────────────────

# Files that legitimately contain the banned strings (they *define* or *test*
# the bans, or preserve historical record). Glob patterns — `*` matches any
# sequence including `/`.
BAN_EXEMPT=(
  "scripts/validate-docs.sh"
  "docs/VOCABULARY.md"
  "CHANGELOG.md"
  "tests/*"
)

# Files that legitimately contain discoverability-register terms (SEO surfaces).
# Patterns are shell glob patterns — `*` matches any sequence including `/`.
SEO_EXEMPT=(
  "README.md"
  "docs/VOCABULARY.md"
  "docs/SPECIFICATION.md"
  "scripts/validate-docs.sh"
  ".claude-plugin/plugin.json"
  ".claude-plugin/marketplace.json"
  # Immutable source material may legitimately contain PKM-register terms
  # (external authors do not follow our vocabulary). raw/ is never our prose.
  "*/raw/*"
)

# ─── Patterns ────────────────────────────────────────────────────────────────

# Strings retired from the vocabulary in schema version 1. Banned in every
# tracked file except BAN_EXEMPT.
BANNED_STRINGS='\bsecond-brain\b|\bsecond brain\b|\bvault-synthesize\b|\bvault-index\b'

# SEO-register terms that remain allowed in README/plugin.json but nowhere else.
SEO_LEAK='\bknowledge base\b|\bknowledge management\b|\bagent harness\b|LLM Wiki Stack|\braw material\b'

# Lowercase layer references — the vocabulary requires "Layer 1".."Layer 4"
# and "Data / Skills / Agents / Orchestration" capitalized when naming the architecture.
LAYER_DRIFT='\blayer [1-4]\b|\b(data|skills|agents|orchestration) layer\b'

# Known skill and agent names — a bare /name reference (missing the
# /llm-wiki-stack: prefix) signals a vocabulary violation.
NAMESPACED_NAMES='llm-wiki-ingest-pipeline|llm-wiki-lint-fix|llm-wiki-analyst|llm-wiki-ingest|llm-wiki-query|llm-wiki-lint|llm-wiki-fix|llm-wiki-status|llm-wiki-synthesize|llm-wiki-index|llm-wiki-markdown|llm-wiki|obsidian-graph-colors|obsidian-markdown|obsidian-bases|obsidian-cli'

# ─── Helpers ─────────────────────────────────────────────────────────────────

RED=$'\033[0;31m'
GREEN=$'\033[0;32m'
BOLD=$'\033[1m'
RESET=$'\033[0m'

header() { printf '\n%s=== %s ===%s\n' "$BOLD" "$1" "$RESET"; }
err() { printf '%sFAIL:%s %s\n' "$RED" "$RESET" "$1"; }
ok() { printf '%sPASS:%s %s\n' "$GREEN" "$RESET" "$1"; }

exempt_from() {
  local file="$1"
  shift
  local pattern
  for pattern in "$@"; do
    # shellcheck disable=SC2254
    case "$file" in
      $pattern) return 0 ;;
    esac
  done
  return 1
}

VIOLATIONS=0

# ─── Check 0: retired banned strings ─────────────────────────────────────────

header "Banned strings (retired vocabulary)"

BAN_HITS=0
while IFS= read -r file; do
  exempt_from "$file" "${BAN_EXEMPT[@]}" && continue
  hits=$(grep -nHiE "$BANNED_STRINGS" "$file" 2>/dev/null || true)
  if [ -n "$hits" ]; then
    err "banned string in $file"
    printf '%s\n' "$hits" | sed 's/^/    /'
    BAN_HITS=$((BAN_HITS + 1))
  fi
done < <(git ls-files -- '*.md' '*.json' '*.sh' '*.yml' '*.yaml' 2>/dev/null)

if [ "$BAN_HITS" -eq 0 ]; then
  ok "no banned strings"
else
  VIOLATIONS=$((VIOLATIONS + BAN_HITS))
fi

# ─── Check 1: SEO-register leaks ─────────────────────────────────────────────

header "SEO-register leaks into technical surfaces"

SEO_HITS=0
while IFS= read -r file; do
  exempt_from "$file" "${SEO_EXEMPT[@]}" && continue
  hits=$(grep -nHiE "$SEO_LEAK" "$file" 2>/dev/null || true)
  if [ -n "$hits" ]; then
    err "SEO-register term in $file"
    printf '%s\n' "$hits" | sed 's/^/    /'
    SEO_HITS=$((SEO_HITS + 1))
  fi
done < <(git ls-files -- '*.md' '*.json' '*.sh' '*.yml' '*.yaml' 2>/dev/null)

if [ "$SEO_HITS" -eq 0 ]; then
  ok "no SEO-register leaks"
else
  VIOLATIONS=$((VIOLATIONS + SEO_HITS))
fi

# ─── Check 2: layer capitalization ──────────────────────────────────────────

header "Layer capitalization"

LAYER_HITS=0
while IFS= read -r file; do
  exempt_from "$file" "${BAN_EXEMPT[@]}" && continue
  # Case-sensitive: only lowercase "layer 1..4" and lowercase layer-name
  # compounds ("data layer" etc.) are violations. "Layer 4" and "Data layer"
  # (Title Case) are the canonical forms and must pass.
  hits=$(grep -nHE "$LAYER_DRIFT" "$file" 2>/dev/null || true)
  if [ -n "$hits" ]; then
    err "lowercase layer reference in $file"
    printf '%s\n' "$hits" | sed 's/^/    /'
    LAYER_HITS=$((LAYER_HITS + 1))
  fi
done < <(git ls-files -- '*.md' 2>/dev/null)

if [ "$LAYER_HITS" -eq 0 ]; then
  ok "layer references are capitalized"
else
  VIOLATIONS=$((VIOLATIONS + LAYER_HITS))
fi

# ─── Check 3: bare slash commands (missing namespace) ───────────────────────

header "Bare slash commands"

BARE_HITS=0
while IFS= read -r file; do
  exempt_from "$file" "${BAN_EXEMPT[@]}" && continue
  # Only flag backtick-wrapped slash commands — the canonical form for inline
  # code. This avoids false positives from file paths (skills/obsidian-cli/)
  # and from URLs in prose.
  #
  # The trailing `([^-[:alnum:]]|$)` guard keeps `llm-wiki` from matching
  # inside `/llm-wiki-stack:` (the properly-namespaced form) — `\b` would
  # match there because `-` is a non-word char, causing a false positive.
  hits=$(grep -nHE "\`/($NAMESPACED_NAMES)([^-[:alnum:]]|$)" "$file" 2>/dev/null || true)
  if [ -n "$hits" ]; then
    err "bare slash command in $file (missing /llm-wiki-stack: prefix)"
    printf '%s\n' "$hits" | sed 's/^/    /'
    BARE_HITS=$((BARE_HITS + 1))
  fi
done < <(git ls-files -- '*.md' 2>/dev/null)

if [ "$BARE_HITS" -eq 0 ]; then
  ok "all slash commands use the llm-wiki-stack: namespace"
else
  VIOLATIONS=$((VIOLATIONS + BARE_HITS))
fi

# ─── Check 4: slash-command references resolve ──────────────────────────────

header "Slash-command references"

# Collect every unique /llm-wiki-stack:<name> referenced anywhere in markdown.
REFS=$(git ls-files -- '*.md' 2>/dev/null |
  xargs grep -ohE '/llm-wiki-stack:[a-z][a-z0-9-]+' 2>/dev/null |
  sort -u)

UNRESOLVED=0
if [ -n "$REFS" ]; then
  while IFS= read -r ref; do
    [ -z "$ref" ] && continue
    name="${ref#/llm-wiki-stack:}"
    if [ -d "skills/$name" ] || [ -f "agents/${name}.md" ]; then
      continue
    fi
    err "$ref does not resolve to skills/$name/ or agents/$name.md"
    # Show which files use it.
    uses=$(git ls-files -- '*.md' | xargs grep -lF "$ref" 2>/dev/null || true)
    if [ -n "$uses" ]; then
      printf '%s\n' "$uses" | sed 's/^/    referenced in: /'
    fi
    UNRESOLVED=$((UNRESOLVED + 1))
  done <<<"$REFS"
fi

if [ "$UNRESOLVED" -eq 0 ]; then
  ok "all slash-command references resolve"
else
  VIOLATIONS=$((VIOLATIONS + UNRESOLVED))
fi

# ─── Summary ────────────────────────────────────────────────────────────────

header "Summary"

if [ "$VIOLATIONS" -eq 0 ]; then
  printf '%sAll vocabulary checks passed.%s\n' "$GREEN" "$RESET"
  exit 0
else
  printf '%s%d violation(s) found.%s Fix before committing.\n' "$RED" "$VIOLATIONS" "$RESET"
  exit 1
fi

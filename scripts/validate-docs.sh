#!/bin/bash
# scripts/validate-docs.sh — glossary gate per docs/GLOSSARY.md
#
# Checks:
#   0. Banned strings (second-brain, second brain, vault-synthesize, vault-index)
#      do not appear outside the explicit allowlist. These terms were retired
#      from the glossary in schema version 1; their replacements are the
#      `llm-wiki-*` skill names.
#   0b. Retired skill name `llm-wiki` (renamed to `init` in 1.0.0).
#   1. Discoverability-register terms ("knowledge management", "agent harness",
#      "LLM Wiki Stack", "raw material") do not leak into technical surfaces.
#   2. Layer references are capitalized ("Layer 1", "Data layer", etc.).
#   3. Slash commands in docs carry the /claude-wiki-pages: namespace prefix.
#   4. Every /claude-wiki-pages:<name> reference resolves to a real skill or agent.
#   5. Design-drift (ADR-0013): mermaid node grounding, link resolution, hook
#      set-equality, feature-relation counts, authority presence, router parity.
#      Scan set: docs/design/*.md and SOFTWARE-3-0.md.
#
# Exit 0 = clean. Exit 1 = violations. Exit 2 = setup error (not in repo root).

set -euo pipefail

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
  "docs/GLOSSARY.md"
  "CHANGELOG.md"
  "docs/adr/*"
  "tests/*"
  # Calibration-flow fixtures are test corpora, not project prose.
  ".claude/fixtures/*"
)

# Files that legitimately contain discoverability-register terms (SEO surfaces).
# Patterns are shell glob patterns — `*` matches any sequence including `/`.
SEO_EXEMPT=(
  "README.md"
  "docs/GLOSSARY.md"
  "scripts/validate-docs.sh"
  ".claude-plugin/plugin.json"
  # Immutable source material may legitimately contain PKM-register terms
  # (external authors do not follow our glossary). raw/ is never our prose.
  "*/raw/*"
  # Calibration-flow fixtures are test corpora, not project prose.
  ".claude/fixtures/*"
)

# ─── Prose file lister ───────────────────────────────────────────────────────

# Vault content is data, not project prose. The dogfood vault
# (docs/claude-wiki-pages-plugin-vault/, formerly docs/vault/), Obsidian config
# trees (.obsidian/), and raw documents are never grouped or indexed by the
# normalization gates — external authors do not follow our glossary, and wiki
# pages are LLM-maintained artifacts, not repo prose.
# (The shipped vault template at skills/init/template/ and the golden fixture at
# tests/fixtures/reference-vault/ stay scanned as authored repo prose; their
# raw/ is already exempted per-check.)
ls_prose() {
  git ls-files -- "$@" 2>/dev/null |
    grep -vE '^docs/vault/|^docs/claude-wiki-pages-plugin-vault/|(^|/)\.obsidian/' || true
}

# ─── Patterns ────────────────────────────────────────────────────────────────

# Strings retired from the glossary in schema version 1. Banned in every
# tracked file except BAN_EXEMPT.
# Agent names retired in 0.2.0 (replaced by {plugin}-{role}-agent convention,
# see docs/adr/ADR-0002-agent-naming-convention.md): llm-wiki-ingest-pipeline,
# llm-wiki-lint-fix, llm-wiki-analyst.
# Identifiers retired in 1.0.0 (plugin rebrand llm-wiki-stack → claude-wiki-pages,
# skills → short verbs): the plugin id llm-wiki-stack
# and the old llm-wiki-<verb> skill names. The bare `llm-wiki` is intentionally
# NOT banned here (it collides with the kept `llm-wiki-pattern` and docs/llm-wiki/);
# a stray `/claude-wiki-pages:llm-wiki` is caught by the slash-resolution check.
# All allowlisted only in CHANGELOG and docs/adr/*, which preserve the historical record.
BANNED_STRINGS='\bsecond-brain\b|\bsecond brain\b|\bvault-synthesize\b|\bvault-index\b|\bllm-wiki-stack\b|\bllm-wiki-ingest\b|\bllm-wiki-query\b|\bllm-wiki-lint\b|\bllm-wiki-fix\b|\bllm-wiki-status\b|\bllm-wiki-synthesize\b|\bllm-wiki-index\b|\bllm-wiki-markdown\b|\bllm-wiki-ingest-pipeline\b|\bllm-wiki-lint-fix\b|\bllm-wiki-analyst\b'

# SEO-register terms that remain allowed in README/plugin.json but nowhere else.
SEO_LEAK='\bknowledge base\b|\bknowledge management\b|\bagent harness\b|LLM Wiki Stack|\braw material\b'

# Lowercase layer references — the glossary requires "Layer 1".."Layer 4"
# and "Data / Skills / Agents / Orchestration" capitalized when naming the architecture.
LAYER_DRIFT='\blayer [1-4]\b|\b(data|skills|agents|orchestration) layer\b'

# Known skill and agent names — a bare /name reference (missing the
# /claude-wiki-pages: prefix) signals a glossary violation.
NAMESPACED_NAMES='doctor|wiki|claude-wiki-pages-orchestrator-agent|claude-wiki-pages-ingest-agent|claude-wiki-pages-curator-agent|claude-wiki-pages-analyst-agent|ingest|query|lint|fix|status|synthesize|index|markdown|init|onboarding|engine-api|maintain-contract|claude-wiki-pages-onboarding-agent|obsidian-graph-colors|obsidian-markdown|obsidian-bases|obsidian-cli'

# ─── Helpers ─────────────────────────────────────────────────────────────────

RED=$'\033[0;31m'
GREEN=$'\033[0;32m'
YELLOW=$'\033[0;33m'
BOLD=$'\033[1m'
RESET=$'\033[0m'

header() { printf '\n%s=== %s ===%s\n' "$BOLD" "$1" "$RESET"; }
err() { printf '%sFAIL:%s %s\n' "$RED" "$RESET" "$1"; }
ok() { printf '%sPASS:%s %s\n' "$GREEN" "$RESET" "$1"; }
warn() { printf '%sWARN:%s %s\n' "$YELLOW" "$RESET" "$1"; }

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

header "Banned strings (retired glossary)"

BAN_HITS=0
while IFS= read -r file; do
  exempt_from "$file" "${BAN_EXEMPT[@]}" && continue || true
  hits=$(grep -nHiE "$BANNED_STRINGS" "$file" 2>/dev/null || true)
  if [ -n "$hits" ]; then
    err "banned string in $file"
    printf '%s\n' "$hits" | sed 's/^/    /'
    BAN_HITS=$((BAN_HITS + 1))
  fi
done < <(ls_prose '*.md' '*.json' '*.sh' '*.yml' '*.yaml')

if [ "$BAN_HITS" -eq 0 ]; then
  ok "no banned strings"
else
  VIOLATIONS=$((VIOLATIONS + BAN_HITS))
fi

# ─── Check 0b: retired skill name `llm-wiki` (renamed to `init` in 1.0.0) ─────
#
# The bare token `llm-wiki` is NOT in BANNED_STRINGS because it collides with
# the kept `llm-wiki-pattern` (Karpathy's pattern) and the `docs/llm-wiki/`
# guide directory. This check narrows to `llm-wiki` used AS A SKILL — the
# backtick-wrapped form `llm-wiki` and the namespaced
# `/claude-wiki-pages:llm-wiki` — so the pattern page, plugin.json keyword, and
# doc path never trip it. Allowlisted in BAN_EXEMPT (CHANGELOG, ADRs, GLOSSARY,
# tests, fixtures), which legitimately record the rename.
header "Retired skill name (llm-wiki -> init)"

RETIRED_SKILL='`llm-wiki`|/claude-wiki-pages:llm-wiki([^-[:alnum:]]|$)'

RETIRED_HITS=0
while IFS= read -r file; do
  exempt_from "$file" "${BAN_EXEMPT[@]}" && continue || true
  hits=$(grep -nHE "$RETIRED_SKILL" "$file" 2>/dev/null || true)
  if [ -n "$hits" ]; then
    err "retired skill name \`llm-wiki\` in $file (use \`init\`)"
    printf '%s\n' "$hits" | sed 's/^/    /'
    RETIRED_HITS=$((RETIRED_HITS + 1))
  fi
done < <(ls_prose '*.md')

if [ "$RETIRED_HITS" -eq 0 ]; then
  ok "no retired \`llm-wiki\` skill references"
else
  VIOLATIONS=$((VIOLATIONS + RETIRED_HITS))
fi

# ─── Check 1: SEO-register leaks ─────────────────────────────────────────────

header "SEO-register leaks into technical surfaces"

SEO_HITS=0
while IFS= read -r file; do
  exempt_from "$file" "${SEO_EXEMPT[@]}" && continue || true
  hits=$(grep -nHiE "$SEO_LEAK" "$file" 2>/dev/null || true)
  if [ -n "$hits" ]; then
    err "SEO-register term in $file"
    printf '%s\n' "$hits" | sed 's/^/    /'
    SEO_HITS=$((SEO_HITS + 1))
  fi
done < <(ls_prose '*.md' '*.json' '*.sh' '*.yml' '*.yaml')

if [ "$SEO_HITS" -eq 0 ]; then
  ok "no SEO-register leaks"
else
  VIOLATIONS=$((VIOLATIONS + SEO_HITS))
fi

# ─── Check 2: layer capitalization ──────────────────────────────────────────

header "Layer capitalization"

LAYER_HITS=0
while IFS= read -r file; do
  exempt_from "$file" "${BAN_EXEMPT[@]}" && continue || true
  # Case-sensitive: only lowercase "layer 1..4" and lowercase layer-name
  # compounds ("data layer" etc.) are violations. "Layer 4" and "Data layer"
  # (Title Case) are the canonical forms and must pass.
  hits=$(grep -nHE "$LAYER_DRIFT" "$file" 2>/dev/null || true)
  if [ -n "$hits" ]; then
    err "lowercase layer reference in $file"
    printf '%s\n' "$hits" | sed 's/^/    /'
    LAYER_HITS=$((LAYER_HITS + 1))
  fi
done < <(ls_prose '*.md')

if [ "$LAYER_HITS" -eq 0 ]; then
  ok "layer references are capitalized"
else
  VIOLATIONS=$((VIOLATIONS + LAYER_HITS))
fi

# ─── Check 3: bare slash commands (missing namespace) ───────────────────────

header "Bare slash commands"

BARE_HITS=0
while IFS= read -r file; do
  exempt_from "$file" "${BAN_EXEMPT[@]}" && continue || true
  # Only flag backtick-wrapped slash commands — the canonical form for inline
  # code. This avoids false positives from file paths (skills/obsidian-cli/)
  # and from URLs in prose.
  #
  # The trailing `([^-[:alnum:]]|$)` guard keeps `llm-wiki` from matching
  # inside `/claude-wiki-pages:` (the properly-namespaced form) — `\b` would
  # match there because `-` is a non-word char, causing a false positive.
  hits=$(grep -nHE "\`/($NAMESPACED_NAMES)([^-[:alnum:]]|$)" "$file" 2>/dev/null || true)
  if [ -n "$hits" ]; then
    err "bare slash command in $file (missing /claude-wiki-pages: prefix)"
    printf '%s\n' "$hits" | sed 's/^/    /'
    BARE_HITS=$((BARE_HITS + 1))
  fi
done < <(ls_prose '*.md')

if [ "$BARE_HITS" -eq 0 ]; then
  ok "all slash commands use the claude-wiki-pages: namespace"
else
  VIOLATIONS=$((VIOLATIONS + BARE_HITS))
fi

# ─── Check 4: slash-command references resolve ──────────────────────────────

header "Slash-command references"

# Collect every unique /claude-wiki-pages:<name> referenced anywhere in markdown.
REFS=$(ls_prose '*.md' |
  xargs grep -ohE '/claude-wiki-pages:[a-z][a-z0-9-]+' 2>/dev/null |
  sort -u || true)

UNRESOLVED=0
if [ -n "$REFS" ]; then
  while IFS= read -r ref; do
    [ -z "$ref" ] && continue
    name="${ref#/claude-wiki-pages:}"
    if [ -d "skills/$name" ] || [ -f "agents/${name}.md" ] || [ -f "commands/${name}.md" ]; then
      continue
    fi
    err "$ref does not resolve to skills/$name/, agents/$name.md, or commands/$name.md"
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

# ─── Check 5: design-drift (ADR-0013) ───────────────────────────────────────
#
# Scan set: docs/design/*.md and SOFTWARE-3-0.md (via git ls-files).
# Sub-checks:
#   5a — mermaid node grounding: file-form tokens (.sh/.ts/.json/.md/.yml/.yaml)
#        inside mermaid fences must resolve (scripts/ inventory or git ls-files).
#        Docs carrying [speculative] are fully exempt.
#   5b — link resolution: every ](./…) and ](../…) relative link must resolve,
#        resolved relative to the linking file's directory. Gitignored targets and
#        http(s)/mailto links are exempt.
#   5c — hook set-equality: every script wired in hooks/hooks.json must appear
#        somewhere in design-doc mermaid fences; PreToolUse ordering delta → WARN.
#   5d — 06-feature-relations counts: stated agents/skills/commands/hook-event
#        counts must match reality.
#   5e — authority presence: each scanned doc must carry ≥1 resolvable link to
#        an authority surface (CLAUDE.md, docs/architecture.md,
#        skills/init/template/CLAUDE.md, hooks/hooks.json,
#        .claude-plugin/plugin.json, docs/adr/).
#   5f — router parity: every row in SOFTWARE-3-0.md's "Six surfaces" table must
#        have non-empty human AND agent cells, with all links resolving.

# Helper: resolve a relative link from a given directory.
# Prints one of: OK | GITIGNORED | EXTERNAL | MISSING.
# Usage: _resolve_link <dir> <link>
#
# Guard-clause early-return order keeps nesting ≤ 2 levels (M07).
_resolve_link() {
  local dir="$1" link="$2"

  # Guard 1: external links — skip immediately.
  case "$link" in http* | mailto*)
    printf 'EXTERNAL'
    return
    ;;
  esac

  # Guard 2: strip trailing anchor; empty after strip means same-file link.
  link="${link%%#*}"
  [ -z "$link" ] && {
    printf 'OK'
    return
  }

  # Guard 3: resolve existence via subshell.
  local exists
  exists=$(cd "$dir" 2>/dev/null && { [ -e "$link" ] && printf 'OK' || printf 'MISSING'; }) || true
  [ "$exists" = "OK" ] && {
    printf 'OK'
    return
  }

  # Guard 4: check if the missing path is gitignored (gitignored → treat as OK).
  # Build absolute path with pure shell (no python3): walk . and .. segments.
  local dirabs
  dirabs=$(cd "$dir" 2>/dev/null && pwd) || true
  [ -z "$dirabs" ] && {
    printf 'MISSING'
    return
  }

  local joined="$dirabs/$link"
  local abs="" seg
  local IFS='/'
  for seg in $joined; do
    case "$seg" in
      '' | .) ;;
      ..) abs="${abs%/*}" ;;
      *) abs="$abs/$seg" ;;
    esac
  done
  unset IFS
  abs="${abs:-/}"
  local rel="${abs#$(pwd)/}"
  if git check-ignore -q "$rel" 2>/dev/null; then
    printf 'GITIGNORED'
    return
  fi
  printf 'MISSING'
}

header "Design-drift gate (Check 5)"

# Guard: only run Check 5 if this looks like the full plugin repo.
# Without hooks/hooks.json there is no ground truth for 5c/5d, and design
# docs legitimately link to hooks/ — those links would all FAIL spuriously
# in stripped contexts (e.g. isolated bats test repos).
if ! git ls-files -- 'hooks/hooks.json' 2>/dev/null | grep -q .; then
  ok "no hooks/hooks.json tracked — skipping design-drift check"
else

  # Helper: check if a file-form token resolves.
  # Returns 0 if resolved, 1 if not.
  # Resolution order: -e repo-root, scripts/ inventory, git ls-files any basename.
  DRIFT_HITS=0
  # Cache git ls-files once to avoid repeated subprocess and SIGPIPE risk.
  _GIT_LS=$(git ls-files 2>/dev/null || true)

  _token_resolves() {
    local tok="$1"
    [ -e "$tok" ] && return 0
    [ -f "scripts/$tok" ] && return 0
    # Anchor to path boundary: match only when tok is the full filename component
    # (preceded by '/' or start-of-line). Avoids suffix collisions like
    # 'docs.sh' matching 'validate-docs.sh' under unanchored grep -F.
    # Escape any regex metacharacters in the token before building the pattern.
    local _escaped
    _escaped=$(printf '%s' "$tok" | sed 's/[][\\.^$*/]/\\&/g')
    # Here-string (not a pipe): grep -q closes its input early on a match, which
    # would SIGPIPE a feeding `printf` and, under `set -o pipefail`, surface as a
    # 141 pipeline status — falsely reporting the token unresolved on BSD/macOS.
    grep -qE "(^|/)${_escaped}$" <<<"$_GIT_LS" && return 0
    return 1
  }

  # ── Per-file scan helpers ──────────────────────────────────────────────────────
  # Extracted from the main loop to reduce nesting depth.
  # Side-effects: increments DRIFT_HITS (global); appends to _DESIGN_SH_TOKENS
  # and _DESIGN_PRE_ORDER (globals set before call).

  # _scan_5a_grounding <file> <fence_tokens>
  # Check 5a: verify each mermaid file-form token resolves (skip speculative docs).
  _scan_5a_grounding() {
    local file="$1" fence_tokens="$2"
    grep -q '\[speculative\]' "$file" 2>/dev/null && return
    local tok
    while IFS= read -r tok; do
      [ -z "$tok" ] && continue
      _token_resolves "$tok" && continue
      err "unresolved mermaid token '$tok' in $file"
      DRIFT_HITS=$((DRIFT_HITS + 1))
    done <<<"$fence_tokens"
  }

  # _scan_5b_links <file> <dir>
  # Check 5b: verify every relative markdown link resolves.
  _scan_5b_links() {
    local file="$1" dir="$2"
    local rawlink link result
    while IFS= read -r rawlink; do
      link=$(printf '%s' "$rawlink" | sed 's/^](\(.*\))$/\1/')
      case "$link" in http* | mailto*) continue ;; esac
      result=$(_resolve_link "$dir" "$link")
      case "$result" in OK | GITIGNORED | EXTERNAL) continue ;; esac
      err "dead link in $file: $link"
      printf '    (link does not resolve)\n'
      DRIFT_HITS=$((DRIFT_HITS + 1))
    done < <(grep -oE '\]\(\.(\.)?/[^)]+\)' "$file" 2>/dev/null |
      sed 's/^](\(.*\))$/\1/' || true)
  }

  # _scan_5e_authority <file> <dir>
  # Check 5e: ensure the doc has at least one resolvable link to an authority surface.
  _scan_5e_authority() {
    local file="$1" dir="$2"
    local rawlink link result AUTH_FOUND=0
    while IFS= read -r rawlink; do
      [ "$AUTH_FOUND" -eq 1 ] && break
      link=$(printf '%s' "$rawlink" | sed 's/^](\(.*\))$/\1/')
      case "$link" in http* | mailto*) continue ;; esac
      grep -qE 'CLAUDE\.md|architecture\.md|hooks\.json|plugin\.json|/docs/adr|docs/adr' <<<"$link" || continue
      result=$(_resolve_link "$dir" "$link")
      case "$result" in OK | GITIGNORED) AUTH_FOUND=1 ;; esac
    done < <(grep -oE '\]\(\.(\.)?/[^)]+\)' "$file" 2>/dev/null |
      sed 's/^](\(.*\))$/\1/' || true)

    if [ "$AUTH_FOUND" -eq 0 ]; then
      err "no resolvable authority link in $file"
      printf '    (add a link to CLAUDE.md, docs/architecture.md, hooks/hooks.json, etc.)\n'
      DRIFT_HITS=$((DRIFT_HITS + 1))
    fi
  }

  # _scan_pre_order <file>
  # Collect PreToolUse script ordering from 02-component-design.md for check 5c.
  _scan_pre_order() {
    local file="$1"
    case "$file" in */02-component-design.md) ;; *) return ;; esac
    _DESIGN_PRE_ORDER=$(awk '
    /^[[:space:]]*```mermaid/{f=1;cnt=0;buf="";next}
    /^[[:space:]]*```/{
      if(f){
        if(cnt>=5){print buf}
        f=0;cnt=0;buf=""
      }
      next
    }
    f{
      if(/SessionStart|UserPromptSubmit|PreToolUse|PostToolUse|SubagentStop|Stop|SessionEnd/)cnt++
      if (/pre[[:space:]]*-->/ && match($0,/pre[[:space:]]*-->[^"]*"[A-Za-z0-9_-]+\.sh/)) {
        s=substr($0,RSTART,RLENGTH)
        sub(/.*"/, "", s)
        buf=buf s "\n"
      }
    }
    ' "$file" 2>/dev/null | awk '!seen[$0]++' || true)
  }

  # _scan_design_file <file>
  # Orchestrate sub-checks 5a, 5b, 5e on a single design doc.
  _scan_design_file() {
    local file="$1"
    local dir
    dir=$(dirname "$file")

    # 5a: extract mermaid tokens (always, for 5c Set A aggregation).
    local FENCE_TOKENS
    FENCE_TOKENS=$(awk \
      '/^[[:space:]]*```mermaid/{f=1;next} /^[[:space:]]*```/{if(f)f=0;next} f' \
      "$file" 2>/dev/null |
      grep -oE '[A-Za-z0-9_-]+\.(sh|ts|json|md|yml|yaml)' | sort -u || true)

    # Aggregate *.sh tokens into global Set A for 5c.
    local _SH
    _SH=$(printf '%s' "$FENCE_TOKENS" | grep '\.sh$' || true)
    [ -n "$_SH" ] && _DESIGN_SH_TOKENS=$(printf '%s\n%s' "$_DESIGN_SH_TOKENS" "$_SH" | sort -u)

    # Collect PreToolUse order (5c) from 02-component-design.md.
    _scan_pre_order "$file"

    # Run the three per-file sub-checks.
    _scan_5a_grounding "$file" "$FENCE_TOKENS"
    _scan_5b_links "$file" "$dir"
    _scan_5e_authority "$file" "$dir"
  }

  # ── Collect all script tokens from design-doc mermaid fences for 5c ──────────
  # Set A: all bare *.sh tokens across all design doc fences.
  # Set B: scripts from hooks/hooks.json (bare names).
  # Fail if Set B − Set A is non-empty (a hooked script is not depicted anywhere).
  # Also collect PreToolUse script order from the hooks-diagram fence (02).

  _DESIGN_SH_TOKENS=""
  _DESIGN_PRE_ORDER="" # PreToolUse scripts in design-doc order (from hook-diagram fence)
  _HOOKS_PRE_ORDER=""  # PreToolUse scripts from hooks.json

  # Extract Set B from hooks.json
  _HOOKS_SH_SET=$(grep -oE 'scripts/[a-z-]+\.sh' hooks/hooks.json 2>/dev/null |
    sed 's|scripts/||' | sort -u || true)

  # Extract hooks.json PreToolUse order (bare names, in wiring order).
  # Use two-argument match + substr (BSD awk compatible; no three-arg match).
  _HOOKS_PRE_ORDER=$(awk '
  BEGIN { in_pre=0 }
  /"PreToolUse"/ { in_pre=1 }
  in_pre && /"command"/ {
    if (match($0, /scripts\/[a-z-]+\.sh/)) {
      s=substr($0,RSTART,RLENGTH)
      sub(/scripts\//, "", s)
      print s
    }
  }
  in_pre && /^[[:space:]]*\]/ { in_pre=0 }
' hooks/hooks.json 2>/dev/null | awk '!seen[$0]++' || true)

  # ── Per-file scans (delegated to _scan_design_file) ──────────────────────────
  while IFS= read -r file; do
    [ -f "$file" ] || continue
    _scan_design_file "$file"
  done < <(git ls-files -- 'docs/design/*.md' 'SOFTWARE-3-0.md' 2>/dev/null)

  # ── 5c: hook set-equality ─────────────────────────────────────────────────────
  # Set B − Set A: scripts wired in hooks/hooks.json but not depicted in any design doc fence.
  HOOK_SET_HITS=0
  while IFS= read -r s; do
    [ -z "$s" ] && continue
    if ! grep -qxF "$s" <<<"$_DESIGN_SH_TOKENS"; then
      err "hook script not depicted in any design-doc mermaid fence: $s"
      HOOK_SET_HITS=$((HOOK_SET_HITS + 1))
    fi
  done <<<"$_HOOKS_SH_SET"

  if [ "$HOOK_SET_HITS" -eq 0 ]; then
    ok "all hooks/hooks.json scripts are depicted in design docs"
  else
    DRIFT_HITS=$((DRIFT_HITS + HOOK_SET_HITS))
  fi

  # ── 5c: PreToolUse ordering WARN (OQ-11) ─────────────────────────────────────
  # Compare the PreToolUse script order in the design-doc hook-diagram fence
  # against hooks/hooks.json. A delta is a WARN (does NOT increment VIOLATIONS).
  if [ -n "$_DESIGN_PRE_ORDER" ] && [ -n "$_HOOKS_PRE_ORDER" ]; then
    # Filter design order to only include scripts that are in hooks.json PreToolUse
    DESIGN_PRE_FILTERED=$(printf '%s' "$_DESIGN_PRE_ORDER" | while IFS= read -r s; do
      grep -qxF "$s" <<<"$_HOOKS_PRE_ORDER" && printf '%s\n' "$s" || true
    done)
    if [ "$DESIGN_PRE_FILTERED" != "$(printf '%s' "$_HOOKS_PRE_ORDER")" ] &&
      [ -n "$DESIGN_PRE_FILTERED" ]; then
      warn "PreToolUse script order in 02-component-design.md differs from hooks/hooks.json"
      printf '    design order: %s\n' "$(printf '%s' "$DESIGN_PRE_FILTERED" | tr '\n' ' ')"
      printf '    hooks.json:   %s\n' "$(printf '%s' "$_HOOKS_PRE_ORDER" | tr '\n' ' ')"
      printf '    (ordering delta is a doc issue, not a regression — OQ-11)\n'
    fi
  fi

  # ── 5d: 06-feature-relations.md count verification ───────────────────────────
  FEAT_DOC="docs/design/06-feature-relations.md"
  if git ls-files -- "$FEAT_DOC" 2>/dev/null | grep -q .; then
    # Actual counts
    ACTUAL_AGENTS=$(git ls-files -- 'agents/*.md' 2>/dev/null | wc -l | tr -d ' ')
    ACTUAL_SKILLS=$(git ls-files -- 'skills/*/SKILL.md' 2>/dev/null | wc -l | tr -d ' ')
    ACTUAL_CMDS=$(git ls-files -- 'commands/*.md' 2>/dev/null | wc -l | tr -d ' ')
    ACTUAL_HOOKS=$(grep -oE '"(SessionStart|UserPromptSubmit|PreToolUse|PostToolUse|SubagentStop|Stop|SessionEnd)"' \
      hooks/hooks.json 2>/dev/null | sort -u | wc -l | tr -d ' ' || true)

    # Stated counts — extract from the table row's "In this repo?" cell (col 3
    # when split on '|').  Strip leading non-digit content (emoji, checkmarks,
    # whitespace) then take the first integer.  This handles both the plain
    # "| 7 |" form and the "| ✅ 7 |" / "| ✅ 7 events |" forms.
    # For the four known numeric dimensions a table row MUST be present; an
    # empty extraction is itself a FAIL (not a silent skip).
    _stated_count() {
      local label="$1"
      grep "\*\*${label}\*\*" "$FEAT_DOC" 2>/dev/null |
        awk -F'|' '{print $3}' |
        grep -oE '[0-9]+' | head -1 || true
    }
    STATED_AGENTS=$(_stated_count "Agents")
    STATED_SKILLS=$(_stated_count "Skills")
    STATED_CMDS=$(_stated_count "Commands")
    STATED_HOOKS=$(_stated_count "Hooks")

    COUNT_FAIL=0

    # For each known dimension: a missing stated count is itself a failure
    # (the table row is required; silence would hide drift).
    if [ -z "$STATED_AGENTS" ] || [ "$STATED_AGENTS" != "$ACTUAL_AGENTS" ]; then
      err "count mismatch in $FEAT_DOC: agents stated=${STATED_AGENTS:-<unextractable>} actual=$ACTUAL_AGENTS"
      COUNT_FAIL=$((COUNT_FAIL + 1))
    fi
    if [ -z "$STATED_SKILLS" ] || [ "$STATED_SKILLS" != "$ACTUAL_SKILLS" ]; then
      err "count mismatch in $FEAT_DOC: skills stated=${STATED_SKILLS:-<unextractable>} actual=$ACTUAL_SKILLS"
      COUNT_FAIL=$((COUNT_FAIL + 1))
    fi
    if [ -z "$STATED_CMDS" ] || [ "$STATED_CMDS" != "$ACTUAL_CMDS" ]; then
      err "count mismatch in $FEAT_DOC: commands stated=${STATED_CMDS:-<unextractable>} actual=$ACTUAL_CMDS"
      COUNT_FAIL=$((COUNT_FAIL + 1))
    fi
    if [ -z "$STATED_HOOKS" ] || [ "$STATED_HOOKS" != "$ACTUAL_HOOKS" ]; then
      err "count mismatch in $FEAT_DOC: hook events stated=${STATED_HOOKS:-<unextractable>} actual=$ACTUAL_HOOKS"
      COUNT_FAIL=$((COUNT_FAIL + 1))
    fi

    if [ "$COUNT_FAIL" -eq 0 ]; then
      ok "06-feature-relations.md counts match reality"
    else
      DRIFT_HITS=$((DRIFT_HITS + COUNT_FAIL))
    fi
  fi

  # ── 5f: router parity (SOFTWARE-3-0.md "Six surfaces" table) ─────────────────
  ROUTER_FILE="SOFTWARE-3-0.md"
  if git ls-files -- "$ROUTER_FILE" 2>/dev/null | grep -q .; then
    dir_router=$(dirname "$ROUTER_FILE")
    ROUTER_HITS=0

    # Parse the table with awk FS="|". Skip header and separator rows.
    # For each data row: check col 2 (human) and col 3 (agent) are non-empty.
    # Check every ](./...) or ](../...) link in each cell resolves.
    while IFS= read -r row; do
      # Skip separator rows (--- patterns)
      case "$row" in *'---'*) continue ;; esac
      # Skip header row (contains "Human on-ramp")
      case "$row" in *'Human on-ramp'*) continue ;; esac
      # Skip non-table lines
      case "$row" in '|'*) ;; *) continue ;; esac

      # Split on | and get columns (awk-style: $2=col1, $3=human, $4=agent)
      col1=$(printf '%s' "$row" | awk -F'|' '{print $2}')
      col2=$(printf '%s' "$row" | awk -F'|' '{print $3}')
      col3=$(printf '%s' "$row" | awk -F'|' '{print $4}')

      # Strip whitespace and markup placeholders for emptiness check.
      # Also remove &nbsp;, em/en dashes (— –), underscores so that
      # placeholder-only cells (e.g. '&nbsp;', '—') still count as empty.
      col2_stripped=$(printf '%s' "$col2" | sed 's/[[:space:]]//g;s/\*//g;s/&nbsp;//g;s/—//g;s/–//g;s/_//g')
      col3_stripped=$(printf '%s' "$col3" | sed 's/[[:space:]]//g;s/\*//g;s/&nbsp;//g;s/—//g;s/–//g;s/_//g')

      # Surface name for error messages
      surface=$(printf '%s' "$col1" | sed 's/[[:space:]]*\*\*\([^*]*\)\*\*/\1/;s/^[[:space:]]*//;s/[[:space:]]*$//')

      if [ -z "$col2_stripped" ] || [ -z "$col3_stripped" ]; then
        err "single-ramped router row in $ROUTER_FILE: '$surface' missing human or agent on-ramp"
        ROUTER_HITS=$((ROUTER_HITS + 1))
        continue
      fi

      # Check all relative links in col2 and col3 resolve
      for cell in "$col2" "$col3"; do
        while IFS= read -r rawlink; do
          link=$(printf '%s' "$rawlink" | sed 's/^](\(.*\))$/\1/')
          case "$link" in http* | mailto*) continue ;; esac
          result=$(_resolve_link "$dir_router" "$link")
          case "$result" in OK | GITIGNORED | EXTERNAL) ;; *)
            err "dead link in router row '$surface' ($ROUTER_FILE): $link"
            ROUTER_HITS=$((ROUTER_HITS + 1))
            ;;
          esac
        done < <(printf '%s' "$cell" | grep -oE '\]\(\.(\.)?/[^)]+\)' |
          sed 's/^](\(.*\))$/\1/' || true)
      done
    done < <(grep '^|' "$ROUTER_FILE" 2>/dev/null || true)

    if [ "$ROUTER_HITS" -eq 0 ]; then
      ok "router parity: all rows have human and agent on-ramps with resolved links"
    else
      DRIFT_HITS=$((DRIFT_HITS + ROUTER_HITS))
    fi
  fi

  # ── 5g: ontology predicate-node grounding ────────────────────────────────────
  # Gated on docs/design/07-ontology.md being tracked.
  # Extracts predicate names from the ontology-profile-v1 predicate table in
  # skills/init/template/CLAUDE.md (the "|`predicate`|..." rows), then extracts
  # every edge-label token from mermaid fences in 07-ontology.md (the |label|
  # form used by mermaid graph edges), and asserts every diagram predicate label
  # exists in the grep-extracted authoritative set.
  # Uses grep/awk ONLY — no Bun, no engine invocation (N12).
  ONTOLOGY_DOC="docs/design/07-ontology.md"
  if git ls-files -- "$ONTOLOGY_DOC" 2>/dev/null | grep -q .; then
    # Extract predicate names directly from the ontology-profile-v1 predicate table.
    # Table section starts at "### Predicate domain" and ends at the next "###".
    # Data rows look like: | `parent` | domain | range | direction |
    # Capture the backtick-quoted predicate name from column 1.
    _AUTHORITY_PREDICATES=$(awk '
      /### Predicate domain/ { in_table=1; next }
      in_table && /^###/ { in_table=0 }
      in_table && /^\|[[:space:]]*`[a-z_]+`/ {
        match($0, /`[a-z_]+`/)
        tok=substr($0, RSTART+1, RLENGTH-2)
        print tok
      }
    ' skills/init/template/CLAUDE.md 2>/dev/null | sort -u || true)

    if [ -z "$_AUTHORITY_PREDICATES" ]; then
      warn "5g: could not extract predicates from skills/init/template/CLAUDE.md — skipping predicate-node grounding"
    else
      # Extract edge-label tokens from mermaid fences in 07-ontology.md.
      # Mermaid graph edges with labels look like:  NodeA -->|label| NodeB
      # Capture the text between the pipes.
      _DIAGRAM_PREDICATES=$(awk \
        '/^[[:space:]]*```mermaid/{f=1;next} /^[[:space:]]*```/{if(f)f=0;next} f' \
        "$ONTOLOGY_DOC" 2>/dev/null |
        grep -oE '\|[a-z_]+\|' |
        sed 's/|//g' | sort -u || true)

      PRED_HITS=0
      while IFS= read -r pred; do
        [ -z "$pred" ] && continue
        if ! printf '%s\n' "$_AUTHORITY_PREDICATES" | grep -qxF "$pred"; then
          err "5g: predicate node '$pred' in $ONTOLOGY_DOC is absent from the ontology-profile-v1 predicate table in skills/init/template/CLAUDE.md"
          PRED_HITS=$((PRED_HITS + 1))
        fi
      done <<<"$_DIAGRAM_PREDICATES"

      if [ "$PRED_HITS" -eq 0 ]; then
        ok "5g: all predicate nodes in $ONTOLOGY_DOC are grounded in ontology-profile-v1"
      else
        DRIFT_HITS=$((DRIFT_HITS + PRED_HITS))
      fi
    fi
  else
    ok "5g: $ONTOLOGY_DOC not yet tracked — predicate-node grounding skipped (not a CI failure)"
  fi

  if [ "$DRIFT_HITS" -eq 0 ]; then
    ok "no design-drift violations"
  else
    VIOLATIONS=$((VIOLATIONS + DRIFT_HITS))
  fi

fi # end: hooks/hooks.json guard for Check 5

# ─── Summary ────────────────────────────────────────────────────────────────

header "Summary"

if [ "$VIOLATIONS" -eq 0 ]; then
  printf '%sAll glossary checks passed.%s\n' "$GREEN" "$RESET"
  exit 0
else
  printf '%s%d violation(s) found.%s Fix before committing.\n' "$RED" "$VIOLATIONS" "$RESET"
  exit 1
fi

#!/usr/bin/env bash
# install-macos.sh — one-time dependency setup for claude-wiki-pages on macOS.
#
# Installs (when missing) Homebrew, git, jq, and Bun — the runtime the plugin
# needs — and patches your shell profile so `brew` and `bun` are on PATH in new
# shells. Idempotent: safe to re-run; already-present tools are left untouched.
#
# This sets up the MACHINE. It does NOT install the plugin into a project —
# Claude Code does that. The script prints the per-project add snippet at the end.
#
# Usage:
#   bash install-macos.sh                  install everything missing, patch PATH
#   bash install-macos.sh --check          report status only, install nothing
#   bash install-macos.sh --dry-run        print what would run, change nothing
#   bash install-macos.sh --with-obsidian  also install the Obsidian CLI (optional; D11 graph parity)
#   bash install-macos.sh --with-ollama    also install Ollama (optional; offline drafting)
#   bash install-macos.sh --help           print this help
#
# After it finishes, open a NEW terminal (or `source` your profile) so PATH
# changes take effect, then follow the printed "Add to a project" steps.

set -euo pipefail

DRY_RUN=0
CHECK_ONLY=0
WITH_OBSIDIAN=0
WITH_OLLAMA=0

usage() { sed -n '2,21p' "$0" | sed 's/^# \?//'; }

for arg in "$@"; do
  case "$arg" in
    -h | --help) usage; exit 0 ;;
    -n | --dry-run) DRY_RUN=1 ;;
    -c | --check) CHECK_ONLY=1 ;;
    --with-obsidian) WITH_OBSIDIAN=1 ;;
    --with-ollama) WITH_OLLAMA=1 ;;
    *) echo "unknown option: $arg" >&2; usage >&2; exit 2 ;;
  esac
done

OS="$(uname -s)"
if [ "$OS" != "Darwin" ]; then
  echo "FAIL: this installer targets macOS. On Linux, install git/jq via your package manager" >&2
  echo "      and Bun via 'curl -fsSL https://bun.sh/install | bash'." >&2
  exit 1
fi

have() { command -v "$1" >/dev/null 2>&1; }

# ── Shell profile (PATH patches land here) ─────────────────────────────────────
# Honour the login shell; default to zsh (macOS default since Catalina).
case "${SHELL:-}" in
  */bash) PROFILE="$HOME/.bash_profile" ;;
  *) PROFILE="$HOME/.zshrc" ;;
esac

# Append a line to the profile exactly once, keyed by a stable marker so re-runs
# never duplicate it.
ensure_profile_line() {
  local marker="$1" line="$2"
  # Check mode reports status only — it must never modify the profile.
  [ "$CHECK_ONLY" -eq 1 ] && return 0
  [ -f "$PROFILE" ] || { [ "$DRY_RUN" -eq 1 ] || touch "$PROFILE"; }
  if [ -f "$PROFILE" ] && grep -qF "$marker" "$PROFILE" 2>/dev/null; then
    return 0
  fi
  if [ "$DRY_RUN" -eq 1 ]; then
    echo "[dry-run] append to $PROFILE: $line"
    return 0
  fi
  printf '\n# %s\n%s\n' "$marker" "$line" >> "$PROFILE"
  echo "PATCHED: $PROFILE ($marker)"
}

# ── Homebrew ───────────────────────────────────────────────────────────────────
# Resolve the brew prefix (Apple Silicon vs Intel) and make brew usable in THIS
# shell for the rest of the run.
brew_bin() {
  if have brew; then command -v brew; return; fi
  for b in /opt/homebrew/bin/brew /usr/local/bin/brew; do
    [ -x "$b" ] && { echo "$b"; return; }
  done
  return 1
}

ensure_brew() {
  if BREW="$(brew_bin)"; then
    [ "$CHECK_ONLY" -eq 1 ] && echo "OK: brew ($BREW)"
    eval "$("$BREW" shellenv)"
    ensure_profile_line "claude-wiki-pages: homebrew on PATH" "eval \"\$($BREW shellenv)\""
    return 0
  fi
  if [ "$CHECK_ONLY" -eq 1 ]; then echo "MISSING: brew" >&2; return 1; fi
  if [ "$DRY_RUN" -eq 1 ]; then echo "[dry-run] install Homebrew via https://brew.sh installer"; return 0; fi
  echo "[install] Homebrew…"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  BREW="$(brew_bin)" || { echo "FAIL: Homebrew install did not produce a brew binary" >&2; exit 1; }
  eval "$("$BREW" shellenv)"
  ensure_profile_line "claude-wiki-pages: homebrew on PATH" "eval \"\$($BREW shellenv)\""
}

brew_install() {
  local binary="$1" formula="$2"
  if have "$binary"; then
    [ "$CHECK_ONLY" -eq 1 ] && echo "OK: $binary"
    return 0
  fi
  if [ "$CHECK_ONLY" -eq 1 ]; then echo "MISSING: $binary" >&2; return 1; fi
  if [ "$DRY_RUN" -eq 1 ]; then echo "[dry-run] brew install $formula"; return 0; fi
  echo "[install] $binary ($formula)…"
  brew install -q "$formula"
}

# ── Bun (the engine runtime; required for verify/fix/heal/doctor) ──────────────
ensure_bun() {
  if have bun; then
    [ "$CHECK_ONLY" -eq 1 ] && echo "OK: bun ($(bun --version 2>/dev/null))"
    ensure_profile_line "claude-wiki-pages: bun on PATH" 'export BUN_INSTALL="$HOME/.bun"; export PATH="$BUN_INSTALL/bin:$PATH"'
    return 0
  fi
  if [ "$CHECK_ONLY" -eq 1 ]; then echo "MISSING: bun" >&2; return 1; fi
  if [ "$DRY_RUN" -eq 1 ]; then echo "[dry-run] curl -fsSL https://bun.sh/install | bash"; return 0; fi
  echo "[install] Bun…"
  curl -fsSL https://bun.sh/install | bash
  # Make bun usable for the rest of THIS run and persist PATH for new shells.
  export BUN_INSTALL="$HOME/.bun"
  export PATH="$BUN_INSTALL/bin:$PATH"
  ensure_profile_line "claude-wiki-pages: bun on PATH" 'export BUN_INSTALL="$HOME/.bun"; export PATH="$BUN_INSTALL/bin:$PATH"'
}

# ── Run ────────────────────────────────────────────────────────────────────────
echo "[install-macos] OS=macOS profile=$PROFILE${DRY_RUN:+}"
[ "$DRY_RUN" -eq 1 ] && echo "[install-macos] dry-run — nothing will change"
[ "$CHECK_ONLY" -eq 1 ] && echo "[install-macos] check — reporting status only"

STATUS=0
ensure_brew || STATUS=1
brew_install git git || STATUS=1
brew_install jq jq || STATUS=1
ensure_bun || STATUS=1
[ "$WITH_OBSIDIAN" -eq 1 ] && { brew_install obsidian obsidian-cli || STATUS=1; }
[ "$WITH_OLLAMA" -eq 1 ] && { brew_install ollama ollama || STATUS=1; }

echo
if [ "$CHECK_ONLY" -eq 1 ]; then
  [ "$STATUS" -eq 0 ] && echo "[install-macos] all required tools present." \
                      || echo "[install-macos] some tools missing (see MISSING lines)." >&2
  exit "$STATUS"
fi
if [ "$DRY_RUN" -eq 1 ]; then echo "[install-macos] dry-run complete."; exit 0; fi
if [ "$STATUS" -ne 0 ]; then echo "[install-macos] finished with errors (see above)." >&2; exit "$STATUS"; fi

cat <<EOF
[install-macos] done. Dependencies installed and PATH patched in $PROFILE.

Next:
  1. Open a NEW terminal (or run:  source "$PROFILE")  so bun is on PATH.
  2. Verify:  bun --version  &&  jq --version  &&  git --version

Add the plugin to a project — run this in the project's root folder:

  mkdir -p .claude
  jq -e . .claude/settings.json >/dev/null 2>&1 || echo '{}' > .claude/settings.json
  tmp=\$(mktemp) && jq '
      .extraKnownMarketplaces["odere-pro"] = {source:{source:"github",repo:"odere-pro/claude-software-3-0-marketplace"}}
    | .enabledPlugins["claude-wiki-pages@odere-pro"] = true
  ' .claude/settings.json > "\$tmp" && mv "\$tmp" .claude/settings.json

Then start Claude Code in that folder (it fetches + enables the plugin) and run:

  /claude-wiki-pages:wiki      # scaffold a vault, ingest, self-heal, query

Prefer the interactive route instead of editing settings? In a Claude Code session:

  /plugin marketplace add odere-pro/claude-software-3-0-marketplace
  /plugin install claude-wiki-pages
  /claude-wiki-pages:init
EOF
exit 0

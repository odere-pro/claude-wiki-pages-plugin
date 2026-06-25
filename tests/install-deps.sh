#!/usr/bin/env bash
# tests/install-deps.sh — install dev and test dependencies for claude-wiki-pages.
#
# Idempotent. Detects macOS (brew) and Linux (apt).
#
# Usage:
#   bash tests/install-deps.sh              install everything missing
#   bash tests/install-deps.sh --dry-run    print what would be installed
#   bash tests/install-deps.sh --check      report status without installing
#   bash tests/install-deps.sh --help       print this help
#
# See tests/README.md for tier definitions.

set -euo pipefail

DRY_RUN=0
CHECK_ONLY=0

usage() {
  sed -n '2,14p' "$0" | sed 's/^# \?//'
}

for arg in "$@"; do
  case "$arg" in
    -h | --help) usage; exit 0 ;;
    -n | --dry-run) DRY_RUN=1 ;;
    -c | --check) CHECK_ONLY=1 ;;
    *) echo "unknown option: $arg" >&2; usage >&2; exit 2 ;;
  esac
done

OS="$(uname -s)"
case "$OS" in
  Darwin) PKG_MGR=brew ;;
  Linux)  PKG_MGR=apt  ;;
  *) echo "FAIL: unsupported OS $OS (supported: macOS, Linux)" >&2; exit 1 ;;
esac

# Native tools. Format: tool-binary|brew-pkg|apt-pkg
# Empty apt-pkg means "no apt package known; install manually".
TOOLS=(
  "jq|jq|jq"
  "bats|bats-core|bats"
  "parallel|parallel|parallel"
  "shellcheck|shellcheck|shellcheck"
  "shfmt|shfmt|shfmt"
  "markdownlint-cli2|markdownlint-cli2|"
  "lychee|lychee|"
  "gitleaks|gitleaks|gitleaks"
)

# Python-pip tools. These map 1:1 to importable module names (with - → _).
# Bats assertion helpers — cloned via git, not package-managed.
BATS_HELPERS=(bats-support bats-assert bats-file)

have() { command -v "$1" >/dev/null 2>&1; }

banner() {
  echo "[install-deps] OS=$OS pkg-manager=$PKG_MGR"
  if [ "$DRY_RUN" -eq 1 ]; then
    echo "[install-deps] dry-run mode — nothing will be installed"
  fi
  if [ "$CHECK_ONLY" -eq 1 ]; then
    echo "[install-deps] check mode — reporting status only"
  fi
}

install_native() {
  local binary="$1" brew_pkg="$2" apt_pkg="$3"
  if have "$binary"; then
    if [ "$CHECK_ONLY" -eq 1 ]; then
      echo "OK: $binary"
    fi
    return 0
  fi
  local pkg="$brew_pkg"
  [ "$PKG_MGR" = "apt" ] && pkg="$apt_pkg"
  if [ -z "$pkg" ]; then
    echo "SKIP: $binary — no $PKG_MGR package known; install manually" >&2
    return 0
  fi
  if [ "$CHECK_ONLY" -eq 1 ]; then
    echo "MISSING: $binary" >&2
    return 1
  fi
  if [ "$DRY_RUN" -eq 1 ]; then
    echo "[dry-run] $PKG_MGR install $pkg"
    return 0
  fi
  if [ "$PKG_MGR" = "brew" ]; then
    brew install -q "$pkg"
  else
    sudo apt-get install -y "$pkg"
  fi
}

clone_bats_helper() {
  local h="$1"
  local dir
  dir="$(cd "$(dirname "$0")/.." && pwd)/tests/test_helper/$h"
  if [ -d "$dir" ]; then
    if [ "$CHECK_ONLY" -eq 1 ]; then
      echo "OK: $h (cloned)"
    fi
    return 0
  fi
  if [ "$CHECK_ONLY" -eq 1 ]; then
    echo "MISSING: $h (bats helper)" >&2
    return 1
  fi
  if [ "$DRY_RUN" -eq 1 ]; then
    echo "[dry-run] git clone --depth 1 https://github.com/bats-core/${h}.git $dir"
    return 0
  fi
  mkdir -p "$(dirname "$dir")"
  git clone --depth 1 "https://github.com/bats-core/${h}.git" "$dir"
}

banner

STATUS=0

for t in "${TOOLS[@]}"; do
  IFS='|' read -r binary brew_pkg apt_pkg <<< "$t"
  install_native "$binary" "$brew_pkg" "$apt_pkg" || STATUS=1
done

for h in "${BATS_HELPERS[@]}"; do
  clone_bats_helper "$h" || STATUS=1
done

# Silence GNU parallel's one-time citation notice so `bats --jobs` (and the gates
# runner) produce clean output instead of the interactive nag.
if [ "$CHECK_ONLY" -eq 0 ] && [ "$DRY_RUN" -eq 0 ] && have parallel; then
  mkdir -p "$HOME/.parallel" && touch "$HOME/.parallel/will-cite"
fi

if [ "$STATUS" -eq 0 ]; then
  echo "[install-deps] done."
else
  echo "[install-deps] some deps missing (see MISSING lines above)" >&2
fi

exit "$STATUS"

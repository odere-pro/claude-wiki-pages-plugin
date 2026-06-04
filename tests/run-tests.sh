#!/usr/bin/env bash
# tests/run-tests.sh — run the local test tiers.
#
# Usage:
#   bash tests/run-tests.sh                  run Tier 0 (static) + Tier 1 (Bats)
#   bash tests/run-tests.sh tier0            Tier 0 only
#   bash tests/run-tests.sh tier1            Tier 1 only
#   bash tests/run-tests.sh tier2            Tier 2 smoke (self-skips without `claude` CLI)
#   bash tests/run-tests.sh tier3            Tier 3 stub (permanently dropped — self-skips)
#   bash tests/run-tests.sh all              all available tiers
#   bash tests/run-tests.sh --list [<tier>]  print commands without executing
#   bash tests/run-tests.sh --help           print this help
#
# See tests/README.md for tier definitions.
# Install the required tools first:
#   bash tests/install-deps.sh

set -uo pipefail

LIST=0
TIER="default"

usage() {
  sed -n '2,16p' "$0" | sed 's/^# \?//'
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    -h | --help)
      usage
      exit 0
      ;;
    -l | --list) LIST=1 ;;
    tier0 | tier1 | tier2 | tier3 | default | all) TIER="$1" ;;
    *)
      echo "unknown tier: $1 (expected tier0|tier1|tier2|tier3|default|all)" >&2
      exit 2
      ;;
  esac
  shift
done

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT" || exit 1

FAILED=0

run() {
  local label="$1"
  shift
  if [ "$LIST" -eq 1 ]; then
    printf '[list] %s: %s\n' "$label" "$*"
    return 0
  fi
  printf '\n━━━ %s ━━━\n' "$label"
  if "$@"; then
    return 0
  else
    FAILED=$((FAILED + 1))
    return 1
  fi
}

tier0() {
  run "shellcheck" shellcheck --severity=warning --format=gcc scripts/*.sh
  run "shfmt" shfmt -d -i 2 -ci scripts/
  run "markdownlint" markdownlint-cli2 --config .markdownlint-cli2.jsonc "**/*.md" "!node_modules" "!tmp" "!tests/test_helper" "!docs/vault-example/wiki/log.md"
  run "lychee" lychee --config .lychee.toml --no-progress .
  run "gitleaks" gitleaks detect --config .gitleaks.toml --source . --no-git --redact
  run "manifest parse" jq -e . .claude-plugin/plugin.json .claude-plugin/marketplace.json hooks/hooks.json
  run "validate-docs" scripts/validate-docs.sh
}

tier1() {
  run "bats (tests/scripts/)" bats --recursive tests/scripts/
}

tier2() {
  run "fresh-install smoke" bash tests/smoke/fresh-install.sh
  run "skill-schema smoke" bash tests/smoke/skill-schema.sh
}

# Tier 3 — local-embedding re-ranker — PERMANENTLY DROPPED (§5 / §11.1).
# This target is an intentionally empty stub. It self-skips with a clear
# message and always exits 0. Do NOT add re-ranker logic here.
tier3() {
  if [ "$LIST" -eq 1 ]; then
    printf '[list] tier3: SKIP (Tier 3 permanently dropped per §5/§11.1)\n'
    return 0
  fi
  printf '\n━━━ Tier 3 ━━━\n'
  printf 'SKIP: Tier 3 (local-embedding re-ranker) is permanently dropped per §5/§11.1.\n'
  printf 'No tests to run. This target is intentionally empty.\n'
}

case "$TIER" in
  tier0) tier0 ;;
  tier1) tier1 ;;
  tier2) tier2 ;;
  tier3) tier3 ;;
  default)
    tier0
    tier1
    ;;
  all)
    tier0
    tier1
    tier2
    ;;
esac

if [ "$LIST" -eq 1 ]; then
  exit 0
fi

if [ "$FAILED" -gt 0 ]; then
  echo ""
  echo "[run-tests] $FAILED check(s) failed" >&2
  exit 1
fi

echo ""
echo "[run-tests] all checks passed"
exit 0

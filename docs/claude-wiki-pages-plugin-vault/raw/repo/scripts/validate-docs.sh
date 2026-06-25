#!/bin/bash
# scripts/validate-docs.sh — glossary / design-drift CI Tier-0 gate.
#
# THIN WRAPPER (migration-plan.md Phase 1 #9, unit docs-finish). The full bash
# implementation (Checks 0–4 glossary/SEO/layer/slash + Check 5 design-drift,
# ADR-0013) was migrated into the Bun engine — `src/core/docs-check.ts` +
# `src/core/design-drift.ts` — and is invoked here via `engine lint --check docs`.
# Retirement was gated on a whole-repo dual-run proving byte/count/file-identical
# results (bash vs engine) across every check and sub-rule; see the unit report.
#
# Contract preserved for every caller (gate-04, tests/run-tests.sh tier0,
# .pre-commit-config.yaml, tests/scripts/validate-docs.bats):
#   - Positional $1 = scan root (default: repo root). Passed to the engine as
#     `--target`; the engine resolves the repo root from it (the `.claude-plugin`
#     ancestor) and scans its git-tracked tree, exactly like `git ls-files` did.
#   - Exit 0 = clean. Exit 1 = violations. Exit 2 = setup error.
#
# FAIL-CLOSED on Bun-absent: this is a CI gate, not a hot-path hook. If Bun is
# missing the gate must NOT silently pass (that would let drift through), so the
# wrapper exits 2 with an install-Bun message instead of engine.sh's fail-open.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Scan root: explicit positional arg, else the repo root.
TARGET="${1:-$ROOT}"

if [ ! -d "$TARGET" ]; then
  echo "ERROR: scan root does not exist: $TARGET" >&2
  exit 2
fi

# Fail-closed: a CI gate cannot pass silently when the engine runtime is absent.
if ! command -v bun >/dev/null 2>&1; then
  printf 'ERROR: Bun is required to run the glossary/design-drift gate.\n' >&2
  printf '       Install from https://bun.sh and re-run.\n' >&2
  exit 2
fi

# Delegate to the engine. The engine returns exit 1 on any error-severity
# finding and 0 when clean, matching this gate's historical contract. Prefer the
# prebuilt dist/cli.js (CI builds it) and fall back to running the source.
if [ -f "$ROOT/dist/cli.js" ]; then
  exec bun "$ROOT/dist/cli.js" lint --check docs --target "$TARGET"
fi
exec bun "$ROOT/src/cli/cli.ts" lint --check docs --target "$TARGET"

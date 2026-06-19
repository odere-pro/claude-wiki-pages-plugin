#!/bin/bash
# PreToolUse: blocks wiki files that use [text](file.md) instead of [[wikilinks]]
# Usage (CLI): scripts/check-wikilinks.sh [--target <vault-path>] [--json]
# Default target: $CLAUDE_WIKI_PAGES_VAULT (fallback: docs/vault)
#
# CLI half: thin wrapper delegating to `engine lint --check md-links`
#   (migrated from inline bash to the Bun engine; see tmp/migration-plan.md §Phase 1).
# Hook half: PreToolUse stdin-JSON path stays in bash until Phase 3.
set -euo pipefail

# shellcheck source=resolve-vault.sh
source "$(dirname "$0")/resolve-vault.sh"
VAULT=$(resolve_vault)
TARGET_SET=0

# Scan original args to determine mode (do not consume them — pass $@ through).
ARGS=("$@")
i=0
while [ $i -lt ${#ARGS[@]} ]; do
  case "${ARGS[$i]}" in
    --target)
      i=$((i + 1))
      VAULT="${ARGS[$i]%/}"
      TARGET_SET=1
      ;;
    *) ;;
  esac
  i=$((i + 1))
done

# ── CLI mode: delegate to the Bun engine ─────────────────────────────────────
# When called with --target, forward all original arguments to the engine.
# The engine recognises --target, --json; other flags are silently ignored.
# Output shape and exit codes are compatible with the original bash behaviour:
#   exit 0 = clean, exit 1 = violations found, exit 2 = bad args (vault absent).
#
# Pre-check: validate the vault's wiki/ directory exists before delegating.
# The engine returns exit 0 with empty findings for a nonexistent vault
# (listMarkdownRecursive returns [] when the dir is absent), which would silently
# succeed on a bad --target path. The old bash CLI half exited 2 in this case
# (scripts/check-wikilinks.sh:106 in the pre-migration committed HEAD), so we
# preserve that contract here to keep json-envelope.bats test 301 green.
if [ "$TARGET_SET" -eq 1 ]; then
  if [ ! -d "$VAULT/wiki" ]; then
    exit 2
  fi
  exec bash "$(dirname "$0")/engine.sh" lint --check md-links --target "$VAULT" "$@"
fi

# ── Hook mode (stdin) — delegated to the Bun engine (Phase 3 migration) ───────
# The hot-path PreToolUse decision is now made by `engine hook --gate
# check-wikilinks` (src/commands/hook/wikilink-gate.ts → src/core/
# hook-wikilink-check.ts). The stdin shape, the {"decision":"block","reason":…}
# stdout contract, and the always-exit-0 hook semantics are preserved VERBATIM —
# the engine emits the same block JSON (the check_content reason for a Write, the
# "Edit introduces …" reason for an Edit) the bash inline path did.
#
# FAIL-OPEN (ADVISORY gate): wikilink style is not a security boundary. When Bun
# is absent we let the write THROUGH (exit 0) rather than blocking — the opposite
# of the security gates (firewall / frontmatter / protect-raw / attachments / dmi),
# which fail closed. A missing-Bun box must never have a wiki edit blocked by an
# advisory style check.
INPUT=$(cat)

if ! command -v bun >/dev/null 2>&1; then
  # Advisory: fail OPEN — proceed with the write.
  exit 0
fi

# Pipe the ORIGINAL stdin to the engine entry; --target pins the same resolved
# vault the bash side computed so the vaultName path filter matches exactly.
printf '%s' "$INPUT" | bash "$(dirname "$0")/engine.sh" hook --gate check-wikilinks --target "$VAULT"
exit 0

#!/usr/bin/env bats
# Tests for scripts/prompt-guard.sh
#
# Behavior under test:
#   - Advisory only — never blocks (always exit 0).
#   - Warns (stdout) on prompts that suggest editing raw files.
#   - Warns on prompts that suggest deleting wiki pages.
#   - Silent on benign prompts.

load '../test_helper/common'

setup() {
  _load_helpers
}

@test "Prompt guard: a benign prompt exits 0 silently" {
  local json='{"prompt":"Summarize the Karpathy LLM Wiki pattern."}'
  run bash -c "printf '%s' '$json' | bash '$REPO_ROOT/scripts/prompt-guard.sh'"

  assert_success
  assert_output_empty
}

@test "Prompt guard: stays silent on a raw/ keyword that lacks an edit verb" {
  # The grep pattern requires BOTH an edit verb AND a raw-path keyword.
  # This prompt has the keyword but no verb — must stay silent.
  # Pins the conjunction against a mutation that drops the verb clause.
  local json='{"prompt":"Explain what the raw/ directory holds and why it matters."}'
  run bash -c "printf '%s' '$json' | bash '$REPO_ROOT/scripts/prompt-guard.sh'"

  assert_success
  assert_output_empty
}

@test "Prompt guard: warns on a prompt with raw-edit intent" {
  local json='{"prompt":"Please edit vault/raw/sample.md and fix the typo."}'
  run bash -c "printf '%s' '$json' | bash '$REPO_ROOT/scripts/prompt-guard.sh'"

  assert_success
  assert_output_contains "WARNING"
  assert_output_contains "immutable"
}

@test "Prompt guard: warns on a prompt with wiki-deletion intent" {
  local json='{"prompt":"Delete the old wiki page about deprecated-tool."}'
  run bash -c "printf '%s' '$json' | bash '$REPO_ROOT/scripts/prompt-guard.sh'"

  assert_success
  assert_output_contains "WARNING"
  assert_output_contains "superseded"
}

@test "Prompt guard: handles an empty or whitespace-only prompt gracefully" {
  # Covers both the "" early-exit and a whitespace-only prompt (which bypasses
  # the `[ -z ]` guard but must still produce no warning).
  for payload in '{"prompt":""}' '{"prompt":"   \t  "}'; do
    run bash -c "printf '%s' '$payload' | bash '$REPO_ROOT/scripts/prompt-guard.sh'"
    assert_success
    assert_output_empty
  done
}

@test "Prompt guard: a vault name with regex metacharacters is escaped and does not cause a grep error (regex injection)" {  # spec H04
  # Pins fix for H04 / injection: VAULT_NAME was interpolated raw into a grep -E
  # pattern. A vault named e.g. "my(vault)" would cause an ERE syntax error or
  # allow the parentheses to form an unintended capture group. With the fix the
  # name is escaped before embedding, so metacharacters are treated as literals.
  #
  # The test sets CLAUDE_WIKI_PAGES_VAULT to a tmp dir whose basename contains
  # regex-special chars, then sends a benign prompt and a raw-edit-intent prompt.
  # 1) The benign prompt must produce no output.
  # 2) The raw-edit-intent prompt must still produce the WARNING (i.e. the
  #    metachar-containing vault name literal is matched, not a broken regex).

  local special_vault
  special_vault="$(mktemp -d)/my(vault)+test"
  mkdir -p "$special_vault"

  # Benign: must stay silent despite the metachar-containing vault name.
  local benign='{"prompt":"Summarize the wiki."}'
  run bash -c "CLAUDE_WIKI_PAGES_VAULT='$special_vault' printf '%s' '$benign' | CLAUDE_WIKI_PAGES_VAULT='$special_vault' bash '$REPO_ROOT/scripts/prompt-guard.sh'"
  assert_success
  assert_output_empty

  # Raw-edit intent mentioning the literal vault name path: must still warn.
  local vault_basename
  vault_basename="$(basename "$special_vault")"
  local intent
  intent="{\"prompt\":\"Please edit ${vault_basename}/raw/sample.md and fix the typo.\"}"
  run bash -c "CLAUDE_WIKI_PAGES_VAULT='$special_vault' printf '%s' '$intent' | CLAUDE_WIKI_PAGES_VAULT='$special_vault' bash '$REPO_ROOT/scripts/prompt-guard.sh'"
  assert_success
  assert_output_contains "WARNING"
  assert_output_contains "immutable"

  rm -rf "$(dirname "$special_vault")"
}

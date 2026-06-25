#!/usr/bin/env bats
# Documentation-contract tests for the agent-teaching and reference skills that
# carry no shell behavior of their own (engine-api, markdown, obsidian-bases,
# obsidian-markdown, obsidian-vault, review, voice). Like stale-memory.bats and
# ingest-classification.bats, these grep each SKILL.md for the contract prose the
# rest of the system depends on and fail if a required statement is removed — so
# every shipped skill is documented and the feature-coverage gate stays honest.

load '../test_helper/common'

setup() {
  _load_helpers
  SKILLS="$REPO_ROOT/skills"
}

# --- engine-api: the LLM-facing engine call contract --------------------------

@test "Skill contract: engine-api SKILL.md declares its name" {
  run grep -F "name: engine-api" "$SKILLS/engine-api/SKILL.md"
  assert_success
}

@test "Skill contract: engine-api SKILL.md documents the --json output shape" {
  run grep -F -- "--json" "$SKILLS/engine-api/SKILL.md"
  assert_success
  assert_output_contains "--json"
}

# --- markdown: query → portable markdown under vault/output/ ------------------

@test "Skill contract: markdown SKILL.md declares its name" {
  run grep -F "name: markdown" "$SKILLS/markdown/SKILL.md"
  assert_success
}

@test "Skill contract: markdown SKILL.md writes the rendered answer under vault/output/" {
  run grep -F "vault/output" "$SKILLS/markdown/SKILL.md"
  assert_success
  assert_output_contains "vault/output"
}

# --- obsidian-bases: .base view authoring ------------------------------------

@test "Skill contract: obsidian-bases SKILL.md declares its name" {
  run grep -F "name: obsidian-bases" "$SKILLS/obsidian-bases/SKILL.md"
  assert_success
}

@test "Skill contract: obsidian-bases SKILL.md documents the .base file format" {
  run grep -F ".base" "$SKILLS/obsidian-bases/SKILL.md"
  assert_success
  assert_output_contains ".base"
}

# --- obsidian-markdown: Obsidian-flavored syntax -----------------------------

@test "Skill contract: obsidian-markdown SKILL.md declares its name" {
  run grep -F "name: obsidian-markdown" "$SKILLS/obsidian-markdown/SKILL.md"
  assert_success
}

@test "Skill contract: obsidian-markdown SKILL.md documents wikilink syntax" {
  run grep -iF "wikilink" "$SKILLS/obsidian-markdown/SKILL.md"
  assert_success
  assert_output_contains "wikilink"
}

# --- obsidian-vault: safe CLI scoping to the resolved vault ------------------

@test "Skill contract: obsidian-vault SKILL.md declares its name" {
  run grep -F "name: obsidian-vault" "$SKILLS/obsidian-vault/SKILL.md"
  assert_success
}

@test "Skill contract: obsidian-vault SKILL.md scopes every CLI call to the resolved vault" {
  run grep -iF "resolved vault" "$SKILLS/obsidian-vault/SKILL.md"
  assert_success
  assert_output_contains "resolved vault"
}

# --- review: the human-in-the-loop _proposed/ promotion gate -----------------

@test "Skill contract: review SKILL.md declares its name" {
  run grep -F "name: review" "$SKILLS/review/SKILL.md"
  assert_success
}

@test "Skill contract: review SKILL.md operates on the _proposed/ staging directory" {
  run grep -F "_proposed" "$SKILLS/review/SKILL.md"
  assert_success
  assert_output_contains "_proposed"
}

@test "Skill contract: review SKILL.md promotes a draft under a git checkpoint" {
  run grep -iF "checkpoint" "$SKILLS/review/SKILL.md"
  assert_success
  assert_output_contains "checkpoint"
}

# --- voice: the house writing voice with two registers -----------------------

@test "Skill contract: voice SKILL.md declares its name" {
  run grep -F "name: voice" "$SKILLS/voice/SKILL.md"
  assert_success
}

@test "Skill contract: voice SKILL.md defines the writing registers it enforces" {
  run grep -iF "register" "$SKILLS/voice/SKILL.md"
  assert_success
  assert_output_contains "register"
}

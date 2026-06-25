#!/usr/bin/env bats
# Documentation-contract tests for the single user-facing entry path: the
# /claude-wiki-pages:wiki command and the orchestrator agent it delegates to.
# Neither carries standalone shell behavior to unit-test, so — like the other
# doc-contract suites — these grep the command and agent definitions for the
# probe → dispatch contract and fail if it is removed.

load '../test_helper/common'

setup() {
  _load_helpers
  ORCH="$REPO_ROOT/agents/claude-wiki-pages-orchestrator-agent.md"
  WIKI="$REPO_ROOT/commands/wiki.md"
}

# --- orchestrator agent: probe state, dispatch to ONE specialist -------------

@test "Orchestrator dispatch: the orchestrator agent declares its name" {
  run grep -F "name: claude-wiki-pages-orchestrator-agent" "$ORCH"
  assert_success
}

@test "Orchestrator dispatch: the orchestrator probes vault state before routing" {
  run grep -iF "probe" "$ORCH"
  assert_success
  assert_output_contains "probe"
}

@test "Orchestrator dispatch: the orchestrator routes to a specialist and owns the decision" {
  run grep -iF "specialist" "$ORCH"
  assert_success
  assert_output_contains "specialist"
}

@test "Orchestrator dispatch: specialists must not re-probe state (single-pass dispatch)" {
  run grep -iF "re-probe" "$ORCH"
  assert_success
  assert_output_contains "re-probe"
}

# --- /wiki command: the one advertised entry verb ----------------------------

@test "Orchestrator dispatch: the /wiki command probes vault state" {
  run grep -iF "Probe vault state" "$WIKI"
  assert_success
  assert_output_contains "Probe vault state"
}

@test "Orchestrator dispatch: the /wiki command delegates to the orchestrator agent" {
  run grep -F "orchestrator" "$WIKI"
  assert_success
  assert_output_contains "orchestrator"
}

@test "Orchestrator dispatch: the /wiki command passes the prompt verbatim without pre-classifying" {
  run grep -iF "verbatim" "$WIKI"
  assert_success
  assert_output_contains "verbatim"
}

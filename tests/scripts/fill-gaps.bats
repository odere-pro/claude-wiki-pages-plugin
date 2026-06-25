#!/usr/bin/env bats
# Tests for the fill-gaps capability:
#   - scripts/graph-quality.sh — the dangling-wikilink scanner + cluster metric
#     the engine's verify does not provide.
#   - skills/fill-gaps/SKILL.md — side-effecting, so it MUST carry
#     disable-model-invocation: true (enforced live by enforce-dmi.sh).
#   - skills/fill-gaps/template/fill-knowledge-gaps.mjs — the bundled workflow
#     asset must parse in the Workflow runtime's async wrapper.
#
# The scanner is exercised against a minimal vault built in BATS_TEST_TMPDIR and
# addressed with --target, so no real project state is touched.

load '../test_helper/common'

GQ="scripts/graph-quality.sh"

setup() {
  _load_helpers
  VAULT="$BATS_TEST_TMPDIR/vault"
  mkdir -p "$VAULT/wiki/engine"
}

# A page resolvable by filename stem, one by title, one hub, one dangling ref.
_seed_vault() {
  cat >"$VAULT/wiki/engine/engine.md" <<'EOF'
---
title: "Wiki Engine"
type: index
aliases: ["Wiki Engine", "engine"]
---
# Wiki Engine
See [[Search Tool]] and [[verify-cmd]] and [[Nonexistent Thing]].
EOF
  cat >"$VAULT/wiki/engine/search.md" <<'EOF'
---
title: "Search Tool"
aliases: ["Search Tool"]
---
Links back to [[Wiki Engine]].
EOF
  cat >"$VAULT/wiki/engine/verify-cmd.md" <<'EOF'
---
title: "Verify Command"
---
no links
EOF
}

@test "Fill-gaps: the dangling-wikilink scanner flags exactly the one dangling target" {
  _seed_vault
  run bash "$REPO_ROOT/$GQ" --target "$VAULT" --json
  [ "$status" -eq 0 ]
  [[ "$output" == *'"danglingCount": 1'* ]]
  [[ "$output" == *'Nonexistent Thing'* ]]
}

@test "Fill-gaps: the scanner resolves links by stem, title, and alias without false positives" {
  _seed_vault
  run bash "$REPO_ROOT/$GQ" --target "$VAULT" --json
  # 'Search Tool' (title), 'verify-cmd' (stem) and 'Wiki Engine' (alias) all resolve
  [[ "$output" != *'"target": "Search Tool"'* ]]
  [[ "$output" != *'"target": "verify-cmd"'* ]]
  [[ "$output" != *'"target": "Wiki Engine"'* ]]
}

@test "Fill-gaps: the scanner assigns pages to the engine cluster (Cn) and reports tree conformance" {
  _seed_vault
  run bash "$REPO_ROOT/$GQ" --target "$VAULT" --json
  assert_output_contains '"engine": 3'
  assert_output_contains '"Cn": 1'
  # The Ce/Ch edge-concentration metrics are retired (ADR-0036): strict-tree
  # conformance is the successor signal, so assert it is emitted instead.
  assert_output_contains '"treeConformance"'
}

@test "Fill-gaps: the scanner reports zero dangling for a clean vault" {
  cat >"$VAULT/wiki/engine/engine.md" <<'EOF'
---
title: "Wiki Engine"
aliases: ["Wiki Engine"]
---
no outbound links
EOF
  run bash "$REPO_ROOT/$GQ" --target "$VAULT" --json
  [ "$status" -eq 0 ]
  [[ "$output" == *'"danglingCount": 0'* ]]
}

@test "Fill-gaps: the side-effecting skill declares disable-model-invocation: true" {
  run grep -E '^disable-model-invocation:[[:space:]]*true' "$REPO_ROOT/skills/fill-gaps/SKILL.md"
  [ "$status" -eq 0 ]
}

@test "Fill-gaps: the bundled workflow template parses inside the Workflow async wrapper" {
  command -v node >/dev/null || skip "node not installed"
  run node -e '
    const fs = require("fs");
    let s = fs.readFileSync(process.argv[1], "utf8").replace(/export const meta/, "const meta");
    new Function("return (async function(args, agent, parallel, pipeline, phase, log, budget, workflow){\n" + s + "\n})");
    console.log("OK");
  ' "$REPO_ROOT/skills/fill-gaps/template/fill-knowledge-gaps.mjs"
  [ "$status" -eq 0 ]
  [[ "$output" == *"OK"* ]]
}

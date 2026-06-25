#!/usr/bin/env bats
# Tests for schemas/config.schema.json — localModel.tier + offlinePolicy additions.
#
# Behavior under test (P3-revised, Wave-2 decision #7):
#   - schemas/config.schema.json accepts localModel.tier (string enum) and
#     localModel.offlinePolicy (string enum).
#   - Valid enum values pass; invalid values are rejected by the schema check
#     in tests/gates/gate-07-config-schema.sh (bun inline validation).
#   - The default config (templates/default.config.json) still conforms.
#
# These tests FAIL before the schema is extended and PASS after.

load '../test_helper/common'

setup() {
  _load_helpers
}

# Skip the whole file if bun is not installed — consistent with gate-07 skip logic.
setup_file() {
  if ! command -v bun >/dev/null 2>&1; then
    skip "bun not installed"
  fi
}

# ---------------------------------------------------------------------------
# Helper: validate a config object against the schema using the same bun
# inline script that gate-07 uses (schema enum + structural check).
# Writes the config to a temp file and runs bun -e with a validation script.
# Sets $status and $output via `run`.
# ---------------------------------------------------------------------------

_validate_config() {
  local config_json="$1"
  local tmpfile="$BATS_TEST_TMPDIR/test-config.json"
  printf '%s' "$config_json" >"$tmpfile"

  run bun -e "
const schema = await Bun.file('$REPO_ROOT/schemas/config.schema.json').json();
const cfg = await Bun.file('$tmpfile').json();
const errors = [];
const props = schema.properties ?? {};
for (const k of Object.keys(cfg)) {
  if (k === '\$schema') continue;
  if (!(k in props)) errors.push('unknown key: ' + k);
}
const check = (obj, spec, path) => {
  for (const [k, v] of Object.entries(obj)) {
    const s = spec?.properties?.[k];
    if (!s) continue;
    if (s.enum && !s.enum.includes(v)) errors.push(path + k + ': \"' + v + '\" not in enum ' + s.enum.join('|'));
    if (s.type === 'object' && v && typeof v === 'object') check(v, s, path + k + '.');
  }
};
check(cfg, schema, '');
if (errors.length) { console.error('FAIL:\\n  ' + errors.join('\\n  ')); process.exit(1); }
console.log('OK');
"
}

# ---------------------------------------------------------------------------
# localModel.tier — valid enum values
# ---------------------------------------------------------------------------

@test "config-schema: localModel.tier 'draft' is a valid enum value" {
  _validate_config '{"version":1,"localModel":{"enabled":true,"tier":"draft"}}'

  assert_success
  assert_output_contains "OK"
}

@test "config-schema: localModel.tier 'ingest-extract' is a valid enum value" {
  _validate_config '{"version":1,"localModel":{"enabled":true,"tier":"ingest-extract"}}'

  assert_success
  assert_output_contains "OK"
}

@test "config-schema: localModel.tier invalid value is rejected" {
  _validate_config '{"version":1,"localModel":{"enabled":true,"tier":"unknown-tier"}}'

  assert_status 1
  assert_output_contains "not in enum"
}

# ---------------------------------------------------------------------------
# localModel.offlinePolicy — valid enum values
# ---------------------------------------------------------------------------

@test "config-schema: localModel.offlinePolicy 'strict' is a valid enum value" {
  _validate_config '{"version":1,"localModel":{"enabled":true,"offlinePolicy":"strict"}}'

  assert_success
  assert_output_contains "OK"
}

@test "config-schema: localModel.offlinePolicy 'prefer-local' is a valid enum value" {
  _validate_config '{"version":1,"localModel":{"enabled":true,"offlinePolicy":"prefer-local"}}'

  assert_success
  assert_output_contains "OK"
}

@test "config-schema: localModel.offlinePolicy 'off' is a valid enum value" {
  _validate_config '{"version":1,"localModel":{"enabled":true,"offlinePolicy":"off"}}'

  assert_success
  assert_output_contains "OK"
}

@test "config-schema: localModel.offlinePolicy invalid value is rejected" {
  _validate_config '{"version":1,"localModel":{"enabled":true,"offlinePolicy":"always-local"}}'

  assert_status 1
  assert_output_contains "not in enum"
}

# ---------------------------------------------------------------------------
# Both fields together + existing fields still valid
# ---------------------------------------------------------------------------

@test "config-schema: localModel with tier and offlinePolicy together is valid" {
  _validate_config '{
    "version": 1,
    "localModel": {
      "enabled": true,
      "provider": "ollama",
      "endpoint": "http://localhost:11434",
      "model": "llama3",
      "draftTarget": "_proposed",
      "tier": "draft",
      "offlinePolicy": "prefer-local"
    }
  }'

  assert_success
  assert_output_contains "OK"
}

@test "config-schema: gate-07 default config still conforms after schema extension" {
  run bash "$REPO_ROOT/tests/gates/gate-07-config-schema.sh"

  assert_success
  assert_output_contains "OK"
}

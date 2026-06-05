#!/usr/bin/env bats
# P3.5 — Tier-1 conformance test: --json envelope key compliance for bash gate scripts.
#
# Asserts that each script's --json output is a valid JSON object whose findings[]
# items are keyed EXACTLY {severity, check, message, file?} verbatim from
# src/core/report.ts:19-26 (N11).
#
# Tests:
#   - validate-frontmatter.sh --json   (clean vault → findings:[])
#   - validate-frontmatter.sh --json   (dirty vault → findings with error keys)
#   - firewall.sh --json               (clean path → findings:[])
#   - firewall.sh --json               (blocked path → findings with block finding)
#   - check-wikilinks.sh --json        (clean vault → findings:[])
#   - check-wikilinks.sh --json        (dirty vault → findings with error keys)
#   - Exit codes: 0 clean / 1 errors / 2 bad args (all three scripts)
#   - No spurious keys in findings[] items (only severity, check, message, file?)

load '../test_helper/common'

setup() {
  _load_helpers
  MINIMAL_VAULT="$REPO_ROOT/tests/fixtures/minimal-vault"
}

# ── helpers ─────────────────────────────────────────────────────────────────

# Verifies a JSON string is valid (exits non-zero if not).
assert_valid_json() {
  local json="$1"
  printf '%s' "$json" | python3 -m json.tool >/dev/null 2>&1 || {
    printf 'assert_valid_json: not valid JSON:\n%s\n' "$json" >&2
    return 1
  }
}

# Asserts that every object in findings[] has only the allowed keys
# {severity, check, message, file?} and no others.
assert_findings_keys_conformant() {
  local json="$1"
  # Extract each finding as a JSON line and check its keys.
  local bad
  bad=$(printf '%s' "$json" | python3 -c "
import json, sys

data = json.load(sys.stdin)
findings = data.get('findings', [])
allowed = {'severity', 'check', 'message', 'file'}
bad_findings = []
for i, f in enumerate(findings):
    extra = set(f.keys()) - allowed
    missing_required = {'severity', 'check', 'message'} - set(f.keys())
    if extra or missing_required:
        bad_findings.append({'index': i, 'keys': list(f.keys()), 'extra': list(extra), 'missing': list(missing_required)})
if bad_findings:
    print(json.dumps(bad_findings))
    sys.exit(1)
sys.exit(0)
" 2>&1)
  if [ $? -ne 0 ]; then
    printf 'assert_findings_keys_conformant: non-conformant findings:\n%s\n' "$bad" >&2
    printf 'full json:\n%s\n' "$json" >&2
    return 1
  fi
}

# Asserts that the top-level envelope has the required keys: findings (array).
assert_envelope_has_findings() {
  local json="$1"
  python3 -c "
import json, sys
data = json.load(sys.stdin)
if 'findings' not in data:
    print('missing \"findings\" key in envelope')
    sys.exit(1)
if not isinstance(data['findings'], list):
    print('\"findings\" is not an array')
    sys.exit(1)
sys.exit(0)
" <<<"$json" || {
    printf 'assert_envelope_has_findings: %s\n' "$(python3 -c "import json,sys; data=json.load(sys.stdin); print('findings key missing or not array')" <<<"$json" 2>&1)" >&2
    printf 'full json:\n%s\n' "$json" >&2
    return 1
  }
}

# ── validate-frontmatter.sh --json ──────────────────────────────────────────

@test "json-envelope: validate-frontmatter --json clean vault emits valid JSON with findings[]" {
  run bash "$REPO_ROOT/scripts/validate-frontmatter.sh" --target "$MINIMAL_VAULT" --json
  assert_success
  assert_valid_json "$output"
  assert_envelope_has_findings "$output"
  assert_findings_keys_conformant "$output"
}

@test "json-envelope: validate-frontmatter --json clean vault findings is empty array" {
  run bash "$REPO_ROOT/scripts/validate-frontmatter.sh" --target "$MINIMAL_VAULT" --json
  assert_success
  local count
  count=$(printf '%s' "$output" | python3 -c "import json,sys; print(len(json.load(sys.stdin)['findings']))")
  assert_eq "$count" "0"
}

@test "json-envelope: validate-frontmatter --json dirty vault emits error finding with required keys" {
  local dirty_vault
  dirty_vault="$BATS_TEST_TMPDIR/dirty-fm-vault"
  mkdir -p "$dirty_vault/wiki/topics"
  # Provide a CLAUDE.md with the Required fields table so the schema parser works
  cat >"$dirty_vault/CLAUDE.md" <<'SCHEMA'
# Schema stub

`schema_version: 2`

## Frontmatter schema

### Required fields by type

| Type | Required fields | Conditional |
| --- | --- | --- |
| `source` | `source_type sources created updated status confidence` | — |
| `entity` | `entity_type parent path sources created updated status confidence` | — |
SCHEMA
  # Write a bad page (missing required fields)
  cat >"$dirty_vault/wiki/topics/bad.md" <<'MD'
---
title: "Bad"
type: entity
---

# Bad entity missing required fields
MD
  run bash "$REPO_ROOT/scripts/validate-frontmatter.sh" --target "$dirty_vault" --json
  assert_status 1
  assert_valid_json "$output"
  assert_envelope_has_findings "$output"
  assert_findings_keys_conformant "$output"
  # Must have at least one finding
  local count
  count=$(printf '%s' "$output" | python3 -c "import json,sys; print(len(json.load(sys.stdin)['findings']))")
  [ "$count" -ge 1 ] || {
    printf 'expected >= 1 finding, got %s\n' "$count" >&2
    return 1
  }
}

@test "json-envelope: validate-frontmatter --json findings[].severity is one of error|warn|info" {
  local dirty_vault
  dirty_vault="$BATS_TEST_TMPDIR/dirty-fm-sev-vault"
  mkdir -p "$dirty_vault/wiki/topics"
  cat >"$dirty_vault/CLAUDE.md" <<'SCHEMA'
# Schema stub

`schema_version: 2`

## Frontmatter schema

### Required fields by type

| Type | Required fields | Conditional |
| --- | --- | --- |
| `entity` | `entity_type parent path sources created updated status confidence` | — |
SCHEMA
  cat >"$dirty_vault/wiki/topics/bad2.md" <<'MD'
---
title: "Bad2"
type: entity
---

# Missing required fields
MD
  run bash "$REPO_ROOT/scripts/validate-frontmatter.sh" --target "$dirty_vault" --json
  assert_status 1
  assert_valid_json "$output"
  python3 -c "
import json, sys
data = json.load(sys.stdin)
allowed_sev = {'error', 'warn', 'info'}
for f in data['findings']:
    sev = f.get('severity', '')
    if sev not in allowed_sev:
        print('invalid severity: ' + sev)
        sys.exit(1)
sys.exit(0)
" <<<"$output"
}

@test "json-envelope: validate-frontmatter --json exit 0 when clean (stable exit codes)" {
  run bash "$REPO_ROOT/scripts/validate-frontmatter.sh" --target "$MINIMAL_VAULT" --json
  assert_status 0
}

@test "json-envelope: validate-frontmatter --json exit 1 when errors (stable exit codes)" {
  local dirty_vault
  dirty_vault="$BATS_TEST_TMPDIR/dirty-fm-exit-vault"
  mkdir -p "$dirty_vault/wiki/topics"
  cat >"$dirty_vault/CLAUDE.md" <<'SCHEMA'
# Schema stub

`schema_version: 2`

## Frontmatter schema

### Required fields by type

| Type | Required fields | Conditional |
| --- | --- | --- |
| `entity` | `entity_type parent path sources created updated status confidence` | — |
SCHEMA
  cat >"$dirty_vault/wiki/topics/bad-exit.md" <<'MD'
---
title: "Bad"
type: entity
---

# Missing fields
MD
  run bash "$REPO_ROOT/scripts/validate-frontmatter.sh" --target "$dirty_vault" --json
  assert_status 1
}

@test "json-envelope: validate-frontmatter --json bad-args exit 2" {
  run bash "$REPO_ROOT/scripts/validate-frontmatter.sh" --json --target /nonexistent/no-such-vault-xyz
  assert_status 2
}

# ── firewall.sh --json ──────────────────────────────────────────────────────

@test "json-envelope: firewall --json allowed path emits valid JSON with findings[]" {
  local vault_dir="$BATS_TEST_TMPDIR/fw-vault"
  mkdir -p "$vault_dir/wiki/topics"
  run bash "$REPO_ROOT/scripts/firewall.sh" \
    --target "$vault_dir" \
    --file "$vault_dir/wiki/topics/page.md" \
    --json
  assert_success
  assert_valid_json "$output"
  assert_envelope_has_findings "$output"
  assert_findings_keys_conformant "$output"
}

@test "json-envelope: firewall --json allowed path findings is empty" {
  local vault_dir="$BATS_TEST_TMPDIR/fw-vault-clean"
  mkdir -p "$vault_dir/wiki/topics"
  run bash "$REPO_ROOT/scripts/firewall.sh" \
    --target "$vault_dir" \
    --file "$vault_dir/wiki/topics/page.md" \
    --json
  assert_success
  local count
  count=$(printf '%s' "$output" | python3 -c "import json,sys; print(len(json.load(sys.stdin)['findings']))")
  assert_eq "$count" "0"
}

@test "json-envelope: firewall --json blocked path emits error finding with required keys" {
  local vault_dir="$BATS_TEST_TMPDIR/fw-vault-block"
  mkdir -p "$vault_dir/wiki"
  run bash "$REPO_ROOT/scripts/firewall.sh" \
    --target "$vault_dir" \
    --file "/etc/passwd" \
    --json
  assert_status 1
  assert_valid_json "$output"
  assert_envelope_has_findings "$output"
  assert_findings_keys_conformant "$output"
  local count
  count=$(printf '%s' "$output" | python3 -c "import json,sys; print(len(json.load(sys.stdin)['findings']))")
  [ "$count" -ge 1 ] || {
    printf 'expected >= 1 finding, got %s\n' "$count" >&2
    return 1
  }
}

@test "json-envelope: firewall --json exit 0 when allowed (stable exit codes)" {
  local vault_dir="$BATS_TEST_TMPDIR/fw-vault-exit0"
  mkdir -p "$vault_dir/wiki"
  run bash "$REPO_ROOT/scripts/firewall.sh" \
    --target "$vault_dir" \
    --file "$vault_dir/wiki/page.md" \
    --json
  assert_status 0
}

@test "json-envelope: firewall --json exit 1 when blocked (stable exit codes)" {
  local vault_dir="$BATS_TEST_TMPDIR/fw-vault-exit1"
  mkdir -p "$vault_dir/wiki"
  run bash "$REPO_ROOT/scripts/firewall.sh" \
    --target "$vault_dir" \
    --file "/etc/passwd" \
    --json
  assert_status 1
}

@test "json-envelope: firewall --json bad-args exit 2" {
  run bash "$REPO_ROOT/scripts/firewall.sh" --json
  assert_status 2
}

# ── check-wikilinks.sh --json ───────────────────────────────────────────────

@test "json-envelope: check-wikilinks --json clean vault emits valid JSON with findings[]" {
  run bash "$REPO_ROOT/scripts/check-wikilinks.sh" --target "$MINIMAL_VAULT" --json
  assert_success
  assert_valid_json "$output"
  assert_envelope_has_findings "$output"
  assert_findings_keys_conformant "$output"
}

@test "json-envelope: check-wikilinks --json clean vault findings is empty array" {
  run bash "$REPO_ROOT/scripts/check-wikilinks.sh" --target "$MINIMAL_VAULT" --json
  assert_success
  local count
  count=$(printf '%s' "$output" | python3 -c "import json,sys; print(len(json.load(sys.stdin)['findings']))")
  assert_eq "$count" "0"
}

@test "json-envelope: check-wikilinks --json dirty vault emits error finding with required keys" {
  local dirty_vault
  dirty_vault="$BATS_TEST_TMPDIR/dirty-wl-vault"
  mkdir -p "$dirty_vault/wiki/topics"
  # Write a page with a [text](file.md) markdown link (bad)
  cat >"$dirty_vault/wiki/topics/bad-links.md" <<'MD'
---
title: "Bad Links"
type: entity
---

# Bad Links

See [the sample](sample-entity.md) for details.
MD
  run bash "$REPO_ROOT/scripts/check-wikilinks.sh" --target "$dirty_vault" --json
  assert_status 1
  assert_valid_json "$output"
  assert_envelope_has_findings "$output"
  assert_findings_keys_conformant "$output"
  local count
  count=$(printf '%s' "$output" | python3 -c "import json,sys; print(len(json.load(sys.stdin)['findings']))")
  [ "$count" -ge 1 ] || {
    printf 'expected >= 1 finding, got %s\n' "$count" >&2
    return 1
  }
}

@test "json-envelope: check-wikilinks --json exit 0 when clean (stable exit codes)" {
  run bash "$REPO_ROOT/scripts/check-wikilinks.sh" --target "$MINIMAL_VAULT" --json
  assert_status 0
}

@test "json-envelope: check-wikilinks --json exit 1 when errors (stable exit codes)" {
  local dirty_vault
  dirty_vault="$BATS_TEST_TMPDIR/dirty-wl-exit-vault"
  mkdir -p "$dirty_vault/wiki/topics"
  cat >"$dirty_vault/wiki/topics/bad-exit.md" <<'MD'
---
title: "Bad"
type: entity
---

See [broken link](page.md) here.
MD
  run bash "$REPO_ROOT/scripts/check-wikilinks.sh" --target "$dirty_vault" --json
  assert_status 1
}

@test "json-envelope: check-wikilinks --json bad-args exit 2" {
  run bash "$REPO_ROOT/scripts/check-wikilinks.sh" --json --target /nonexistent/no-such-vault-xyz
  assert_status 2
}

# ── default (no --json) behavior is unchanged ───────────────────────────────

@test "json-envelope: validate-frontmatter without --json emits human text (behavior unchanged)" {
  run bash "$REPO_ROOT/scripts/validate-frontmatter.sh" --target "$MINIMAL_VAULT"
  assert_success
  # Human output must NOT be valid JSON
  if printf '%s' "$output" | python3 -m json.tool >/dev/null 2>&1; then
    printf 'default output should be human text, not JSON:\n%s\n' "$output" >&2
    return 1
  fi
  assert_output_contains "All frontmatter valid"
}

@test "json-envelope: check-wikilinks without --json emits human text (behavior unchanged)" {
  run bash "$REPO_ROOT/scripts/check-wikilinks.sh" --target "$MINIMAL_VAULT"
  assert_success
  if printf '%s' "$output" | python3 -m json.tool >/dev/null 2>&1; then
    printf 'default output should be human text, not JSON:\n%s\n' "$output" >&2
    return 1
  fi
  assert_output_contains "All wikilinks valid"
}

@test "json-envelope: firewall without --json emits human text (behavior unchanged)" {
  local vault_dir="$BATS_TEST_TMPDIR/fw-human-vault"
  mkdir -p "$vault_dir/wiki"
  run bash "$REPO_ROOT/scripts/firewall.sh" \
    --target "$vault_dir" \
    --file "$vault_dir/wiki/page.md"
  assert_success
  assert_output_contains "ALLOW"
}

#!/usr/bin/env bats
# B11: Tests for scripts/lib-page-type.sh — the shared _page_type() helper.
#
# Behavior under test:
#   - _page_type extracts the type: value from a file's frontmatter.
#   - Returns the raw type string without surrounding quotes.
#   - Prints nothing (empty) when there is no type: field.
#   - Prints nothing when the file has no frontmatter at all.
#   - Handles single-quoted, double-quoted, and unquoted type values.
#   - Ignores type: occurrences in the body (only reads the frontmatter block).
#
# These tests were written first (TDD) to pin the helper before any refactor
# touches it as part of the B06 resolve-vault decomposition.

load '../test_helper/common'

setup() {
  _load_helpers
  TMPF="$BATS_TEST_TMPDIR/test-page.md"
}

@test "_page_type: extracts unquoted type field" {
  printf -- '---\ntype: concept\ntitle: Test\n---\n\nBody\n' >"$TMPF"
  run bash -c "source '$REPO_ROOT/scripts/lib-page-type.sh'; _page_type '$TMPF'"
  assert_success
  [ "$output" = "concept" ]
}

@test "_page_type: extracts double-quoted type field" {
  printf -- '---\ntype: "entity"\ntitle: Test\n---\n\nBody\n' >"$TMPF"
  run bash -c "source '$REPO_ROOT/scripts/lib-page-type.sh'; _page_type '$TMPF'"
  assert_success
  [ "$output" = "entity" ]
}

@test "_page_type: extracts single-quoted type field" {
  printf -- "---\ntype: 'topic'\ntitle: Test\n---\n\nBody\n" >"$TMPF"
  run bash -c "source '$REPO_ROOT/scripts/lib-page-type.sh'; _page_type '$TMPF'"
  assert_success
  [ "$output" = "topic" ]
}

@test "_page_type: returns empty when type: field is absent" {
  printf -- '---\ntitle: No type here\n---\n\nBody\n' >"$TMPF"
  run bash -c "source '$REPO_ROOT/scripts/lib-page-type.sh'; _page_type '$TMPF'"
  assert_success
  [ -z "$output" ]
}

@test "_page_type: returns empty when file has no frontmatter" {
  printf 'Just a body without frontmatter\n' >"$TMPF"
  run bash -c "source '$REPO_ROOT/scripts/lib-page-type.sh'; _page_type '$TMPF'"
  assert_success
  [ -z "$output" ]
}

@test "_page_type: ignores type: in the body (only frontmatter counts)" {
  printf -- '---\ntitle: Test\n---\n\ntype: this-is-in-body\n' >"$TMPF"
  run bash -c "source '$REPO_ROOT/scripts/lib-page-type.sh'; _page_type '$TMPF'"
  assert_success
  [ -z "$output" ]
}

@test "_page_type: handles synthesis page type" {
  printf -- '---\ntype: synthesis\ntitle: Combined\nsources: []\n---\n' >"$TMPF"
  run bash -c "source '$REPO_ROOT/scripts/lib-page-type.sh'; _page_type '$TMPF'"
  assert_success
  [ "$output" = "synthesis" ]
}

@test "_page_type: handles source page type" {
  printf -- '---\ntype: source\ntitle: Raw Source\nsource_type: web\n---\n' >"$TMPF"
  run bash -c "source '$REPO_ROOT/scripts/lib-page-type.sh'; _page_type '$TMPF'"
  assert_success
  [ "$output" = "source" ]
}

@test "_page_type: handles index page type" {
  printf -- '---\ntype: index\ntitle: Index\n---\n' >"$TMPF"
  run bash -c "source '$REPO_ROOT/scripts/lib-page-type.sh'; _page_type '$TMPF'"
  assert_success
  [ "$output" = "index" ]
}

@test "_page_type: exits 0 on a non-existent file (graceful failure)" {
  run bash -c "source '$REPO_ROOT/scripts/lib-page-type.sh'; _page_type '/nonexistent/page.md'"
  assert_success
  [ -z "$output" ]
}

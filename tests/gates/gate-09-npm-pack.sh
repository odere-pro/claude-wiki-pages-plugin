#!/bin/bash
# Gate 09 — the npm tarball ships only the engine's runtime surface. The dev
# surface (src/, site/, tests/) must NOT be published; dist/ and schemas/ must be.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT" || exit 2
if ! command -v npm >/dev/null 2>&1; then
  echo "SKIP: npm not installed"
  exit 0
fi

listing="$(npm pack --dry-run --json 2>/dev/null | tr ',' '\n' | grep -oE '"path":"[^"]+"' | sed 's/"path":"//;s/"//' || true)"
[ -z "$listing" ] && { echo "SKIP: could not read npm pack listing"; exit 0; }

bad=""
for forbidden in 'src/' 'site/' 'tests/'; do
  if printf '%s\n' "$listing" | grep -q "^$forbidden"; then
    bad="$bad $forbidden"
  fi
done
if [ -n "$bad" ]; then
  echo "FAIL: dev surface would be published:$bad"
  exit 1
fi
echo "OK: tarball excludes src/ site/ tests/"

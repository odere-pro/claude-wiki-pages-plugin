#!/bin/bash
# Gate 04 — the glossary gate is clean (no retired identifiers, all slash refs resolve).
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT" || exit 2
bash scripts/validate-docs.sh

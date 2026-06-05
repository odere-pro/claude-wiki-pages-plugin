#!/bin/bash
# Gate 13 — NO-RAG invariant: the retrieval path (search command + vocabulary/stem
# core modules) must not import any embedding, vector, HTTP, or similarity library,
# and must not call fetch/http/embedding/vector/cosine/knn on the retrieval path.
#
# This makes "no RAG" a CI invariant — caught statically, not at runtime.
# Tier 0 gate: runs with no bun/node dependency (grep only).
#
# Self-test: `bash gate-13-no-rag.sh --self-test` plants forbidden tokens in a
# temp file the scanner reads and asserts the gate FAILS — so the enforcement
# can never silently regress to fail-open.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT" || exit 2

# ── Scanner ────────────────────────────────────────────────────────────────────
# Returns 0 = clean, 1 = forbidden content found, 2 = internal/grep error.
# Takes the list of files to scan as positional args so the self-test can point
# it at a planted /tmp file.
scan_files() {
  local fail=0

  # Forbidden import patterns (embedding/vector/HTTP libraries). Plain strings;
  # matched as `from '<pkg>` / `from "<pkg>`.
  local forbidden_imports=(
    "openai"
    "anthropic"
    "cohere"
    "transformers"
    "onnxruntime"
    "tensorflow"
    "torch"
    "faiss"
    "chromadb"
    "pinecone"
    "weaviate"
    "qdrant"
    "milvus"
    "pgvector"
    "axios"
    "node-fetch"
    "got"
    "undici"
    "cross-fetch"
  )

  # Forbidden runtime tokens (network / ML / similarity API calls). These are
  # extended-regex patterns: every ERE metachar that must match literally is
  # escaped (notably the parens in `fetch\(`, `encode\(`, `\.embed\(`). An
  # unescaped `(` would make grep exit 2 and — under `set -uo pipefail` without
  # `-e` — that error was previously swallowed, leaving the token unchecked.
  local forbidden_tokens=(
    'fetch\('
    'http\.'
    'https\.'
    'embedding'
    'embeddings'
    'vector'
    'cosine'
    '\bknn\b'
    'similarity'
    'encode\('
    'encode\.'
    '\.embed\('
  )

  local file pattern token hits rc
  for file in "$@"; do
    if [ ! -f "$file" ]; then
      echo "WARN: retrieval file not found: $file (skipping)"
      continue
    fi

    # Import checks.
    for pattern in "${forbidden_imports[@]}"; do
      grep -qE "from ['\"]${pattern}" "$file"
      rc=$?
      if [ "$rc" -eq 0 ]; then
        echo "FAIL: forbidden import '${pattern}' in ${file}"
        fail=1
      elif [ "$rc" -ge 2 ]; then
        echo "FAIL: grep errored (rc=$rc) on import pattern '${pattern}' in ${file}"
        return 2
      fi
    done

    # Token checks. Exclude comment-only lines (//, /*, *, #) so prose like
    # "no embeddings" in a docstring does not trip the gate; real code lines do.
    for token in "${forbidden_tokens[@]}"; do
      hits="$(grep -nE "${token}" "$file" |
        grep -vE '^[^:]+:[[:space:]]*//' |
        grep -vE '^[^:]+:[[:space:]]*/\*' |
        grep -vE '^[^:]+:[[:space:]]*\*' |
        grep -vE '^[^:]+:[[:space:]]*#')"
      rc=${PIPESTATUS[0]}
      # PIPESTATUS[0] is the FIRST grep (the ERE match). 0 = matched lines,
      # 1 = no match, >=2 = malformed pattern / read error → fail the gate loudly.
      if [ "$rc" -ge 2 ]; then
        echo "FAIL: grep errored (rc=$rc) on token pattern '${token}' in ${file}"
        return 2
      fi
      if [ -n "$hits" ]; then
        echo "FAIL: forbidden token '${token}' in ${file}:"
        printf '  %s\n' "$hits"
        fail=1
      fi
    done
  done

  return "$fail"
}

# ── Self-test ────────────────────────────────────────────────────────────────
# Plant forbidden tokens in temp files and assert the scanner FAILS on each.
# Guards against the fail-open regression (unbalanced parens, swallowed errors).
run_self_test() {
  local tmpdir planted ok=0
  tmpdir="$(mktemp -d)"
  trap 'rm -rf "$tmpdir"' RETURN

  # Case 1: planted fetch( — the exact fail-open repro.
  planted="$tmpdir/planted-fetch.ts"
  printf 'const v = await fetch("http://x/embed");\n' >"$planted"
  if scan_files "$planted" >/dev/null 2>&1; then
    echo "SELF-TEST FAIL: planted fetch( was NOT caught (gate fails open)"
    ok=1
  else
    echo "SELF-TEST OK: planted fetch( is caught"
  fi

  # Case 2: planted vector — a plain token.
  planted="$tmpdir/planted-vector.ts"
  printf 'const store = new VectorIndex(); // uses a vector db\n' >"$planted"
  if scan_files "$planted" >/dev/null 2>&1; then
    echo "SELF-TEST FAIL: planted vector was NOT caught"
    ok=1
  else
    echo "SELF-TEST OK: planted vector is caught"
  fi

  # Case 3: planted .embed( call.
  planted="$tmpdir/planted-embed.ts"
  printf 'const e = await model.embed(text);\n' >"$planted"
  if scan_files "$planted" >/dev/null 2>&1; then
    echo "SELF-TEST FAIL: planted .embed( was NOT caught"
    ok=1
  else
    echo "SELF-TEST OK: planted .embed( is caught"
  fi

  # Case 4: a clean file must PASS (no false positive).
  planted="$tmpdir/clean.ts"
  printf 'export function add(a: number, b: number): number { return a + b; }\n' >"$planted"
  if scan_files "$planted" >/dev/null 2>&1; then
    echo "SELF-TEST OK: clean file passes"
  else
    echo "SELF-TEST FAIL: clean file was flagged (false positive)"
    ok=1
  fi

  if [ "$ok" -eq 0 ]; then
    echo "OK: gate-13 self-test passed (enforcement is live, not fail-open)"
  fi
  return "$ok"
}

# ── Entry point ──────────────────────────────────────────────────────────────
if [ "${1:-}" = "--self-test" ]; then
  run_self_test
  exit $?
fi

# Files on the retrieval path (the scope the spec defines).
# graph.ts is included because it is imported by search.ts and is on the
# retrieval path; the gate must prove it has zero embedding/vector/fetch tokens.
RETRIEVAL_FILES=(
  "src/commands/search/search.ts"
  "src/core/vocabulary.ts"
  "src/core/stem.ts"
  "src/core/graph.ts"
)

scan_files "${RETRIEVAL_FILES[@]}"
rc=$?
if [ "$rc" -eq 0 ]; then
  echo "OK: no RAG/embedding/vector/network tokens found on retrieval path"
  exit 0
fi
if [ "$rc" -ge 2 ]; then
  echo "ERROR: gate-13 scanner failed internally (rc=$rc)"
  exit 2
fi
exit 1

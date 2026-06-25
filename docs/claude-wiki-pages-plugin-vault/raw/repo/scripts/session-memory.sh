#!/bin/bash
# Stop / SessionEnd hook: persist a session learning as a durable raw source.
#
# Decision #5 (TEAM-BRIEF.md §11): Claude Code exposes Stop and SessionEnd;
# the memory loop uses one of those, NOT SubagentStop.
#
# Protocol:
#   1. Read the session-scratch handoff file (CLAUDE_WIKI_PAGES_SESSION_SCRATCH).
#      If absent or empty → exit 0 (no-op). The hook is lazy: it only fires when
#      the agent explicitly wrote a learning during the session.
#   2. Check idempotency: if raw/agent-sessions/<session-id>-*.md already exists
#      for this session ID → exit 0 (already committed; no double-write).
#   3. Write ONE new file: <vault>/raw/agent-sessions/<session-id>-<timestamp>.md
#      with type: source, source_type: agent-session in frontmatter.
#   4. Git-commit the file (using the same identity as src/core/git.ts).
#
# No-laundering invariant (TEAM-BRIEF.md §5): the written file is a real raw/
# source (type: source, source_type: agent-session). It is NOT promoted directly
# to wiki/. Ingesting it into _proposed/ for review happens on the next
# /wiki or maintenance pass via the normal ingest pipeline.
#
# Environment variables:
#   CLAUDE_WIKI_PAGES_SESSION_SCRATCH  — path to the session-scratch handoff
#     file (written by the agent during the session; absent/empty = no-op).
#   CLAUDE_WIKI_PAGES_SESSION_ID       — session identifier (embedded in
#     filename for idempotency). Defaults to a hash of the scratch path + PID.
#   CLAUDE_WIKI_PAGES_VAULT            — vault path (resolved via resolve-vault.sh).
set -euo pipefail

# shellcheck source=resolve-vault.sh
source "$(dirname "$0")/resolve-vault.sh"
VAULT=$(resolve_vault)

# ── 1. Read scratch file ──────────────────────────────────────────────────────
SCRATCH="${CLAUDE_WIKI_PAGES_SESSION_SCRATCH:-}"
if [ -z "${SCRATCH}" ] || [ ! -f "${SCRATCH}" ]; then
  exit 0
fi
LEARNING=$(cat "${SCRATCH}")
if [ -z "${LEARNING}" ]; then
  exit 0
fi

# ── 2. Resolve session ID and check idempotency ───────────────────────────────
# Default session ID: stable hash based on scratch path so re-runs of the same
# session (same scratch file) are idempotent without needing the harness to
# provide an explicit ID.
SESSION_ID="${CLAUDE_WIKI_PAGES_SESSION_ID:-$(printf '%s' "${SCRATCH}${$}" | cksum | awk '{print $1}')}"

# Validate SESSION_ID before using it in a find -name glob and an output path.
# A caller-supplied value containing '/', '..', or glob metacharacters can
# escape the agent-sessions directory or widen the idempotency glob.
# Accepted: [A-Za-z0-9_-]+ only (matches both the cksum-derived default and
# typical harness-supplied IDs such as "sess-20240101-abc123").
if ! printf '%s' "${SESSION_ID}" | grep -qE '^[A-Za-z0-9_-]+$'; then
  printf 'session-memory: invalid SESSION_ID — must match [A-Za-z0-9_-]+, got: %s\n' \
    "${SESSION_ID}" >&2
  exit 0
fi

AGENT_SESSIONS_DIR="${VAULT}/raw/agent-sessions"

# Idempotency check: if a file for this session ID already exists, skip.
if find "${AGENT_SESSIONS_DIR}" -maxdepth 1 -type f \
  -name "${SESSION_ID}-*.md" 2>/dev/null | grep -q .; then
  exit 0
fi

# ── 3. Write the new raw source file ─────────────────────────────────────────
TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ" 2>/dev/null || date +"%Y%m%dT%H%M%SZ")
DATE_ONLY=$(date -u +"%Y-%m-%d" 2>/dev/null || date +"%Y-%m-%d")
TARGET_FILE="${AGENT_SESSIONS_DIR}/${SESSION_ID}-${TIMESTAMP}.md"

mkdir -p "${AGENT_SESSIONS_DIR}"

# Write frontmatter using a quoted heredoc delimiter ('FRONTMATTER') so the
# body is treated as a literal string with NO shell expansion.  The trusted,
# already-validated variables (SESSION_ID, DATE_ONLY) are substituted before
# the heredoc via printf so they never touch the evaluation phase.
# The untrusted LLM-authored content (LEARNING) is appended separately via
# printf '%s\n' which passes it as a literal argument — no format-string or
# command-substitution expansion is possible.
{
  printf -- '---\ntitle: "Agent Session Learning — %s"\ntype: source\nsource_type: agent-session\ncreated: %s\ndate_ingested: %s\ntags: []\naliases: []\nsources: []\nstatus: active\nconfidence: 0.9\n---\n\n' \
    "${SESSION_ID}" "${DATE_ONLY}" "${DATE_ONLY}"
  printf '%s\n' "${LEARNING}"
} >"${TARGET_FILE}"

# ── 4. Git-commit the new file ────────────────────────────────────────────────
# Use the same identity constants as src/core/git.ts so commits are consistent.
if git -C "${VAULT}" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git -C "${VAULT}" \
    -c user.name=claude-wiki-pages \
    -c user.email=claude-wiki-pages@users.noreply.github.com \
    -c commit.gpgsign=false \
    add "${TARGET_FILE}"
  git -C "${VAULT}" \
    -c user.name=claude-wiki-pages \
    -c user.email=claude-wiki-pages@users.noreply.github.com \
    -c commit.gpgsign=false \
    commit --no-verify -m \
    "chore(memory): add agent-session source ${SESSION_ID} — lazy ingest pending"
fi

exit 0

#!/bin/bash
# Sourceable helper — wired-source CRUD.
# B06: extracted from resolve-vault.sh to separate the wired-source concern from
# vault resolution (SRP / high-cohesion). All public function names are preserved
# so existing callers (sync-source.sh, wire-source.sh) continue to work without
# any change.
#
# Do NOT execute directly; source it from resolve-vault.sh (which re-exports
# these functions to its callers). This file deliberately omits `set -euo pipefail`
# — it is sourced, not executed.
#
# Depends on: CLAUDE_WIKI_PAGES_SETTINGS (set in resolve-vault.sh before sourcing
# this file), init_vault_settings (also defined in resolve-vault.sh).
#
# Public surface (stable):
#   wired_read         — print "name|path|vault|lastSyncedCommit" per source
#   wired_globs        — print include/exclude glob list for a named source
#   wired_add          — register or update a wired source
#   wired_set_synced   — record a completed pull

# A "wired source" is a git work tree (typically the host project) registered
# as a docs-only ingest source. Records live in settings.json (mutable
# per-machine state — lastSyncedCommit — does NOT belong in the gate-pinned
# config schema):
#
#   "wired_sources": [{
#     "name": "...", "path": ".", "vault": "docs/vault",
#     "include": ["README*", "*.md", "docs/**", ...],
#     "exclude": ["<vault>/**", "node_modules/**", ".git/**", ...],
#     "lastSyncedCommit": "<sha>", "lastSyncedAt": "<iso>"
#   }]
#
# Sync semantics live in scripts/sync-source.sh; registration in
# scripts/wire-source.sh. These helpers are the only settings.json accessors.

# wired_read: print one line per wired source as the canonical record
#   name|path|vault|lastSyncedCommit
# This function is the SINGLE source of truth for the wired-record shape; the
# only consumer (sync-source.sh) splits on the same delimiter via `IFS='|' read`.
# M15: '|' is a RESERVED field delimiter — a field containing it would silently
# corrupt the positional split (wrong vault/commit), so wired_read fails closed
# on a '|' in any field rather than emit an ambiguous record.
# Prints nothing when the key is absent (valid un-wired project). Fail-closed:
# exit 1 with a stderr WARN on malformed JSON, non-string fields, or a
# delimiter-bearing field.
wired_read() {
  [ -f "$CLAUDE_WIKI_PAGES_SETTINGS" ] || return 0
  python3 - "$CLAUDE_WIKI_PAGES_SETTINGS" <<'PYEOF'
import json, sys

try:
    data = json.load(open(sys.argv[1]))
except Exception as exc:
    sys.stderr.write(
        "[claude-wiki-pages] WARN: settings malformed (cannot parse %s: %s)"
        " — wired sources unavailable\n" % (sys.argv[1], exc)
    )
    sys.exit(1)

for w in data.get("wired_sources", []):
    name, path, vault = w.get("name", ""), w.get("path", ""), w.get("vault", "")
    commit = w.get("lastSyncedCommit", "")
    if not all(isinstance(v, str) for v in (name, path, vault, commit)) or not name:
        sys.stderr.write(
            "[claude-wiki-pages] WARN: wired_sources entry malformed (name=%r)"
            " — wired sources unavailable\n" % name
        )
        sys.exit(1)
    if any("|" in v for v in (name, path, vault, commit)):
        sys.stderr.write(
            "[claude-wiki-pages] WARN: wired_sources entry %r has a '|' in a"
            " field (reserved record delimiter) — wired sources unavailable\n"
            % name
        )
        sys.exit(1)
    print("%s|%s|%s|%s" % (name, path, vault, commit))
PYEOF
}

# wired_globs <name> <include|exclude>: print that record's glob list, one per line.
wired_globs() {
  [ -f "$CLAUDE_WIKI_PAGES_SETTINGS" ] || return 0
  python3 - "$CLAUDE_WIKI_PAGES_SETTINGS" "$1" "$2" 2>/dev/null <<'PYEOF'
import json, sys
data = json.load(open(sys.argv[1]))
for w in data.get("wired_sources", []):
    if w.get("name") == sys.argv[2]:
        for g in w.get(sys.argv[3], []):
            if isinstance(g, str):
                print(g)
PYEOF
}

# wired_add <name> <path> <vault> <include_json> <exclude_json>:
# idempotent on name — re-adding an existing name updates path/vault/globs but
# preserves lastSyncedCommit/lastSyncedAt (re-wiring must not lose sync state).
wired_add() {
  init_vault_settings
  local tmp="${CLAUDE_WIKI_PAGES_SETTINGS}.tmp"
  python3 - "$CLAUDE_WIKI_PAGES_SETTINGS" "$1" "$2" "$3" "$4" "$5" >"$tmp" 2>/dev/null <<'PYEOF'
import json, sys
data = json.load(open(sys.argv[1]))
name, path, vault = sys.argv[2], sys.argv[3], sys.argv[4]
include, exclude = json.loads(sys.argv[5]), json.loads(sys.argv[6])
sources = data.setdefault("wired_sources", [])
entry = next((w for w in sources if w.get("name") == name), None)
if entry is None:
    entry = {"name": name, "lastSyncedCommit": "", "lastSyncedAt": ""}
    sources.append(entry)
entry.update({"path": path, "vault": vault, "include": include, "exclude": exclude})
print(json.dumps(data, indent=2))
PYEOF
  if [ ! -s "$tmp" ]; then
    printf '[claude-wiki-pages] WARN: cannot update wired_sources\n' >&2
    rm -f "$tmp" 2>/dev/null
    return 1
  fi
  mv "$tmp" "$CLAUDE_WIKI_PAGES_SETTINGS" 2>/dev/null
}

# wired_set_synced <name> <commit> <iso-date>: record a completed pull.
wired_set_synced() {
  [ -f "$CLAUDE_WIKI_PAGES_SETTINGS" ] || return 1
  local tmp="${CLAUDE_WIKI_PAGES_SETTINGS}.tmp"
  python3 - "$CLAUDE_WIKI_PAGES_SETTINGS" "$1" "$2" "$3" >"$tmp" 2>/dev/null <<'PYEOF'
import json, sys
data = json.load(open(sys.argv[1]))
for w in data.get("wired_sources", []):
    if w.get("name") == sys.argv[2]:
        w["lastSyncedCommit"] = sys.argv[3]
        w["lastSyncedAt"] = sys.argv[4]
print(json.dumps(data, indent=2))
PYEOF
  if [ ! -s "$tmp" ]; then
    printf '[claude-wiki-pages] WARN: cannot record sync state\n' >&2
    rm -f "$tmp" 2>/dev/null
    return 1
  fi
  mv "$tmp" "$CLAUDE_WIKI_PAGES_SETTINGS" 2>/dev/null
}

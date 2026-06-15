#!/bin/bash
# Post-ingest verification script
# Checks: duplicate index entries, sources field format, index consistency
# Usage: scripts/verify-ingest.sh [--target <vault-path>]
# Exit 0 = all clean, Exit 1 = issues found
set -euo pipefail

# shellcheck source=resolve-vault.sh
source "$(dirname "$0")/resolve-vault.sh"
VAULT=$(resolve_vault)
while [ $# -gt 0 ]; do
  case "$1" in
    --target)
      VAULT="${2%/}"
      shift 2
      ;; # explicit CLI flag overrides auto-detection
    *) shift ;;
  esac
done
WIKI="$VAULT/wiki"
INDEX="$WIKI/index.md"
VAULT_CLAUDE_MD="$VAULT/CLAUDE.md"
SUPPORTED_SCHEMA_VERSIONS=(1 2 3)

ERRORS=0
WARNINGS=0

red() { printf '\033[0;31mERROR: %s\033[0m\n' "$1"; }
yellow() { printf '\033[0;33mWARN:  %s\033[0m\n' "$1"; }
green() { printf '\033[0;32mOK:    %s\033[0m\n' "$1"; }
header() { printf '\n\033[1m=== %s ===\033[0m\n' "$1"; }

# C08: single shared title extractor — extracts the `title:` value from YAML
# frontmatter of a given file. Reads the file directly (not stdin) so it can
# be called without a subshell pipeline at every call site.
# Usage: _fm_title <file>  →  prints the title string, or empty if absent.
_fm_title() {
  sed -n '/^---$/,/^---$/{/^title:/{s/^title: *"*//;s/"*$//;p;q;};}' "$1"
}

# M11: single shared YAML list extractor for sources:, children:, and any
# other list field. Reads YAML text from stdin, extracts the named field's
# list entries (one per output line, quotes/brackets stripped). Handles all
# three YAML list shapes the ingest pipeline emits, so the bash twin agrees
# with the engine's `yaml`-library parse (pinned by gate-05):
#   1. inline flow:        sources: ["[[A]]", "[[B]]"]
#   2. multi-line flow:    sources:\n  [\n    "[[A]]",\n    "[[B]]",\n  ]
#   3. block (dash) list:  sources:\n  - "[[A]]"\n  - "[[B]]"
# A flow array is accumulated by bracket balance — wikilink "[[A]]" markers are
# self-balancing (+2/-2 net 0), so only the array's own [ … ] opens/closes it,
# which is why the earlier "first ] wins" logic mis-stopped on multi-line flow.
# Usage: _extract_yaml_list <field> [keep]  — pass a non-empty 2nd arg to keep
# the [[ ]] wikilink markers (the wikilink-format check needs them).
_extract_yaml_list() {
  local field="$1"
  local keep="${2:-}"
  awk -v field="$field" -v keep="$keep" '
    function bracket_balance(s,   i, c, depth) {
      depth = 0
      for (i = 1; i <= length(s); i++) {
        c = substr(s, i, 1)
        if (c == "[") depth++
        else if (c == "]") depth--
      }
      return depth
    }
    function emit(s) {
      gsub(/^[[:space:]"\047]+|[[:space:]"\047]+$/, "", s)   # trim spaces + quotes
      if (keep == "") { sub(/^\[\[/, "", s); sub(/\]\]$/, "", s) }
      if (s != "") print s
    }
    function parse_flow(buf,   n, items, i) {
      gsub(/\n/, " ", buf)          # collapse to a single logical line
      sub(/^[^[]*\[/, "", buf)      # drop up to and including the opening [
      sub(/\][^]]*$/, "", buf)      # drop the closing ] and any trailing text
      n = split(buf, items, ",")
      for (i = 1; i <= n; i++) emit(items[i])
    }
    $0 ~ ("^" field ":") {
      val = $0
      sub(/^[^:]*:[[:space:]]*/, "", val)   # strip "field:" and leading space
      if (val ~ /\[/) {                      # flow array opens on the field line
        buf = val
        while (bracket_balance(buf) > 0) { if ((getline nxt) <= 0) break; buf = buf "\n" nxt }
        parse_flow(buf)
        next
      }
      if (val == "") {                       # value is on the following line(s)
        if ((getline nxt) <= 0) next
        if (nxt ~ /^[[:space:]]*\[/) {        # multi-line flow array
          buf = nxt
          while (bracket_balance(buf) > 0) { if ((getline n2) <= 0) break; buf = buf "\n" n2 }
          parse_flow(buf)
          next
        }
        while (nxt ~ /^[[:space:]]*-/) {      # block (dash) list
          line = nxt
          sub(/^[[:space:]]*-[[:space:]]*/, "", line)
          emit(line)
          if ((getline nxt) <= 0) break
        }
        next
      }
      emit(val)                              # bare scalar value
    }
  '
}

# Variant: extract sources: entries WITHOUT stripping wikilink [[ ]] so the
# wikilink-format check (CHECK 2) can test the brackets. DRY: same parser,
# keep-wikilinks mode.
_extract_sources_raw() {
  _extract_yaml_list "sources" keep
}

# Folder note (schema v3): filename stem equals its parent directory name AND
# frontmatter declares `type: index`. Twin of isFolderNote in src/core/fs.ts —
# both names (folder note and legacy _index.md) classify as index files
# identically at any schema version.
_is_folder_note() {
  local f="$1"
  [ -f "$f" ] || return 1
  local stem dir
  stem=$(basename "$f" .md)
  dir=$(basename "$(dirname "$f")")
  [ "$stem" = "$dir" ] || return 1
  grep -Eq '^type:[[:space:]]*["'\'']?index["'\'']?[[:space:]]*$' "$f"
}

# The folder's index file exists: folder note when present, else legacy
# _index.md. Twin of indexFileOf in src/core/fs.ts.
_has_index_file() {
  local d="$1" name
  name=$(basename "$d")
  if [ -f "$d/$name.md" ] && _is_folder_note "$d/$name.md"; then return 0; fi
  [ -f "$d/_index.md" ]
}

if [ ! -d "$VAULT" ]; then
  red "Vault directory not found at '$VAULT'"
  printf 'Run /claude-wiki-pages:init to initialise, or set a different path: bash scripts/set-vault.sh <path>\n'
  exit 1
fi

# ──────────────────────────────────────────────
# CHECK 0: schema_version
# ──────────────────────────────────────────────
header "Schema version"

DECLARED=""
if [ -f "$VAULT_CLAUDE_MD" ]; then
  # Match both `schema_version: 1` and backtick forms like `schema_version: 1`.
  DECLARED=$(grep -oE '`?schema_version`?:[[:space:]]*`?[0-9]+`?' "$VAULT_CLAUDE_MD" | head -1 |
    grep -oE '[0-9]+' | head -1 || true)
  if [ -z "$DECLARED" ]; then
    red "$VAULT_CLAUDE_MD declares no schema_version. Add \`schema_version: 1\` near the top."
    ERRORS=$((ERRORS + 1))
  else
    SUPPORTED=0
    for v in "${SUPPORTED_SCHEMA_VERSIONS[@]}"; do
      if [ "$DECLARED" -eq "$v" ]; then
        SUPPORTED=1
        break
      fi
    done
    if [ "$SUPPORTED" -eq 1 ]; then
      green "schema_version $DECLARED supported"
    else
      red "schema_version $DECLARED is unsupported (this build supports: ${SUPPORTED_SCHEMA_VERSIONS[*]})"
      red "See CHANGELOG.md for migration notes."
      ERRORS=$((ERRORS + 1))
    fi
  fi
else
  yellow "$VAULT_CLAUDE_MD not found — skipping schema_version check"
fi

# ──────────────────────────────────────────────
# CHECK 1: Duplicate entries in index.md
# ──────────────────────────────────────────────
header "Index duplicates"

if [ ! -f "$INDEX" ]; then
  red "index.md not found at $INDEX"
  ERRORS=$((ERRORS + 1))
else
  # Extract all [[Page Title]] wikilinks from the body (skip frontmatter)
  BODY=$(sed -n '/^---$/,/^---$/d; p' "$INDEX")
  LINKS=$(echo "$BODY" | grep -oE '\[\[[^]|]+' | sed 's/\[\[//' | sort || true)
  DUPES=$(echo "$LINKS" | uniq -d)

  if [ -n "$DUPES" ]; then
    while IFS= read -r dup; do
      COUNT=$(echo "$LINKS" | grep -cxF "$dup")
      red "Duplicate in index.md: \"$dup\" appears $COUNT times"
      ERRORS=$((ERRORS + 1))
    done <<<"$DUPES"
  else
    LINK_COUNT=$(echo "$LINKS" | grep -c . || true)
    green "No duplicates in index.md ($LINK_COUNT unique entries)"
  fi

  # Hierarchical MOC reachability (schema v3 folder notes, ADR-0031).
  # A page is "in the MOC" if the folder-note tree rooted at index.md reaches it
  # via child_indexes -> children, resolved by path U basename — NOT if it is
  # listed in index.md directly. _sources/ and _synthesis/ pages are reached from
  # the pages that cite them (CHECK 3b), so they are excluded here. Twin of
  # reachableFromMoc()/checkIndex in src/core/index-check.ts.
  if command -v python3 >/dev/null 2>&1; then
    NOT_IN_MOC=$(
      VERIFY_WIKI="$WIKI" python3 - <<'PY'
import os, re

wiki = os.environ["VERIFY_WIKI"]
BOOKKEEPING_STEMS = {"index", "log", "dashboard", "manifest", "_index", ".gitkeep"}

def norm(s):
    return s.strip().lower()

def split_frontmatter(text):
    if not text.startswith("---"):
        return "", text
    end = text.find("\n---", 3)
    if end == -1:
        return "", text
    return text[3:end], text[end + 4:]

def parse_fm_lists(fm):
    """Extract title, aliases, children, child_indexes from a frontmatter block.
    Handles inline-flow and block (dash) YAML lists — mirrors the engine yaml parse."""
    title = None
    aliases, children, child_indexes = [], [], []
    lines = fm.splitlines()
    i = 0
    def parse_list(rest, j):
        vals = []
        rest = rest.strip()
        if rest.startswith("["):
            items = re.findall(r"\"([^\"]*)\"|'([^']*)'", rest)
            if items:
                for a, b in items:
                    v = a or b
                    if v:
                        vals.append(v)
            else:
                for piece in rest.strip("[]").split(","):
                    piece = piece.strip().strip('"').strip("'")
                    if piece:
                        vals.append(piece)
            return vals, j
        k = j + 1
        while k < len(lines):
            bm = re.match(r"^\s*-\s*(.+?)\s*$", lines[k])
            if bm:
                vals.append(bm.group(1).strip().strip('"').strip("'"))
                k += 1
            else:
                break
        return vals, k - 1
    while i < len(lines):
        line = lines[i]
        m = re.match(r"^title:\s*(.+?)\s*$", line)
        if m:
            title = m.group(1).strip().strip('"').strip("'")
        for field, bucket in (("aliases", aliases), ("children", children),
                              ("child_indexes", child_indexes)):
            m = re.match(r"^" + field + r":\s*(.*)$", line)
            if m:
                vals, i = parse_list(m.group(1), i)
                bucket.extend(vals)
        i += 1
    return title, aliases, children, child_indexes

def link_target(raw):
    """Strip [[ ]], |display, #heading, ^block; return normalised target."""
    t = raw
    t = re.sub(r"^\[\[", "", t)
    t = re.sub(r"\]\]$", "", t)
    for sep in ("|", "#", "^"):
        idx = t.find(sep)
        if idx != -1:
            t = t[:idx]
    return norm(t)

# Build the path U basename resolver over wiki/.
by_path = {}       # normalised wiki-rel path (with & without .md) -> rel
by_basename = {}   # normalised stem -> [rel]
by_alias = {}
by_title = {}
fm_by_rel = {}
all_pages = []
for dirpath, _dirs, files in os.walk(wiki):
    for fn in sorted(files):
        if not fn.endswith(".md"):
            continue
        full = os.path.join(dirpath, fn)
        rel = os.path.relpath(full, wiki).replace(os.sep, "/")
        all_pages.append(rel)
        stem = fn[:-3]
        pk = norm(rel)
        by_path.setdefault(pk, rel)
        by_path.setdefault(pk[:-3] if pk.endswith(".md") else pk, rel)
        by_basename.setdefault(norm(stem), []).append(rel)
        try:
            text = open(full, encoding="utf-8").read()
        except Exception:
            text = ""
        fm, _b = split_frontmatter(text)
        title, aliases, children, child_indexes = parse_fm_lists(fm)
        fm_by_rel[rel] = (title, children, child_indexes)
        if title:
            by_title.setdefault(norm(title), []).append(rel)
        for a in aliases:
            if norm(a):
                by_alias.setdefault(norm(a), []).append(rel)

for _m in (by_basename, by_alias, by_title):
    for _k in list(_m):
        _m[_k] = sorted(set(_m[_k]))

def tiebreak(cands, src):
    srcdir = src.rsplit("/", 1)[0] if "/" in src else ""
    def key(c):
        cdir = c.rsplit("/", 1)[0] if "/" in c else ""
        return (c.count("/"), 0 if cdir == srcdir else 1, c)
    return sorted(cands, key=key)[0]

def resolve(raw, src):
    nt = link_target(raw)
    if not nt:
        return None
    if nt in by_path:
        return by_path[nt]
    if by_basename.get(nt):
        return tiebreak(by_basename[nt], src)
    if by_alias.get(nt):
        return tiebreak(by_alias[nt], src)
    if by_title.get(nt):
        return tiebreak(by_title[nt], src)
    return None

# Walk the MOC from index.md.
covered = set()
visited = set()
def visit(rel):
    if rel in visited:
        return
    visited.add(rel)
    covered.add(rel)
    title, children, child_indexes = fm_by_rel.get(rel, (None, [], []))
    for c in children:
        r = resolve(c, rel)
        if r is not None:
            covered.add(r)
    for ci in child_indexes:
        r = resolve(ci, rel)
        if r is not None:
            visit(r)

if "index.md" in fm_by_rel:
    visit("index.md")

# Folder-note detection mirrors _is_folder_note: stem == parent AND type: index.
def is_folder_note(rel):
    parts = rel.split("/")
    stem = parts[-1][:-3]
    parent = parts[-2] if len(parts) >= 2 else ""
    if stem != parent:
        return False
    try:
        text = open(os.path.join(wiki, rel), encoding="utf-8").read()
    except Exception:
        return False
    return bool(re.search(r"^type:\s*[\"']?index[\"']?\s*$", text, re.MULTILINE))

for rel in sorted(all_pages):
    stem = rel.split("/")[-1][:-3]
    if stem in BOOKKEEPING_STEMS:
        continue
    if is_folder_note(rel):
        continue
    if rel.startswith("_sources/") or rel.startswith("_synthesis/"):
        continue
    if rel not in covered:
        title = fm_by_rel.get(rel, (None, [], []))[0] or stem
        # Output FILE then TITLE, read in pairs by the bash loop below.
        print(os.path.join(wiki, rel))
        print(title)
PY
    )
    if [ -n "$NOT_IN_MOC" ]; then
      while IFS= read -r moc_file && IFS= read -r moc_title; do
        [ -z "$moc_file" ] && continue || true
        yellow "Page not in MOC: \"$moc_title\" ($moc_file) — not reachable from index.md via folder notes"
        WARNINGS=$((WARNINGS + 1))
      done <<<"$NOT_IN_MOC"
    fi
  fi
fi

# ──────────────────────────────────────────────
# CHECK 2: sources fields use [[wikilinks]]
# ──────────────────────────────────────────────
header "Sources field format"

SOURCES_OK=0
SOURCES_BAD=0

while IFS= read -r filepath; do
  BASENAME=$(basename "$filepath" .md)
  case "$BASENAME" in
    index | log | dashboard | manifest | _index | .gitkeep) continue ;;
  esac
  if _is_folder_note "$filepath"; then continue; fi

  # Extract frontmatter block
  FRONTMATTER=$(sed -n '/^---$/,/^---$/p' "$filepath")

  # M11: use the shared _extract_sources_raw helper (DRY — previously duplicated
  # in CHECK 2, CHECK 4, and CHECK 5a).
  SOURCES_ENTRIES=$(printf '%s\n' "$FRONTMATTER" | _extract_sources_raw)

  if [ -z "$SOURCES_ENTRIES" ]; then
    continue
  fi

  while IFS= read -r entry; do
    # Skip empty entries
    [ -z "$entry" ] && continue || true
    # Check for [[wikilink]] format
    if echo "$entry" | grep -qE '^\[\[.+\]\]$'; then
      SOURCES_OK=$((SOURCES_OK + 1))
    else
      red "Plain string in sources: \"$entry\" in $(basename "$filepath")"
      SOURCES_BAD=$((SOURCES_BAD + 1))
      ERRORS=$((ERRORS + 1))
    fi
  done <<<"$SOURCES_ENTRIES"
done < <(find "$WIKI" -name '*.md' -type f | sort)

if [ "$SOURCES_BAD" -eq 0 ]; then
  green "All sources fields use [[wikilinks]] ($SOURCES_OK entries checked)"
else
  red "$SOURCES_BAD plain-string sources found ($SOURCES_OK OK)"
fi

# ──────────────────────────────────────────────
# CHECK 3: per-folder index (folder note or legacy _index.md) consistency
# with folder contents
# ──────────────────────────────────────────────
header "Index consistency"

# Children are "[[wikilink]]" values (piped-basename or path-qualified); a page
# is matched by the file its child link RESOLVES to (path U basename, ADR-0031),
# not by title. A child is an error only when it resolves to no page anywhere in
# wiki/. Twin of checkIndexConsistency in src/core/moc.ts. The python3 block
# emits one tagged line per finding; the subfolder-index check stays here.
if command -v python3 >/dev/null 2>&1; then
  MOC_OUTPUT=$(
    VERIFY_WIKI="$WIKI" python3 - <<'PY'
import os, re

wiki = os.environ["VERIFY_WIKI"]

def norm(s):
    return s.strip().lower()

def split_frontmatter(text):
    if not text.startswith("---"):
        return "", text
    end = text.find("\n---", 3)
    if end == -1:
        return "", text
    return text[3:end], text[end + 4:]

def parse_fm(fm):
    title = None
    aliases, children = [], []
    is_index = bool(re.search(r"^type:\s*[\"']?index[\"']?\s*$", fm, re.MULTILINE))
    lines = fm.splitlines()
    i = 0
    def parse_list(rest, j):
        vals = []
        rest = rest.strip()
        if rest.startswith("["):
            items = re.findall(r"\"([^\"]*)\"|'([^']*)'", rest)
            if items:
                for a, b in items:
                    v = a or b
                    if v:
                        vals.append(v)
            else:
                for piece in rest.strip("[]").split(","):
                    piece = piece.strip().strip('"').strip("'")
                    if piece:
                        vals.append(piece)
            return vals, j
        k = j + 1
        while k < len(lines):
            bm = re.match(r"^\s*-\s*(.+?)\s*$", lines[k])
            if bm:
                vals.append(bm.group(1).strip().strip('"').strip("'"))
                k += 1
            else:
                break
        return vals, k - 1
    while i < len(lines):
        line = lines[i]
        m = re.match(r"^title:\s*(.+?)\s*$", line)
        if m:
            title = m.group(1).strip().strip('"').strip("'")
        for field, bucket in (("aliases", aliases), ("children", children)):
            m = re.match(r"^" + field + r":\s*(.*)$", line)
            if m:
                vals, i = parse_list(m.group(1), i)
                bucket.extend(vals)
        i += 1
    return title, aliases, children, is_index

def link_target(raw):
    t = re.sub(r"^\[\[", "", raw)
    t = re.sub(r"\]\]$", "", t)
    for sep in ("|", "#", "^"):
        idx = t.find(sep)
        if idx != -1:
            t = t[:idx]
    return norm(t)

by_path, by_basename, by_alias, by_title = {}, {}, {}, {}
pages = {}  # rel -> (title, aliases, children, is_index)
for dirpath, _dirs, files in os.walk(wiki):
    for fn in sorted(files):
        if not fn.endswith(".md"):
            continue
        full = os.path.join(dirpath, fn)
        rel = os.path.relpath(full, wiki).replace(os.sep, "/")
        stem = fn[:-3]
        pk = norm(rel)
        by_path.setdefault(pk, rel)
        by_path.setdefault(pk[:-3] if pk.endswith(".md") else pk, rel)
        by_basename.setdefault(norm(stem), []).append(rel)
        try:
            text = open(full, encoding="utf-8").read()
        except Exception:
            text = ""
        fm, _b = split_frontmatter(text)
        title, aliases, children, is_index = parse_fm(fm)
        pages[rel] = (title, aliases, children, is_index)
        if title:
            by_title.setdefault(norm(title), []).append(rel)
        for a in aliases:
            if norm(a):
                by_alias.setdefault(norm(a), []).append(rel)

for _m in (by_basename, by_alias, by_title):
    for _k in list(_m):
        _m[_k] = sorted(set(_m[_k]))

def tiebreak(cands, src):
    srcdir = src.rsplit("/", 1)[0] if "/" in src else ""
    def key(c):
        cdir = c.rsplit("/", 1)[0] if "/" in c else ""
        return (c.count("/"), 0 if cdir == srcdir else 1, c)
    return sorted(cands, key=key)[0]

def resolve(raw, src):
    nt = link_target(raw)
    if not nt:
        return None
    if nt in by_path:
        return by_path[nt]
    if by_basename.get(nt):
        return tiebreak(by_basename[nt], src)
    if by_alias.get(nt):
        return tiebreak(by_alias[nt], src)
    if by_title.get(nt):
        return tiebreak(by_title[nt], src)
    return None

def is_folder_note(rel):
    parts = rel.split("/")
    stem = parts[-1][:-3]
    parent = parts[-2] if len(parts) >= 2 else ""
    return stem == parent and pages.get(rel, (None, None, None, False))[3]

def title_of(rel):
    t = pages.get(rel, (None,))[0]
    return t if t else rel.split("/")[-1][:-3]

# Index files: legacy _index.md plus folder notes — in sorted-path order.
index_files = []
for rel in sorted(pages):
    fn = rel.split("/")[-1]
    if fn == "_index.md" or is_folder_note(rel):
        index_files.append(rel)

for index_rel in index_files:
    folder = index_rel.rsplit("/", 1)[0] if "/" in index_rel else ""
    folder_name = folder.split("/")[-1] if folder else os.path.basename(wiki.rstrip("/"))
    index_name = index_rel.split("/")[-1]
    _t, _a, children, _i = pages[index_rel]

    # Actual non-index pages directly in this folder.
    actual = []
    for rel in sorted(pages):
        d = rel.rsplit("/", 1)[0] if "/" in rel else ""
        if d != folder:
            continue
        if rel.split("/")[-1] == "_index.md" or is_folder_note(rel):
            continue
        actual.append(rel)

    child_resolved = {c: resolve(c, index_rel) for c in children}
    resolved_files = {r for r in child_resolved.values() if r is not None}

    # Pages in folder but missing from children.
    for rel in actual:
        if children:
            if rel not in resolved_files:
                print('WARN\tPage "%s" in %s/ but not in %s/%s children' %
                      (title_of(rel), folder_name, folder_name, index_name))
        else:
            print('WARN\tPage "%s" in %s/ but %s has empty children list' %
                  (title_of(rel), folder_name, index_name))

    # Children that resolve to no page anywhere.
    for c in children:
        if child_resolved[c] is None:
            if actual:
                print('ERR\tIndex lists "%s" but no matching page found in %s/' % (c, folder_name))
            else:
                print('ERR\tIndex lists "%s" but folder %s/ has no pages' % (c, folder_name))
PY
  )
  if [ -n "$MOC_OUTPUT" ]; then
    while IFS=$'\t' read -r tag msg; do
      [ -z "$tag" ] && continue || true
      case "$tag" in
        WARN)
          yellow "$msg"
          WARNINGS=$((WARNINGS + 1))
          ;;
        ERR)
          red "$msg"
          ERRORS=$((ERRORS + 1))
          ;;
      esac
    done <<<"$MOC_OUTPUT"
  fi
fi

# Subfolder index-file presence (filesystem-based, resolution-independent) plus
# the per-index informational "checked" line (green, never counted).
while IFS= read -r index_file; do
  if [ "$(basename "$index_file")" != "_index.md" ] && ! _is_folder_note "$index_file"; then
    continue
  fi
  FOLDER=$(dirname "$index_file")
  FOLDER_NAME=$(basename "$FOLDER")
  INDEX_BASENAME=$(basename "$index_file")
  while IFS= read -r d; do
    [ -z "$d" ] && continue || true
    subdir=$(basename "$d")
    if ! _has_index_file "$FOLDER/$subdir"; then
      red "Subfolder $FOLDER_NAME/$subdir/ has no index file (folder note or _index.md)"
      ERRORS=$((ERRORS + 1))
    fi
  done < <(find "$FOLDER" -mindepth 1 -maxdepth 1 -type d | sort)
  green "$FOLDER_NAME/$INDEX_BASENAME checked"
done < <(find "$WIKI" -name '*.md' -type f | sort)

# CHECK 3b: Source summaries referenced by at least one wiki page
header "Orphan source summaries"

SOURCES_DIR="$WIKI/_sources"
if [ ! -d "$SOURCES_DIR" ]; then
  yellow "No _sources/ directory found"
elif command -v python3 >/dev/null 2>&1; then
  # A source is referenced iff some citing page has a wikilink that RESOLVES to
  # it by path U basename (ADR-0031) — not iff a bare [[title]] string appears.
  # Twin of checkOrphanSources in src/core/moc.ts.
  ORPHAN_OUTPUT=$(
    VERIFY_WIKI="$WIKI" python3 - <<'PY'
import os, re

wiki = os.environ["VERIFY_WIKI"]
LINK_RE = re.compile(r"\[\[([^\[\]]+?)\]\]")

def norm(s):
    return s.strip().lower()

def split_frontmatter(text):
    if not text.startswith("---"):
        return "", text
    end = text.find("\n---", 3)
    if end == -1:
        return "", text
    return text[3:end], text[end + 4:]

def strip_code(text):
    out = []
    in_fence = False
    marker = ""
    for line in text.splitlines():
        s = line.lstrip()
        if not in_fence and (s.startswith("```") or s.startswith("~~~")):
            in_fence = True
            marker = s[:3]
            continue
        if in_fence:
            if s.startswith(marker):
                in_fence = False
                marker = ""
            continue
        out.append(re.sub(r"`[^`]*`", "", line))
    return "\n".join(out)

def parse_title_aliases(fm):
    title = None
    aliases = []
    lines = fm.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        m = re.match(r"^title:\s*(.+?)\s*$", line)
        if m:
            title = m.group(1).strip().strip('"').strip("'")
        m = re.match(r"^aliases:\s*(.*)$", line)
        if m:
            rest = m.group(1).strip()
            if rest.startswith("["):
                items = re.findall(r"\"([^\"]*)\"|'([^']*)'", rest)
                if items:
                    for a, b in items:
                        v = a or b
                        if v:
                            aliases.append(v)
                else:
                    for piece in rest.strip("[]").split(","):
                        piece = piece.strip().strip('"').strip("'")
                        if piece:
                            aliases.append(piece)
            else:
                j = i + 1
                while j < len(lines):
                    bm = re.match(r"^\s*-\s*(.+?)\s*$", lines[j])
                    if bm:
                        aliases.append(bm.group(1).strip().strip('"').strip("'"))
                        j += 1
                    else:
                        break
                i = j - 1
        i += 1
    return title, aliases

def link_target(raw):
    t = re.sub(r"^\[\[", "", raw)
    t = re.sub(r"\]\]$", "", t)
    for sep in ("|", "#", "^"):
        idx = t.find(sep)
        if idx != -1:
            t = t[:idx]
    return norm(t)

by_path, by_basename, by_alias, by_title = {}, {}, {}, {}
all_pages, titles = [], {}
for dirpath, _dirs, files in os.walk(wiki):
    for fn in sorted(files):
        if not fn.endswith(".md"):
            continue
        full = os.path.join(dirpath, fn)
        rel = os.path.relpath(full, wiki).replace(os.sep, "/")
        all_pages.append(rel)
        stem = fn[:-3]
        pk = norm(rel)
        by_path.setdefault(pk, rel)
        by_path.setdefault(pk[:-3] if pk.endswith(".md") else pk, rel)
        by_basename.setdefault(norm(stem), []).append(rel)
        try:
            text = open(full, encoding="utf-8").read()
        except Exception:
            text = ""
        fm, _b = split_frontmatter(text)
        title, aliases = parse_title_aliases(fm)
        titles[rel] = title if title else stem
        if title:
            by_title.setdefault(norm(title), []).append(rel)
        for a in aliases:
            if norm(a):
                by_alias.setdefault(norm(a), []).append(rel)

for _m in (by_basename, by_alias, by_title):
    for _k in list(_m):
        _m[_k] = sorted(set(_m[_k]))

def tiebreak(cands, src):
    srcdir = src.rsplit("/", 1)[0] if "/" in src else ""
    def key(c):
        cdir = c.rsplit("/", 1)[0] if "/" in c else ""
        return (c.count("/"), 0 if cdir == srcdir else 1, c)
    return sorted(cands, key=key)[0]

def resolve(raw, src):
    nt = link_target(raw)
    if not nt:
        return None
    if nt in by_path:
        return by_path[nt]
    if by_basename.get(nt):
        return tiebreak(by_basename[nt], src)
    if by_alias.get(nt):
        return tiebreak(by_alias[nt], src)
    if by_title.get(nt):
        return tiebreak(by_title[nt], src)
    return None

# Collect every file a citing page's wikilink resolves to.
referenced = set()
for rel in all_pages:
    if rel.startswith("_sources/") or rel in ("index.md", "log.md"):
        continue
    try:
        text = open(os.path.join(wiki, rel), encoding="utf-8").read()
    except Exception:
        continue
    for raw in LINK_RE.findall(strip_code(text)):
        r = resolve(raw, rel)
        if r is not None:
            referenced.add(r)

# Source summaries (type != manifest) not referenced by any page are orphans.
for rel in sorted(all_pages):
    parts = rel.split("/")
    if parts[0] != "_sources" or parts[-1] == ".gitkeep":
        continue
    try:
        text = open(os.path.join(wiki, rel), encoding="utf-8").read()
    except Exception:
        text = ""
    fm, _b = split_frontmatter(text)
    if re.search(r"^type:\s*manifest\s*$", fm, re.MULTILINE):
        continue
    if rel not in referenced:
        print('%s\t%s' % (titles[rel], parts[-1]))
PY
  )
  ORPHAN_SOURCES=0
  if [ -n "$ORPHAN_OUTPUT" ]; then
    while IFS=$'\t' read -r src_title src_base; do
      [ -z "$src_title" ] && continue || true
      yellow "Orphan source: \"$src_title\" ($src_base) — not referenced by any wiki page"
      WARNINGS=$((WARNINGS + 1))
      ORPHAN_SOURCES=$((ORPHAN_SOURCES + 1))
    done <<<"$ORPHAN_OUTPUT"
  fi
  if [ "$ORPHAN_SOURCES" -eq 0 ]; then
    green "All source summaries are referenced by at least one wiki page"
  fi
fi

# Also check for topic folders that lack an index file entirely
while IFS= read -r dir; do
  [ -z "$dir" ] && continue || true
  DIRNAME=$(basename "$dir")
  # Skip special folders and dot-directories (.claude/, .obsidian/ — tooling
  # state, not topic folders).
  case "$DIRNAME" in
    _sources | _synthesis | .*) continue ;;
  esac
  if ! _has_index_file "$dir"; then
    red "Topic folder $DIRNAME/ has no index file (folder note or _index.md)"
    ERRORS=$((ERRORS + 1))
  fi
done < <(find "$WIKI" -mindepth 1 -maxdepth 1 -type d | sort)

# ──────────────────────────────────────────────
# Legacy index filename (schema v3): at schema_version >= 3, a remaining
# wiki/**/_index.md is deprecated — folder notes (<dir>/<dirname>.md) are the
# v3 name. WARN with the migrate remediation; older vaults emit nothing.
# ──────────────────────────────────────────────
if [ -n "$DECLARED" ] && [ "$DECLARED" -ge 3 ]; then
  while IFS= read -r legacy_file; do
    [ -z "$legacy_file" ] && continue || true
    yellow "legacy-index-filename: $legacy_file uses the legacy _index.md name — rename to the folder note $(basename "$(dirname "$legacy_file")").md (run: bash scripts/engine.sh migrate --write)"
    WARNINGS=$((WARNINGS + 1))
  done < <(find "$WIKI" -name '_index.md' -type f | sort)
fi

# ──────────────────────────────────────────────
# CHECK 4: S4-derivation — staleness from updated vs newest cited-source date
#
# For each wiki page (excluding bookkeeping) that carries a sources: list,
# resolve each [[wikilink]] to the matching file in wiki/_sources/ (by title:
# or aliases: match). Find the newest date on the cited source (updated: first,
# then date_ingested:, then date_published:). If that source date is strictly
# newer than the wiki page's own updated:, emit a WARN-level "stale-source"
# finding. An unresolvable wikilink emits a separate "dangling-source" WARN and
# is NOT counted as fresh (source-relative, not calendar-relative; no auto-
# mutation of status:).
# ──────────────────────────────────────────────
header "Cited-source staleness (S4)"

# Helper: extract the first occurrence of a scalar frontmatter field.
# Usage: _fm_field <file> <field-name>
# Returns the trimmed value or empty string.
# `grep -m1` avoids piping into `head` (which would SIGPIPE grep under
# `set -o pipefail`); the trailing `|| true` absorbs grep's exit-1 on no match
# so a missing field yields "" instead of killing the script under `set -e`.
_fm_field() {
  local file="$1" field="$2"
  local line
  line=$(sed -n '/^---$/,/^---$/p' "$file" | grep -m1 -E "^${field}:[[:space:]]" || true)
  [ -z "$line" ] && return 0
  printf '%s' "$line" | sed "s/^${field}:[[:space:]]*//" | tr -d "\"'"
}

# Helper: given a cited wikilink target (without [[ ]], pipe already stripped),
# find the source file in _sources/ it resolves to. Resolution order mirrors the
# engine resolveLink (ADR-0031): exact wiki-relative PATH (with/without .md,
# case-insensitive) -> filename basename (case-insensitive) -> title -> alias.
# Path and basename are what Obsidian resolves; title/alias are a superset.
# Prints the absolute filepath or nothing. Twin of the path U basename branch of
# checkCitedSourceStaleness in src/core/staleness.ts.
_resolve_source_wikilink() {
  local target="$1"
  local sources_dir="$2"
  local wiki_dir
  wiki_dir=$(dirname "$sources_dir")
  [ -d "$sources_dir" ] || return 0
  # Normalise the target to lowercase for case-insensitive path/basename match.
  local nt
  nt=$(printf '%s' "$target" | tr '[:upper:]' '[:lower:]')

  # Tier 1: exact wiki-relative path (a path-qualified target like
  # "_sources/adr-0001-foo"). Strip a trailing .md before comparing.
  local nt_noext="${nt%.md}"
  local cand_rel cand_norm
  while IFS= read -r candidate; do
    cand_rel="${candidate#"$wiki_dir"/}"
    cand_norm=$(printf '%s' "$cand_rel" | tr '[:upper:]' '[:lower:]')
    cand_norm="${cand_norm%.md}"
    if [ "$cand_norm" = "$nt_noext" ]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done < <(find "$sources_dir" -name '*.md' -not -name '.gitkeep' -type f | sort)

  # Tier 2: filename basename (case-insensitive).
  local stem stem_norm
  while IFS= read -r candidate; do
    stem=$(basename "$candidate" .md)
    stem_norm=$(printf '%s' "$stem" | tr '[:upper:]' '[:lower:]')
    if [ "$stem_norm" = "$nt_noext" ]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done < <(find "$sources_dir" -name '*.md' -not -name '.gitkeep' -type f | sort)

  # Tier 3/4: title: then aliases: (exact, as before — kept as a superset).
  while IFS= read -r candidate; do
    local title
    title=$(_fm_field "$candidate" "title")
    if [ "$title" = "$target" ]; then
      printf '%s\n' "$candidate"
      return 0
    fi
    local aliases_line
    aliases_line=$(sed -n '/^---$/,/^---$/p' "$candidate" |
      grep -m1 -E "^aliases:" || true)
    if [ -n "$aliases_line" ] && echo "$aliases_line" | grep -qF "\"${target}\""; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done < <(find "$sources_dir" -name '*.md' -not -name '.gitkeep' -type f | sort)
  # Not found
  return 0
}

# Helper: return the best available date from a source file (YYYY-MM-DD string).
# Priority: updated: > date_ingested: > date_published:
_source_best_date() {
  local file="$1"
  local d
  d=$(_fm_field "$file" "updated")
  [ -n "$d" ] && printf '%s\n' "$d" && return
  d=$(_fm_field "$file" "date_ingested")
  [ -n "$d" ] && printf '%s\n' "$d" && return
  d=$(_fm_field "$file" "date_published")
  [ -n "$d" ] && printf '%s\n' "$d" && return
  printf ''
}

STALE_SOURCE_FOUND=0

while IFS= read -r filepath; do
  BASENAME=$(basename "$filepath" .md)
  # Skip bookkeeping files; _sources/ pages are the targets, not the checkers.
  case "$BASENAME" in
    index | log | dashboard | manifest | _index | .gitkeep) continue ;;
  esac
  # Skip the _sources/ directory itself and _synthesis/.
  case "$filepath" in
    */_sources/*) continue ;;
    */_synthesis/*) continue ;;
  esac

  # Extract the wiki page's own updated: date.
  PAGE_UPDATED=$(_fm_field "$filepath" "updated")
  [ -z "$PAGE_UPDATED" ] && continue # no updated: field — skip staleness check

  # M11: use shared _extract_sources_raw helper (DRY — third occurrence).
  PAGE_SOURCES=$(sed -n '/^---$/,/^---$/p' "$filepath" | _extract_sources_raw)
  [ -z "$PAGE_SOURCES" ] && continue

  while IFS= read -r entry; do
    [ -z "$entry" ] && continue
    # Only process [[wikilink]] entries (plain-string check is CHECK 2).
    if echo "$entry" | grep -qE '^\[\[.+\]\]$'; then
      # Strip [[ and ]] to get target name; also strip alias suffix after |.
      TARGET=$(echo "$entry" | sed 's/^\[\[//' | sed 's/\]\]$//' | cut -d'|' -f1)
      # Resolve to a file in _sources/.
      SOURCE_FILE=$(_resolve_source_wikilink "$TARGET" "$WIKI/_sources")
      if [ -z "$SOURCE_FILE" ]; then
        yellow "dangling-source: \"${TARGET}\" cited by $(basename "$filepath") could not be resolved in _sources/"
        WARNINGS=$((WARNINGS + 1))
        STALE_SOURCE_FOUND=$((STALE_SOURCE_FOUND + 1))
        continue
      fi
      SOURCE_DATE=$(_source_best_date "$SOURCE_FILE")
      if [ -z "$SOURCE_DATE" ]; then
        continue # source has no date field — cannot evaluate staleness
      fi
      # Compare YYYY-MM-DD strings lexicographically (valid for ISO dates).
      # Stale when source_date is strictly greater than page_updated.
      if [[ "$SOURCE_DATE" > "$PAGE_UPDATED" ]]; then
        PAGE_TITLE=$(_fm_field "$filepath" "title")
        [ -z "$PAGE_TITLE" ] && PAGE_TITLE="$BASENAME"
        yellow "stale-source: \"${PAGE_TITLE}\" ($(basename "$filepath")) updated ${PAGE_UPDATED} but cited source \"${TARGET}\" has date ${SOURCE_DATE}"
        WARNINGS=$((WARNINGS + 1))
        STALE_SOURCE_FOUND=$((STALE_SOURCE_FOUND + 1))
      fi
    fi
  done <<<"$PAGE_SOURCES"
done < <(find "$WIKI" -name '*.md' -type f | sort)

if [ "$STALE_SOURCE_FOUND" -eq 0 ]; then
  green "All cited sources are current (no staleness findings)"
fi

# ──────────────────────────────────────────────
# CHECK 5: I3 — provenance-completeness
#
# 5a. source-presence: a page whose type: is one of entity / concept / topic /
#     project / synthesis MUST have at least one entry in sources:.  An empty
#     or absent sources: list is an ERROR.  Pages whose sources: list is
#     non-empty but contains malformed entries are already caught by CHECK 2;
#     this check counts only the presence of at least one entry and must NOT
#     double-flag those pages.
#
# 5b. derived/confidence consistency: a page with derived: true must keep
#     confidence < 0.8.  Any violation is a WARN.
# ──────────────────────────────────────────────
header "Provenance completeness (I3)"

SOURCE_REQUIRING_TYPES="entity concept topic project synthesis"
PROVENANCE_ERRORS=0
DERIVED_WARNS=0

while IFS= read -r filepath; do
  BASENAME=$(basename "$filepath" .md)
  # Skip bookkeeping files.
  case "$BASENAME" in
    index | log | dashboard | manifest | _index | .gitkeep) continue ;;
  esac
  # Skip _sources/ and _synthesis/ directories.
  case "$filepath" in
    */_sources/*) continue ;;
    */_synthesis/*) continue ;;
  esac

  # Read the type: field from frontmatter.
  PAGE_TYPE=$(sed -n '/^---$/,/^---$/p' "$filepath" |
    grep -m1 -E '^type:[[:space:]]' | sed 's/^type:[[:space:]]*//' | tr -d "\"'" || true)

  # ── 5a: source-presence ──────────────────────────────────────────────────
  # Only check source-requiring types.
  IS_REQUIRING=0
  for t in $SOURCE_REQUIRING_TYPES; do
    if [ "$PAGE_TYPE" = "$t" ]; then
      IS_REQUIRING=1
      break
    fi
  done

  if [ "$IS_REQUIRING" -eq 1 ]; then
    # Count entries in sources: via the shared helper. We need the raw count
    # regardless of format so that malformed-but-present entries are not
    # double-flagged. M11: uses _extract_sources_raw instead of an inline awk.
    _fm_block=$(sed -n '/^---$/,/^---$/p' "$filepath")
    ENTRY_COUNT=$(printf '%s\n' "$_fm_block" | _extract_sources_raw | grep -c . || true)
    ENTRY_COUNT="${ENTRY_COUNT:-0}"

    if [ "$ENTRY_COUNT" -eq 0 ]; then
      PAGE_TITLE=$(_fm_title "$filepath")
      [ -z "$PAGE_TITLE" ] && PAGE_TITLE="$BASENAME"
      red "no-sources: \"${PAGE_TITLE}\" ($(basename "$filepath")) has type \"${PAGE_TYPE}\" but no sources entries"
      PROVENANCE_ERRORS=$((PROVENANCE_ERRORS + 1))
      ERRORS=$((ERRORS + 1))
    fi
  fi

  # ── 5b: derived/confidence consistency ────────────────────────────────────
  DERIVED_VAL=$(sed -n '/^---$/,/^---$/p' "$filepath" |
    grep -m1 -E '^derived:[[:space:]]' | sed 's/^derived:[[:space:]]*//' | tr -d "\"'" || true)

  if [ "$DERIVED_VAL" = "true" ]; then
    CONF_VAL=$(sed -n '/^---$/,/^---$/p' "$filepath" |
      grep -m1 -E '^confidence:[[:space:]]' | sed 's/^confidence:[[:space:]]*//' | tr -d "\"'" || true)
    if [ -n "$CONF_VAL" ]; then
      # Use awk for floating-point comparison (bash arithmetic is integer-only).
      IS_HIGH=$(awk -v c="$CONF_VAL" 'BEGIN { print (c + 0 >= 0.8) ? "1" : "0" }')
      if [ "$IS_HIGH" = "1" ]; then
        PAGE_TITLE=$(_fm_title "$filepath")
        [ -z "$PAGE_TITLE" ] && PAGE_TITLE="$BASENAME"
        yellow "derived-high-confidence: \"${PAGE_TITLE}\" ($(basename "$filepath")) has derived: true but confidence ${CONF_VAL} >= 0.8 — lower confidence to reflect inferred status"
        DERIVED_WARNS=$((DERIVED_WARNS + 1))
        WARNINGS=$((WARNINGS + 1))
      fi
    fi
  fi

done < <(find "$WIKI" -name '*.md' -type f | sort)

if [ "$PROVENANCE_ERRORS" -eq 0 ] && [ "$DERIVED_WARNS" -eq 0 ]; then
  green "All provenance checks passed"
fi

# ──────────────────────────────────────────────
# FU1 (ADR-0028): dangling-wikilink WARN check
#
# One WARN per (page, distinct-normalised-target) whose [[link]] resolves to
# no page in wiki/.  Resolution model (identical to the TS twin in
# src/core/wikilink-check.ts and scripts/graph-quality.sh):
#
#   A link [[T]] resolves iff, case-insensitively, the normalised target
#   (stripped of "|alias", "#heading", "^block") equals:
#     - the filename stem of some page, OR
#     - the title: value of some page, OR
#     - any aliases: entry of some page.
#
# BOOKKEEPING pages (index, log, dashboard, manifest, _index, .gitkeep) and
# folder notes (type: index, stem == dir name) are skipped as subjects.
# All pages contribute to the resolvable-name set (targets are not filtered).
#
# Implementation uses an inline python3 block (same pattern as
# scripts/graph-quality.sh) so the regex and normalisation are byte-identical
# across both bash-twin and TS-engine on every vault.
# ──────────────────────────────────────────────
header "Dangling wikilinks (FU1)"

if ! command -v python3 >/dev/null 2>&1; then
  yellow "python3 not found — dangling-wikilink check skipped"
else
  DANGLING_WARNS=0
  # Run the python3 block; capture its output as "COUNT\tFILE\tTARGET" lines.
  # Each line is one (file, distinct-normalised-target) pair that dangles.
  DANGLING_OUTPUT=$(
    VERIFY_WIKI="$WIKI" python3 - <<'PY'
import os, re

wiki = os.environ["VERIFY_WIKI"]

BOOKKEEPING_STEMS = {"index", "log", "dashboard", "manifest", "_index", ".gitkeep"}
LINK_RE = re.compile(r"\[\[([^\[\]]+?)\]\]")

def strip_code(text):
    # Drop fenced code blocks (``` / ~~~) and inline code spans (`…`) before
    # scanning for [[wikilinks]] — Obsidian does not render links inside code,
    # so a `[[Target]]` written as a documentation example is not a real link.
    # Twin of strip_code in scripts/graph-quality.sh and stripCode in
    # src/core/wikilink-check.ts (pinned by gate-05).
    out = []
    in_fence = False
    marker = ""
    for line in text.splitlines():
        s = line.lstrip()
        if not in_fence and (s.startswith("```") or s.startswith("~~~")):
            in_fence = True
            marker = s[:3]
            continue
        if in_fence:
            if s.startswith(marker):
                in_fence = False
                marker = ""
            continue
        out.append(re.sub(r"`[^`]*`", "", line))
    return "\n".join(out)

def norm(s):
    return s.strip().lower()

def normalise_target(raw):
    """Strip |alias, #heading, ^block, then lower+strip."""
    t = raw
    pipe = t.find("|")
    if pipe != -1:
        t = t[:pipe]
    hash_ = t.find("#")
    if hash_ != -1:
        t = t[:hash_]
    caret = t.find("^")
    if caret != -1:
        t = t[:caret]
    return t.strip().lower()

def split_frontmatter(text):
    if not text.startswith("---"):
        return "", text
    end = text.find("\n---", 3)
    if end == -1:
        return "", text
    return text[3:end], text[end + 4:]

def parse_title_aliases(text):
    """Tolerant extraction of title: and aliases: — mirrors graph-quality.sh."""
    fm, _ = split_frontmatter(text)
    title = None
    aliases = []
    lines = fm.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        m = re.match(r"^title:\s*(.+?)\s*$", line)
        if m:
            title = m.group(1).strip().strip('"').strip("'")
        m = re.match(r"^aliases:\s*(.*)$", line)
        if m:
            rest = m.group(1).strip()
            if rest.startswith("["):
                items = re.findall(r"\"([^\"]*)\"|'([^']*)'", rest)
                if items:
                    for a, b in items:
                        val = a or b
                        if val:
                            aliases.append(val)
                else:
                    for piece in rest.strip("[]").split(","):
                        piece = piece.strip().strip('"').strip("'")
                        if piece:
                            aliases.append(piece)
            else:
                j = i + 1
                while j < len(lines):
                    bm = re.match(r"^\s*-\s*(.+?)\s*$", lines[j])
                    if bm:
                        aliases.append(bm.group(1).strip().strip('"').strip("'"))
                        j += 1
                    else:
                        break
                i = j - 1
        i += 1
    return title, aliases

def is_folder_note(full_path, stem, parent_name):
    """Matches _is_folder_note in verify-ingest.sh: stem==parent AND type: index."""
    if stem != parent_name:
        return False
    try:
        text = open(full_path, encoding="utf-8").read()
    except Exception:
        return False
    return bool(re.search(r"^type:\s*[\"']?index[\"']?\s*$", text, re.MULTILINE))

# ── Pass 1: build the resolvable-name set (ALL pages are potential targets) ──
# A link resolves iff its normalised target is the wiki-relative PATH (with or
# without .md), the filename stem, the title:, or an aliases: entry of some page
# (ADR-0031). Path + basename are what Obsidian resolves; title/alias are kept
# as a deliberate superset. Twin of resolvableNames() in src/core/link-resolver.ts.
resolvable = set()
for dirpath, _dirs, files in os.walk(wiki):
    for fn in sorted(files):
        if not fn.endswith(".md"):
            continue
        stem = fn[:-3]
        full = os.path.join(dirpath, fn)
        rel = os.path.relpath(full, wiki).replace(os.sep, "/")
        resolvable.add(norm(rel))
        resolvable.add(norm(rel[:-3] if rel.endswith(".md") else rel))
        resolvable.add(norm(stem))
        try:
            text = open(full, encoding="utf-8").read()
        except Exception:
            continue
        title, aliases = parse_title_aliases(text)
        if title:
            resolvable.add(norm(title))
        for a in aliases:
            resolvable.add(norm(a))

# ── Pass 2: scan non-bookkeeping pages as subjects ───────────────────────────
for dirpath, _dirs, files in os.walk(wiki):
    for fn in sorted(files):
        if not fn.endswith(".md"):
            continue
        stem = fn[:-3]
        # Skip bookkeeping stems.
        if stem in BOOKKEEPING_STEMS:
            continue
        parent_name = os.path.basename(dirpath)
        full = os.path.join(dirpath, fn)
        # Skip folder notes (type: index, stem == parent dir name).
        if is_folder_note(full, stem, parent_name):
            continue

        try:
            text = open(full, encoding="utf-8").read()
        except Exception:
            continue

        rel = os.path.relpath(full, wiki)
        seen_norms = set()
        for raw in LINK_RE.findall(strip_code(text)):
            nt = normalise_target(raw)
            if not nt or nt in seen_norms:
                continue
            seen_norms.add(nt)
            if nt not in resolvable:
                # Display form: strip alias/anchor for readability.
                display = raw
                pipe = display.find("|")
                if pipe != -1:
                    display = display[:pipe]
                hash_ = display.find("#")
                if hash_ != -1:
                    display = display[:hash_]
                caret = display.find("^")
                if caret != -1:
                    display = display[:caret]
                display = display.strip()
                # Output two lines per finding: FILE then TARGET.
                # Bash twin reads them in pairs below.
                print(rel)
                print(display)
PY
  )

  # Emit one WARN per (file, target) pair and count.
  # Python output: alternating lines — FILE, TARGET, FILE, TARGET, ...
  # Read them in pairs with a two-read loop.
  if [ -n "$DANGLING_OUTPUT" ]; then
    while IFS= read -r dangling_file && IFS= read -r dangling_target; do
      [ -z "$dangling_file" ] && continue || true
      yellow "dangling-wikilink: [[${dangling_target}]] in ${dangling_file} has no matching page (path, stem, title, or alias)"
      DANGLING_WARNS=$((DANGLING_WARNS + 1))
      WARNINGS=$((WARNINGS + 1))
    done <<<"$DANGLING_OUTPUT"
  fi

  if [ "$DANGLING_WARNS" -eq 0 ]; then
    green "No dangling wikilinks found"
  fi
fi

# ──────────────────────────────────────────────
# wikilink-collision WARN check (ADR-0030)
#
# One WARN per normalised name claimed by >1 distinct page over basename ∪
# alias (the two tiers Obsidian resolves; title excluded). Obsidian silently
# opens the basename winner, shadowing the alias page. Bash twin of
# src/core/collision-check.ts — must emit the IDENTICAL count (gate-05 compares
# counts; messages need not match byte-for-byte). Same inline-python3 pattern as
# the dangling block so the page set and normalisation are identical.
# ──────────────────────────────────────────────
header "Wikilink collisions (ADR-0030)"

if ! command -v python3 >/dev/null 2>&1; then
  yellow "python3 not found — wikilink-collision check skipped"
else
  COLLISION_WARNS=0
  COLLISION_OUTPUT=$(
    VERIFY_WIKI="$WIKI" python3 - <<'PY'
import os, re
from collections import defaultdict

wiki = os.environ["VERIFY_WIKI"]

def norm(s):
    return s.strip().lower()

def split_frontmatter(text):
    if not text.startswith("---"):
        return "", text
    end = text.find("\n---", 3)
    if end == -1:
        return "", text
    return text[3:end], text[end + 4:]

def parse_aliases(text):
    """Tolerant extraction of aliases: — mirrors the dangling block / graph-quality.sh."""
    fm, _ = split_frontmatter(text)
    aliases = []
    lines = fm.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        m = re.match(r"^aliases:\s*(.*)$", line)
        if m:
            rest = m.group(1).strip()
            if rest.startswith("["):
                items = re.findall(r"\"([^\"]*)\"|'([^']*)'", rest)
                if items:
                    for a, b in items:
                        val = a or b
                        if val:
                            aliases.append(val)
                else:
                    for piece in rest.strip("[]").split(","):
                        piece = piece.strip().strip('"').strip("'")
                        if piece:
                            aliases.append(piece)
            else:
                j = i + 1
                while j < len(lines):
                    bm = re.match(r"^\s*-\s*(.+?)\s*$", lines[j])
                    if bm:
                        aliases.append(bm.group(1).strip().strip('"').strip("'"))
                        j += 1
                    else:
                        break
                i = j - 1
        i += 1
    return aliases

basename_files = defaultdict(set)
alias_files = defaultdict(set)
claims = defaultdict(set)

for dirpath, _dirs, files in os.walk(wiki):
    for fn in sorted(files):
        if not fn.endswith(".md"):
            continue
        stem = fn[:-3]
        full = os.path.join(dirpath, fn)
        rel = os.path.relpath(full, wiki).replace(os.sep, "/")
        nb = norm(stem)
        basename_files[nb].add(rel)
        claims[nb].add(rel)
        try:
            text = open(full, encoding="utf-8").read()
        except Exception:
            text = ""
        for a in parse_aliases(text):
            na = norm(a)
            if na:
                alias_files[na].add(rel)
                claims[na].add(rel)

def tiebreak(cands):
    # shortest path (fewest segments) then alphabetical; no source context here.
    return sorted(cands, key=lambda p: (p.count("/"), p))[0]

for name in sorted(claims):
    fileset = claims[name]
    if len(fileset) < 2:
        continue
    if basename_files.get(name):
        winner = tiebreak(basename_files[name]); kind = "basename"
    elif alias_files.get(name):
        winner = tiebreak(alias_files[name]); kind = "alias"
    else:
        winner = sorted(fileset)[0]; kind = "basename"
    losers = ", ".join(sorted(f for f in fileset if f != winner))
    print(f"wikilink-collision: [[{name}]] resolves to {len(fileset)} pages — "
          f"Obsidian opens {winner} ({kind}), shadowing {losers}; rename or disambiguate")
PY
  )

  if [ -n "$COLLISION_OUTPUT" ]; then
    while IFS= read -r collision_line; do
      [ -z "$collision_line" ] && continue
      yellow "$collision_line"
      COLLISION_WARNS=$((COLLISION_WARNS + 1))
      WARNINGS=$((WARNINGS + 1))
    done <<<"$COLLISION_OUTPUT"
  fi

  if [ "$COLLISION_WARNS" -eq 0 ]; then
    green "No wikilink collisions found"
  fi
fi

# ──────────────────────────────────────────────
# SUMMARY
# ──────────────────────────────────────────────
header "Summary"
printf "Errors:   %d\n" "$ERRORS"
printf "Warnings: %d\n" "$WARNINGS"

if [ "$ERRORS" -gt 0 ]; then
  red "Verification failed — fix errors before continuing"
  exit 1
else
  if [ "$WARNINGS" -gt 0 ]; then
    yellow "Passed with warnings"
  else
    green "All checks passed"
  fi
  exit 0
fi

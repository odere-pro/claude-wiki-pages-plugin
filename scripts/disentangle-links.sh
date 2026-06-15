#!/bin/bash
# disentangle-links.sh — enforce topic-local linking so the Obsidian graph forms
# clean topic islands instead of one dense hairball (ADR-0033).
#
# The wiki over-links: every topic folder cross-references every other through
# `related:` frontmatter and inline body [[wikilinks]], plus the synthesis note
# and log.md fan out to detail pages. In Obsidian's force graph that fuses all
# seven topic folders into a single tangled component (see tmp images 6/7). The
# target shape is per-topic islands (tmp image 8): edges stay WITHIN a topic;
# cross-topic references survive as readable text, not graph edges.
#
# Policy (the refined linking algorithm — same rule the authoring skills now
# follow, see docs/adr/ADR-0033 and the CLAUDE.md "Topic-local linking" rule):
#   KEEP   a [[link]] iff the target resolves to a page in the SAME top-level
#          topic folder as the source, OR the link is part of the navigation
#          spine (`parent:` up to the folder note / index), OR a provenance
#          citation (`sources:` → wiki/_sources/**, never demoted — provenance
#          is load-bearing data), OR the source is the folder note / index.md.
#   DEMOTE a cross-topic body [[Target|Display]] to plain `Display` (or `Target`
#          when unpiped). The reader still sees the concept; the graph edge dies.
#   PRUNE  cross-topic entries from `related:` frontmatter lists.
#   CAP    `_synthesis/**` and `log.md` to folder-note links only; their
#          detail-page links are demoted to text.
#
# Resolution model mirrors scripts/graph-quality.sh (ADR-0031): path/basename/
# title/alias, case-insensitive, code spans/fences skipped. Pure bash + python3,
# no Bun, no network — consistent with the NO-RAG stance.
#
# Usage:
#   scripts/disentangle-links.sh [--target <vault>] [--apply] [--json]
# Default is a DRY RUN: it reports what would change and writes nothing.
# `--apply` rewrites the wiki files in place (run inside git; changes are
# reversible with `git checkout`). Exit 0 always.
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

TARGET=""
APPLY=0
JSON=0
while [ $# -gt 0 ]; do
  case "$1" in
    --target)
      TARGET="${2:-}"
      shift 2
      ;;
    --apply)
      APPLY=1
      shift
      ;;
    --json)
      JSON=1
      shift
      ;;
    -h | --help)
      sed -n '2,40p' "$0"
      exit 0
      ;;
    *)
      echo "disentangle-links: unknown arg: $1" >&2
      exit 0
      ;;
  esac
done

if [ -z "$TARGET" ]; then
  # shellcheck source=resolve-vault.sh
  source "${SCRIPT_DIR}/resolve-vault.sh"
  TARGET="$(resolve_vault)"
fi
if ! command -v python3 >/dev/null 2>&1; then
  echo "[claude-wiki-pages] disentangle-links: python3 not found — skipped." >&2
  exit 0
fi
if [ ! -d "$TARGET/wiki" ]; then
  echo "[claude-wiki-pages] disentangle-links: no wiki/ under '$TARGET'." >&2
  exit 0
fi

DL_VAULT="$TARGET" DL_APPLY="$APPLY" DL_JSON="$JSON" python3 - <<'PY'
import os, re, json

vault = os.environ["DL_VAULT"]
apply = os.environ.get("DL_APPLY") == "1"
as_json = os.environ.get("DL_JSON") == "1"
wiki = os.path.join(vault, "wiki")

CLUSTERS = ["plugin", "wiki-pages", "llm", "obsidian", "engine", "knowledge-graph", "how-it-works"]
LINK_RE = re.compile(r"\[\[([^\[\]]+?)\]\]")
HUB_BASENAMES = {"log.md", "plugin-architecture-synthesis.md"}

# The visible ROOT entity — the top-level "entry point" node that ties the topic
# islands together (ADR-0033). Its links to the per-topic folder notes are an
# allowed spine (kept across topics), so the graph reads as a root + island lobes
# rather than seven disconnected components. Set to the page's wiki-relative path,
# or "" to disable. Resolved at read time from `root_entity:` in any folder note's
# frontmatter if present (single source); otherwise this default.
ROOT_ENTITY = os.environ.get("DL_ROOT_ENTITY", "wiki/plugin/claude-wiki-pages-plugin.md")

def norm(s): return s.strip().lower()

def link_target(raw):
    return raw.split("|", 1)[0].split("#", 1)[0].split("^", 1)[0].strip()

def link_display(raw):
    # Text Obsidian shows: the piped alias, else the bare target (minus anchor).
    if "|" in raw:
        return raw.split("|", 1)[1].strip()
    return raw.split("#", 1)[0].split("^", 1)[0].strip()

def split_frontmatter(text):
    if not text.startswith("---"):
        return None, text, ""
    end = text.find("\n---", 3)
    if end == -1:
        return None, text, ""
    return text[3:end], text[end + 4:], text[:end + 4]

def parse_title_aliases(fm):
    title = None; aliases = []
    if not fm: return title, aliases
    lines = fm.splitlines(); i = 0
    while i < len(lines):
        line = lines[i]
        m = re.match(r"^title:\s*(.+?)\s*$", line)
        if m: title = m.group(1).strip().strip('"').strip("'")
        m = re.match(r"^aliases:\s*(.*)$", line)
        if m:
            rest = m.group(1).strip()
            if rest.startswith("["):
                for a, b in re.findall(r'"([^"]*)"|\'([^\']*)\'', rest):
                    if a or b: aliases.append(a or b)
            else:
                j = i + 1
                while j < len(lines):
                    bm = re.match(r"^\s*-\s*(.+?)\s*$", lines[j])
                    if bm: aliases.append(bm.group(1).strip().strip('"').strip("'")); j += 1
                    else: break
                i = j - 1
        i += 1
    return title, aliases

def cluster_of(rel):
    parts = rel.split(os.sep); stem = parts[-1][:-3]
    top = parts[0] if len(parts) > 1 else ""
    if top in ("_sources", "_synthesis") or (len(parts) == 1 and stem in ("index", "log", "manifest")):
        return "special"
    return top if top in CLUSTERS else "other"

def is_folder_note(vrel):
    parts = vrel.split("/")  # wiki/<cluster>/<cluster>.md
    return len(parts) == 3 and parts[1] in CLUSTERS and parts[2] == parts[1] + ".md"

def is_hidden(vrel):
    # Nodes the topic graph excludes from view (graph.json filter): the
    # provenance/MOC scaffolding. Links touching these never fuse the visible
    # topic islands, so they are always kept (provenance + navigation preserved).
    if vrel.startswith("wiki/_sources/") or vrel.startswith("wiki/_synthesis/"):
        return True
    return vrel in ("wiki/index.md", "wiki/log.md", "wiki/manifest.md", "wiki/_sources/manifest.md")

# ---- build resolution index ----
by_path = {}; by_base = {}; by_alias = {}; by_title = {}
pages = []
for dirpath, _d, files in os.walk(wiki):
    for fn in sorted(files):
        if not fn.endswith(".md"): continue
        full = os.path.join(dirpath, fn)
        rel = os.path.relpath(full, wiki); stem = fn[:-3]
        text = open(full, encoding="utf-8").read()
        fm, _body, _raw = split_frontmatter(text)
        title, aliases = parse_title_aliases(fm)
        vrel = "wiki/" + rel.replace(os.sep, "/")
        pk = vrel.lower()
        by_path.setdefault(pk, vrel)
        by_path.setdefault(pk[:-3] if pk.endswith(".md") else pk, vrel)
        by_base.setdefault(norm(stem), []).append(vrel)
        if title: by_title.setdefault(norm(title), []).append(vrel)
        for a in aliases:
            if norm(a): by_alias.setdefault(norm(a), []).append(vrel)
        pages.append({"full": full, "rel": rel, "vrel": vrel, "text": text,
                      "cluster": cluster_of(rel)})
for m in (by_base, by_alias, by_title):
    for k in list(m): m[k] = sorted(set(m[k]))

def tiebreak(cands, src):
    sd = src.rsplit("/", 1)[0] if "/" in src else ""
    return sorted(cands, key=lambda c: (c.count("/"),
                  0 if (c.rsplit("/", 1)[0] if "/" in c else "") == sd else 1, c))[0]

def resolve(raw, src):
    nt = norm(link_target(raw))
    if not nt: return None
    if nt in by_path: return by_path[nt]
    for m in (by_base, by_alias, by_title):
        if m.get(nt): return tiebreak(m[nt], src)
    return None

vrel2cluster = {p["vrel"]: p["cluster"] for p in pages}

def top_folder(vrel):
    parts = vrel.split("/")  # wiki/<top>/...
    return parts[1] if len(parts) > 2 else ""

def keep_link(src_vrel, src_cluster, raw):
    """True = keep the [[wikilink]]; False = demote/prune.

    The rule: CUT a link iff BOTH endpoints are VISIBLE topic pages in
    DIFFERENT top-level folders. Anything touching a hidden node (index/log/
    _sources/_synthesis/manifest — excluded from the graph view) is kept, which
    preserves the navigation spine (`parent`→index, index→folder notes) and all
    provenance citations (`sources`→_sources). Intra-folder links are kept."""
    tgt = resolve(raw, src_vrel)
    if tgt is None:
        return True  # dangling: leave untouched (graph-quality flags these)
    if is_hidden(src_vrel) or is_hidden(tgt):
        return True  # touches a filtered node — never fuses the visible islands
    if top_folder(src_vrel) == top_folder(tgt):
        return True  # intra-topic
    # Root-entity spine: the entry-point node may link the per-topic folder notes.
    if src_vrel == ROOT_ENTITY and is_folder_note(tgt):
        return True
    return False     # cross-topic between two visible topic pages → cut

# ---- rewrite ----
def demote_in_body(body, src_vrel, src_cluster):
    out = []; in_fence = False; marker = ""; demoted = 0
    for line in body.splitlines(keepends=False):
        s = line.lstrip()
        if not in_fence and (s.startswith("```") or s.startswith("~~~")):
            in_fence = True; marker = s[:3]; out.append(line); continue
        if in_fence:
            if s.startswith(marker): in_fence = False; marker = ""
            out.append(line); continue
        # protect inline code spans: split on backtick runs, only edit odd-index? simpler:
        # rebuild line replacing links outside `...` spans
        def repl_line(text):
            nonlocal demoted
            res = []; i = 0
            for seg, is_code in split_code_spans(text):
                if is_code:
                    res.append(seg); continue
                def r(m):
                    nonlocal demoted
                    raw = m.group(1)
                    if keep_link(src_vrel, src_cluster, raw):
                        return m.group(0)
                    demoted += 1
                    return link_display(raw)
                res.append(LINK_RE.sub(r, seg))
            return "".join(res)
        out.append(repl_line(line))
    return "\n".join(out) + ("\n" if body.endswith("\n") else ""), demoted

def split_code_spans(text):
    # yield (segment, is_code) splitting on backtick-delimited inline code.
    parts = re.split(r"(`+[^`]*`+)", text)
    for p in parts:
        if not p: continue
        yield (p, bool(re.match(r"^`+", p)))

# Association frontmatter fields whose cross-topic entries fuse the graph. The
# spine fields (`parent`, `children`, `child_indexes`) and provenance (`sources`)
# are NOT pruned — they target hidden nodes or same-cluster children and so are
# kept by keep_link anyway; pruning them here is unnecessary and risky.
PRUNE_FIELDS = ("related", "depends_on", "key_pages", "members", "scope", "contradicts", "supersedes")

def prune_fields(fm_raw, src_vrel, src_cluster):
    """Prune cross-topic entries from inline-array frontmatter link fields.
    Handles the `field: ["[[..]]", ...]` form the templates emit."""
    pruned = 0
    lines = fm_raw.splitlines()
    for idx, line in enumerate(lines):
        m = re.match(r"^(\s*([a-z_]+):\s*)(\[.*\])\s*$", line)
        if not m: continue
        if m.group(2) not in PRUNE_FIELDS: continue
        prefix, arr = m.group(1), m.group(3)
        items = re.findall(r'"([^"]*)"', arr)
        kept = []
        for it in items:
            lm = LINK_RE.search(it)
            if lm and not keep_link(src_vrel, src_cluster, lm.group(1)):
                pruned += 1; continue
            kept.append(it)
        new_arr = "[" + ", ".join(f'"{k}"' for k in kept) + "]"
        lines[idx] = prefix + new_arr
    return "\n".join(lines), pruned

report = []
total_demoted = total_pruned = 0
for p in pages:
    # Hidden nodes (index/log/_sources/_synthesis/manifest) keep every link by
    # the visibility rule, so they never change — skip the work.
    if is_hidden(p["vrel"]):
        continue
    fm_raw, body, fm_block = split_frontmatter(p["text"])
    new_fm_block = fm_block
    pruned = 0
    if fm_raw is not None:
        new_fm_inner, pruned = prune_fields(fm_raw, p["vrel"], p["cluster"])
        if pruned:
            new_fm_block = "---" + new_fm_inner + "\n---"
    new_body, demoted = demote_in_body(body, p["vrel"], p["cluster"])
    if pruned or demoted:
        new_text = (new_fm_block + new_body) if fm_raw is not None else new_body
        report.append({"file": p["rel"], "cluster": p["cluster"],
                       "demoted": demoted, "relatedPruned": pruned})
        total_demoted += demoted; total_pruned += pruned
        if apply and new_text != p["text"]:
            open(p["full"], "w", encoding="utf-8").write(new_text)

result = {
    "vault": vault, "applied": apply,
    "filesChanged": len(report),
    "bodyLinksDemoted": total_demoted,
    "relatedEntriesPruned": total_pruned,
    "files": sorted(report, key=lambda r: -(r["demoted"] + r["relatedPruned"])),
}
if as_json:
    print(json.dumps(result, indent=2))
else:
    mode = "APPLIED" if apply else "DRY RUN (no files written; pass --apply)"
    print(f"disentangle-links [{mode}]  vault: {vault}")
    print(f"files changed: {result['filesChanged']}  "
          f"body links demoted: {total_demoted}  related entries pruned: {total_pruned}")
    for r in result["files"][:30]:
        print(f"  {r['demoted']:3d}d {r['relatedPruned']:2d}p  [{r['cluster']}]  {r['file']}")
    if len(result["files"]) > 30:
        print(f"  … and {len(result['files']) - 30} more")
PY

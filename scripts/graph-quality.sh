#!/bin/bash
# graph-quality.sh — deterministic dangling-wikilink scanner + topic-cluster metric.
#
# The Bun engine's `verify` checks structural integrity but does NOT detect
# dangling [[wikilinks]] (links whose target resolves to no page) — those show up
# as empty grey nodes in Obsidian's graph. This script fills that gap, and also
# measures how concentrated the graph is around the project's core topic clusters.
#
# Pure bash + python3 stdlib: no Bun, no network, no embeddings — consistent with
# the NO-RAG stance (ADR-0007). Read-only; never writes to the vault.
#
# Usage:
#   scripts/graph-quality.sh [--target <vault-path>] [--json]
#
# Resolution model (mirrors Obsidian): a link [[T]] (after stripping a trailing
#   "|alias" and "#heading" anchor) resolves iff, case-insensitively, T equals
#   some page's filename stem, its `title:`, or one of its `aliases:`. No
#   space<->hyphen fuzzing — that mismatch is exactly what produces empty nodes.
#
# Cluster model: each topic-bearing page (everything under wiki/ except _sources/,
#   _synthesis/, and the root index.md/log.md/manifest.md) is assigned to one of
#   the 7 core clusters by its top-level folder; anything else is "other".
#   Hub pages are the per-folder notes <cluster>/<cluster>.md.
#     Cn = pages in the 7 clusters / all topic-bearing pages.
#     Ch = resolved wikilink edges touching a hub page / all resolved edges.
#
# Exit codes: 0 always (it reports; callers decide gates from the JSON/output).
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

TARGET=""
JSON=0
while [ $# -gt 0 ]; do
  case "$1" in
    --target)
      TARGET="${2:-}"
      shift 2
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
      echo "graph-quality: unknown arg: $1" >&2
      exit 0
      ;;
  esac
done

# Resolve the vault the same way every other script does, unless --target given.
if [ -z "$TARGET" ]; then
  # shellcheck source=resolve-vault.sh
  source "${SCRIPT_DIR}/resolve-vault.sh"
  TARGET="$(resolve_vault)"
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "[claude-wiki-pages] graph-quality: python3 not found — skipped." >&2
  exit 0
fi

if [ ! -d "$TARGET/wiki" ]; then
  echo "[claude-wiki-pages] graph-quality: no wiki/ under '$TARGET'." >&2
  exit 0
fi

GQ_VAULT="$TARGET" GQ_JSON="$JSON" python3 - <<'PY'
import os, re, json

vault = os.environ["GQ_VAULT"]
as_json = os.environ.get("GQ_JSON") == "1"
wiki = os.path.join(vault, "wiki")

# The 7 core topic clusters (top-level folders under wiki/).
CLUSTERS = ["plugin", "wiki-pages", "llm", "obsidian", "engine", "knowledge-graph", "how-it-works"]

LINK_RE = re.compile(r"\[\[([^\[\]]+?)\]\]")

def strip_code(text):
    # Drop fenced code blocks (``` / ~~~) and inline code spans (`…`) before
    # scanning for [[wikilinks]] — Obsidian does not render links inside code,
    # so a `[[Target]]` written as a documentation example is not a real link.
    # Twin of strip_code in scripts/verify-ingest.sh and stripCode in
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

def link_target(raw):
    # Strip "|display" alias and "#heading"/"^block" anchor; keep the page target.
    t = raw.split("|", 1)[0]
    t = t.split("#", 1)[0]
    t = t.split("^", 1)[0]
    return t.strip()

def split_frontmatter(text):
    if not text.startswith("---"):
        return "", text
    end = text.find("\n---", 3)
    if end == -1:
        return "", text
    return text[3:end], text[end + 4:]

def parse_title_aliases(fm):
    """Tolerant extraction of title: and aliases: from a frontmatter block.
    Handles inline arrays (aliases: ["a","b"]) and block lists (- a)."""
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
                items = re.findall(r'"([^"]*)"|\'([^\']*)\'', rest)
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
                # block list follows: subsequent "- item" lines
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

# ---- gather all pages -------------------------------------------------------
pages = []
resolvable = set()  # normalized names that satisfy a [[link]]

for dirpath, _dirs, files in os.walk(wiki):
    for fn in sorted(files):
        if not fn.endswith(".md"):
            continue
        full = os.path.join(dirpath, fn)
        rel = os.path.relpath(full, wiki)
        parts = rel.split(os.sep)
        stem = fn[:-3]
        try:
            text = open(full, encoding="utf-8").read()
        except Exception:
            text = ""
        fm, _body = split_frontmatter(text)
        title, aliases = parse_title_aliases(fm)

        resolvable.add(norm(stem))
        if title:
            resolvable.add(norm(title))
        for a in aliases:
            resolvable.add(norm(a))

        links = [link_target(m) for m in LINK_RE.findall(strip_code(text))]

        top = parts[0] if len(parts) > 1 else ""
        is_special = top in ("_sources", "_synthesis") or (len(parts) == 1 and stem in ("index", "log", "manifest"))
        cluster = top if top in CLUSTERS else "other"
        is_hub = (len(parts) == 2 and parts[1] == top + ".md" and top in CLUSTERS)

        pages.append({
            "rel": rel, "stem": stem, "title": title, "aliases": aliases,
            "links": links, "cluster": cluster, "is_hub": is_hub,
            "is_special": is_special,
        })

# ---- dangling scan ----------------------------------------------------------
dangling = {}
for p in pages:
    for raw in p["links"]:
        if raw and norm(raw) not in resolvable:
            dangling.setdefault(raw, set()).add(p["rel"])

dangling_list = sorted(
    ({"target": t, "refs": len(fs), "files": sorted(fs)} for t, fs in dangling.items()),
    key=lambda d: (-d["refs"], d["target"].lower()),
)
dangling_refs = sum(d["refs"] for d in dangling_list)

# ---- cluster metric ---------------------------------------------------------
topic_pages = [p for p in pages if not p["is_special"]]
in_clusters = [p for p in topic_pages if p["cluster"] in CLUSTERS]
Cn = (len(in_clusters) / len(topic_pages)) if topic_pages else 0.0

cluster_counts = {c: 0 for c in CLUSTERS + ["other"]}
for p in topic_pages:
    cluster_counts[p["cluster"]] = cluster_counts.get(p["cluster"], 0) + 1

hub_names = set()
for p in pages:
    if p["is_hub"]:
        hub_names.add(norm(p["stem"]))
        if p["title"]:
            hub_names.add(norm(p["title"]))
        for a in p["aliases"]:
            hub_names.add(norm(a))

# Map every resolvable name → the cluster of the page that owns it (or "special"
# for _sources/_synthesis/index/log). Used for the faithful edge metric Ce.
name2cluster = {}
for p in pages:
    owner = "special" if p["is_special"] else p["cluster"]
    for nm in [norm(p["stem"])] + ([norm(p["title"])] if p["title"] else []) + [norm(a) for a in p["aliases"]]:
        name2cluster.setdefault(nm, owner)

edges_total = 0
edges_hub = 0
# Ce — the faithful "edges around the topics" metric: of all resolved edges
# between non-special pages, the fraction whose BOTH endpoints lie in one of the
# 7 core clusters. This is what "majority of edges around the topics" means.
ce_total = 0
ce_in = 0
for p in pages:
    src_is_hub = p["is_hub"]
    src_in_cluster = (not p["is_special"]) and p["cluster"] in CLUSTERS
    for raw in p["links"]:
        if not raw:
            continue
        n = norm(raw)
        if n not in resolvable:
            continue  # dangling links are not edges
        edges_total += 1
        if src_is_hub or n in hub_names:
            edges_hub += 1
        # Ce denominator: edge between two non-special pages.
        tgt_cluster = name2cluster.get(n)
        if (not p["is_special"]) and tgt_cluster not in (None, "special"):
            ce_total += 1
            if src_in_cluster and tgt_cluster in CLUSTERS:
                ce_in += 1
Ch = (edges_hub / edges_total) if edges_total else 0.0
Ce = (ce_in / ce_total) if ce_total else 0.0

# ---- connectivity / orphans / shadows (ADR-0031) ----------------------------
# Node universe = every wiki/ page (incl. _sources/_synthesis/index/log/folder
# notes — the connective tissue). Edges = resolving links (body + frontmatter,
# code-stripped), resolved by the Obsidian-accurate ladder (ADR-0030) over the
# nodes PLUS scratch files (output/, _inbox/). A link resolving INTO a scratch
# folder is a shadow (counted, NOT a connecting edge). Undirected union-find
# yields components + orphans. All lists sorted (same vault → same output).
SCRATCH_DIRS = ["output", "_inbox"]

by_path = {}      # normalised vault-rel path (with & without .md) -> id
by_basename = {}  # normalised stem -> [ids]
by_alias = {}
by_title = {}

def add_target(vrel, stem, title, aliases):
    pk = vrel.lower()
    by_path.setdefault(pk, vrel)
    by_path.setdefault(pk[:-3] if pk.endswith(".md") else pk, vrel)
    by_basename.setdefault(norm(stem), []).append(vrel)
    if title:
        by_title.setdefault(norm(title), []).append(vrel)
    for a in aliases:
        if norm(a):
            by_alias.setdefault(norm(a), []).append(vrel)

node_ids = []
for p in pages:
    vrel = "wiki/" + p["rel"].replace(os.sep, "/")
    node_ids.append(vrel)
    add_target(vrel, p["stem"], p["title"], p["aliases"])

scratch_ids = set()
for sd in SCRATCH_DIRS:
    root = os.path.join(vault, sd)
    if not os.path.isdir(root):
        continue
    for dp, _d, fs in os.walk(root):
        for fn in sorted(fs):
            if not fn.endswith(".md"):
                continue
            full = os.path.join(dp, fn)
            vrel = os.path.relpath(full, vault).replace(os.sep, "/")
            scratch_ids.add(vrel)
            try:
                text = open(full, encoding="utf-8").read()
            except Exception:
                text = ""
            fm2, _b = split_frontmatter(text)
            t2, al2 = parse_title_aliases(fm2)
            add_target(vrel, fn[:-3], t2, al2)

for _m in (by_basename, by_alias, by_title):
    for _k in list(_m):
        _m[_k] = sorted(set(_m[_k]))

def _tiebreak(cands, src):
    srcdir = src.rsplit("/", 1)[0] if "/" in src else ""
    def key(c):
        cdir = c.rsplit("/", 1)[0] if "/" in c else ""
        return (c.count("/"), 0 if cdir == srcdir else 1, c)
    return sorted(cands, key=key)[0]

def resolve_link(raw, src):
    nt = norm(link_target(raw))
    if not nt:
        return None
    if nt in by_path:
        return by_path[nt]
    if by_basename.get(nt):
        return _tiebreak(by_basename[nt], src)
    if by_alias.get(nt):
        return _tiebreak(by_alias[nt], src)
    if by_title.get(nt):
        return _tiebreak(by_title[nt], src)
    return None

parent = {n: n for n in node_ids}

def _find(x):
    while parent[x] != x:
        parent[x] = parent[parent[x]]
        x = parent[x]
    return x

def _union(a, b):
    ra, rb = _find(a), _find(b)
    if ra != rb:
        parent[ra] = rb

node_set = set(node_ids)
degree = {n: 0 for n in node_ids}
shadows = []
for p in pages:
    src = "wiki/" + p["rel"].replace(os.sep, "/")
    for raw in p["links"]:
        if not raw:
            continue
        tgt = resolve_link(raw, src)
        if tgt is None:
            continue  # dangling — no edge
        if tgt in scratch_ids:
            shadows.append({"from": src, "to": tgt})
            continue  # shadow — not a connecting edge
        if tgt == src or tgt not in node_set:
            continue
        degree[src] += 1
        degree[tgt] += 1
        _union(src, tgt)

comp_sizes = {}
for n in node_ids:
    r = _find(n)
    comp_sizes[r] = comp_sizes.get(r, 0) + 1
orphans = sorted(n for n in node_ids if degree[n] == 0)
shadows_sorted = sorted(shadows, key=lambda s: (s["from"], s["to"]))
connectivity = {
    "nodes": len(node_ids),
    "components": len(comp_sizes),
    "largestComponentSize": max(comp_sizes.values()) if comp_sizes else 0,
    "orphanCount": len(orphans),
    "orphans": orphans,
    "shadowCount": len(shadows_sorted),
    "shadows": shadows_sorted,
}

result = {
    "vault": vault,
    "danglingCount": len(dangling_list),
    "danglingRefs": dangling_refs,
    "dangling": dangling_list,
    "nodes": len(topic_pages),
    "nodesInClusters": len(in_clusters),
    "Cn": round(Cn, 4),
    "edgesTotal": edges_total,
    "edgesTouchingHub": edges_hub,
    "Ch": round(Ch, 4),
    "edgesBetweenTopics": ce_total,
    "edgesWithinClusters": ce_in,
    "Ce": round(Ce, 4),
    "clusters": cluster_counts,
    "connectivity": connectivity,
}

if as_json:
    print(json.dumps(result, indent=2))
else:
    print(f"vault: {vault}")
    print(f"dangling targets: {result['danglingCount']}  (refs: {result['danglingRefs']})")
    for d in dangling_list[:25]:
        print(f"  - {d['target']}  ({d['refs']} ref{'s' if d['refs'] != 1 else ''})")
    if len(dangling_list) > 25:
        print(f"  … and {len(dangling_list) - 25} more")
    print(f"nodes: {result['nodes']}  in-clusters: {result['nodesInClusters']}  Cn={result['Cn']}")
    print(f"edges: {result['edgesTotal']}  within-clusters: {result['edgesWithinClusters']}/{result['edgesBetweenTopics']}  Ce={result['Ce']}  touching-hub: {result['edgesTouchingHub']}  Ch={result['Ch']}")
    print("cluster sizes: " + ", ".join(f"{c}={cluster_counts.get(c, 0)}" for c in CLUSTERS + ["other"]))
    cc = result["connectivity"]
    print(f"connectivity: nodes={cc['nodes']}  components={cc['components']}  "
          f"orphans={cc['orphanCount']}  shadows={cc['shadowCount']}  largest={cc['largestComponentSize']}")
    if cc["orphanCount"]:
        for o in cc["orphans"][:25]:
            print(f"  orphan: {o}")
        if cc["orphanCount"] > 25:
            print(f"  … and {cc['orphanCount'] - 25} more orphans")
    if cc["shadowCount"]:
        for s in cc["shadows"][:25]:
            print(f"  shadow: {s['from']} -> {s['to']}")
PY
